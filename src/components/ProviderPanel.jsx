import { useState } from 'react'
import { Key, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import providersConfig from '../providers/providers-config.json'

export default function ProviderPanel({
  apiKeys, onUpdateApiKey,
  activeProviders, onToggleProvider,
  providerModels, onUpdateModel,
  providerPrompts, onUpdatePrompt
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [showKeys, setShowKeys] = useState({})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Providers</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-2)', padding: '4px 6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 2 }}>
          🔌 API Directs
        </div>
        {providersConfig.api.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            isActive={activeProviders.includes(p.id)}
            onToggle={() => onToggleProvider(p.id)}
            expanded={expandedId === p.id}
            onExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
            apiKey={apiKeys[p.id] || ''}
            onUpdateKey={val => onUpdateApiKey(p.id, val)}
            showKey={showKeys[p.id]}
            onToggleShowKey={() => setShowKeys(s => ({ ...s, [p.id]: !s[p.id] }))}
            selectedModel={providerModels[p.id] || p.defaultModel}
            onUpdateModel={val => onUpdateModel(p.id, val)}
            promptPrefix={providerPrompts?.[p.id] || ''}
            onUpdatePrompt={val => onUpdatePrompt(p.id, val)}
          />
        ))}

        <div style={{ fontSize: 10, color: 'var(--text-2)', padding: '8px 6px 4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 2, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          🌐 DOM Bridges (via Extension)
        </div>
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px', marginBottom: 8, fontSize: 11, color: 'var(--text-1)' }}>
          <strong style={{ color: 'var(--warn)' }}>⚠ Extension Chrome requise</strong>
          <br />Installez <code style={{ fontSize: 10, background: 'var(--bg-2)', padding: '1px 4px', borderRadius: 3 }}>extension/</code> dans Chrome DevMode.
        </div>
        {providersConfig.dom_bridge.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            isActive={activeProviders.includes(p.id)}
            onToggle={() => onToggleProvider(p.id)}
            expanded={expandedId === p.id}
            onExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
            isDomBridge
            promptPrefix={providerPrompts?.[p.id] || ''}
            onUpdatePrompt={val => onUpdatePrompt(p.id, val)}
          />
        ))}
      </div>
    </div>
  )
}

function ProviderCard({
  provider, isActive, onToggle, expanded, onExpand,
  apiKey, onUpdateKey, showKey, onToggleShowKey,
  selectedModel, onUpdateModel,
  isDomBridge,
  promptPrefix, onUpdatePrompt
}) {
  const hasPrompt = promptPrefix && promptPrefix.trim().length > 0

  return (
    <div style={{
      border: `1px solid ${isActive ? provider.color + '60' : 'var(--border)'}`,
      borderRadius: 6, marginBottom: 4, overflow: 'hidden',
      background: isActive ? provider.color + '0a' : 'transparent',
      transition: 'all 0.15s'
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', cursor: 'pointer' }} onClick={onExpand}>
        <span style={{ fontSize: 14 }}>{provider.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: isActive ? 'var(--text-0)' : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 4 }}>
            {provider.name}
            {hasPrompt && (
              <span title="Prompt préfixe actif" style={{
                fontSize: 8, background: provider.color + '33',
                border: `1px solid ${provider.color}55`,
                borderRadius: 3, padding: '0 4px', color: provider.color,
                fontWeight: 700
              }}>P</span>
            )}
          </div>
          {isDomBridge && <div style={{ fontSize: 10, color: 'var(--text-2)' }}>DOM Bridge</div>}
          {!isDomBridge && selectedModel && <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'monospace' }}>{selectedModel}</div>}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onToggle() }}>
          <div style={{ width: 28, height: 16, borderRadius: 8, background: isActive ? provider.color : 'var(--border)', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: isActive ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
        </label>
        {expanded ? <ChevronUp size={12} color="var(--text-2)" /> : <ChevronDown size={12} color="var(--text-2)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 8px 10px', borderTop: '1px solid var(--border)' }}>

          {/* Model selector */}
          {provider.models && !isDomBridge && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', marginBottom: 3 }}>Modèle</label>
              <select
                value={selectedModel || provider.defaultModel}
                onChange={e => onUpdateModel(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', color: 'var(--text-0)', fontSize: 11 }}
              >
                {provider.models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {/* API Key */}
          {provider.requiresKey && !isDomBridge && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', marginBottom: 3 }}>
                <Key size={9} style={{ display: 'inline', marginRight: 3 }} />
                {provider.keyLabel}
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => onUpdateKey(e.target.value)}
                  placeholder="sk-..."
                  style={{ flex: 1, background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', color: 'var(--text-0)', fontSize: 11, fontFamily: 'monospace' }}
                />
                <button onClick={onToggleShowKey} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', color: 'var(--text-1)', cursor: 'pointer', fontSize: 10 }}>
                  {showKey ? '🙈' : '👁'}
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 3 }}>Stocké localement (localStorage)</div>
            </div>
          )}

          {/* DOM Bridge info */}
          {isDomBridge && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-1)', marginBottom: 4 }}>{provider.note}</div>
              <a href={provider.url} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--accent)', textDecoration: 'none' }}>
                <ExternalLink size={10} /> Ouvrir {provider.url}
              </a>
              <div style={{ marginTop: 6, background: 'var(--bg-0)', borderRadius: 4, padding: 6, fontSize: 10, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                <div>Input: <span style={{ color: '#7dd3fc' }}>{provider.selectors?.input}</span></div>
                <div>Output: <span style={{ color: '#86efac' }}>{provider.selectors?.response}</span></div>
              </div>
            </div>
          )}

          {/* ── Prompt préfixe par provider ── */}
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <label style={{ fontSize: 10, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ color: provider.color }}>⚡</span>
              Préfixe de prompt
              <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>(ajouté avant chaque message)</span>
            </label>
            <textarea
              value={promptPrefix}
              onChange={e => onUpdatePrompt(e.target.value)}
              placeholder={`Ex: "Réponds toujours en JSON." ou "Tu es un expert en sécurité."`}
              rows={3}
              style={{
                width: '100%', background: 'var(--bg-0)',
                border: `1px solid ${hasPrompt ? provider.color + '66' : 'var(--border)'}`,
                borderRadius: 4, padding: '5px 7px',
                color: 'var(--text-0)', fontSize: 11,
                fontFamily: 'inherit', resize: 'vertical',
                lineHeight: 1.5, boxSizing: 'border-box',
                outline: 'none', transition: 'border-color 0.15s'
              }}
            />
            {hasPrompt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                <span style={{ fontSize: 9, color: provider.color }}>
                  ✓ Actif — {promptPrefix.trim().length} caractères
                </span>
                <button
                  onClick={() => onUpdatePrompt('')}
                  style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)' }}
                >
                  Effacer
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
