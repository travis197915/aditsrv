# UHC Claims Audit Review Dashboard

A React SPA for reviewing and auditing behavioral health claims. Auditors browse a claims listing, drill into per-claim agent execution details, and approve or reject reviews. Authentication is live against the Node identity service; claims data is currently served from local mock data until backend APIs are wired.

Branded for **Optum** (orange `#FF612B` primary).

---

## Tech Stack

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| Framework       | React 19 + TypeScript 5.9                               |
| Build           | Vite 7 (`@vitejs/plugin-react`)                         |
| Styling         | Tailwind CSS 4 + shadcn/ui primitives                   |
| Data            | TanStack Query 5 + native `fetch` via `src/lib/api.ts`  |
| Routing         | React Router DOM 7                                      |
| Icons           | lucide-react                                            |
| Package Manager | Yarn                                                    |

---

## Quick Start

```bash
yarn install
yarn dev        # http://localhost:5173
yarn build      # tsc -b && vite build → dist/
yarn preview    # serve the production build
yarn lint       # eslint .
yarn compile    # tsc -b (typecheck only)
```

---

## Backend Architecture

```
React SPA (this repo)
 │  fetch + JWT Bearer
 ▼
Node relay (claims-corebackend, port 4000)
 │  Identity: /auth/login, /auth/me, /auth/change-password
 ▼
JWT stored in localStorage → used on all authenticated requests
```

**Live today:** login, session restore, profile, change password.

**Pending:** claims listing, claim detail, stats, filters, approve/reject — currently backed by `src/data/dummy-claims.ts`.

---

## Environment

| Variable                 | Used by                          | Default                 |
| ------------------------ | -------------------------------- | ----------------------- |
| `VITE_API_BASE_URL`      | Legacy fallback for auth URL     | mirrors auth URL        |

---

## Routing Map

| Path             | Component              | Data source                          |
| ---------------- | ---------------------- | ------------------------------------ |
| `/login`         | `routes/login`         | `POST /auth/login`                   |
| `/`              | redirect → `/claims`   | —                                    |
| `/claims`        | `routes/claims`        | `dummy-claims.ts` (mock)             |
| `/claims/:id`    | `routes/claims/[id]`   | `dummy-claims.ts` (mock)             |
| `/profile`       | `routes/profile`       | JWT user + `POST /auth/change-password` |
| `*`              | `components/NotFound`  | —                                    |

Everything except `/login` is wrapped by `<ProtectedRoute>`, which redirects unauthenticated users to `/login`.

---

## Project Structure

```
src/
├── main.tsx                         # QueryClient + Theme + Auth + Router
├── index.css                        # Tailwind + Optum theme tokens
│
├── routes/
│   ├── index.tsx                    # Route table
│   ├── login/index.tsx              # Optum-branded login
│   ├── claims/
│   │   ├── index.tsx                # Listing — stats, filters, table, pagination
│   │   └── [id]/index.tsx           # Detail — agent executions, feedback, approve/reject
│   └── profile/index.tsx            # User info + change password
│
├── layouts/
│   └── TopNavLayout.tsx             # Sticky header (logo, Back on detail, user menu)
│
├── components/
│   ├── StatusChip.tsx               # AiStatusChip + ReviewStatusChip (pill badges)
│   ├── DateFilterInput.tsx          # mm-dd-yyyy display + native calendar picker
│   ├── ProtectedRoute.tsx           # Auth guard
│   ├── FormPanel/                   # Shared form shell (login)
│   └── ui/                          # shadcn: button, input, textarea, alert
│
├── contexts/
│   └── AuthContext.tsx              # login / logout / session restore
│
├── data/
│   └── dummy-claims.ts              # Mock claims list, stats, and detail payloads
│
├── lib/
│   ├── api.ts                       # authApi client + CorebackendUser types
│   ├── theme.tsx                    # ThemeProvider (light default)
│   └── utils.ts                     # cn() — clsx + tailwind-merge
│
├── types/
│   └── index.ts                     # ClaimRecord, ClaimDetail, status enums, User
│
└── utils/
    └── auth.ts                      # Token storage, JWT decode helpers
```

---

## Pages

### Claims listing (`/claims`)

- **Stat cards** — total claims audited, accuracy %, average processing time
- **Filters** — claim ID search, review status, AI status, platform date range (calendar pickers), Apply / Clear / Upload
- **Table** — sortable-style columns with `AiStatusChip` and `ReviewStatusChip`
- **Pagination** — page controls + rows-per-page selector

### Claim details (`/claims/:id`)

- Orange-bordered execution panel with agent accordion cards
- Per-agent status chips, step breakdown, process summary
- Feedback textarea + Approve / Reject actions (UI only — not wired to API)
- **Back** button in header (`TopNavLayout showBack`)

### Profile (`/profile`)

- Current user name, email, role
- Change password form → `POST /auth/change-password`

---

## REST Endpoints (identity)

All via `authApi` in `src/lib/api.ts` — base URL from `VITE_AUTH_API_BASE_URL`.

| Method | Path                    | Used by              |
| ------ | ----------------------- | -------------------- |
| POST   | `/auth/login`           | Login page           |
| GET    | `/auth/me`              | Session restore      |
| POST   | `/auth/change-password` | Profile page         |

Token is stored under `localStorage.token`; cached user under `localStorage.auth_user`. A 401 from any request clears auth and redirects to `/login`.

---

## Development Notes

### Adding a new page

1. Create `src/routes/<domain>/index.tsx`
2. Add types to `src/types/index.ts` if needed
3. Register the route in `src/routes/index.tsx`
4. Wrap content in `<TopNavLayout>` for consistent chrome

### Status chips

Use `AiStatusChip` and `ReviewStatusChip` from `@/components/StatusChip` — do not inline badge styles in tables.

### Date filters

Use `DateFilterInput` from `@/components/DateFilterInput` — displays `mm-dd-yyyy`, opens native calendar on click.

### Path aliases

`@/*` → `src/*` (configured in `vite.config.ts` and `tsconfig.app.json`).

---

## What is NOT yet integrated

- **Claims APIs** — listing, detail, stats, filters, approve/reject still read from `dummy-claims.ts`
- **Upload button** — present in the filter bar, no handler yet
- **Date range filtering** — state is captured on Apply but not applied to the mock dataset
- **Real-time notifications** — header bell/plus actions removed; no replacement planned yet

When backend endpoints are ready, replace `dummy-claims.ts` imports with TanStack Query hooks calling the new REST routes through an extended `src/lib/api.ts` client.
