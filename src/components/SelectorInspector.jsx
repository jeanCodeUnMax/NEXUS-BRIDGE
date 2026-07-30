import { useState } from 'react'
import providersConfig from '../providers/providers-config.json'

const DOM_PROVIDERS = providersConfig.dom_bridge

export default function SelectorInspector({ customSelectors, onSaveSelectors, onClose }) {
  const [selectedProvider, setSelectedProvider] = useState(DOM_PROVIDERS[0].id)
  const [editValues, setEditValues] = useState({})
  const [saved, setSaved] = useState(false)

  const provider = DOM_PROVIDERS.find(p => p.id === selectedProvider)
  const baseSelectors = provider?.selectors || {}
  const overrides = customSelectors?.[selectedProvider] || {}
  const merged = { ...baseSelectors, ...overrides }

  function handleChange(key, val) {
    setEditValues(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  function handleSave() {
    const updated = { ...overrides, ...editValues }
    onSaveSelectors(selectedProvider, updated)
    setEditValues({})
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  function handleReset(key) {
    const updated = { ...(customSelectors?.[selectedProvider] || {}) }
    delete updated[key]
    onSaveSelectors(selectedProvider, updated)
    setEditValues(prev => { const n = {...prev}; delete n[key]; return n })
  }

  function handleResetAll() {
    onSaveSelectors(selectedProvider, {})
    setEditValues({})
  }

  const SELECTOR_LABELS = {
    input: 'Zone de saisie (input)',
    submit: 'Bouton envoyer (submit)',
    response: 'Zone de réponse (response)',
    streaming_signal: 'Signal streaming actif',
    stop_button: 'Bouton stop'
  }

  const hasChanges = Object.keys(editValues).length > 0
  const hasOverrides = Object.keys(overrides).length > 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000aa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--border-bright)',
        borderRadius: 10, width: 560, maxWidth: '95vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px #000000cc'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-0)' }}>
              🔬 Selector Inspector
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>
              Calibrez les sélecteurs CSS pour chaque provider DOM Bridge
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-2)',
            cursor: 'pointer', fontSize: 16, padding: 4
          }}>✕</button>
        </div>

        {/* Provider tabs */}
        <div style={{
          display: 'flex', overflowX: 'auto', gap: 4,
          padding: '8px 12px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-0)'
        }}>
          {DOM_PROVIDERS.map(p => {
            const hasOvr = customSelectors?.[p.id] && Object.keys(customSelectors[p.id]).length > 0
            return (
              <button key={p.id} onClick={() => { setSelectedProvider(p.id); setEditValues({}) }}
                style={{
                  padding: '5px 10px', borderRadius: 5, fontSize: 11,
                  cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: selectedProvider === p.id ? 600 : 400,
                  border: `1px solid ${selectedProvider === p.id ? p.color : 'var(--border)'}`,
                  background: selectedProvider === p.id ? p.color + '22' : 'var(--bg-2)',
                  color: selectedProvider === p.id ? p.color : 'var(--text-2)',
                  position: 'relative'
                }}>
                {p.icon} {p.name.split(' ')[0]}
                {hasOvr && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#f59e0b', border: '1px solid var(--bg-0)'
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Provider info banner */}
        <div style={{
          padding: '8px 16px', background: provider?.color + '11',
          borderBottom: '1px solid var(--border)', fontSize: 11,
          display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-1)'
        }}>
          <span>{provider?.icon}</span>
          <span style={{ fontWeight: 600 }}>{provider?.name}</span>
          <span style={{ color: 'var(--text-2)' }}>→</span>
          <a href={provider?.url} target="_blank" rel="noreferrer"
            style={{ color: provider?.color, fontSize: 10, textDecoration: 'none' }}>
            {provider?.url}
          </a>
          {hasOverrides && (
            <span style={{
              marginLeft: 'auto', fontSize: 10, color: '#f59e0b',
              background: '#f59e0b22', border: '1px solid #f59e0b44',
              borderRadius: 3, padding: '1px 6px'
            }}>
              ✏ {Object.keys(overrides).length} override(s) actif(s)
            </span>
          )}
        </div>

        {/* Selectors list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(merged).map(([key, defaultVal]) => {
            const isOverridden = key in overrides
            const currentEdit = editValues[key]
            const displayVal = currentEdit !== undefined ? currentEdit : (overrides[key] || defaultVal)
            const isDirty = currentEdit !== undefined && currentEdit !== (overrides[key] || defaultVal)

            return (
              <div key={key} style={{
                background: 'var(--bg-2)',
                border: `1px solid ${isOverridden ? '#f59e0b44' : 'var(--border)'}`,
                borderRadius: 6, padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-0)' }}>
                      {SELECTOR_LABELS[key] || key}
                    </span>
                    <span style={{
                      marginLeft: 6, fontSize: 9, fontFamily: 'monospace',
                      color: 'var(--text-2)', background: 'var(--bg-3)',
                      borderRadius: 3, padding: '1px 5px'
                    }}>{key}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {isOverridden && (
                      <span style={{ fontSize: 9, color: '#f59e0b' }}>✏ custom</span>
                    )}
                    {isDirty && (
                      <span style={{ fontSize: 9, color: 'var(--accent)' }}>● modifié</span>
                    )}
                    {isOverridden && (
                      <button onClick={() => handleReset(key)} style={{
                        fontSize: 9, padding: '2px 5px', borderRadius: 3, cursor: 'pointer',
                        background: 'var(--bg-3)', border: '1px solid var(--border)',
                        color: 'var(--text-2)'
                      }} title="Remettre la valeur par défaut">↺ reset</button>
                    )}
                  </div>
                </div>

                <input
                  value={displayVal}
                  onChange={e => handleChange(key, e.target.value)}
                  style={{
                    width: '100%', background: 'var(--bg-0)',
                    border: `1px solid ${isDirty ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 4, padding: '5px 8px',
                    color: 'var(--text-0)', fontSize: 12, fontFamily: 'monospace',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s'
                  }}
                  placeholder="Sélecteur CSS…"
                />

                {!isOverridden && (
                  <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4 }}>
                    Valeur par défaut (config)
                  </div>
                )}
                {isOverridden && (
                  <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4 }}>
                    Défaut : <code style={{ fontFamily: 'monospace', color: 'var(--text-2)', fontSize: 10 }}>{defaultVal}</code>
                  </div>
                )}
              </div>
            )
          })}

          {/* Guide rapide */}
          <div style={{
            background: '#0a1628', border: '1px solid #1e3a5f',
            borderRadius: 6, padding: '10px 12px', fontSize: 10, color: '#7ab3d4'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#4a9eff' }}>💡 Guide — Trouver un sélecteur CSS</div>
            <div style={{ lineHeight: 1.8 }}>
              1. Ouvre <a href={provider?.url} target="_blank" rel="noreferrer" style={{ color: '#4a9eff' }}>{provider?.url}</a> dans Chrome<br />
              2. Clic droit sur l'élément → <strong>Inspecter</strong><br />
              3. Dans DevTools → clic droit sur la balise → <strong>Copy → Copy selector</strong><br />
              4. Colle le sélecteur dans le champ correspondant ci-dessus<br />
              5. Clique <strong>Sauvegarder</strong>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-0)'
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {hasOverrides && (
              <button onClick={handleResetAll} style={{
                padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
                border: '1px solid var(--danger)', background: '#2d0a0a',
                color: 'var(--danger)', fontSize: 11
              }}>↺ Tout réinitialiser</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && (
              <span style={{ fontSize: 11, color: '#4caf50' }}>✓ Sauvegardé !</span>
            )}
            <button onClick={onClose} style={{
              padding: '6px 14px', borderRadius: 5, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--bg-2)',
              color: 'var(--text-1)', fontSize: 11
            }}>Fermer</button>
            <button onClick={handleSave} disabled={!hasChanges} style={{
              padding: '6px 16px', borderRadius: 5, cursor: hasChanges ? 'pointer' : 'not-allowed',
              border: 'none', background: hasChanges ? 'var(--accent)' : 'var(--bg-3)',
              color: hasChanges ? '#fff' : 'var(--text-2)', fontSize: 11, fontWeight: 600
            }}>Sauvegarder</button>
          </div>
        </div>
      </div>
    </div>
  )
}
