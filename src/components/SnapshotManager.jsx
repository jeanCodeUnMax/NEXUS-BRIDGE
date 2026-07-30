import { useState, useRef } from 'react'
import { downloadSnapshot, importSnapshot, clearAllData, generateContextSummary } from '../utils/snapshot'
import { Download, Upload, Trash2, FileText, Copy, Check } from 'lucide-react'

export default function SnapshotManager({ onImported }) {
  const [status, setStatus] = useState(null) // { type: 'success'|'error'|'info', msg }
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef(null)

  function handleExport() {
    const stats = downloadSnapshot()
    setStatus({ type: 'success', msg: `Snapshot exporté — ${stats.projects} projet(s), ${stats.total_messages} message(s)` })
    setTimeout(() => setStatus(null), 3000)
  }

  function handleImportClick() {
    fileRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await importSnapshot(file)
      setStatus({ type: 'success', msg: `Snapshot importé (${result.imported_at?.slice(0,10)}) — rechargement…` })
      setTimeout(() => { onImported?.(); window.location.reload() }, 1200)
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
      setTimeout(() => setStatus(null), 4000)
    }
    e.target.value = ''
  }

  function handleClear() {
    clearAllData()
    setShowConfirmClear(false)
    setStatus({ type: 'info', msg: 'Données effacées — rechargement…' })
    setTimeout(() => window.location.reload(), 1000)
  }

  function handleSummary() {
    const s = generateContextSummary()
    setSummary(s)
    setShowSummary(true)
  }

  function handleCopy() {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-0)'
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.08em', marginBottom: 7 }}>
          💾 SNAPSHOT
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Export */}
          <button onClick={handleExport} style={btn('#4a9eff')}>
            <Download size={11} /> Exporter snapshot
          </button>

          {/* Import */}
          <button onClick={handleImportClick} style={btn('#7c4dff')}>
            <Upload size={11} /> Importer snapshot
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />

          {/* Context summary for Ollama */}
          <button onClick={handleSummary} style={btn('#10a37f')}>
            <FileText size={11} /> Résumé contexte (Ollama)
          </button>

          {/* Clear */}
          {!showConfirmClear ? (
            <button onClick={() => setShowConfirmClear(true)} style={btn('#ef4444', true)}>
              <Trash2 size={11} /> Effacer tout
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleClear} style={{ ...btn('#ef4444'), flex: 1, fontSize: 10 }}>
                ✓ Confirmer
              </button>
              <button onClick={() => setShowConfirmClear(false)} style={{ ...btn(), flex: 1, fontSize: 10 }}>
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Status message */}
        {status && (
          <div style={{
            marginTop: 7, padding: '5px 8px', borderRadius: 4, fontSize: 10,
            background: status.type === 'success' ? '#0a1f0a' : status.type === 'error' ? '#1f0a0a' : '#0a1220',
            border: `1px solid ${status.type === 'success' ? '#2d5a2d' : status.type === 'error' ? '#5a2d2d' : '#1e3a5f'}`,
            color: status.type === 'success' ? '#86efac' : status.type === 'error' ? '#fca5a5' : '#7ab3d4'
          }}>
            {status.msg}
          </div>
        )}
      </div>

      {/* Summary modal */}
      {showSummary && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000000aa',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={e => { if (e.target === e.currentTarget) setShowSummary(false) }}>
          <div style={{
            background: 'var(--bg-1)', border: '1px solid var(--border-bright)',
            borderRadius: 10, width: 600, maxWidth: '95vw', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 60px #000000cc'
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-0)' }}>📋 Résumé de contexte</div>
                <div style={{ fontSize: 10, color: 'var(--text-2)' }}>À coller dans un prompt Ollama ou MCP</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleCopy} style={{
                  padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11,
                  border: '1px solid var(--border)', background: 'var(--bg-2)',
                  color: copied ? '#4caf50' : 'var(--text-1)',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <button onClick={() => setShowSummary(false)} style={{
                  background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 16
                }}>✕</button>
              </div>
            </div>
            <pre style={{
              flex: 1, overflowY: 'auto', padding: '12px 14px',
              margin: 0, fontSize: 11, color: 'var(--text-1)',
              fontFamily: 'var(--font-mono)', lineHeight: 1.7,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {summary}
            </pre>
          </div>
        </div>
      )}
    </>
  )
}

function btn(color, danger = false) {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', borderRadius: 5, cursor: 'pointer',
    border: `1px solid ${color ? color + '44' : 'var(--border)'}`,
    background: color ? color + '11' : 'var(--bg-2)',
    color: color || 'var(--text-1)',
    fontSize: 11, fontWeight: 500, width: '100%',
    transition: 'all 0.12s'
  }
}
