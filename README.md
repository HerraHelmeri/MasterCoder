# CodeAgent

CodeAgent is a desktop AI code workspace built with Electron. It pairs a VS Code-style file explorer with a chat assistant, file context picker, and a Monaco-based code viewer/editor.

## Highlights

- Explorer with create, rename, copy, and delete actions
- Chat UI with code blocks, syntax highlighting, and a thinking indicator
- Floating prompt bar aligned to the message area
- Context selection for model prompts
- Monaco modal editor for viewing/editing files

## Stack

- Electron
- React + TypeScript
- Vite + Tailwind (CDN)
- Monaco Editor

## Setup

Requirements:
- Node.js 18+

Install:
```
npm install
```

Configure Gemini:
- Create or edit `.env.local`
- Add `GEMINI_API_KEY=your_key_here`

Run:
```
npm run dev
```

## Commands

```
npm run dev
npm run build
npm run preview
```

## Notes

- File operations are restricted to the selected workspace root.
- TypeScript diagnostics follow your `tsconfig.json` when present.
