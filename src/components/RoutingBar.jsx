import { useState } from 'react'
import providersConfig from '../providers/providers-config.json'

const ALL_PROVIDERS = [...providersConfig.api, ...providersConfig.dom_bridge]

export default function RoutingBar({ activeProviderIds, selectedTargets, onChangeTargets }) {
  const [expanded, setExpanded] = useState(false)

  const available = activeProviderIds
    .map(id => ALL_PROVIDERS.find(p => p.id === id))
    .filter(Boolean)

  if (available.length === 0) return null

  const allSelected = available.every(p => selectedTargets.includes(p.id))

  function toggle(id) {
    if (selectedTargets.includes(id)) {
      onChangeTargets(selectedTargets.filter(x => x !== id))
    } else {
      onChangeTargets([...selectedTargets, id])
    }
  }

  function toggleAll() {
    if (allSelected) {
      onChangeTargets([])
    } else {
      onChangeTargets(available.map(p => p.id))
    }
  }

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-1)',
      padding: '4px 12px',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, color: 'var(--text-2)',
        cursor: 'pointer', userSelect: 'none', padding: '2px 0'
      }} onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: 9, opacity: 0.7 }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ letterSpacing: '0.08em', fontWeight: 600, color: 'var(--accent)' }}>
          ROUTING
        </span>
        <span style={{ marginLeft: 4 }}>
          {selectedTargets.length === 0
            ? <span style={{ color: 'var(--danger)' }}>⚠ Aucune cible</span>
            : selectedTargets.length === available.length
              ? <span style={{ color: '#4caf50' }}>→ Tous ({available.length})</span>
              : <>
                  {selectedTargets.map(id => {
                    const p = ALL_PROVIDERS.find(x => x.id === id)
                    return p ? (
                      <span key={id} style={{
                        display: 'inline-block', marginRight: 4,
                        background: p.color + '22', border: `1px solid ${p.color}55`,
                        borderRadius: 3, padding: '0 4px', color: p.color, fontSize: 10
                      }}>{p.icon} {p.name.split(' ')[0]}</span>
                    ) : null
                  })}
                </>
          }
        </span>
      </div>

      {/* Expanded provider grid */}
      {expanded && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 5,
          paddingBottom: 6, paddingTop: 4
        }}>
          {/* Select All */}
          <button
            onClick={toggleAll}
            style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
              border: `1px solid ${allSelected ? '#4caf50' : 'var(--border)'}`,
              background: allSelected ? '#1a2e1a' : 'var(--bg-2)',
              color: allSelected ? '#4caf50' : 'var(--text-2)',
              fontWeight: 600
            }}
          >
            {allSelected ? '✓ Tous' : '○ Tous'}
          </button>

          {available.map(p => {
            const active = selectedTargets.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                title={p.type === 'dom' ? `DOM Bridge — ${p.url}` : `API directe`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 4, fontSize: 10,
                  cursor: 'pointer', fontWeight: active ? 600 : 400,
                  border: `1px solid ${active ? p.color : 'var(--border)'}`,
                  background: active ? p.color + '22' : 'var(--bg-2)',
                  color: active ? p.color : 'var(--text-2)',
                  transition: 'all 0.12s',
                  position: 'relative'
                }}
              >
                <span>{p.icon}</span>
                <span>{p.name.split(' ')[0]}</span>
                {p.type === 'dom' && (
                  <span style={{
                    fontSize: 8, background: '#ffffff15',
                    borderRadius: 2, padding: '0 2px', color: 'var(--text-2)'
                  }}>DOM</span>
                )}
                {active && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 7, height: 7, borderRadius: '50%',
                    background: p.color, border: '1px solid var(--bg-1)'
                  }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
