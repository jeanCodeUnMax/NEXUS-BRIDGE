import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { renderMarkdown } from '../utils/renderMarkdown'
import providersConfig from '../providers/providers-config.json'

const ALL_PROVIDERS = [...providersConfig.api, ...providersConfig.dom_bridge]

// One provider column in the grid
function ProviderColumn({ providerId, messages }) {
  const provider = ALL_PROVIDERS.find(p => p.id === providerId)
  const color = provider?.color || 'var(--accent)'

  // Only assistant messages for this provider
  const responses = messages.filter(m => m.role === 'assistant' && m.provider === providerId)

  return (
    <div style={{
      flex: 1, minWidth: 220,
      display: 'flex', flexDirection: 'column',
      border: `1px solid ${color}33`,
      borderRadius: 8, overflow: 'hidden',
      background: 'var(--bg-1)'
    }}>
      {/* Column header */}
      <div style={{
        padding: '8px 12px',
        background: color + '18',
        borderBottom: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', gap: 6
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: color + '30', border: `1px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11
        }}>
          {provider?.icon || '🤖'}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{provider?.name || providerId}</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-2)', background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 3 }}>
          {provider?.type === 'dom' ? 'DOM' : 'API'}
        </span>
      </div>

      {/* Responses */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {responses.length === 0 ? (
          <div style={{ color: 'var(--text-2)', fontSize: 11, textAlign: 'center', padding: '20px 0', opacity: 0.5 }}>
            Aucune réponse
          </div>
        ) : (
          responses.map(msg => <GridCell key={msg.id} message={msg} color={color} />)
        )}
      </div>
    </div>
  )
}

function GridCell({ message, color }) {
  const [copied, setCopied] = useState(false)
  const [showThinking, setShowThinking] = useState(false)

  function copy() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const ts = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  return (
    <div style={{
      background: 'var(--bg-2)', borderRadius: 6,
      border: `1px solid ${color}22`, padding: '8px 10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {ts && <span style={{ fontSize: 9, color: 'var(--text-2)' }}>{ts}</span>}
        {message.metadata?.duration && (
          <span style={{ fontSize: 9, color: 'var(--text-2)' }}>
            {(message.metadata.duration / 1000).toFixed(1)}s
          </span>
        )}
        <button onClick={copy} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          {copied ? <Check size={11} color="var(--success)" /> : <Copy size={11} color="var(--text-2)" />}
        </button>
      </div>

      {/* Thinking */}
      {message.thinking && (
        <div style={{ marginBottom: 6 }}>
          <button onClick={() => setShowThinking(!showThinking)} style={{
            display: 'flex', alignItems: 'center', gap: 3,
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            borderRadius: 3, padding: '2px 6px', cursor: 'pointer',
            color: 'var(--text-2)', fontSize: 10
          }}>
            💭 {showThinking ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
          {showThinking && (
            <div style={{
              marginTop: 4, padding: 8, background: 'var(--bg-0)',
              border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 10, color: 'var(--text-1)', fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 200, overflowY: 'auto'
            }}>
              {message.thinking}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {message.streaming && !message.content ? (
        <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%', background: color,
              animation: `pulse-dot 1s ease-in-out ${i * 0.2}s infinite`
            }} />
          ))}
        </div>
      ) : (
        <div
          className="md-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          style={{ fontSize: 12, color: 'var(--text-0)', lineHeight: 1.65 }}
        />
      )}

      {message.error && (
        <div style={{ marginTop: 6, padding: '5px 8px', background: '#2d0a0a', border: '1px solid var(--danger)', borderRadius: 4, fontSize: 10, color: '#fca5a5' }}>
          ❌ {message.error}
        </div>
      )}
    </div>
  )
}

// Main grid — groups messages by user turn, shows responses side-by-side
export default function GridView({ messages, activeProviderIds }) {
  if (!messages.length) return null

  // Get unique provider IDs that have responses
  const respondingProviders = [...new Set(
    messages.filter(m => m.role === 'assistant' && m.provider).map(m => m.provider)
  )].filter(id => activeProviderIds.includes(id))

  // Split into user turns
  const turns = []
  let currentTurn = null
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (currentTurn) turns.push(currentTurn)
      currentTurn = { user: msg, responses: [] }
    } else if (currentTurn) {
      currentTurn.responses.push(msg)
    }
  }
  if (currentTurn) turns.push(currentTurn)

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {turns.map((turn, i) => (
        <div key={turn.user.id} style={{ borderBottom: '1px solid var(--border)' }}>
          {/* User message — full width */}
          <div style={{
            padding: '10px 14px', background: 'var(--bg-2)',
            display: 'flex', alignItems: 'flex-start', gap: 8
          }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>👤</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Vous</div>
              <div style={{ fontSize: 13, color: 'var(--text-0)', lineHeight: 1.6 }}>{turn.user.content}</div>
              {turn.user.routedTo && (
                <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {turn.user.routedTo.map(id => {
                    const p = ALL_PROVIDERS.find(x => x.id === id)
                    return p ? (
                      <span key={id} style={{ fontSize: 9, color: p.color, background: p.color + '18', border: `1px solid ${p.color}33`, borderRadius: 3, padding: '1px 5px' }}>
                        → {p.icon} {p.name.split(' ')[0]}
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Provider responses — horizontal grid */}
          {respondingProviders.length > 0 && (
            <div style={{
              display: 'flex', gap: 8, padding: '10px 12px',
              overflowX: 'auto', alignItems: 'flex-start'
            }}>
              {respondingProviders.map(providerId => {
                // Filter responses for THIS turn only
                const turnMsgs = turn.responses.filter(m => m.provider === providerId)
                return (
                  <div key={providerId} style={{ flex: 1, minWidth: 240, maxWidth: respondingProviders.length === 1 ? '100%' : 400 }}>
                    <ProviderColumn
                      providerId={providerId}
                      messages={[...turn.responses]}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
