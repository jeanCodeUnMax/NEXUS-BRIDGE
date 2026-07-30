import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { renderMarkdown } from '../utils/renderMarkdown'

export default function ChatMessage({ message, providerConfig }) {
  const [copied, setCopied] = useState(false)
  const [showThinking, setShowThinking] = useState(false)

  const isUser = message.role === 'user'
  const color = providerConfig?.color || 'var(--accent)'

  function copyText() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const ts = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

  return (
    <div className="animate-in" style={{
      padding: '10px 14px',
      borderBottom: '1px solid var(--border)',
      background: isUser ? 'var(--bg-2)' : 'transparent'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {isUser ? (
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>👤</div>
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: color + '30', border: `1px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
            {providerConfig?.icon || '🤖'}
          </div>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: isUser ? 'var(--text-1)' : color }}>
          {isUser ? 'Vous' : (providerConfig?.name || message.provider || 'Assistant')}
        </span>
        {ts && <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{ts}</span>}
        {message.metadata?.duration && (
          <span style={{ fontSize: 10, color: 'var(--text-2)', marginLeft: 'auto' }}>
            {(message.metadata.duration / 1000).toFixed(1)}s
          </span>
        )}
        <button onClick={copyText} style={iconBtn} title="Copier">
          {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} color="var(--text-2)" />}
        </button>
      </div>

      {/* Thinking block */}
      {message.thinking && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowThinking(!showThinking)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
              color: 'var(--text-2)', fontSize: 11
            }}
          >
            💭 Thinking
            {message.thinkingDuration && <span style={{ color: 'var(--text-2)' }}>({(message.thinkingDuration / 1000).toFixed(1)}s)</span>}
            {showThinking ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          {showThinking && (
            <div style={{
              marginTop: 4, padding: 10,
              background: 'var(--bg-0)', border: '1px solid var(--border)',
              borderRadius: 6, fontSize: 11, color: 'var(--text-1)',
              fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap',
              lineHeight: 1.6, maxHeight: 300, overflowY: 'auto'
            }}>
              {message.thinking}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {message.streaming && !message.content ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: color,
              animation: `pulse-dot 1s ease-in-out ${i * 0.2}s infinite`
            }} />
          ))}
        </div>
      ) : (
        <div
          className="md-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          style={{ fontSize: 13, color: 'var(--text-0)', lineHeight: 1.7 }}
        />
      )}

      {/* Error */}
      {message.error && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#2d0a0a', border: '1px solid var(--danger)', borderRadius: 5, fontSize: 11, color: '#fca5a5' }}>
          ❌ {message.error}
        </div>
      )}
    </div>
  )
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 3, borderRadius: 4, display: 'flex', alignItems: 'center'
}
