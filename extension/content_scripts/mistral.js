// NEXUS Bridge — Mistral Le Chat Content Script
(function() {
  const SELECTORS = { input: 'textarea[placeholder]', response: '.prose', streaming_signal: '.animate-pulse' }
  let checkInterval = null

  function fillInput(text) {
    const el = document.querySelector(SELECTORS.input)
    if (!el) throw new Error('Mistral input not found')
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
    if (nativeSetter) nativeSetter.call(el, text); else el.value = text
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return el
  }

  function submit(el) {
    setTimeout(() => {
      const btn = document.querySelector('button[type="submit"]')
      if (btn) btn.click(); else el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
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
          chrome.runtime.sendMessage({ type: 'NEXUS_RESPONSE_DONE', providerId: 'mistral-free', text })
        }
      }
    }, 300)
    setTimeout(() => clearInterval(checkInterval), 180000)
  }

  // Enregistrement
  chrome.runtime.sendMessage({ type: 'NEXUS_REGISTER_TAB', providerId: 'mistral-free' })

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
    chrome.runtime.sendMessage({ type: 'NEXUS_HEARTBEAT', providerId: 'mistral-free' })
  }, 25000)

  console.log('[NEXUS Bridge] Mistral ready')
})()
