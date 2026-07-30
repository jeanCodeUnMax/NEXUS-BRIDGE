// NEXUS Bridge — Gemini Content Script
(function() {
  const SELECTORS = {
    input: 'div.ql-editor, rich-textarea .ql-editor',
    response: 'message-content .markdown',
    streaming_signal: '.loading-indicator, model-response.loading'
  }
  let checkInterval = null

  function fillInput(text) {
    const el = document.querySelector(SELECTORS.input)
    if (!el) throw new Error('Gemini input not found')
    el.focus()
    document.execCommand('selectAll', false, null)
    document.execCommand('insertText', false, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return el
  }

  function submit(el) {
    setTimeout(() => {
      const btn = document.querySelector('button.send-button, button[aria-label*="Send"]')
      if (btn) btn.click()
      else el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
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
      else if (!streaming && text) {
        stableCount++
        if (stableCount >= 3) {
          clearInterval(checkInterval)
          chrome.runtime.sendMessage({ type: 'NEXUS_RESPONSE_DONE', providerId: 'gemini-free', text })
        }
      }
    }, 400)
    setTimeout(() => clearInterval(checkInterval), 180000)
  }

  // Enregistrement
  chrome.runtime.sendMessage({ type: 'NEXUS_REGISTER_TAB', providerId: 'gemini-free' })

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'INJECT_PROMPT') {
      try { const el = fillInput(msg.prompt); submit(el); setTimeout(observeResponse, 1000); sendResponse({ ok: true }) }
      catch(e) { sendResponse({ ok: false, error: e.message }) }
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

  // Heartbeat
  setInterval(() => {
    chrome.runtime.sendMessage({ type: 'NEXUS_HEARTBEAT', providerId: 'gemini-free' })
  }, 25000)

  console.log('[NEXUS Bridge] Gemini ready')
})()
