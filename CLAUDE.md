# newtab

Single-page React new-tab homepage. Reads config from `public/config.json`.

## Tech Stack

- React 19, TypeScript (strict), Vite 7, Node 24
- Functional components + hooks only (useState/useEffect/useMemo)
- Plain CSS (no frameworks, no CSS-in-JS)
- No routing, no state management libraries

## Structure

```
src/
├── App.css                — all component styles
├── App.tsx                — thin shell: config loading, light/dark mode, screen switching
├── components/
│   └── BackgroundLayer.tsx — shared background component (used by both screens)
├── screens/
│   ├── HomeScreen/
│   │   ├── index.ts
│   │   ├── HomeScreen.tsx         — navigating state, settings button, composes children
│   │   └── components/
│   │       ├── SearchBar.tsx
│   │       ├── ModuleGrid.tsx
│   │       ├── LinkModule.tsx
│   │       └── LinkItem.tsx
│   └── ConfigEditorScreen/
│       ├── index.ts
│       ├── ConfigEditorScreen.tsx — header, tab bar, import/export modal
│       └── components/
│           ├── BackgroundTab.tsx  — background settings (image, color, opacity)
│           └── LinksTab.tsx      — section + link CRUD with reordering & validation
├── hooks/
│   └── useConfig.ts       — fetches /config.json, persists to localStorage
├── index.css              — base reset + CSS custom properties
├── main.tsx
└── types/
    └── config.ts          — config schema interfaces
docker/
├── Dockerfile             — multi-stage build
└── nginx.conf
```

### Screen pattern

Each screen lives in `src/screens/<ScreenName>/` with:
- `index.ts` — re-exports the main component
- `<ScreenName>.tsx` — the screen component
- `components/` — components specific to that screen

Shared components used across screens stay in `src/components/`.

## Style

- Adaptive text color via CSS custom properties — `--fg` (RGB triplet) is set dynamically based on background color luminance (`0, 0, 0` on light backgrounds, `255, 255, 255` on dark). All text and translucent surfaces must use `rgb(var(--fg))` / `rgba(var(--fg), <alpha>)` instead of hardcoded `#fff` or `rgba(255,255,255,...)`.
- `--dropdown-bg` (RGB triplet) is used for dropdown surfaces, also flips with background luminance.
- Translucent cards use `rgba(var(--fg), 0.05)`
- System font stack
- Smooth hover transitions (150ms)
- Responsive from 600px to ultrawide

## Git

- Branch pattern: `<type>/<short-description>` (e.g. `feat/add-search`, `fix/broken-links`, `chore/update-deps`)
- Commit messages: single-line, lowercase, no Co-Authored-By lines
- PR titles: conventional commit format without scope (e.g. `chore: add ci workflows`)

## Commands

- `npm run dev` — start dev server (port 3541)
- `npm run build` — typecheck + production build
- `npm run lint` — eslint
- `npm run test` — run all tests once (vitest)
- `npm run test:watch` — run tests in watch mode

## Verification

Always run lint, tests, and build to verify changes:

```
npm run lint && npm run test && npm run build
```
