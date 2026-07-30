/**
 * NEXUS Bridge — Snapshot Manager
 * Export / Import all localStorage state as a portable JSON file
 */

const NEXUS_KEYS = [
  'nexus_projects',
  'nexus_sessions',
  'nexus_messages',
  'nexus_api_keys',
  'nexus_active_providers',
  'nexus_provider_models',
  'nexus_custom_selectors',
  'nexus_routing_targets',
  'nexus_provider_prompts',
  'nexus_last_project',
  'nexus_last_session',
]

export function exportSnapshot() {
  const snapshot = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    app: 'NEXUS Bridge',
    data: {}
  }

  for (const key of NEXUS_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      try {
        snapshot.data[key] = JSON.parse(raw)
      } catch {
        snapshot.data[key] = raw
      }
    }
  }

  // Stats
  const projects = snapshot.data['nexus_projects'] || []
  const sessions = snapshot.data['nexus_sessions'] || []
  const messages = snapshot.data['nexus_messages'] || {}
  const totalMessages = Object.values(messages).reduce((acc, arr) => acc + (arr?.length || 0), 0)

  snapshot.stats = {
    projects: projects.length,
    sessions: sessions.length,
    total_messages: totalMessages,
  }

  return snapshot
}

export function downloadSnapshot() {
  const snapshot = exportSnapshot()
  const json = JSON.stringify(snapshot, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `nexus-snapshot-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
  return snapshot.stats
}

export function importSnapshot(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const snapshot = JSON.parse(e.target.result)

        if (!snapshot.data || snapshot.app !== 'NEXUS Bridge') {
          reject(new Error('Fichier invalide — ce n\'est pas un snapshot NEXUS Bridge'))
          return
        }

        // Write all keys to localStorage
        for (const [key, value] of Object.entries(snapshot.data)) {
          localStorage.setItem(key, JSON.stringify(value))
        }

        resolve({
          imported_at: snapshot.exported_at,
          stats: snapshot.stats || {}
        })
      } catch (err) {
        reject(new Error('Impossible de lire le fichier : ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
    reader.readAsText(file)
  })
}

export function clearAllData() {
  for (const key of NEXUS_KEYS) {
    localStorage.removeItem(key)
  }
}

// Generate a human-readable summary for Ollama/MCP context
export function generateContextSummary() {
  const snapshot = exportSnapshot()
  const { data, stats } = snapshot

  const projects = data['nexus_projects'] || []
  const sessions = data['nexus_sessions'] || []
  const messages = data['nexus_messages'] || {}
  const providerModels = data['nexus_provider_models'] || {}
  const providerPrompts = data['nexus_provider_prompts'] || {}

  let summary = `# NEXUS Bridge — Résumé de contexte\n`
  summary += `Exporté le : ${new Date().toLocaleString('fr-FR')}\n\n`
  summary += `## Stats globales\n`
  summary += `- ${stats.projects} projet(s)\n`
  summary += `- ${stats.sessions} session(s)\n`
  summary += `- ${stats.total_messages} message(s) total\n\n`

  summary += `## Projets\n`
  for (const p of projects) {
    const projectSessions = sessions.filter(s => s.projectId === p.id)
    summary += `### ${p.name}\n`
    if (p.systemPrompt) summary += `Prompt système : ${p.systemPrompt.slice(0, 200)}${p.systemPrompt.length > 200 ? '…' : ''}\n`
    summary += `Sessions : ${projectSessions.length}\n`
    for (const s of projectSessions) {
      const msgs = messages[s.id] || []
      summary += `  - "${s.name}" — ${msgs.length} messages\n`
      // Last user message
      const lastUser = [...msgs].reverse().find(m => m.role === 'user')
      if (lastUser) summary += `    Dernier message : ${lastUser.content.slice(0, 100)}…\n`
    }
    summary += '\n'
  }

  if (Object.keys(providerPrompts).some(k => providerPrompts[k])) {
    summary += `## Prompts par provider\n`
    for (const [id, prompt] of Object.entries(providerPrompts)) {
      if (prompt) summary += `- ${id} : ${prompt.slice(0, 100)}\n`
    }
    summary += '\n'
  }

  return summary
}
