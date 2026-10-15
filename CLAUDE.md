# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies (required once; `node_modules/` is gitignored)
- `npm run dev` — Vite dev server on port 3000 (`server.open` is true, so it opens a browser)
- `npm run server` — API server on port 3001 (`server/index.mjs`, SQLite file at `data/game.db`, gitignored)
- `npm run dev:all` — runs the API server and the Vite dev server together (use this for login and score saving)
- `npm run build` — production build to `build/` (not `dist/`)

There is no test, lint, or typecheck script, no tsconfig.json, and no test framework. Vite/SWC strips TypeScript types without checking them, so `npm run build` does not catch type errors. There is no single-test command to run.

## Architecture

This is a single-screen React 18 + TypeScript game (a three-chest treasure hunt) built with Vite and the SWC React plugin. The entry is `index.html` → `src/main.tsx` → `src/App.tsx`.

- **Backend:** `server/index.mjs` is an Express server that uses Node's built-in `node:sqlite` (Node 22.13+/24). Tables: `users`, `scores`, `login_events`. Passwords are hashed with `crypto.scrypt`. Sessions are random tokens in an in-memory `Map` (cookie `sid`), so a server restart logs everyone out. Vite proxies `/api` to port 3001.
- **Guest mode:** the app can run without an account. Guests play normally, but `POST /api/scores` is never sent, so nothing is saved.
- **Score validation:** the server accepts only integers that are multiples of 50 in the range -150 to 100. Tighten this if the lose rule changes.
- **All game logic lives in `src/App.tsx`.** Game state is `boxes` (three `{id, isOpen, hasTreasure}` entries), `score`, and `gameEnded`. `initializeGame()` places one treasure at random and resets state; it runs on mount and on "Play Again". Opening a treasure adds +100, opening a skeleton subtracts 50, and the game ends once the treasure is found or every box is open. When a logged-in user finishes a game, the score is saved once (guarded by `savedRef`).
- `openBox` calls `setScore` from inside the `setBoxes` updater. This works, but it is a side effect inside an updater. Keep that in mind if you touch the scoring logic.
- **Styling:** components use Tailwind utility classes, but Tailwind is not a dependency. The styles come from the precompiled `src/index.css` (Tailwind v4.1.3 output), which `main.tsx` imports. A utility class that does not already appear in `index.css` will have no effect. `src/styles/globals.css` is not imported anywhere and is dead.
- **`src/components/ui/`** holds shadcn/ui-style primitives (Radix-based). Their imports carry version suffixes such as `from "cmdk@1.1.1"` or `"lucide-react@0.487.0"`. `vite.config.ts` maps each suffixed specifier back to the plain package name. Keep that pattern when you add or copy components, or the import will fail to resolve.
- The `@` alias resolves to `src/`.
- Assets are imported as modules: chest images from `src/assets/` and sound effects from `src/audios/` (`chest_open.mp3` for treasure, `chest_open_with_evil_laugh.mp3` for skeleton). `src/results/` holds a screenshot that the app does not import.
- `src/guidelines/Guidelines.md` is an unfilled template whose content is inside an HTML comment. It contains no project rules.

## Development History

Changes made on 2026-10-14:

- **Startup defaults to guest mode.** On mount, `App.tsx` calls `/api/me`. If there is no session (or the call fails), the game starts directly in guest mode instead of showing the auth screen.
- **Login/register moved to the top-right corner.** The header with the login/logout control is now `absolute top-4 right-4` inside a `relative` container. Previously it sat in a vertically centered column, so it was not in the corner. Guest mode shows "登入 / 註冊" there, and logged-in users see their username and "登出".
- **Logout returns to a guest game.** `logout()` now calls `enterGame(null)` and no longer shows the auth screen.
- **Verified:** `npm run build` passes. The changes have not been tested in a browser.
