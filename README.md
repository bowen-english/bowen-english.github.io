# English Shadow Coach

A private static web app for English shadow practice: one AI chats naturally, while another AI silently reviews your English and stores feedback in the browser.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenRouter chat completions API called directly from the browser
- Browser `localStorage` for API key, messages, feedback, and settings

## Setup

```bash
npm install
./run
```

Open the app, paste your OpenRouter API key into Settings, and it will be saved in this browser's `localStorage`.

The default models are:

- Chat Partner: `google/gemini-3.5-flash`
- Silent Coach: `google/gemini-3.5-flash`
- TTS: `google/gemini-3.5-flash`

The model fields are editable in the UI and saved locally.

The app can load OpenRouter models automatically. When an API key is saved it first tries the account-scoped model list; otherwise it falls back to OpenRouter's public model list. You can still type a model ID manually in either model field.

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

## Context Modes

- `latest_user`: Silent Coach only sees the user's latest sentence.
- `latest_user_with_partner`: Silent Coach sees the user's latest sentence plus the previous Chat Partner reply.
- `recent_full`: Silent Coach sees the latest N user turns with surrounding Chat Partner context.

The explanation language setting controls whether Silent Coach explains feedback in Chinese or English.

## Project Shape

- [app/page.tsx](app/page.tsx): main client UI and localStorage orchestration.
- [lib/openrouter-browser.ts](lib/openrouter-browser.ts): browser-side OpenRouter request wrapper.
- [lib/prompts.ts](lib/prompts.ts): Chat Partner and Silent Coach system prompts.
