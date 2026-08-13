# Loca8tor

Nigeria's postcode generator and address system — turn a location into a shareable postcode, generate it, and get your parcel delivered without stress.

## Stack

Vite + React + TypeScript + Tailwind (shadcn/radix) on the frontend, Supabase (Postgres, Auth, Edge Functions) on the backend, packaged for mobile via Capacitor, deployed on Vercel.

## Getting started

```
npm install
cp .env.example .env   # fill in your Supabase project's URL + publishable key
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest suite |

See [`CLAUDE.md`](./CLAUDE.md) for project structure, Supabase workflow, and deployment notes.
