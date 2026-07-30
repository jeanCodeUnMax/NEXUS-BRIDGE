# 🧠 NEXUS Bridge

Application web multi-provider AI avec bridges DOM vers interfaces gratuites.

## Structure

```
nexus-bridge/
├── src/                    ← App React (Vite)
│   ├── components/
│   ├── hooks/
│   ├── providers/
│   └── utils/
├── extension/              ← Extension Chrome (charger manuellement)
│   ├── content_scripts/    ← Un script par site AI
│   ├── background.js
│   ├── manifest.json
│   └── popup.html
└── README.md
```

## Installation — App React

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Installation — Extension Chrome

1. Ouvrir Chrome → `chrome://extensions/`
2. Activer **Mode développeur** (toggle en haut à droite)
3. Cliquer **Charger l'extension non empaquetée**
4. Sélectionner le dossier `extension/`
5. L'icône NEXUS apparaît dans la barre d'outils

## Utilisation

### Providers API directs (Ollama, Anthropic, OpenRouter, Groq)
1. Dans le panneau **Providers** (droite), activer le toggle
2. Saisir la clé API si nécessaire
3. Choisir le modèle
4. C'est prêt — les réponses arrivent en streaming

### Providers DOM Bridge (ChatGPT, Claude.ai, Gemini, Mistral, Perplexity)
1. Ouvrir l'onglet du site dans Chrome (ex: chatgpt.com)
2. Se connecter normalement
3. Le content script s'auto-enregistre (voir popup extension)
4. Activer le toggle dans NEXUS
5. Envoyer un message — NEXUS injecte et capture automatiquement

> **Note :** Les providers DOM Bridge nécessitent que l'onglet reste ouvert.

## Projets & Sessions

- **Projet** = contexte permanent (system prompt, description)
- **Session** = conversation dans un projet
- Chaque session peut utiliser plusieurs providers simultanément

## Export

- **MD** : Markdown avec thinking, métadonnées, timestamps
- **JSON** : Export complet structuré pour archivage/analyse

## Mise à jour des sélecteurs DOM

Si un site change son interface, éditez `extension/content_scripts/<site>.js` :
```javascript
const SELECTORS = {
  input: '#nouveau-selecteur',
  response: '.nouvelle-classe-reponse',
  streaming_signal: '.indicateur-chargement'
}
```
Puis rechargez l'extension dans `chrome://extensions/`.

## Providers supportés

| Provider | Type | Modèles | Clé requise |
|----------|------|---------|-------------|
| Ollama | API locale | llama3.2, mistral, codestral… | Non |
| Anthropic | API cloud | claude-sonnet-4-6, opus, haiku | Oui |
| OpenRouter | API cloud | mistral-7b-free, llama-free… | Oui |
| Groq | API cloud | llama-3.1-8b, mixtral… | Oui |
| ChatGPT | DOM Bridge | GPT-4o (Free) | Non (session) |
| Claude.ai | DOM Bridge | Claude (Free) | Non (session) |
| Gemini | DOM Bridge | Gemini (Free) | Non (session) |
| Mistral | DOM Bridge | Mistral (Free) | Non (session) |
| Perplexity | DOM Bridge | Perplexity (Free) | Non (session) |
