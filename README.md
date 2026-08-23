# English Shadow Coach

A private static web app for English shadow practice: one AI chats naturally, while another AI silently reviews your English and stores feedback in the browser.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenRouter chat completions API called directly from the browser
- Browser `localStorage` for API key, messages, feedback, and settings
- Browser IndexedDB for bounded speech-audio caching

## Setup

```bash
npm install
./run
```

Open the app, paste your OpenRouter API key into Settings, and it will be saved in this browser's `localStorage`.

The default models are:

- Chat Partner: `openai/gpt-5.6-luna`
- Silent Coach: `openai/gpt-5.6-luna`
- TTS: `google/gemini-3.1-flash-tts-preview`

Chat and coaching intentionally share Luna as the fast, cost-efficient default.
TTS stays on a dedicated speech model because Luna produces text, not audio.
All built-in GPT-5.6 requests use `reasoning.effort: medium`. Chat Partner
responses stream into the conversation as they arrive; final messages are saved
only after the stream completes.

The model fields are editable and saved locally. Opening Settings lazily loads
OpenRouter's current all-modality catalog once, separates text from dedicated
speech models, and caches the result for six hours in `sessionStorage`. With an
API key it first tries the account-scoped list, then falls back to the public
catalog. “Test selected models” performs a real streaming Chat, structured
Coach, and TTS smoke test.

Requests have cancellation, timeouts, bounded retries, completion limits, and
per-conversation request isolation. Structured Coach output is schema-validated
and gets one automatic repair attempt if necessary.

## Static Deploy

```bash
npm run build
```

The static site is generated in `out/`.

For a GitHub Pages project site, set the base path before building:

```bash
NEXT_PUBLIC_BASE_PATH=/your-repo-name npm run build
```

Do not commit API keys. The deployed app asks for the key in the browser and stores it locally on each device/browser.

This repository includes a GitHub Pages workflow at `.github/workflows/nextjs.yml`. For the special `bowen-english.github.io` repository, no base path is needed; pushing to `main` builds and deploys the static site automatically.

`./run` is a small local launcher. It starts the Next.js dev server and creates `.env.local` from `.env.example` if the runtime env file is missing.

## Local History

Conversations are saved as local browser sessions. You can start a new conversation, switch between saved conversations, or delete individual conversations from the history bar. Settings, draft text, and the OpenRouter API key are also kept in `localStorage`.

Drafts are stored per conversation and written with a short debounce. Deleted
conversations can be restored from the seven-second Undo notice. Generated
speech is cached in IndexedDB with a 75 MB / 200-entry least-recently-used cap;
in-memory object URLs are capped separately.

If browser storage is unavailable or full, the app shows a visible warning
instead of silently losing changes.

## Validation

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Context Modes

- `latest_user`: Silent Coach only sees the user's latest sentence.
- `latest_user_with_partner`: Silent Coach sees the user's latest sentence plus the previous Chat Partner reply.
- `recent_full`: Silent Coach sees the latest N user turns with surrounding Chat Partner context.

The explanation language setting controls whether Silent Coach explains feedback in Chinese or English.

## Project Shape

- [app/page.tsx](app/page.tsx): main client UI and localStorage orchestration.
- [lib/openrouter-browser.ts](lib/openrouter-browser.ts): browser-side OpenRouter request wrapper.
- [lib/structured-responses.ts](lib/structured-responses.ts): validated Coach and voice response parsing.
- [lib/audio-cache.ts](lib/audio-cache.ts): bounded IndexedDB audio cache.
- [hooks/use-request-registry.ts](hooks/use-request-registry.ts): request cancellation and stale-response protection.
- [lib/prompts.ts](lib/prompts.ts): Chat Partner and Silent Coach system prompts.
