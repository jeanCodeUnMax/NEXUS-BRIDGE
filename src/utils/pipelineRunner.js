/**
 * NEXUS Pipeline Runner
 * Executes a multi-agent pipeline with roles, shared manifesto, loops and scoring
 */

import { callApiProvider } from './apiCaller'
import providersConfig from '../providers/providers-config.json'

const ALL_PROVIDERS = [...providersConfig.api, ...providersConfig.dom_bridge]

// Extract confidence score from agent response (looks for /10 or %)
export function extractScore(text) {
  // Pattern: 8/10, 7.5/10, score: 8, confiance: 85%
  const patterns = [
    /(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /score\s*[:=]\s*(\d+(?:\.\d+)?)/i,
    /confian[ct]e\s*[:=]\s*(\d+(?:\.\d+)?)%/i,
    /note\s*[:=]\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\/10/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const val = parseFloat(m[1])
      // Normalize to /10
      if (val > 10) return val / 10
      return val
    }
  }
  return null
}

// Detect stagnation: score didn't improve enough over last N turns
export function detectStagnation(scoreHistory, threshold = 0.5, window = 2) {
  if (scoreHistory.length < window + 1) return false
  const recent = scoreHistory.slice(-window)
  const delta = Math.max(...recent) - Math.min(...recent)
  return delta < threshold
}

// Summarize manifesto using an API provider
export async function summarizeManifesto(manifesto, provider, apiKeys, providerModels) {
  const enriched = { ...provider, selectedModel: providerModels[provider.id] || provider.defaultModel }
  const messages = [
    {
      role: 'user',
      content: `Résume ce manifeste de façon concise en gardant uniquement les décisions clés, les scores et les points de blocage. Maximum 500 mots.\n\n${manifesto}`
    }
  ]
  let result = ''
  await callApiProvider(enriched, messages, apiKeys, chunk => { result += chunk })
  return result
}

// Run one pipeline step
export async function runStep(step, manifesto, userObjective, apiKeys, providerModels, onChunk) {
  const provider = ALL_PROVIDERS.find(p => p.id === step.providerId)
  if (!provider || provider.type === 'dom') {
    throw new Error(`Provider "${step.providerId}" non disponible pour le pipeline (DOM Bridge non supporté en mode automatique)`)
  }

  const enriched = { ...provider, selectedModel: providerModels[provider.id] || provider.defaultModel }

  const systemPrompt = `Tu es ${step.role}.
${step.systemPrompt || ''}

OBJECTIF GLOBAL : ${userObjective}

MANIFESTE PARTAGÉ (contexte cumulatif de tous les agents) :
---
${manifesto || '(vide — premier tour)'}
---

Lis attentivement le manifeste avant de contribuer. Ajoute ta contribution claire et structurée.
${step.mustScore ? `\nIMPORTANT : Tu DOIS terminer ta réponse avec une note de confiance au format X/10 (ex: "Score de confiance : 8/10")` : ''}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: step.userPrompt || `Effectue ton rôle de ${step.role} sur l'objectif ci-dessus.` }
  ]

  let fullResponse = ''
  await callApiProvider(enriched, messages, apiKeys, chunk => {
    fullResponse += chunk
    onChunk?.(chunk)
  })

  const score = step.mustScore ? extractScore(fullResponse) : null
  return { response: fullResponse, score }
}
