<div align="center">
	<h1>AI World Economy Forecaster</h1>
	<p><strong>Interactive economic intelligence dashboard</strong> combining IMF & World Bank macro data, geospatial visualization, advanced charting, and Gemini-powered analytical chat.</p>
	<p>
		<a href="#quick-start">Quick Start</a> ·
		<a href="#features">Features</a> ·
		<a href="#api-endpoints">API</a> ·
		<a href="#architecture">Architecture</a>
	</p>
</div>

---

## Overview

This project provides a modern economic analysis interface that lets users:

1. Fetch and explore macroeconomic indicators from the IMF (SDMX 2.1) and World Bank APIs.
2. Visualize country-level trends via interactive maps and charts.
3. Chat with an LLM (Google Gemini) for contextual explanations, summaries, and comparative insights.
4. Export or snapshot data visualizations.

Built with Vite + React + TypeScript + Tailwind CSS + Radix UI primitives (via shadcn-style component layer). Data fetching/state is powered by TanStack Query. The backend layer consists of lightweight serverless handlers (Vercel-style) for data normalization, multi-source fallbacks, and AI interactions.

## Features

| Category | Highlights |
|----------|------------|
| Data Integration | IMF SDMX 2.1 (WEO/IFS/CPI/etc.), World Bank indicators with robust key normalization |
| Resilience | Automatic key variant generation (frequency, country code 2 vs 3 letters), multi-attempt logging |
| Visualization | Recharts time-series, React Simple Maps world choropleths, trend analysis summaries |
| UI/UX | Dark/light theme toggle, responsive layout, rich accessible components (Radix UI), command palette |
| Analytics Chat | Gemini models (2.5 Flash, 2.0 Flash experimental, 1.5 Flash/Pro) with context-driven prompts |
| Performance | Client-side caching w/ React Query; selective server fetch; minimal bundle via Vite + SWC |
| Extensibility | Modular endpoint handlers, clean utils, typed component primitives, zod-based form validation |

## Tech Stack

Frontend:
- React 18 + TypeScript
- Vite (dev, build, preview)
- Tailwind CSS + tailwindcss-animate + @tailwindcss/typography
- Radix UI + shadcn component abstractions (`src/components/ui/*`)
- Recharts, React Simple Maps, Embla Carousel, Framer Motion
- React Router DOM (routing) & next-themes (theme persistence)
- React Hook Form + Zod (forms & schema validation)

Backend / Serverless:
- Vercel serverless functions (`server/api/*`, `server/chat/*`)
- Custom IMF SDMX handler (`imf3.ts`) with WEO & World Bank special cases
- Gemini LLM integration (Google Generative Language API)

State/Utilities:
- TanStack React Query (data cache & lifecycle)
- Utility libs: `clsx`, `tailwind-merge`, `class-variance-authority`

Tooling:
- ESLint (typescript-eslint, react-refresh, hooks)
- TypeScript 5.x
- PostCSS + Autoprefixer

## Architecture

```text
├─ index.html                # Root HTML shell
├─ vite.config.ts            # Vite + React SWC configuration
├─ tailwind.config.ts        # Tailwind design tokens & content paths
├─ src/
│  ├─ main.tsx               # App bootstrap (React root)
│  ├─ App.tsx                # Top-level layout + router outlet
│  ├─ pages/                 # Route views (Landing, Dashboard, WorldMap, etc.)
│  ├─ components/            # Shared UI components
│  │  ├─ ui/                 # Shadcn/Radix wrapped primitives
│  │  ├─ ThemeToggle.tsx     # Theme switcher
│  │  └─ Logo.tsx            # Branding component
│  ├─ data/indicators.txt    # Reference list of indicator codes
│  ├─ hooks/                 # Custom hooks (mobile, toast)
│  ├─ lib/utils.ts           # Utility helpers (classnames, etc.)
│  └─ styles (App.css, index.css)
├─ api/                      # Client-facing serverless endpoints (Vercel pattern)
│  └─ chat/llm.ts            # Simplified chat handler
├─ server/                   # Production-grade serverless handlers
│  ├─ api/imf3.ts            # IMF & World Bank unified data handler
│  └─ chat/LLMChat.ts        # Robust Gemini chat with model fallbacks
└─ public/                   # Static assets (images, robots.txt)
```

### Data Flow (Fetch → Normalize → Present → Explain)
1. UI triggers indicator query (country + code + time range).
2. React Query calls `/api/imf3` with `type=data`.
3. Handler chooses source (IMF SDMX, WEO DataMapper JSON, or World Bank) and normalizes to `{date,value}` array.
4. Components render charts/maps + summary stats.
5. User invokes chat; context (stats + raw series) forms part of Gemini prompt.
6. Chat response displayed with attempt diagnostics for transparency.

## API Endpoints

### IMF / World Bank Unified
`GET /api/imf3`

Query Parameters:
- `type`: `data` | `availableconstraint` (default: `data`)
- `flowRef`: Dataset identifier (e.g. `IFS`, `WEO`, `CPI`, `WORLDBANK`)
- `key`: Composite key (examples below)
- `startPeriod`, `endPeriod`: Temporal bounds (year or date string)
- `providerRef`, `componentID`, `mode`, `references`: For `availableconstraint` metadata queries
- Additional passthrough meta: `freq`, `indicatorLabel`, `timeRange`, `clientTs`

