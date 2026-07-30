/**
 * NEXUS Bridge — Export Utility
 * Exports full conversation with thinking/metadata as Markdown or JSON
 */

export function exportAsMarkdown(project, session, messages) {
  const date = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const lines = []

  lines.push(`# 🧠 NEXUS Bridge — Export`)
  lines.push(``)
  lines.push(`**Projet :** ${project.name}`)
  lines.push(`**Session :** ${session.name}`)
  lines.push(`**Exporté le :** ${date}`)
  lines.push(`**Providers utilisés :** ${[...new Set(messages.filter(m => m.provider).map(m => m.provider))].join(', ') || 'N/A'}`)
  lines.push(`**Messages :** ${messages.length}`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  if (project.systemPrompt) {
    lines.push(`## ⚙️ System Prompt`)
    lines.push(``)
    lines.push(`> ${project.systemPrompt.replace(/\n/g, '\n> ')}`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
  }

  lines.push(`## 💬 Conversation`)
  lines.push(``)

  for (const msg of messages) {
    const roleLabel = msg.role === 'user' ? '👤 **Utilisateur**' : `🤖 **${msg.provider || 'Assistant'}**`
    const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('fr-FR') : ''
    lines.push(`### ${roleLabel}${ts ? ` · ${ts}` : ''}`)
    lines.push(``)

    if (msg.thinking) {
      lines.push(`<details>`)
      lines.push(`<summary>💭 Thinking (${msg.thinkingDuration || '?'}ms)</summary>`)
      lines.push(``)
      lines.push(`\`\`\``)
      lines.push(msg.thinking)
      lines.push(`\`\`\``)
      lines.push(``)
      lines.push(`</details>`)
      lines.push(``)
    }

    lines.push(msg.content)
    lines.push(``)

    if (msg.metadata) {
      const meta = []
      if (msg.metadata.tokens) meta.push(`tokens: ${msg.metadata.tokens}`)
      if (msg.metadata.duration) meta.push(`durée: ${msg.metadata.duration}ms`)
      if (meta.length) lines.push(`*${meta.join(' · ')}*`)
      lines.push(``)
    }

    lines.push(`---`)
    lines.push(``)
  }

  return lines.join('\n')
}

export function exportAsJSON(project, session, messages) {
  return JSON.stringify({
    nexus_bridge_export: true,
    version: '1.0',
    exported_at: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      systemPrompt: project.systemPrompt,
      createdAt: project.createdAt
    },
    session: {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      providerIds: session.providerIds
    },
    messages
  }, null, 2)
}

export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generateFilename(project, session, ext) {
  const date = new Date().toISOString().slice(0, 10)
  const pName = project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const sName = session.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  return `nexus-${pName}-${sName}-${date}.${ext}`
}
