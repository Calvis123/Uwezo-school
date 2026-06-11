# Uwezo School Frontend

## Prereqs

- Node.js (recommended: current LTS)
- Running backend API service

## Setup

1. Create `.env` from `.env.example` and set `BACKEND_URL` to the backend API URL.

2. Install deps:

```powershell
npm.cmd install
```

3. Run dev server:

```powershell
npm.cmd run dev
```

## Notes

- The frontend does not connect to PostgreSQL directly.
- Browser requests to `/api/*` are proxied to `BACKEND_URL` by `next.config.ts`.
