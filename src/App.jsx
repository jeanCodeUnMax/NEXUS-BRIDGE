import { useState, useRef, useEffect } from 'react'
import { useStorage } from './hooks/useStorage'
import { callApiProvider } from './utils/apiCaller'
import { runStep, summarizeManifesto, detectStagnation } from './utils/pipelineRunner'
import { isBridgeDetected, sendPrompt as bridgeSendPrompt, onDomResponse } from './utils/nexusBridge'
import ProjectManager from './components/ProjectManager'
import ProviderPanel from './components/ProviderPanel'
import SnapshotManager from './components/SnapshotManager'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import Toolbar from './components/Toolbar'
import RoutingBar from './components/RoutingBar'
import SelectorInspector from './components/SelectorInspector'
import HealthCheck from './components/HealthCheck'
import GridView from './components/GridView'
import PipelineEditor from './components/PipelineEditor'
import PipelineView from './components/PipelineView'
import providersConfig from './providers/providers-config.json'

const ALL_PROVIDERS = [...providersConfig.api, ...providersConfig.dom_bridge]

export default function App() {
  // Persistence
  const [projects, setProjects] = useStorage('nexus_projects', [])
  const [sessions, setSessions] = useStorage('nexus_sessions', [])
  const [allMessages, setAllMessages] = useStorage('nexus_messages', {})
  const [apiKeys, setApiKeys] = useStorage('nexus_api_keys', {})
  const [activeProviderIds, setActiveProviderIds] = useStorage('nexus_active_providers', [])
  const [providerModels, setProviderModels] = useStorage('nexus_provider_models', {})
  const [customSelectors, setCustomSelectors] = useStorage('nexus_custom_selectors', {})
  const [providerPrompts, setProviderPrompts] = useStorage('nexus_provider_prompts', {})
  // Per-message routing targets (default = all active providers)
  const [routingTargets, setRoutingTargets] = useStorage('nexus_routing_targets', [])

  // Ephemeral
  const [activeProject, setActiveProject] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSelectorInspector, setShowSelectorInspector] = useState(false)
  const [viewMode, setViewMode] = useState('chat') // 'chat' | 'grid' | 'pipeline'
  const [pipelineResults, setPipelineResults] = useState([])
  const [pipelineManifesto, setPipelineManifesto] = useState('')
  const [pipelineStatus, setPipelineStatus] = useState('idle')
  const [pipelineObjective, setPipelineObjective] = useState('')
  const [leftWidth, setLeftWidth] = useState(220)
  const [rightWidth, setRightWidth] = useState(250)
  const abortRef = useRef(null)
  const chatEndRef = useRef(null)
  const draggingRef = useRef(null)

  const messages = activeSession ? (allMessages[activeSession.id] || []) : []

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Écouter les réponses DOM complètes via le bridge
  useEffect(() => {
    const unsub = onDomResponse(({ providerId, text }) => {
      // Trouver la dernière session active et mettre à jour le message streaming du provider
      setAllMessages(prev => {
        // Chercher dans toutes les sessions le dernier message streaming de ce provider
        const updated = { ...prev }
        for (const [sessionId, msgs] of Object.entries(updated)) {
          const idx = msgs.findLastIndex(m => m.provider === providerId && m.streaming)
          if (idx !== -1) {
            const newMsgs = [...msgs]
            newMsgs[idx] = { ...newMsgs[idx], streaming: false, content: text }
            updated[sessionId] = newMsgs
            break
          }
        }
        return updated
      })
    })
    return unsub
  }, [])

  // Restore last session
  useEffect(() => {
    const lastProjectId = localStorage.getItem('nexus_last_project')
    const lastSessionId = localStorage.getItem('nexus_last_session')
    if (lastProjectId) {
      const p = projects.find(x => x.id === lastProjectId)
      if (p) setActiveProject(p)
    }
    if (lastSessionId) {
      const s = sessions.find(x => x.id === lastSessionId)
      if (s) setActiveSession(s)
    }
  }, [])

  useEffect(() => { if (activeProject) localStorage.setItem('nexus_last_project', activeProject.id) }, [activeProject])
  useEffect(() => { if (activeSession) localStorage.setItem('nexus_last_session', activeSession.id) }, [activeSession])

  // Sync routing targets when active providers change
  useEffect(() => {
    setRoutingTargets(prev => {
      const valid = prev.filter(id => activeProviderIds.includes(id))
      if (valid.length === 0 && activeProviderIds.length > 0) return [...activeProviderIds]
      return valid
    })
  }, [activeProviderIds])

  // --- Project / Session CRUD ---
  function createProject(p) { setProjects(prev => [p, ...prev]); setActiveProject(p); setActiveSession(null) }
  function deleteProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id))
    const relatedSessions = sessions.filter(s => s.projectId === id).map(s => s.id)
    setSessions(prev => prev.filter(s => s.projectId !== id))
    setAllMessages(prev => { const n = {...prev}; relatedSessions.forEach(sid => delete n[sid]); return n })
    if (activeProject?.id === id) { setActiveProject(null); setActiveSession(null) }
  }
  function createSession(s) { setSessions(prev => [s, ...prev]); setActiveSession(s); setAllMessages(prev => ({ ...prev, [s.id]: [] })) }
  function deleteSession(id) {
    setSessions(prev => prev.filter(s => s.id !== id))
    setAllMessages(prev => { const n = {...prev}; delete n[id]; return n })
    if (activeSession?.id === id) setActiveSession(null)
  }
  function clearMessages() { if (!activeSession) return; setAllMessages(prev => ({ ...prev, [activeSession.id]: [] })) }

  // --- Providers ---
  function toggleProvider(id) {
    setActiveProviderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function updateApiKey(providerId, key) { setApiKeys(prev => ({ ...prev, [providerId]: key })) }
  function updateProviderModel(providerId, model) { setProviderModels(prev => ({ ...prev, [providerId]: model })) }
  function saveSelectors(providerId, selectors) { setCustomSelectors(prev => ({ ...prev, [providerId]: selectors })) }
  function updateProviderPrompt(providerId, prompt) { setProviderPrompts(prev => ({ ...prev, [providerId]: prompt })) }

  // --- Messaging ---
  function addMessage(sessionId, msg) {
    setAllMessages(prev => ({ ...prev, [sessionId]: [...(prev[sessionId] || []), msg] }))
  }

  async function sendMessage(text) {
    if (!activeSession || !activeProject || isLoading) return

    // Use routing targets (manual Discord-style selection)
    const targets = routingTargets.length > 0 ? routingTargets : activeProviderIds
    const sessionId = activeSession.id

    const apiProviders = targets
      .map(id => ALL_PROVIDERS.find(p => p.id === id))
      .filter(p => p && p.type === 'api')

    const domProviders = targets
      .map(id => ALL_PROVIDERS.find(p => p.id === id))
      .filter(p => p && p.type === 'dom')

    if (apiProviders.length === 0 && domProviders.length === 0) return

    const userMsg = {
      id: crypto.randomUUID(), role: 'user', content: text,
      timestamp: new Date().toISOString(),
      routedTo: targets
    }
    addMessage(sessionId, userMsg)
    setIsLoading(true)
    abortRef.current = new AbortController()

    const history = [...(allMessages[sessionId] || []), userMsg]
    const apiMessages = []
    if (activeProject.systemPrompt) apiMessages.push({ role: 'system', content: activeProject.systemPrompt })
    apiMessages.push(...history.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })))

    // API providers — parallel streaming
    const apiPromises = apiProviders.map(async (provider) => {
      const enrichedProvider = { ...provider, selectedModel: providerModels[provider.id] || provider.defaultModel }
      // Inject per-provider prompt prefix
      const prefix = providerPrompts[provider.id]?.trim()
      const providerMessages = prefix
        ? apiMessages.map((m, i) => {
            // Prepend prefix to the last user message only
            if (m.role === 'user' && i === apiMessages.length - 1) {
              return { ...m, content: `${prefix}\n\n${m.content}` }
            }
            return m
          })
        : apiMessages
      const placeholderId = crypto.randomUUID()
      addMessage(sessionId, {
        id: placeholderId, role: 'assistant', content: '',
        provider: provider.id, streaming: true, timestamp: new Date().toISOString()
      })
      const startTime = Date.now()
      try {
        let fullContent = ''
        await callApiProvider(enrichedProvider, providerMessages, apiKeys, (chunk) => {
          fullContent += chunk
          setAllMessages(prev => {
            const msgs = [...(prev[sessionId] || [])]
            const idx = msgs.findIndex(m => m.id === placeholderId)
            if (idx !== -1) msgs[idx] = { ...msgs[idx], content: fullContent }
            return { ...prev, [sessionId]: msgs }
          })
        })
        const duration = Date.now() - startTime
        setAllMessages(prev => {
          const msgs = [...(prev[sessionId] || [])]
          const idx = msgs.findIndex(m => m.id === placeholderId)
          if (idx !== -1) msgs[idx] = { ...msgs[idx], streaming: false, content: fullContent, metadata: { duration } }
          return { ...prev, [sessionId]: msgs }
        })
      } catch (err) {
        if (err.name === 'AbortError') return
        setAllMessages(prev => {
          const msgs = [...(prev[sessionId] || [])]
          const idx = msgs.findIndex(m => m.id === placeholderId)
          if (idx !== -1) msgs[idx] = { ...msgs[idx], streaming: false, error: err.message, content: '' }
          return { ...prev, [sessionId]: msgs }
        })
      }
    })

    // DOM providers — via pont window.postMessage ↔ extension Chrome
    domProviders.forEach(provider => {
      const selectorOverrides = customSelectors?.[provider.id] || {}
      const mergedSelectors = { ...provider.selectors, ...selectorOverrides }

      if (isBridgeDetected()) {
        const placeholderId = crypto.randomUUID()
        addMessage(sessionId, {
          id: placeholderId, role: 'assistant', content: '',
          provider: provider.id, streaming: true, timestamp: new Date().toISOString()
        })
        bridgeSendPrompt(provider.id, text, mergedSelectors)
          .then(response => {
            // L'injection a réussi. La réponse finale arrivera via onDomResponse.
            if (response && !response.ok) {
              setAllMessages(prev => {
                const msgs = [...(prev[sessionId] || [])]
                const idx = msgs.findIndex(m => m.id === placeholderId)
                if (idx !== -1) msgs[idx] = { ...msgs[idx], streaming: false, error: response.error || 'Erreur injection', content: '' }
                return { ...prev, [sessionId]: msgs }
              })
            }
            // Si ok: le message reste en streaming, sera mis à jour par onDomResponse
          })
          .catch(err => {
            setAllMessages(prev => {
              const msgs = [...(prev[sessionId] || [])]
              const idx = msgs.findIndex(m => m.id === placeholderId)
              if (idx !== -1) msgs[idx] = { ...msgs[idx], streaming: false, error: err.message, content: '' }
              return { ...prev, [sessionId]: msgs }
            })
          })
      } else {
        addMessage(sessionId, {
          id: crypto.randomUUID(), role: 'assistant', content: '',
          provider: provider.id, streaming: false, timestamp: new Date().toISOString(),
          error: `Extension NEXUS non détectée — installez-la depuis extension/ et rechargez la page`
        })
      }
    })

    await Promise.allSettled(apiPromises)
    setIsLoading(false)
  }

  function stopGeneration() { abortRef.current?.abort(); setIsLoading(false) }

  // --- Resize panels ---
  function startResize(side) {
    const onMove = (e) => {
      if (side === 'left') setLeftWidth(Math.max(160, Math.min(350, e.clientX)))
      if (side === 'right') setRightWidth(Math.max(180, Math.min(380, window.innerWidth - e.clientX)))
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const activeProviderConfigs = activeProviderIds.map(id => ALL_PROVIDERS.find(p => p.id === id)).filter(Boolean)

  // --- Pipeline Runner ---
  async function runPipeline({ objective, steps, loopConfig, summarizeThreshold }) {
    setPipelineObjective(objective)
    setPipelineResults([])
    setPipelineManifesto('')
    setPipelineStatus('running')
    setViewMode('pipeline')

    let manifesto = ''
    let loopCount = 0
    let scoreHistory = []
    let currentStepIndex = 0

    try {
      while (currentStepIndex < steps.length) {
        const step = steps[currentStepIndex]
        const resultId = `${step.id}-loop${loopCount}-${Date.now()}`

        // Add placeholder
        setPipelineResults(prev => [...prev, {
          id: resultId, role: step.role, providerId: step.providerId,
          status: 'running', response: '', score: null, loop: loopCount,
          duration: null, error: null
        }])

        const startTime = Date.now()
        let fullResponse = ''

        try {
          const { response, score } = await runStep(
            step, manifesto, objective, apiKeys, providerModels,
            (chunk) => {
              fullResponse += chunk
              setPipelineResults(prev => prev.map(r =>
                r.id === resultId ? { ...r, response: fullResponse } : r
              ))
            }
          )

          const duration = Date.now() - startTime

          // Update manifesto
          manifesto += `\n\n## ${step.role} (Tour ${loopCount + 1})\n${response}`

          // Auto-compress if too long
          if (manifesto.length > summarizeThreshold) {
            const summarizerProvider = providersConfig.api.find(p => p.id === steps[0].providerId)
            if (summarizerProvider) {
              manifesto = await summarizeManifesto(manifesto, summarizerProvider, apiKeys, providerModels)
              manifesto = `[MANIFESTE COMPRESSÉ]\n${manifesto}`
            }
          }

          setPipelineManifesto(manifesto)

          // Finalize result
          setPipelineResults(prev => prev.map(r =>
            r.id === resultId ? { ...r, status: 'done', response, score, duration } : r
          ))

          // Loop logic
          if (score !== null) scoreHistory.push(score)

          const isLastStep = currentStepIndex === steps.length - 1
          if (isLastStep && loopConfig.enabled && score !== null) {
            const stagnating = detectStagnation(scoreHistory)
            if (score < loopConfig.scoreThreshold && loopCount < loopConfig.maxLoops - 1) {
              loopCount++
              currentStepIndex = loopConfig.fromStep
              continue
            }
          }

          currentStepIndex++
        } catch (err) {
          setPipelineResults(prev => prev.map(r =>
            r.id === resultId ? { ...r, status: 'error', error: err.message, duration: Date.now() - startTime } : r
          ))
          break
        }
      }
    } finally {
      setPipelineStatus(prev => prev === 'running' ? 'done' : prev)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-0)', overflow: 'hidden' }}>

      {/* ─── LEFT — Projects & Sessions ─── */}
      <div style={{ width: leftWidth, minWidth: 160, maxWidth: 350, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-1)', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #4a9eff, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>N</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-0)', letterSpacing: '0.05em' }}>NEXUS</div>
            <div style={{ fontSize: 9, color: 'var(--text-2)', letterSpacing: '0.1em' }}>BRIDGE</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ProjectManager
            projects={projects} sessions={sessions}
            activeProject={activeProject} activeSession={activeSession}
            onSelectProject={p => { setActiveProject(p); setActiveSession(null) }}
            onSelectSession={s => setActiveSession(s)}
            onCreateProject={createProject} onCreateSession={createSession}
            onDeleteProject={deleteProject} onDeleteSession={deleteSession}
          />
        </div>
      </div>

      <div onMouseDown={() => startResize('left')} style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0 }} />

      {/* ─── CENTER — Chat ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Toolbar
          project={activeProject} session={activeSession}
          messages={messages} onClearMessages={clearMessages}
          viewMode={viewMode} onToggleView={() => setViewMode(v => v === 'chat' ? 'grid' : v === 'grid' ? 'pipeline' : 'chat')}
        />

        {/* Messages — Chat or Grid view */}
        {!activeSession ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-2)' }}>
            <div style={{ fontSize: 32 }}>🧠</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>NEXUS Bridge</div>
            <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 300 }}>
              Créez un projet dans le panneau gauche,<br />puis démarrez une session.
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-2)' }}>
            <div style={{ fontSize: 24 }}>💬</div>
            <div style={{ fontSize: 12 }}>Session vide — envoyez un premier message</div>
            {routingTargets.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 380 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>→</span>
                {routingTargets.map(id => {
                  const p = ALL_PROVIDERS.find(x => x.id === id)
                  return p ? <span key={id} style={{ color: p.color }}>{p.icon} {p.name.split(' ')[0]}</span> : null
                })}
              </div>
            )}
            {activeProject?.systemPrompt && (
              <div style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', maxWidth: 400, textAlign: 'center' }}>
                ⚙ Prompt : <em>{activeProject.systemPrompt.slice(0, 80)}{activeProject.systemPrompt.length > 80 ? '…' : ''}</em>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <GridView
            messages={messages}
            activeProviderIds={activeProviderIds}
          />
        ) : viewMode === 'pipeline' ? (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: 320, borderRight: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-0)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em' }}>⚡ PIPELINE EDITOR</span>
              </div>
              <PipelineEditor onRun={runPipeline} isRunning={pipelineStatus === 'running'} />
            </div>
            <PipelineView
              results={pipelineResults}
              manifesto={pipelineManifesto}
              pipelineStatus={pipelineStatus}
              objective={pipelineObjective}
            />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {messages.map(msg => {
              const provConfig = ALL_PROVIDERS.find(p => p.id === msg.provider)
              return <ChatMessage key={msg.id} message={msg} providerConfig={provConfig} />
            })}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Health Check bar */}
        <HealthCheck
          customSelectors={customSelectors}
          activeProviderIds={activeProviderIds}
        />

        {/* Routing bar — Discord style */}
        <RoutingBar
          activeProviderIds={activeProviderIds}
          selectedTargets={routingTargets}
          onChangeTargets={setRoutingTargets}
        />

        <ChatInput
          onSend={sendMessage} isLoading={isLoading} onStop={stopGeneration}
          disabled={!activeSession} activeProviders={routingTargets.length > 0 ? routingTargets : activeProviderIds}
        />
      </div>

      <div onMouseDown={() => startResize('right')} style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0 }} />

      {/* ─── RIGHT — Providers ─── */}
      <div style={{ width: rightWidth, minWidth: 180, maxWidth: 380, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', flexShrink: 0, overflow: 'hidden' }}>
        {/* Selector Inspector trigger */}
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowSelectorInspector(true)} style={{
            padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 10,
            border: '1px solid var(--border)', background: 'var(--bg-2)',
            color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4
          }}>
            🔬 Selector Inspector
            {Object.values(customSelectors).some(v => Object.keys(v).length > 0) && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            )}
          </button>
        </div>
        <ProviderPanel
          apiKeys={apiKeys} onUpdateApiKey={updateApiKey}
          activeProviders={activeProviderIds} onToggleProvider={toggleProvider}
          providerModels={providerModels} onUpdateModel={updateProviderModel}
          providerPrompts={providerPrompts} onUpdatePrompt={updateProviderPrompt}
        />
        <SnapshotManager />
      </div>

      {/* Selector Inspector Modal */}
      {showSelectorInspector && (
        <SelectorInspector
          customSelectors={customSelectors}
          onSaveSelectors={saveSelectors}
          onClose={() => setShowSelectorInspector(false)}
        />
      )}
    </div>
  )
}
