# Archispace DevMan — Project Context

## What this is
Internal development project management tool for Archispace. Built with React + Vite + Supabase + Vercel.

## Live URL
https://devman-liart.vercel.app

## Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Zustand, React Router v6, Lucide icons
- **Backend:** Supabase (PostgreSQL + real-time) — project: `ayedbsknuxtpzkykfidg`
- **Hosting:** Vercel — team: `thth-ths-projects`, project: `devman`

## Source code locations
- **Working copy (PC):** `C:\Users\tim\devman\`
- **Google Drive sync:** `G:\Other computers\My Computer (1)\Documents\Cowork\projects\DevMan\`

## Environment variables (in .env)
- `VITE_SUPABASE_URL=https://ayedbsknuxtpzkykfidg.supabase.co`
- `VITE_SUPABASE_ANON_KEY=sb_publishable_Fx2EUdNHIG2EXpVObpCCGA_Lo3Xc7T8`

## Deploying changes
Run these two commands from `C:\Users\tim\devman\`:
```
npx vercel build --prod --token <VERCEL_TOKEN> --scope thth-ths-projects --yes
npx vercel deploy --prebuilt --prod --token <VERCEL_TOKEN> --scope thth-ths-projects --yes
```
(Vercel token stored locally — do not commit it)

## Key files
- `src/store/useStore.js` — all data logic, Supabase queries, real-time subscriptions
- `src/data/checklistTemplate.js` — the 87 default checklist items across 10 stages
- `src/data/stages.js` — the 10 project stages with colours
- `src/pages/` — all page components
- `src/components/` — shared components

## Database tables (Supabase)
- `projects` — project records
- `checklist_items` — checklist items per project/stage
- `milestones` — milestone dates per project
- `activity_log` — activity feed entries

## Node.js
Installed at `C:\Program Files\nodejs\`
npm packages installed at `C:\Users\tim\devman\node_modules\`
