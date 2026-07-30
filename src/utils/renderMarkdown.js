/**
 * Lightweight Markdown renderer (no external deps)
 */
export function renderMarkdown(text) {
  if (!text) return ''

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Code blocks (before inline)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`
  )

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold / italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

  // HR
  html = html.replace(/^---$/gm, '<hr>')

  // Tables
  html = html.replace(/(\|.+\|\n)((?:\|[-:]+)+\|\n)((?:\|.+\|\n?)+)/g, (_, header, sep, body) => {
    const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('')
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
  })

  // Lists
  html = html.replace(/^(\s*[-*+] .+(\n\s*[-*+] .+)*)/gm, match => {
    const items = match.split('\n').filter(l => l.trim()).map(l => `<li>${l.replace(/^\s*[-*+] /, '').trim()}</li>`).join('')
    return `<ul>${items}</ul>`
  })

  html = html.replace(/^(\s*\d+\. .+(\n\s*\d+\. .+)*)/gm, match => {
    const items = match.split('\n').filter(l => l.trim()).map(l => `<li>${l.replace(/^\s*\d+\. /, '').trim()}</li>`).join('')
    return `<ol>${items}</ol>`
  })

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  // Paragraphs (double newlines)
  html = html.replace(/\n\n+/g, '</p><p>')
  html = html.replace(/\n/g, '<br>')
  html = `<p>${html}</p>`

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p>(<(?:h[1-3]|ul|ol|pre|blockquote|hr|table)[^>]*>)/g, '$1')
  html = html.replace(/(<\/(?:h[1-3]|ul|ol|pre|blockquote|hr|table)>)<\/p>/g, '$1')

  return html
}
