# AI Assistant (UI Template Collection)

A static HTML/CSS/JS sub-page with a procedural 3D robot (Three.js via CDN), chat history, working message search, voice in/out and a serverless AI backend. No npm, React, Vite or localhost needed.

## Research notes
- **AI assistants** answer questions and run tasks in natural language; they appear in support, coding help, education and accessibility tools.
- **Modern patterns:** persistent chat history, streaming/“thinking” feedback, per-answer actions (copy, speak, regenerate), voice input and output, code blocks with copy buttons.
- **3D assistants** give the AI a visible state (idle, listening, thinking, speaking), which makes waiting and voice interaction clearer.

## Implementation
- `index.html`, `style.css`, `script.js`: UI, chat logic, search, Web Speech API (SpeechRecognition, SpeechSynthesis).
- Theme: Obsidian Foil (dark default, light via the Theme button).
- Robot: built from Three.js primitives (no `robot.glb` needed, no crown). Eyes, mouth, core and head animate per state. `prefers-reduced-motion` damps motion.
- History: `localStorage` (`id, title, createdAt, updatedAt, messages[]`). AI text is rendered with DOM APIs, never raw `innerHTML`.
- Backend: your own Cloudflare Worker (Workers AI + Tavily). Page sends {message, history}, expects {reply}. Set ALLOWED_ORIGIN to your site origin(s).

## Deploy
1. **Frontend:** commit the `ai-assistant/` folder into `UI-Template-Collection/` and push. GitHub Pages serves `/UI-Template-Collection/ai-assistant/` (all paths are relative). The backend folder can stay out of the repo if you prefer.
2. **Backend:** `npm i -g wrangler`, then in `backend/`: `wrangler deploy worker.js --name ai-assistant-api`, then `wrangler secret put GEMINI_API_KEY`. Edit `ORIGIN` in `worker.js` to your Pages origin.
3. Put the Worker URL (ending `/api/chat`) in `API_URL` at the top of `script.js`.

## Why the key is not in frontend code
GitHub Pages files are public; anyone can read `script.js` and steal the key. The key lives only as a server-side secret in the Worker, and the Worker restricts CORS to your site.

## Browser notes
Voice input needs Chrome/Edge/Safari and microphone permission, on HTTPS (GitHub Pages is).
