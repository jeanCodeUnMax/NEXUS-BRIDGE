/**
 * NEXUS Bridge — Background Service Worker
 * Coordinates tab management and message routing between app and content scripts.
 * 
 * Utilise chrome.storage.session pour persister les tabs enregistrées
 * même quand le Service Worker se met en veille (MV3).
 */

// --- Gestion persistante des tabs via chrome.storage.session ---

async function getProviderTabs() {
  const data = await chrome.storage.session.get('providerTabs')
  return data.providerTabs || {}
}

async function setProviderTab(providerId, tabId) {
  const tabs = await getProviderTabs()
  tabs[providerId] = tabId
  await chrome.storage.session.set({ providerTabs: tabs })
  console.log(`[NEXUS BG] Registered ${providerId} → tab ${tabId}`)
}

async function removeProviderTab(providerId) {
  const tabs = await getProviderTabs()
  delete tabs[providerId]
  await chrome.storage.session.set({ providerTabs: tabs })
  console.log(`[NEXUS BG] Unregistered ${providerId}`)
}

async function removeProviderByTabId(tabId) {
  const tabs = await getProviderTabs()
  let removed = false
  for (const [providerId, tid] of Object.entries(tabs)) {
    if (tid === tabId) {
      delete tabs[providerId]
      console.log(`[NEXUS BG] Tab closed, unregistered ${providerId}`)
      removed = true
    }
  }
  if (removed) await chrome.storage.session.set({ providerTabs: tabs })
}

// --- Message Router ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {

    case 'NEXUS_REGISTER_TAB':
      setProviderTab(msg.providerId, sender.tab.id)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }))
      return true

    case 'NEXUS_SEND_PROMPT':
      handleSendPrompt(msg, sendResponse)
      return true

    case 'NEXUS_SEND':
      handleSend(msg, sendResponse)
      return true

    case 'NEXUS_GET_ACTIVE_TABS':
      getProviderTabs()
        .then(tabs => sendResponse({ tabs: Object.keys(tabs) }))
        .catch(() => sendResponse({ tabs: [] }))
      return true

    case 'NEXUS_HEALTH_CHECK':
      handleHealthCheck(msg, sendResponse)
      return true

    case 'NEXUS_HEARTBEAT':
      // Keep-alive depuis un content script
      if (sender.tab && msg.providerId) {
        setProviderTab(msg.providerId, sender.tab.id)
          .then(() => sendResponse({ ok: true }))
          .catch(() => sendResponse({ ok: false }))
      } else {
        sendResponse({ ok: true })
      }
      return true

    case 'NEXUS_RESPONSE_DONE':
      // Relayer la réponse vers tous les onglets localhost
      chrome.tabs.query({ url: 'http://localhost:*/*' }, tabs => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'NEXUS_RESPONSE_DONE',
            providerId: msg.providerId,
            text: msg.text
          }).catch(() => {})
        })
      })
      sendResponse({ ok: true })
      return true
  }
})

async function handleHealthCheck(msg, sendResponse) {
  const { providerId, selectors } = msg
  const tabs = await getProviderTabs()
  const tabId = tabs[providerId]

  if (!tabId) {
    sendResponse({ ok: false, status: 'no_tab', error: 'Aucun onglet enregistré — ouvrez le site dans Chrome' })
    return
  }

  try {
    await chrome.tabs.get(tabId)
  } catch {
    await removeProviderTab(providerId)
    sendResponse({ ok: false, status: 'tab_closed', error: 'Onglet fermé — rouvrez le site' })
    return
  }

  // Ask content script to probe selectors
  try {
    chrome.tabs.sendMessage(tabId, {
      type: 'NEXUS_PROBE_SELECTORS',
      selectors
    }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, status: 'cs_error', error: chrome.runtime.lastError.message })
      } else {
        sendResponse(response || { ok: false, status: 'no_response' })
      }
    })
  } catch (err) {
    sendResponse({ ok: false, status: 'cs_error', error: err.message })
  }
}

async function handleSendPrompt(msg, sendResponse) {
  const { providerId, prompt } = msg
  const tabs = await getProviderTabs()
  const tabId = tabs[providerId]
  if (!tabId) { sendResponse({ ok: false, error: `No tab for ${providerId}` }); return }
  try { await chrome.tabs.get(tabId) } catch { await removeProviderTab(providerId); sendResponse({ ok: false, error: 'Tab closed' }); return }
  chrome.tabs.sendMessage(tabId, { type: 'INJECT_PROMPT', prompt }, (response) => {
    if (chrome.runtime.lastError) sendResponse({ ok: false, error: chrome.runtime.lastError.message })
    else sendResponse(response || { ok: true })
  })
}

async function handleSend(msg, sendResponse) {
  const { providerId, text, selectors } = msg
  const tabs = await getProviderTabs()
  const tabId = tabs[providerId]
  if (!tabId) { sendResponse({ ok: false, error: `No tab for ${providerId}` }); return }
  try { await chrome.tabs.get(tabId) } catch { await removeProviderTab(providerId); sendResponse({ ok: false, error: 'Tab closed' }); return }
  chrome.tabs.sendMessage(tabId, { type: 'INJECT_PROMPT', prompt: text, selectors }, (response) => {
    if (chrome.runtime.lastError) sendResponse({ ok: false, error: chrome.runtime.lastError.message })
    else sendResponse(response || { ok: true })
  })
}

// Nettoyage quand un onglet est fermé
chrome.tabs.onRemoved.addListener((tabId) => {
  removeProviderByTabId(tabId)
})
