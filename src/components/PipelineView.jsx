import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { renderMarkdown } from '../utils/renderMarkdown'
import providersConfig from '../providers/providers-config.json'

const ALL_PROVIDERS = [...providersConfig.api, ...providersConfig.dom_bridge]

function StepResult({ result, index }) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const provider = ALL_PROVIDERS.find(p => p.id === result.providerId)

  function copy() {
    navigator.clipboard.writeText(result.response || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const statusColor = result.status === 'done' ? '#4caf50'
    : result.status === 'running' ? '#f59e0b'
    : result.status === 'error' ? '#ef4444'
    : 'var(--text-2)'

  return (
    <div style={{
      border: `1px solid ${provider?.color ? provider.color + '44' : 'var(--border)'}`,
      borderRadius: 8, marginBottom: 8, overflow: 'hidden', background: 'var(--bg-1)'
    }}>
      {/* Step header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: provider?.color ? provider.color + '0d' : 'transparent' }}
        onClick={() => setExpanded(e => !e)}>
        {/* Step number */}
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: provider?.color ? provider.color + '33' : 'var(--bg-3)',
          border: `2px solid ${statusColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: statusColor
        }}>
          {result.status === 'running' ? '⟳' : result.status === 'error' ? '✕' : index + 1}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {result.role}
            {result.loop > 0 && (
              <span style={{ fontSize: 9, color: '#f59e0b', background: '#f59e0b22', border: '1px solid #f59e0b44', borderRadius: 3, padding: '0 5px' }}>
                🔁 boucle {result.loop}
              </span>
            )}
            {result.score !== null && result.score !== undefined && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                background: result.score >= 7 ? '#1a3a1a' : result.score >= 5 ? '#2d2010' : '#2d0a0a',
                border: `1px solid ${result.score >= 7 ? '#4caf50' : result.score >= 5 ? '#f59e0b' : '#ef4444'}`,
                color: result.score >= 7 ? '#4caf50' : result.score >= 5 ? '#f59e0b' : '#ef4444'
              }}>
                {result.score}/10
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-2)' }}>
            {provider ? `${provider.icon} ${provider.name}` : result.providerId}
            {result.duration && <span style={{ marginLeft: 8 }}>{(result.duration / 1000).toFixed(1)}s</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {result.response && (
            <button onClick={e => { e.stopPropagation(); copy() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
              {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} color="var(--text-2)" />}
            </button>
          )}
          {expanded ? <ChevronUp size={12} color="var(--text-2)" /> : <ChevronDown size={12} color="var(--text-2)" />}
        </div>
      </div>

      {/* Response */}
      {expanded && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
          {result.status === 'running' && !result.response && (
            <div style={{ display: 'flex', gap: 5, padding: '8px 0', alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: provider?.color || 'var(--accent)', animation: 'pulse-dot 1s ease-in-out 0s infinite' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: provider?.color || 'var(--accent)', animation: 'pulse-dot 1s ease-in-out 0.2s infinite' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: provider?.color || 'var(--accent)', animation: 'pulse-dot 1s ease-in-out 0.4s infinite' }} />
            </div>
          )}

          {result.response && (
            <div className="md-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(result.response) }}
              style={{ fontSize: 12, color: 'var(--text-0)', lineHeight: 1.7 }}
            />
          )}

          {result.error && (
            <div style={{ padding: '6px 10px', background: '#2d0a0a', border: '1px solid var(--danger)', borderRadius: 5, fontSize: 11, color: '#fca5a5' }}>
              ❌ {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PipelineView({ results, manifesto, pipelineStatus, objective }) {
  const [showManifesto, setShowManifesto] = useState(false)
  const [copiedManifesto, setCopiedManifesto] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [results])

  const statusColors = { idle: 'var(--text-2)', running: '#f59e0b', done: '#4caf50', stopped: '#ef4444' }
  const statusLabels = { idle: 'En attente', running: '⟳ En cours…', done: '✓ Terminé', stopped: '⚠ Arrêté' }

  const lastScore = [...results].reverse().find(r => r.score !== null && r.score !== undefined)?.score

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Pipeline status bar */}
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-0)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: statusColors[pipelineStatus] }}>
            {statusLabels[pipelineStatus]}
          </div>
          {objective && (
            <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
              🎯 {objective}
            </div>
          )}
        </div>

        {lastScore !== undefined && lastScore !== null && (
          <div style={{
            padding: '4px 10px', borderRadius: 5, fontWeight: 700, fontSize: 12,
            background: lastScore >= 7 ? '#1a3a1a' : lastScore >= 5 ? '#2d2010' : '#2d0a0a',
            border: `1px solid ${lastScore >= 7 ? '#4caf50' : lastScore >= 5 ? '#f59e0b' : '#ef4444'}`,
            color: lastScore >= 7 ? '#4caf50' : lastScore >= 5 ? '#f59e0b' : '#ef4444'
          }}>
            Score final : {lastScore}/10
          </div>
        )}

        <button onClick={() => setShowManifesto(m => !m)} style={{
          padding: '4px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 10,
          border: `1px solid ${showManifesto ? 'var(--accent)' : 'var(--border)'}`,
          background: showManifesto ? 'var(--accent)22' : 'var(--bg-2)',
          color: showManifesto ? 'var(--accent)' : 'var(--text-1)'
        }}>
          📋 Manifeste {manifesto ? `(${manifesto.length} car.)` : '(vide)'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 0 }}>
        {/* Results */}
        <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-2)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
              <div style={{ fontSize: 12 }}>Configurez votre pipeline et lancez-le</div>
            </div>
          ) : (
            results.map((r, i) => <StepResult key={r.id} result={r} index={i} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Manifesto panel */}
        {showManifesto && (
          <div style={{
            width: 320, borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', background: 'var(--bg-1)', flexShrink: 0
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>📋 Manifeste partagé</span>
              <button onClick={() => { navigator.clipboard.writeText(manifesto); setCopiedManifesto(true); setTimeout(() => setCopiedManifesto(false), 1500) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedManifesto ? '#4caf50' : 'var(--text-2)' }}>
                {copiedManifesto ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <pre style={{
              flex: 1, overflowY: 'auto', padding: '10px 12px',
              margin: 0, fontSize: 10, color: 'var(--text-1)',
              fontFamily: 'var(--font-mono)', lineHeight: 1.6,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {manifesto || '(manifeste vide)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
