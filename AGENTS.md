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
│   │   ├── HomeScreen.tsx         — navigation, command, and modal state; composes children
│   │   └── components/
│   │       ├── CommandPalette.tsx — searchable commands and command-specific forms
│   │       ├── SearchBar.tsx
│   │       ├── ModuleGrid.tsx
│   │       ├── LinkModule.tsx
│   │       └── LinkItem.tsx
│   └── ConfigEditorScreen/
│       ├── index.ts
│       ├── ConfigEditorScreen.tsx — header, tab bar, import/export modal
│       └── components/
│           ├── GeneralTab.tsx    — general settings (background + search placeholder)
│           └── LinksTab.tsx      — section + link CRUD with reordering & validation
├── hooks/
│   └── useConfig.ts       — fetches /config.json, persists to localStorage
├── utils/
│   ├── linkConfig.ts     — shared link constraints and URL normalization
│   └── foreground.ts     — foreground (text color) resolution from background config
├── index.css              — base reset + CSS custom properties
├── main.tsx
└── types/
    └── config.ts          — config schema interfaces
docker/
├── Dockerfile             — multi-stage build (deps → build → nginx)
└── nginx.conf
.dockerignore              — keeps node_modules/dist/.git/.context out of the build context
```

### Screen pattern

Each screen lives in `src/screens/<ScreenName>/` with:
- `index.ts` — re-exports the main component
- `<ScreenName>.tsx` — the screen component
- `components/` — components specific to that screen

Shared components used across screens stay in `src/components/`.

## Style

- Adaptive text color via CSS custom properties — `--fg` (RGB triplet) is set dynamically by `resolveForeground` in `src/utils/foreground.ts` (`0, 0, 0` on light backgrounds, `255, 255, 255` on dark), or forced by the `background.foreground` setting (`auto` | `light` | `dark`). All text and translucent surfaces must use `rgb(var(--fg))` / `rgba(var(--fg), <alpha>)` instead of hardcoded `#fff` or `rgba(255,255,255,...)`.
- `--dropdown-bg` (RGB triplet) is used for dropdown surfaces, also flips with background luminance.
- Translucent cards use `rgba(var(--fg), 0.05)`
- System font stack
- Smooth hover transitions (150ms)
- Responsive from 600px to ultrawide

## Git

- NEVER push directly to the main branch. Always create a feature branch and open a PR.
- Branch pattern: `<type>/<short-description>` (e.g. `feat/add-search`, `fix/broken-links`, `chore/update-deps`)
- Commit messages: single-line, lowercase, no Co-Authored-By lines
- PR titles: conventional commit format without scope (e.g. `chore: add ci workflows`)

## Commands

- `npm run dev` — start dev server (port 3541)
- `npm run build` — typecheck + production build
- `npm run lint` — eslint
- `npm run test` — run all tests once (vitest)
- `npm run test:watch` — run tests in watch mode

## Testing

- Always keep tests up to date when adding new features or editing existing ones
- Test files are co-located next to source files (e.g. `LinkItem.test.tsx` beside `LinkItem.tsx`)
- Shared test fixtures live in `src/test/fixtures.ts`

## Verification

Always run lint, tests, and build to verify changes:

```
npm run lint && npm run test && npm run build
```

When changing dependencies, also run the audits CI enforces (see `docs/security.md`):

```
npm audit --omit=dev --audit-level=low && npm audit --audit-level=high
```
