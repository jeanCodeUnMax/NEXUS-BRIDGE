import { useState, useEffect, useCallback } from 'react'
import { isBridgeDetected, healthCheck, onExtensionChange, waitForBridge } from '../utils/nexusBridge'
import providersConfig from '../providers/providers-config.json'

const DOM_PROVIDERS = providersConfig.dom_bridge

// Status colors & icons
const STATUS = {
  unknown:  { color: '#666',     icon: '○', label: 'Non testé' },
  checking: { color: '#f59e0b',  icon: '◌', label: 'Vérification…' },
  ready:    { color: '#4caf50',  icon: '●', label: 'Prêt' },
  partial:  { color: '#f59e0b',  icon: '◐', label: 'Partiel' },
  no_tab:   { color: '#ef4444',  icon: '○', label: 'Onglet manquant' },
  tab_closed:{ color: '#ef4444', icon: '✕', label: 'Onglet fermé' },
  cs_error: { color: '#ef4444',  icon: '!', label: 'Extension KO' },
  no_ext:   { color: '#888',     icon: '⊘', label: 'Extension absente' },
}

export default function HealthCheck({ customSelectors, activeProviderIds }) {
  const [statuses, setStatuses] = useState({}) // providerId → { status, results, ts }
  const [checking, setChecking] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [bridgeReady, setBridgeReady] = useState(false)

  // Attendre la détection du bridge au montage
  useEffect(() => {
    setBridgeReady(isBridgeDetected())
    const unsub = onExtensionChange((detected) => {
      setBridgeReady(detected)
      if (detected) checkAll()
    })
    // Tenter de détecter pendant 5s
    waitForBridge(5000).then(detected => {
      setBridgeReady(detected)
      if (detected) checkAll()
    })
    return unsub
  }, [])

  const checkProvider = useCallback(async (provider) => {
    if (!bridgeReady && !isBridgeDetected()) {
      setStatuses(prev => ({ ...prev, [provider.id]: { status: 'no_ext', results: {}, ts: Date.now() } }))
      return
    }

    setStatuses(prev => ({ ...prev, [provider.id]: { status: 'checking', results: {}, ts: Date.now() } }))

    const selectorOverrides = customSelectors?.[provider.id] || {}
    const mergedSelectors = { ...provider.selectors, ...selectorOverrides }

    try {
      const response = await healthCheck(provider.id, mergedSelectors)
      setStatuses(prev => ({
        ...prev,
        [provider.id]: {
          status: response?.status || 'cs_error',
          results: response?.results || {},
          error: response?.error,
          ts: Date.now()
        }
      }))
    } catch (err) {
      setStatuses(prev => ({
        ...prev,
        [provider.id]: { status: 'cs_error', results: {}, ts: Date.now(), error: err.message }
      }))
    }
  }, [customSelectors, bridgeReady])

  const checkAll = useCallback(() => {
    setChecking(true)
    DOM_PROVIDERS.forEach(p => checkProvider(p))
    setTimeout(() => setChecking(false), 3000)
  }, [checkProvider])

  // Auto-check quand bridge est détecté
  useEffect(() => {
    if (bridgeReady) checkAll()
  }, [bridgeReady])

  // Refresh périodique toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isBridgeDetected()) checkAll()
    }, 30000)
    return () => clearInterval(interval)
  }, [checkAll])

  const allDom = DOM_PROVIDERS

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-0)',
      padding: '6px 10px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.08em' }}>
          DOM BRIDGE STATUS
        </span>
        <button onClick={checkAll} disabled={checking} style={{
          fontSize: 9, padding: '2px 7px', borderRadius: 3, cursor: checking ? 'wait' : 'pointer',
          border: '1px solid var(--border)', background: 'var(--bg-2)',
          color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 3
        }}>
          {checking ? '⟳ …' : '⟳ Tester'}
        </button>
      </div>

      {/* Provider status pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {allDom.map(provider => {
          const s = statuses[provider.id]
          const st = STATUS[s?.status || 'unknown']
          const isActive = activeProviderIds.includes(provider.id)
          const isExpanded = expanded === provider.id

          return (
            <div key={provider.id}>
              <button
                onClick={() => setExpanded(isExpanded ? null : provider.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 7px', borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${isActive ? provider.color + '55' : 'var(--border)'}`,
                  background: isActive ? provider.color + '11' : 'var(--bg-2)',
                  color: 'var(--text-1)', fontSize: 10,
                  opacity: isActive ? 1 : 0.6
                }}
              >
                <span style={{ fontSize: 8, color: st.color }}>{st.icon}</span>
                <span>{provider.icon}</span>
                <span style={{ color: isActive ? provider.color : 'var(--text-2)' }}>
                  {provider.name.split(' ')[0]}
                </span>
                <span style={{ fontSize: 9, color: st.color }}>{st.label}</span>
              </button>

              {/* Detail dropdown */}
              {isExpanded && s && (
                <div style={{
                  position: 'absolute', zIndex: 200,
                  background: 'var(--bg-1)', border: `1px solid ${provider.color}55`,
                  borderRadius: 6, padding: '8px 10px', minWidth: 240,
                  boxShadow: '0 8px 24px #00000066', fontSize: 10,
                  marginTop: 2
                }}>
                  <div style={{ fontWeight: 600, color: provider.color, marginBottom: 6 }}>
                    {provider.icon} {provider.name}
                  </div>

                  {s.error && (
                    <div style={{ color: '#ef4444', background: '#2d0a0a', border: '1px solid #5a1010', borderRadius: 4, padding: '4px 8px', marginBottom: 6 }}>
                      {s.error}
                    </div>
                  )}

                  {Object.keys(s.results || {}).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {Object.entries(s.results).map(([key, r]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: r.found ? '#4caf50' : '#ef4444', fontSize: 11 }}>
                            {r.found ? '✓' : '✗'}
                          </span>
                          <span style={{ color: 'var(--text-1)', minWidth: 100 }}>{key}</span>
                          <code style={{ color: 'var(--text-2)', fontSize: 9, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                            {r.selector}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.status === 'no_tab' && (
                    <a href={provider.url} target="_blank" rel="noreferrer" style={{ color: provider.color, fontSize: 10 }}>
                      → Ouvrir {provider.url}
                    </a>
                  )}

                  <div style={{ marginTop: 6, color: 'var(--text-2)', fontSize: 9 }}>
                    Testé : {s.ts ? new Date(s.ts).toLocaleTimeString() : '—'}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {bridgeReady ? (
        <div style={{ fontSize: 9, color: '#4caf50', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf50', display: 'inline-block' }} />
          Extension Chrome connectée
        </div>
      ) : (
        <div style={{ fontSize: 9, color: '#888', marginTop: 4 }}>
          ⊘ Extension Chrome non détectée — chargez-la depuis <code>extension/</code> et rechargez la page
        </div>
      )}
    </div>
  )
}
