import { useState, useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'

export default function ChatInput({ onSend, isLoading, onStop, disabled, activeProviders }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [text])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    if (!text.trim() || isLoading || disabled) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const noProviders = activeProviders.length === 0

  return (
    <div style={{
      padding: '10px 12px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-1)'
    }}>
      {noProviders && (
        <div style={{ fontSize: 11, color: 'var(--warn)', marginBottom: 6, padding: '4px 8px', background: '#2d1f00', borderRadius: 4, border: '1px solid #5a3e00' }}>
          ⚠ Aucun provider actif — activez-en un dans le panneau de droite
        </div>
      )}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: 'var(--bg-2)', border: '1px solid var(--border-bright)',
        borderRadius: 8, padding: '6px 8px',
        transition: 'border-color 0.15s'
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Sélectionnez un projet et une session…' : 'Votre message… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)'}
          disabled={disabled || (isLoading && false)}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-0)', fontSize: 13, lineHeight: 1.5,
            resize: 'none', fontFamily: 'inherit',
            minHeight: 22, maxHeight: 200,
            opacity: disabled ? 0.5 : 1
          }}
        />
        {isLoading ? (
          <button
            onClick={onStop}
            style={{
              background: '#2d0a0a', border: '1px solid var(--danger)',
              borderRadius: 6, padding: '6px 10px', color: 'var(--danger)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap'
            }}
          >
            <Square size={12} /> Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled || noProviders}
            style={{
              background: text.trim() && !disabled && !noProviders ? 'var(--accent)' : 'var(--bg-3)',
              border: 'none', borderRadius: 6, padding: '6px 10px',
              color: text.trim() && !disabled && !noProviders ? '#fff' : 'var(--text-2)',
              cursor: text.trim() && !disabled && !noProviders ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 500, transition: 'all 0.15s'
            }}
          >
            <Send size={12} /> Envoyer
          </button>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>Providers actifs : {activeProviders.length > 0 ? activeProviders.join(', ') : 'aucun'}</span>
        <span>Entrée = envoyer · Maj+Entrée = nouvelle ligne</span>
      </div>
    </div>
  )
}
