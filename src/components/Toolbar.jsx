import { Download, FileText, Trash2, LayoutGrid, MessageSquare } from 'lucide-react'
import { exportAsMarkdown, exportAsJSON, downloadFile, generateFilename } from '../utils/exportConversation'

export default function Toolbar({ project, session, messages, onClearMessages, viewMode, onToggleView }) {
  const canExport = project && session && messages.length > 0

  function handleExportMD() {
    if (!canExport) return
    const content = exportAsMarkdown(project, session, messages)
    const filename = generateFilename(project, session, 'md')
    downloadFile(content, filename, 'text/markdown')
  }

  function handleExportJSON() {
    if (!canExport) return
    const content = exportAsJSON(project, session, messages)
    const filename = generateFilename(project, session, 'json')
    downloadFile(content, filename, 'application/json')
  }

  function handleClear() {
    if (!session) return
    if (confirm('Effacer tous les messages de cette session ?')) {
      onClearMessages()
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-1)',
      minHeight: 38
    }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, minWidth: 0 }}>
        {project ? (
          <>
            <span style={{ color: 'var(--text-2)' }}>📁</span>
            <span style={{ color: 'var(--text-1)', fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
            {session && (
              <>
                <span style={{ color: 'var(--border-bright)' }}>›</span>
                <span style={{ color: 'var(--text-0)', fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.name}</span>
              </>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--text-2)', fontSize: 11 }}>Sélectionnez un projet</span>
        )}
        {messages.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-2)', marginLeft: 4 }}>
            ({messages.length} messages)
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={handleExportMD}
          disabled={!canExport}
          title="Exporter en Markdown (avec thinking)"
          style={toolBtn(!canExport)}
        >
          <FileText size={13} />
          <span style={{ fontSize: 11 }}>MD</span>
        </button>
        <button
          onClick={handleExportJSON}
          disabled={!canExport}
          title="Exporter en JSON"
          style={toolBtn(!canExport)}
        >
          <Download size={13} />
          <span style={{ fontSize: 11 }}>JSON</span>
        </button>
        <div style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />
        <button
          onClick={onToggleView}
          disabled={!session || messages.length === 0}
          title={viewMode === 'grid' ? 'Vue chat' : 'Vue grille (comparaison)'}
          style={{
            ...toolBtn(!session || messages.length === 0),
            border: viewMode === 'grid' ? '1px solid var(--accent)' : undefined,
            color: viewMode === 'grid' ? 'var(--accent)' : undefined,
          }}
        >
          {viewMode === 'grid' ? <MessageSquare size={13} /> : <LayoutGrid size={13} />}
          <span style={{ fontSize: 11 }}>{viewMode === 'grid' ? 'Chat' : 'Grille'}</span>
        </button>
        <div style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />
        <button
          onClick={handleClear}
          disabled={!session || messages.length === 0}
          title="Effacer les messages"
          style={toolBtn(!session || messages.length === 0, true)}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function toolBtn(disabled, danger = false) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'var(--bg-2)',
    border: `1px solid ${danger && !disabled ? '#3d1a1a' : 'var(--border)'}`,
    borderRadius: 5, padding: '4px 8px',
    color: disabled ? 'var(--text-2)' : danger ? 'var(--danger)' : 'var(--text-1)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontSize: 12, transition: 'all 0.1s'
  }
}
