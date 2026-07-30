/**
 * NEXUS Bridge — Communication Module
 * Centralise toute la communication entre l'app web et l'extension Chrome
 * via le pont window.postMessage ↔ content script ↔ background.
 * 
 * L'app ne peut PAS appeler chrome.runtime.sendMessage directement.
 * Ce module gère :
 *  - Détection de l'extension (handshake bidirectionnel PING/READY)
 *  - Envoi de messages avec callback
 *  - Réception des réponses asynchrones (NEXUS_RESPONSE_DONE)
 *  - Watchdog de déconnexion
 */

const NEXUS_CHANNEL = 'NEXUS_BRIDGE'
let _bridgeDetected = false
let _lastReadyTimestamp = 0
let _pendingCallbacks = new Map() // requestId → { resolve, reject, timeout }
let _responseListeners = [] // Array de callbacks pour NEXUS_RESPONSE_DONE
let _extensionListeners = [] // Array de callbacks pour changement d'état extension

// Initialiser l'écoute des messages du bridge
function _initListener() {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (!event.data || event.data.channel !== NEXUS_CHANNEL) return

    // Bridge détecté — accepte READY avec ou sans direction
    if (event.data.type === 'NEXUS_BRIDGE_READY') {
      _lastReadyTimestamp = Date.now()
      const wasDetected = _bridgeDetected
      _bridgeDetected = true
      if (!wasDetected) {
        console.log('[NEXUS] Extension bridge détectée ✓')
        _extensionListeners.forEach(cb => cb(true))
      }
      return
    }

    // Les autres messages doivent venir du content script (direction: to-app)
    if (event.data.direction !== 'to-app') return

    // Réponse à un message avec requestId
    if (event.data.type === 'NEXUS_RESPONSE' && event.data.requestId) {
      const pending = _pendingCallbacks.get(event.data.requestId)
      if (pending) {
        clearTimeout(pending.timeout)
        _pendingCallbacks.delete(event.data.requestId)
        if (event.data.error) {
          pending.reject(new Error(event.data.error))
        } else {
          pending.resolve(event.data.response)
        }
      }
      return
    }

    // Réponse complète d'un provider DOM
    if (event.data.type === 'NEXUS_RESPONSE_DONE') {
      _responseListeners.forEach(cb => cb({
        providerId: event.data.providerId,
        text: event.data.text
      }))
      return
    }
  })
}

// Envoyer un PING au content script pour déclencher un READY
function _sendPing() {
  window.postMessage({
    channel: NEXUS_CHANNEL,
    type: 'NEXUS_BRIDGE_PING'
  }, '*')
}

// Probe actif au démarrage : envoyer des PING rapidement
// Si le content script est déjà là, il répondra READY immédiatement
function _startProbe() {
  _sendPing() // Premier ping immédiat
  let probeCount = 0
  const probeInterval = setInterval(() => {
    if (_bridgeDetected) {
      clearInterval(probeInterval)
      return
    }
    _sendPing()
    probeCount++
    if (probeCount >= 10) clearInterval(probeInterval) // 10 × 500ms = 5s
  }, 500)
}

// Watchdog : détecter si l'extension se déconnecte (plus de READY depuis 15s)
function _startWatchdog() {
  setInterval(() => {
    if (_bridgeDetected && _lastReadyTimestamp > 0) {
      const elapsed = Date.now() - _lastReadyTimestamp
      if (elapsed > 15000) {
        console.warn('[NEXUS] Extension bridge perdue — pas de heartbeat depuis 15s')
        _bridgeDetected = false
        _extensionListeners.forEach(cb => cb(false))
        // Relancer le probe pour tenter de reconnecter
        _startProbe()
      }
    }
  }, 5000)
}

// Initialiser au chargement du module
_initListener()
_startProbe()
_startWatchdog()

/**
 * Vérifie si l'extension bridge est détectée
 */
export function isBridgeDetected() {
  return _bridgeDetected
}

/**
 * Envoie un message à l'extension et attend la réponse
 * @param {string} type - Type de message (ex: 'NEXUS_HEALTH_CHECK')
 * @param {object} payload - Données du message
 * @param {number} timeoutMs - Timeout en ms (défaut: 8000)
 * @returns {Promise<object>} Réponse de l'extension
 */
export function sendToExtension(type, payload = {}, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!_bridgeDetected) {
      reject(new Error('Extension NEXUS non détectée'))
      return
    }

    const requestId = crypto.randomUUID()

    const timeout = setTimeout(() => {
      _pendingCallbacks.delete(requestId)
      reject(new Error('Timeout — pas de réponse de l\'extension'))
    }, timeoutMs)

    _pendingCallbacks.set(requestId, { resolve, reject, timeout })

    window.postMessage({
      channel: NEXUS_CHANNEL,
      direction: 'to-extension',
      type,
      payload,
      requestId
    }, '*')
  })
}

/**
 * Enregistre un listener pour les réponses complètes des providers DOM
 * @param {function} callback - Reçoit { providerId, text }
 * @returns {function} Fonction pour se désabonner
 */
export function onDomResponse(callback) {
  _responseListeners.push(callback)
  return () => {
    _responseListeners = _responseListeners.filter(cb => cb !== callback)
  }
}

/**
 * Enregistre un listener pour les changements d'état de l'extension
 * @param {function} callback - Reçoit (isDetected: boolean)
 * @returns {function} Fonction pour se désabonner
 */
export function onExtensionChange(callback) {
  _extensionListeners.push(callback)
  return () => {
    _extensionListeners = _extensionListeners.filter(cb => cb !== callback)
  }
}

/**
 * Attend que le bridge soit détecté (avec timeout)
 * @param {number} timeoutMs - Temps max d'attente
 * @returns {Promise<boolean>}
 */
export function waitForBridge(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (_bridgeDetected) { resolve(true); return }

    const timer = setTimeout(() => {
      unsub()
      resolve(false)
    }, timeoutMs)

    const unsub = onExtensionChange((detected) => {
      if (detected) {
        clearTimeout(timer)
        unsub()
        resolve(true)
      }
    })
  })
}

/**
 * Demande la liste des tabs actives au background
 * @returns {Promise<string[]>} Liste des provider IDs actifs
 */
export async function getActiveTabs() {
  try {
    const response = await sendToExtension('NEXUS_GET_ACTIVE_TABS', {}, 3000)
    return response?.tabs || []
  } catch {
    return []
  }
}

/**
 * Lance un health check pour un provider DOM
 * @param {string} providerId
 * @param {object} selectors
 * @returns {Promise<object>}
 */
export async function healthCheck(providerId, selectors) {
  return sendToExtension('NEXUS_HEALTH_CHECK', { providerId, selectors }, 5000)
}

/**
 * Envoie un prompt à un provider DOM
 * @param {string} providerId
 * @param {string} text
 * @param {object} selectors
 * @returns {Promise<object>}
 */
export async function sendPrompt(providerId, text, selectors) {
  return sendToExtension('NEXUS_SEND', { providerId, text, selectors }, 10000)
}

