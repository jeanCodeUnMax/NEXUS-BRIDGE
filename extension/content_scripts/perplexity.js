// NEXUS Bridge — Perplexity Content Script
(function() {
  const SELECTORS = { input: 'textarea[placeholder]', response: '.prose', streaming_signal: '.animate-spin' }
  let checkInterval = null

  function fillInput(text) {
    const el = document.querySelector(SELECTORS.input)
    if (!el) throw new Error('Perplexity input not found')
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
    if (nativeSetter) nativeSetter.call(el, text); else el.value = text
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return el
  }

  function submit(el) {
    setTimeout(() => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
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
          chrome.runtime.sendMessage({ type: 'NEXUS_RESPONSE_DONE', providerId: 'perplexity-free', text })
        }
      }
    }, 350)
    setTimeout(() => clearInterval(checkInterval), 180000)
  }

  // Enregistrement
  chrome.runtime.sendMessage({ type: 'NEXUS_REGISTER_TAB', providerId: 'perplexity-free' })

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'INJECT_PROMPT') {
      try { const el = fillInput(msg.prompt); submit(el); setTimeout(observeResponse, 800); sendResponse({ ok: true }) }
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
    chrome.runtime.sendMessage({ type: 'NEXUS_HEARTBEAT', providerId: 'perplexity-free' })
  }, 25000)

  console.log('[NEXUS Bridge] Perplexity ready')
})()
