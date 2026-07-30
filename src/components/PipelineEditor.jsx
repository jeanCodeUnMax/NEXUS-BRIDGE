import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Play, RotateCcw } from 'lucide-react'
import providersConfig from '../providers/providers-config.json'

const API_PROVIDERS = providersConfig.api
const PRESET_ROLES = [
  { id: 'planner',  label: '🗺 Planificateur', systemPrompt: 'Tu analyses l\'objectif et produis un plan d\'action structuré étape par étape.', mustScore: false },
  { id: 'coder',    label: '💻 Codeur',         systemPrompt: 'Tu implémentes le plan fourni dans le manifeste en écrivant du code propre et commenté.', mustScore: false },
  { id: 'auditor',  label: '🔍 Auditeur',       systemPrompt: 'Tu analyses le code ou le contenu produit, identifies les bugs, failles et améliorations possibles.', mustScore: true },
  { id: 'judge',    label: '⚖ Juge',            systemPrompt: 'Tu évalues objectivement le travail de tous les agents. Tu dois trancher et donner un verdict final avec une note.', mustScore: true },
  { id: 'critic',   label: '🎯 Critique',       systemPrompt: 'Tu joues l\'avocat du diable. Tu cherches les failles, incohérences et points faibles dans le travail produit.', mustScore: false },
  { id: 'custom',   label: '✏ Personnalisé',    systemPrompt: '', mustScore: false },
]

function StepCard({ step, index, total, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(index === 0)
  const preset = PRESET_ROLES.find(r => r.id === step.rolePreset) || PRESET_ROLES[PRESET_ROLES.length - 1]
  const provider = API_PROVIDERS.find(p => p.id === step.providerId)

  return (
    <div style={{
      border: `1px solid ${provider?.color ? provider.color + '55' : 'var(--border)'}`,
      borderRadius: 7, marginBottom: 6, overflow: 'hidden',
      background: 'var(--bg-2)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: provider?.color ? provider.color + '33' : 'var(--bg-3)',
          border: `1px solid ${provider?.color || 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: provider?.color || 'var(--text-2)', flexShrink: 0
        }}>{index + 1}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>{step.role || preset.label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-2)' }}>
            {provider ? `${provider.icon} ${provider.name}` : 'Aucun provider'}
            {step.mustScore && <span style={{ marginLeft: 6, color: '#f59e0b' }}>⭐ note</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={e => { e.stopPropagation(); onMoveUp() }} disabled={index === 0}
            style={iconBtn(index === 0)}><ChevronUp size={11} /></button>
          <button onClick={e => { e.stopPropagation(); onMoveDown() }} disabled={index === total - 1}
            style={iconBtn(index === total - 1)}><ChevronDown size={11} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={iconBtn(false, '#ef4444')}><Trash2 size={11} /></button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0 10px 10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
          {/* Role preset */}
          <div>
            <label style={lbl}>Rôle</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {PRESET_ROLES.map(r => (
                <button key={r.id} onClick={() => onChange({
                  ...step, rolePreset: r.id,
                  role: r.label,
                  systemPrompt: r.id !== 'custom' ? r.systemPrompt : step.systemPrompt,
                  mustScore: r.mustScore
                })} style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                  border: `1px solid ${step.rolePreset === r.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: step.rolePreset === r.id ? 'var(--accent)22' : 'var(--bg-3)',
                  color: step.rolePreset === r.id ? 'var(--accent)' : 'var(--text-2)'
                }}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* Custom role name */}
          <div>
            <label style={lbl}>Nom du rôle</label>
            <input value={step.role} onChange={e => onChange({ ...step, role: e.target.value })}
              placeholder="Ex: Expert sécurité"
              style={inputStyle} />
          </div>

          {/* Provider */}
          <div>
            <label style={lbl}>Provider</label>
            <select value={step.providerId} onChange={e => onChange({ ...step, providerId: e.target.value })}
              style={inputStyle}>
              <option value="">— Choisir —</option>
              {API_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>
          </div>

          {/* System prompt */}
          <div>
            <label style={lbl}>Instructions système</label>
            <textarea value={step.systemPrompt} onChange={e => onChange({ ...step, systemPrompt: e.target.value })}
              rows={3} placeholder="Décris précisément ce que cet agent doit faire…"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>

          {/* User prompt */}
          <div>
            <label style={lbl}>Message utilisateur <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>(optionnel)</span></label>
            <input value={step.userPrompt || ''} onChange={e => onChange({ ...step, userPrompt: e.target.value })}
              placeholder="Laisse vide pour utiliser le rôle par défaut"
              style={inputStyle} />
          </div>

          {/* Must score */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: 'var(--text-1)' }}>
            <input type="checkbox" checked={step.mustScore} onChange={e => onChange({ ...step, mustScore: e.target.checked })} />
            Cet agent doit fournir un score /10
          </label>
        </div>
      )}
    </div>
  )
}

