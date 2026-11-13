# FinSight

A personal finance dashboard with local AI (Ollama) integration, built with Next.js 16, React 19, Tailwind CSS v4, and Prisma.

## Project Structure

```
Finsight-v8/
├── frontend/   ← Next.js PWA (deploy to Vercel)
└── backend/    ← Express + Prisma API (deploy to Railway / Render / VPS)
```

---

## Local Development

```bash
# 1. Start backend (port 5002)
cd backend && npm install && npm run dev

# 2. Start frontend (port 3000)
cd frontend && npm install && npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deployment (Frontend)

### Prerequisites
- Backend deployed and publicly accessible (e.g. Railway, Render, or a VPS with HTTPS)
- Vercel account connected to this repository

### Steps

1. **Import the repository** in Vercel. It will auto-detect the monorepo.

2. **Set Environment Variables** in Vercel project settings:

   | Variable | Value |
   |---|---|
   | `BACKEND_URL` | `https://your-backend-url.com` |
   | `NEXT_PUBLIC_API_URL` | `/api` |

3. **Update `vercel.json`** — replace the placeholder rewrite destination:
   ```json
   "destination": "https://your-backend-url.com/api/$1"
   ```

4. **Deploy** — Vercel will run `cd frontend && npm install && npm run build` automatically.

> [!IMPORTANT]
> The backend uses Ollama for AI features. Ollama **cannot** run on Vercel (serverless). Host the backend on a machine where Ollama is installed (Railway + a companion VPS, or a self-hosted server).

---

## Backend Deployment (Railway / Render)

```bash
cd backend
# Set environment variables:
# DATABASE_URL, JWT_SECRET, OLLAMA_URL, PORT=5002
npm install && npm run build && npm start
```

---

## PWA / Mobile App

FinSight is installable as a PWA on iOS and Android.
- On iOS: Safari → Share → Add to Home Screen
- On Android: Chrome → ⋮ → Install App

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Animation | Framer Motion 13, GSAP 3 |
| Charts | Recharts 3 |
| Backend | Express, Prisma, PostgreSQL |
| AI | Ollama (local LLM) |
| Auth | JWT (httpOnly cookies) |