Examples:
```text
/api/imf3?type=data&flowRef=WEO&key=A.US.NGDPD&startPeriod=2020&endPeriod=2025
/api/imf3?type=data&flowRef=IFS&key=A.US.NGDP_R_SA_IX&startPeriod=2015&endPeriod=2024
/api/imf3?type=availableconstraint&flowRef=CPI&key=ALL&providerRef=all&componentID=REF_AREA&mode=exact&references=none
```

Returns (simplified):
```jsonc
{
	"meta": { "flowRef": "IFS", "key": "A.US.NGDP_R_SA_IX", ... },
	"data": [ { "date": "2015", "value": 12345 }, ... ],
	"raw": {},
	"attempts": [ { "url": "...", "success": true, "dataPoints": 11 } ]
}
```

Key Variant Logic (automatic fallbacks):
- Adds/removes frequency (e.g. `A.US.NGDPD` ↔ `US.NGDPD`)
- Converts 2-letter ↔ 3-letter country codes for WEO/DataMapper
- Tries alternate dimension orders when needed

### Gemini Chat
`POST /api/chat/llm` or `POST /server/chat/LLMChat` (depending on deployment routing)

Body:
```jsonc
{
	"message": "Explain recent GDP trends for the US.",
	"context": {
		"country": "United States",
		"indicator": "GDP (current USD)",
		"timeRange": "2015-2024",
		"data": [ { "year": "2015", "value": 18219256 }, ... ]
	}
}
```

Response:
```json
{ "success": true, "response": "GDP has shown..." }
```

Advanced handler (`LLMChat.ts`) also supports model enumeration (`listModels`) and detailed attempt logs for multi-model fallbacks.

## Environment Variables

Create a `.env.local` (or Vercel project env) with:

```bash
IMF_API_KEY=your_imf_subscription_key        # Optional; improves quota for IMF SDMX
CHART_API_KEY=alternate_imf_key              # Optional secondary key
LLM_API_KEY=your_gemini_api_key              # Required for server chat handler
VITE_LLM_API_KEY=your_gemini_api_key         # If needed client-side (avoid exposing sensitive keys)
```

Never commit real keys. Prefer only server-side usage for LLM.

## Quick Start

```bash
# Clone
git clone https://github.com/senipatel/ai-world-economy-forcaster.git
cd ai-world-economy-forcaster

# Install (choose one)
npm install
# or
pnpm install

# Run dev
npm run dev

# Open
http://localhost:5173
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build (Vite) |
| `npm run build:dev` | Development-mode build (useful for debugging size) |
| `npm run preview` | Preview built assets locally |
| `npm run lint` | Run ESLint across project |

## Styling & Components

- Tailwind utility-first styling; design tokens configured in `tailwind.config.ts`.
- Radix UI primitives wrapped in reusable components under `src/components/ui`.
- `class-variance-authority` + `tailwind-merge` ensure consistent variant and class composition.
- Dark/light theme toggle integrated via `next-themes`.

## Data Visualization

- Time-series charts built with Recharts.
- World map visualization with `react-simple-maps` (projection + geo features).
- Carousel and animated transitions via Embla + Framer Motion.

## Performance Considerations

- React Query memoizes results and minimizes duplicate requests.
- SDMX responses normalized into compact arrays to reduce render overhead.
- Attempt logging helps diagnose slow/failing external calls.
- Vite + SWC ensures fast cold starts and incremental builds.

## Error Handling & Resilience

- Multi-attempt logging for API calls (`attempts[]`) with URL & status details.
- Graceful degradation if WEO SDMX returns empty (fallback to DataMapper JSON).
- World Bank integration provides supplemental health/environment indicators.
- Gemini handler rotates through model list; aborts early on auth/quota errors.

## Extending

Add a new data source:
1. Create a new endpoint file in `server/api/`.
2. Implement fetch + normalization to `{date,value}` shape.
3. Return consistent `{ meta, data, raw, attempts }` envelope.
4. Wire a front-end hook (React Query) and visualization component.

## Deployment

Designed for Vercel (see `vercel.json`). Steps:
1. Set environment variables in the Vercel dashboard.
2. Push `main` → triggers build & deployment.
3. Test API routes (`/api/imf3`, `/api/chat/llm`).

## Contributing

Contributions welcome! Please:
1. Open an issue describing enhancement or bug.
2. Fork & create a feature branch.
3. Add/update relevant documentation & basic tests (if logic added).
4. Submit pull request referencing issue.

## Roadmap / Ideas

- Caching layer for IMF queries (edge KV or Redis)
- Country comparison mode & multi-series overlay
- Export options: CSV, PNG (currently exploring html2canvas)
- More indicators autocomplete + fuzzy search
- User accounts & saved dashboards

## License

No license specified yet. If you intend the code to be open source, consider adding an OSI-approved license (MIT, Apache-2.0, GPL-3.0). Until then, all rights reserved.

## Disclaimer

Economic data may lag or contain revisions. Always verify critical figures with official IMF / World Bank releases. LLM-generated analysis can produce errors—use judgment before relying on output for decisions.

## Acknowledgments

- International Monetary Fund SDMX API
- World Bank Open Data API
- Google Gemini Generative Language API
- Radix UI & shadcn component patterns
- TanStack React Query maintainers

---

> Built for rapid macroeconomic insight and experimentation.

