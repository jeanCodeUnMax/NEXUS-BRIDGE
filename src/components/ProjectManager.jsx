import { useState } from 'react'
import { FolderOpen, Plus, Trash2, ChevronRight, FileText, Edit2, X, Check } from 'lucide-react'

export default function ProjectManager({ projects, sessions, activeProject, activeSession, onSelectProject, onSelectSession, onCreateProject, onCreateSession, onDeleteProject, onDeleteSession }) {
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectPrompt, setNewProjectPrompt] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [showNewSession, setShowNewSession] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  const projectSessions = activeProject
    ? sessions.filter(s => s.projectId === activeProject.id)
    : []

  function handleCreateProject(e) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    onCreateProject({
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      systemPrompt: newProjectPrompt.trim(),
      createdAt: new Date().toISOString()
    })
    setNewProjectName(''); setNewProjectDesc(''); setNewProjectPrompt('')
    setShowNewProject(false)
  }

  function handleCreateSession(e) {
    e.preventDefault()
    if (!newSessionName.trim() || !activeProject) return
    onCreateSession({
      id: crypto.randomUUID(),
      projectId: activeProject.id,
      name: newSessionName.trim(),
      providerIds: [],
      createdAt: new Date().toISOString()
    })
    setNewSessionName('')
    setShowNewSession(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Projects list */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Projets</span>
          <button onClick={() => setShowNewProject(!showNewProject)} style={btnStyle('#1a3a5c', 'var(--accent)')}>
            <Plus size={12} />
          </button>
        </div>

        {showNewProject && (
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-1)', marginBottom: 6, fontWeight: 600 }}>Nouveau projet</div>
            <input
              placeholder="Nom du projet *"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              style={inputStyle}
              autoFocus
            />
            <input
              placeholder="Description (optionnel)"
              value={newProjectDesc}
              onChange={e => setNewProjectDesc(e.target.value)}
              style={{ ...inputStyle, marginTop: 4 }}
            />
            <textarea
              placeholder="System prompt (optionnel) — contexte permanent injecté dans chaque message"
              value={newProjectPrompt}
              onChange={e => setNewProjectPrompt(e.target.value)}
              style={{ ...inputStyle, marginTop: 4, minHeight: 60, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <button onClick={handleCreateProject} style={btnStyle('var(--accent)', '#fff', true)}>
                <Check size={11} /> Créer
              </button>
              <button onClick={() => setShowNewProject(false)} style={btnStyle('var(--bg-2)', 'var(--text-1)')}>
                <X size={11} />
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
          {projects.length === 0 && (
            <div style={{ color: 'var(--text-2)', fontSize: 11, padding: '8px 4px', textAlign: 'center' }}>
              Aucun projet — créez-en un
            </div>
          )}
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
                borderRadius: 5, cursor: 'pointer',
                background: activeProject?.id === p.id ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${activeProject?.id === p.id ? 'var(--accent)' : 'transparent'}`,
                transition: 'background 0.1s'
              }}
            >
              <FolderOpen size={12} color={activeProject?.id === p.id ? 'var(--accent)' : 'var(--text-2)'} />
              <span style={{ flex: 1, fontSize: 12, color: activeProject?.id === p.id ? 'var(--text-0)' : 'var(--text-1)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <button
                onClick={e => { e.stopPropagation(); if (confirm(`Supprimer "${p.name}" ?`)) onDeleteProject(p.id) }}
                style={{ opacity: 0, ...btnStyle('transparent', 'var(--danger)') }}
                className="del-btn"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      {activeProject && (
        <div style={{ padding: '8px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Sessions</span>
              <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1 }}>{activeProject.name}</div>
            </div>
            <button onClick={() => setShowNewSession(!showNewSession)} style={btnStyle('#1a3a5c', 'var(--accent)')}>
              <Plus size={12} />
            </button>
          </div>

          {showNewSession && (
            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: 8, marginBottom: 6 }}>
              <input
                placeholder="Nom de la session *"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateSession(e)}
                style={inputStyle}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <button onClick={handleCreateSession} style={btnStyle('var(--accent)', '#fff', true)}>
                  <Check size={11} /> Créer
                </button>
                <button onClick={() => setShowNewSession(false)} style={btnStyle('var(--bg-2)', 'var(--text-1)')}>
                  <X size={11} />
                </button>
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {projectSessions.length === 0 && (
              <div style={{ color: 'var(--text-2)', fontSize: 11, padding: '8px 4px', textAlign: 'center' }}>
                Aucune session
              </div>
            )}
            {projectSessions.map(s => (
              <div
                key={s.id}
                onClick={() => onSelectSession(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
                  borderRadius: 5, cursor: 'pointer',
                  background: activeSession?.id === s.id ? '#1a2a1a' : 'transparent',
                  border: `1px solid ${activeSession?.id === s.id ? 'var(--success)' : 'transparent'}`,
                  transition: 'background 0.1s'
                }}
              >
                <ChevronRight size={10} color={activeSession?.id === s.id ? 'var(--success)' : 'var(--text-2)'} />
                <FileText size={11} color={activeSession?.id === s.id ? 'var(--success)' : 'var(--text-2)'} />
                <span style={{ flex: 1, fontSize: 12, color: activeSession?.id === s.id ? '#7fff7f' : 'var(--text-1)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Supprimer session "${s.name}" ?`)) onDeleteSession(s.id) }}
                  style={btnStyle('transparent', 'var(--danger)')}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeProject && (
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-2)' }}>
          {activeProject.systemPrompt && (
            <div style={{ background: 'var(--bg-3)', borderRadius: 4, padding: '4px 6px', marginBottom: 4 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>⚙ Prompt:</span>{' '}
              {activeProject.systemPrompt.slice(0, 60)}{activeProject.systemPrompt.length > 60 ? '…' : ''}
            </div>
          )}
          {activeProject.description && <div style={{ color: 'var(--text-2)' }}>{activeProject.description}</div>}
        </div>
      )}

      <style>{`.del-btn { opacity: 0 !important; } div:hover > .del-btn { opacity: 1 !important; }`}</style>
    </div>
  )
}

const btnStyle = (bg, color, withText = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 3,
  background: bg, color, border: 'none', borderRadius: 4,
  padding: withText ? '4px 8px' : '3px 5px',
  cursor: 'pointer', fontSize: 11, fontWeight: 500,
  transition: 'opacity 0.1s'
})

const inputStyle = {
  width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
  borderRadius: 4, padding: '5px 8px', color: 'var(--text-0)',
  fontSize: 12, outline: 'none', fontFamily: 'inherit'
}
