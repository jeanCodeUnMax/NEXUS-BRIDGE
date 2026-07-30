// NEXUS Bridge — ChatGPT Content Script
(function() {
  const SELECTORS = {
    input: '#prompt-textarea',
    submit: 'button[data-testid="send-button"]',
    response: '.markdown',
    streaming_signal: '.result-streaming, button[aria-label="Stop streaming"]'
  }

  let checkInterval = null

  function fillInput(text) {
    const el = document.querySelector(SELECTORS.input)
    if (!el) throw new Error('ChatGPT input not found')

    // ChatGPT utilise un contenteditable div (pas toujours un textarea)
    if (el.tagName === 'TEXTAREA') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      if (nativeSetter) nativeSetter.call(el, text)
      else el.value = text
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      // contenteditable (ChatGPT a migré vers ce format)
      el.focus()
      document.execCommand('selectAll', false, null)
      document.execCommand('insertText', false, text)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    return el
  }

  function submit() {
    setTimeout(() => {
      const btn = document.querySelector(SELECTORS.submit)
      if (btn) btn.click()
    }, 150)
  }

  function observeResponse() {
    let lastText = '', stableCount = 0
    if (checkInterval) clearInterval(checkInterval)
    checkInterval = setInterval(() => {
      const els = document.querySelectorAll(SELECTORS.response)
      if (!els.length) return
      const text = els[els.length - 1]?.innerText || ''
      const streaming = !!document.querySelector(SELECTORS.streaming_signal)
      if (text !== lastText) { lastText = text; stableCount = 0 }
      else if (!streaming) {
        stableCount++
        if (stableCount >= 3) {
          clearInterval(checkInterval)
          chrome.runtime.sendMessage({ type: 'NEXUS_RESPONSE_DONE', providerId: 'chatgpt-free', text })
        }
      }
    }, 300)
    setTimeout(() => clearInterval(checkInterval), 180000)
  }

  // Enregistrement auprès du background
  chrome.runtime.sendMessage({ type: 'NEXUS_REGISTER_TAB', providerId: 'chatgpt-free' })

  // Écouter les injections de prompt
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'INJECT_PROMPT') {
      try {
        fillInput(msg.prompt)
        submit()
        setTimeout(observeResponse, 800)
        sendResponse({ ok: true })
      } catch(e) {
        sendResponse({ ok: false, error: e.message })
      }
      return true
    }

    // Health check probe — DANS l'IIFE pour accéder à SELECTORS
    if (msg.type === 'NEXUS_PROBE_SELECTORS') {
      const results = {}
      const sel = msg.selectors || SELECTORS
      for (const [key, css] of Object.entries(sel)) {
        const el = document.querySelector(css)
        results[key] = { found: !!el, selector: css }
      }
      const allOk = Object.values(results).every(r => r.found)
      sendResponse({ ok: allOk, status: allOk ? 'ready' : 'partial', results })
      return true
    }
  })

  // Heartbeat pour maintenir l'enregistrement
  setInterval(() => {
    chrome.runtime.sendMessage({ type: 'NEXUS_HEARTBEAT', providerId: 'chatgpt-free' })
  }, 25000)

  console.log('[NEXUS Bridge] ChatGPT ready')
})()
