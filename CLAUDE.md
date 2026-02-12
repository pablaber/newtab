# newtab

Single-page React new-tab homepage. Reads config from `public/config.json`.

## Tech Stack

- React 19, TypeScript (strict), Vite 7, Node 24
- Functional components + hooks only (useState/useEffect/useMemo)
- Plain CSS (no frameworks, no CSS-in-JS)
- No routing, no state management libraries

## Structure

- `src/types/config.ts` — config schema interfaces
- `src/hooks/useConfig.ts` — fetches `/config.json`
- `src/components/` — BackgroundLayer, SearchBar, ModuleGrid, LinkModule, LinkItem
- `src/App.tsx` — assembles everything, manages filter state
- `src/App.css` — all component styles
- `src/index.css` — base reset
- `docker/` — Dockerfile (multi-stage) + nginx.conf

## Style

- Dark theme with translucent cards (`rgba(255,255,255,0.05)`)
- System font stack, white text
- Smooth hover transitions (150ms)
- Responsive from 600px to ultrawide

## Commands

- `npm run dev` — start dev server
- `npm run build` — typecheck + production build
- `npm run lint` — eslint
