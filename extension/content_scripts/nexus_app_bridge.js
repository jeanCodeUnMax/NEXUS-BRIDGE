/**
 * NEXUS Bridge — App Bridge Content Script
 * Injecté sur localhost pour servir de pont entre l'app web et l'extension Chrome.
 * 
 * L'app web ne peut PAS utiliser chrome.runtime.sendMessage directement
 * (elle n'est pas une page de l'extension). Ce script fait le relais :
 *   App (window.postMessage) → Content Script (chrome.runtime.sendMessage) → Background
 *   Background → Content Script (window.postMessage) → App
 * 
 * Handshake bidirectionnel :
 *   - Le CS envoie NEXUS_BRIDGE_READY en burst au démarrage
 *   - L'app peut envoyer NEXUS_BRIDGE_PING → le CS répond NEXUS_BRIDGE_READY
 *   - Élimine toute race condition de timing
 */

(function () {
  const NEXUS_CHANNEL = 'NEXUS_BRIDGE'

  function sendReady() {
    window.postMessage({
      channel: NEXUS_CHANNEL,
      type: 'NEXUS_BRIDGE_READY',
      direction: 'to-app'
    }, '*')
  }

  // Burst initial : envoyer READY toutes les 500ms pendant 5 secondes
  // pour être sûr que l'app React le capte même si elle charge après
  sendReady()
  let burstCount = 0
  const burstInterval = setInterval(() => {
    sendReady()
    burstCount++
    if (burstCount >= 10) clearInterval(burstInterval) // 10 × 500ms = 5s
  }, 500)

  console.log('[NEXUS App Bridge] Content script injecté sur', location.href)

  // Écouter les messages de l'app web
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (!event.data || event.data.channel !== NEXUS_CHANNEL) return

    // Répondre aux PING de l'app → handshake bidirectionnel
    if (event.data.type === 'NEXUS_BRIDGE_PING') {
      sendReady()
      return
    }

    // Seuls les messages to-extension sont relayés au background
    if (event.data.direction !== 'to-extension') return

    const { type, payload, requestId } = event.data

    // Relayer vers le background de l'extension
    chrome.runtime.sendMessage({ type, ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        window.postMessage({
          channel: NEXUS_CHANNEL,
          direction: 'to-app',
          type: 'NEXUS_RESPONSE',
          requestId,
          error: chrome.runtime.lastError.message,
          response: null
        }, '*')
        return
      }
      window.postMessage({
        channel: NEXUS_CHANNEL,
        direction: 'to-app',
        type: 'NEXUS_RESPONSE',
        requestId,
        response
      }, '*')
    })
  })

  // Écouter les messages du background (ex: NEXUS_RESPONSE_DONE)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'NEXUS_RESPONSE_DONE') {
      window.postMessage({
        channel: NEXUS_CHANNEL,
        direction: 'to-app',
        type: 'NEXUS_RESPONSE_DONE',
        providerId: msg.providerId,
        text: msg.text
      }, '*')
      sendResponse({ ok: true })
    }
    return true
  })

  // Heartbeat régulier : toutes les 5s (réduit de 10s)
  setInterval(() => {
    sendReady()
  }, 5000)
})()
