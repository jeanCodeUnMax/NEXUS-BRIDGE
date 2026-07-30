/**
 * NEXUS Bridge — API Caller
 * Handles all direct API providers: Ollama, Anthropic, OpenRouter, Groq
 */

export async function callApiProvider(provider, messages, apiKeys, onChunk) {
  switch (provider.id) {
    case 'ollama':
      return callOllama(provider, messages, onChunk)
    case 'anthropic':
      return callAnthropic(provider, messages, apiKeys.anthropic, onChunk)
    case 'openrouter':
      return callOpenAI_compat(provider, messages, apiKeys.openrouter, 'https://openrouter.ai/api/v1/chat/completions', onChunk)
    case 'groq':
      return callOpenAI_compat(provider, messages, apiKeys.groq, 'https://api.groq.com/openai/v1/chat/completions', onChunk)
    default:
      throw new Error(`Unknown provider: ${provider.id}`)
  }
}

async function callOllama(provider, messages, onChunk) {
  const model = provider.selectedModel || provider.defaultModel
  const resp = await fetch(`${provider.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true
    })
  })
  if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`)
  return readNDJSONStream(resp.body, data => data.message?.content || '', onChunk)
}

async function callAnthropic(provider, messages, apiKey, onChunk) {
  if (!apiKey) throw new Error('Anthropic API key required')
  const model = provider.selectedModel || provider.defaultModel

  // Separate system message
  const systemMsg = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMsg?.content,
      messages: userMessages.map(m => ({ role: m.role, content: m.content })),
      stream: true
    })
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(`Anthropic: ${err.error?.message || resp.status}`)
  }

  let full = ''
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'content_block_delta' && data.delta?.text) {
            full += data.delta.text
            onChunk?.(data.delta.text)
          }
        } catch { /* skip malformed */ }
      }
    }
  }
  return full
}

async function callOpenAI_compat(provider, messages, apiKey, url, onChunk) {
  if (!apiKey) throw new Error(`API key required for ${provider.name}`)
  const model = provider.selectedModel || provider.defaultModel

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  }
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://nexus-bridge.local'
    headers['X-Title'] = 'NEXUS Bridge'
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: 4096
    })
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(`${provider.name}: ${err.error?.message || resp.status}`)
  }
  return readSSEStream(resp.body, data => data.choices?.[0]?.delta?.content || '', onChunk)
}

// --- Stream readers ---

async function readSSEStream(body, extractor, onChunk) {
  let full = ''
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6))
          const chunk = extractor(data)
          if (chunk) { full += chunk; onChunk?.(chunk) }
        } catch { /* skip */ }
      }
    }
  }
  return full
}

async function readNDJSONStream(body, extractor, onChunk) {
  let full = ''
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (line.trim()) {
        try {
          const data = JSON.parse(line)
          const chunk = extractor(data)
          if (chunk) { full += chunk; onChunk?.(chunk) }
        } catch { /* skip */ }
      }
    }
  }
  return full
}