export default function PipelineEditor({ onRun, isRunning }) {
  const [objective, setObjective] = useState('')
  const [steps, setSteps] = useState([
    { id: 'step-1', rolePreset: 'planner',  role: '🗺 Planificateur', providerId: API_PROVIDERS[0]?.id || '', systemPrompt: PRESET_ROLES[0].systemPrompt, mustScore: false, userPrompt: '' },
    { id: 'step-2', rolePreset: 'coder',    role: '💻 Codeur',        providerId: API_PROVIDERS[0]?.id || '', systemPrompt: PRESET_ROLES[1].systemPrompt, mustScore: false, userPrompt: '' },
    { id: 'step-3', rolePreset: 'judge',    role: '⚖ Juge',           providerId: API_PROVIDERS[0]?.id || '', systemPrompt: PRESET_ROLES[3].systemPrompt, mustScore: true,  userPrompt: '' },
  ])
  const [loopConfig, setLoopConfig] = useState({ enabled: true, fromStep: 1, scoreThreshold: 7, maxLoops: 3 })
  const [summarizeThreshold, setSummarizeThreshold] = useState(3000)

  function addStep() {
    setSteps(prev => [...prev, {
      id: `step-${Date.now()}`, rolePreset: 'custom', role: '✏ Nouvel agent',
      providerId: API_PROVIDERS[0]?.id || '', systemPrompt: '', mustScore: false, userPrompt: ''
    }])
  }

  function updateStep(id, data) { setSteps(prev => prev.map(s => s.id === id ? data : s)) }
  function deleteStep(id) { setSteps(prev => prev.filter(s => s.id !== id)) }
  function moveStep(id, dir) {
    setSteps(prev => {
      const arr = [...prev]
      const i = arr.findIndex(s => s.id === id)
      if (dir === -1 && i > 0) [arr[i-1], arr[i]] = [arr[i], arr[i-1]]
      if (dir === 1 && i < arr.length - 1) [arr[i], arr[i+1]] = [arr[i+1], arr[i]]
      return arr
    })
  }

  const canRun = objective.trim() && steps.length > 0 && steps.every(s => s.providerId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>

        {/* Objective */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...lbl, fontSize: 11, color: 'var(--accent)' }}>🎯 Objectif global</label>
          <textarea value={objective} onChange={e => setObjective(e.target.value)}
            rows={3} placeholder="Ex: Créer une fonction Python qui trie une liste par fréquence d'apparition, avec tests unitaires."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, fontSize: 12 }} />
        </div>

        {/* Steps */}
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ ...lbl, margin: 0 }}>Agents ({steps.length})</label>
          <button onClick={addStep} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px',
            borderRadius: 5, cursor: 'pointer', fontSize: 11,
            border: '1px solid var(--accent)', background: 'var(--accent)22', color: 'var(--accent)'
          }}><Plus size={11} /> Ajouter</button>
        </div>

        {steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} total={steps.length}
            onChange={data => updateStep(step.id, data)}
            onDelete={() => deleteStep(step.id)}
            onMoveUp={() => moveStep(step.id, -1)}
            onMoveDown={() => moveStep(step.id, 1)}
          />
        ))}

        {/* Loop config */}
        <div style={{
          border: '1px solid #f59e0b44', borderRadius: 7,
          background: '#f59e0b08', padding: '10px 12px', marginTop: 8
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>
            <input type="checkbox" checked={loopConfig.enabled} onChange={e => setLoopConfig(p => ({ ...p, enabled: e.target.checked }))} />
            🔁 Boucle de validation
          </label>

          {loopConfig.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Reboucler depuis l'étape</label>
                  <select value={loopConfig.fromStep} onChange={e => setLoopConfig(p => ({ ...p, fromStep: +e.target.value }))}
                    style={inputStyle}>
                    {steps.map((s, i) => <option key={s.id} value={i}>{i + 1}. {s.role}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Score minimum /10</label>
                  <input type="number" min="1" max="10" step="0.5"
                    value={loopConfig.scoreThreshold}
                    onChange={e => setLoopConfig(p => ({ ...p, scoreThreshold: +e.target.value }))}
                    style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Max boucles</label>
                  <input type="number" min="1" max="10"
                    value={loopConfig.maxLoops}
                    onChange={e => setLoopConfig(p => ({ ...p, maxLoops: +e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#f59e0b99' }}>
                Si le score du Juge est &lt; {loopConfig.scoreThreshold}/10, reboucle depuis l'étape {loopConfig.fromStep + 1} (max {loopConfig.maxLoops}x)
              </div>
            </div>
          )}
        </div>

        {/* Summarize threshold */}
        <div style={{ marginTop: 8, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-2)' }}>
          <label style={{ ...lbl, margin: 0 }}>
            📦 Compression manifeste si &gt;
            <input type="number" value={summarizeThreshold} min={500} step={500}
              onChange={e => setSummarizeThreshold(+e.target.value)}
              style={{ ...inputStyle, display: 'inline', width: 70, margin: '0 4px', padding: '2px 6px' }} />
            caractères
          </label>
          <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 3 }}>
            Le manifeste sera résumé automatiquement pour éviter de dépasser le contexte
          </div>
        </div>
      </div>

      {/* Run button */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-0)' }}>
        <button
          onClick={() => onRun({ objective, steps, loopConfig, summarizeThreshold })}
          disabled={!canRun || isRunning}
          style={{
            width: '100%', padding: '10px', borderRadius: 6, cursor: canRun && !isRunning ? 'pointer' : 'not-allowed',
            border: 'none', fontWeight: 700, fontSize: 13,
            background: canRun && !isRunning ? 'linear-gradient(135deg, #4a9eff, #7c4dff)' : 'var(--bg-3)',
            color: canRun && !isRunning ? '#fff' : 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s'
          }}>
          {isRunning ? <><RotateCcw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Pipeline en cours…</> : <><Play size={14} /> Lancer le Pipeline</>}
        </button>
        {!canRun && !isRunning && (
          <div style={{ fontSize: 10, color: 'var(--text-2)', textAlign: 'center', marginTop: 5 }}>
            {!objective.trim() ? 'Définissez un objectif' : 'Assignez un provider à chaque agent'}
          </div>
        )}
      </div>
    </div>
  )
}

const lbl = { fontSize: 10, color: 'var(--text-2)', display: 'block', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }
const inputStyle = { width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 7px', color: 'var(--text-0)', fontSize: 11, boxSizing: 'border-box', outline: 'none' }
const iconBtn = (disabled, color) => ({
  background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? 'var(--text-2)' : color || 'var(--text-1)', padding: 3, opacity: disabled ? 0.4 : 1
})
