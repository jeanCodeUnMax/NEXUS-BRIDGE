const PROVIDERS = [
  { id: 'chatgpt-free', name: 'ChatGPT', icon: '🤖', url: 'https://chatgpt.com' },
  { id: 'claude-free', name: 'Claude.ai', icon: '🔮', url: 'https://claude.ai' },
  { id: 'gemini-free', name: 'Gemini', icon: '✨', url: 'https://gemini.google.com' },
  { id: 'mistral-free', name: 'Mistral Le Chat', icon: '🌊', url: 'https://chat.mistral.ai' },
  { id: 'perplexity-free', name: 'Perplexity', icon: '🔍', url: 'https://www.perplexity.ai' }
]

async function renderProviders() {
  // Lire les tabs depuis chrome.storage.session (persistant)
  const data = await chrome.storage.session.get('providerTabs')
  const providerTabs = data.providerTabs || {}
  const activeTabs = Object.keys(providerTabs)

  const list = document.getElementById('providers-list')
  list.innerHTML = ''

  // Vérifier chaque tab enregistrée pour voir si elle existe encore
  for (const p of PROVIDERS) {
    const tabId = providerTabs[p.id]
    let isActive = false
    let statusText = 'Ouvrir'

    if (tabId) {
      try {
        await chrome.tabs.get(tabId)
        isActive = true
        statusText = '✓'
      } catch {
        // Tab n'existe plus, nettoyer
        delete providerTabs[p.id]
        statusText = 'Ouvrir'
      }
    }

    const div = document.createElement('div')
    div.className = 'provider'
    div.innerHTML = `
      <span>${p.icon}</span>
      <span class="dot ${isActive ? 'active' : 'inactive'}"></span>
      <span class="name">${p.name}</span>
      <a href="${p.url}" target="_blank" style="font-size:10px;color:#5d6a7e;">${statusText}</a>
    `
    list.appendChild(div)
  }

  // Sauvegarder les éventuels nettoyages
  await chrome.storage.session.set({ providerTabs })
}

// Lancer le rendu
renderProviders()
