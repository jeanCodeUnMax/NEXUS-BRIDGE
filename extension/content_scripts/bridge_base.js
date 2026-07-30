/**
 * NEXUS Bridge — Base DOM Bridge
 * Shared logic for all content scripts
 * Each site-specific script extends this pattern
 */

class NexusBridgeBase {
  constructor(providerId, selectors) {
    this.providerId = providerId
    this.selectors = selectors
    this.isStreaming = false
    this.observer = null
    this.responseBuffer = ''
    this.lastResponseCount = 0

    this.init()
  }

  init() {
    // Register with background
    chrome.runtime.sendMessage({
      type: 'NEXUS_REGISTER_TAB',
      providerId: this.providerId
    })

    // Listen for prompt injection requests
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'INJECT_PROMPT') {
        this.injectPrompt(msg.prompt)
          .then(() => sendResponse({ ok: true }))
          .catch(err => sendResponse({ ok: false, error: err.message }))
        return true
      }
    })

    console.log(`[NEXUS Bridge] ${this.providerId} content script ready`)
  }

  async injectPrompt(text) {
    const input = await this.waitForElement(this.selectors.input, 5000)
    if (!input) throw new Error(`Input not found: ${this.selectors.input}`)

    // Clear and fill input
    if (input.tagName === 'TEXTAREA') {
      this.fillTextarea(input, text)
    } else {
      this.fillContentEditable(input, text)
    }

    // Wait a tick then submit
    await this.sleep(200)
    await this.submit(input)

    // Start observing response
    this.observeResponse()
  }

  fillTextarea(el, text) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    nativeSetter.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  fillContentEditable(el, text) {
    el.focus()
    // Use execCommand for compatibility
    document.execCommand('selectAll', false, null)
    document.execCommand('insertText', false, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  async submit(inputEl) {
    // Try submit button first
    if (this.selectors.submit) {
      const btn = document.querySelector(this.selectors.submit)
      if (btn && !btn.disabled) {
        btn.click()
        return
      }
    }
    // Fallback: Enter key
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
    inputEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }))
  }

  observeResponse() {
    this.responseBuffer = ''
    this.isStreaming = true

    if (this.observer) this.observer.disconnect()

    const container = document.body
    let stableCount = 0
    let lastText = ''
    let checkInterval

    // Poll for response completion (more reliable than MutationObserver for streaming)
    checkInterval = setInterval(() => {
      const responseEls = document.querySelectorAll(this.selectors.response)
      if (!responseEls.length) return

      const lastEl = responseEls[responseEls.length - 1]
      const currentText = lastEl.innerText || lastEl.textContent || ''

      // Check if streaming signal is gone (= done)
      const stillStreaming = this.selectors.streaming_signal
        ? document.querySelector(this.selectors.streaming_signal) !== null
        : currentText === lastText // fallback: text stable = done

      if (currentText !== lastText) {
        lastText = currentText
        stableCount = 0
        // Send chunk to background
        chrome.runtime.sendMessage({
          type: 'NEXUS_RESPONSE_CHUNK',
          providerId: this.providerId,
          chunk: currentText,
          done: false
        })
      } else if (!stillStreaming) {
        stableCount++
        if (stableCount >= 3) {
          // Done
          clearInterval(checkInterval)
          this.isStreaming = false
          chrome.runtime.sendMessage({
            type: 'NEXUS_RESPONSE_DONE',
            providerId: this.providerId,
            text: currentText
          })
        }
      }
    }, 300)

    // Safety timeout: 3 minutes
    setTimeout(() => {
      if (checkInterval) clearInterval(checkInterval)
    }, 180000)
  }

  waitForElement(selector, timeout = 3000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector)
      if (el) { resolve(el); return }

      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector)
        if (found) { observer.disconnect(); resolve(found) }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      setTimeout(() => { observer.disconnect(); resolve(null) }, timeout)
    })
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
}
