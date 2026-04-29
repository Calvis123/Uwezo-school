# Uwezo School (Next.js + Prisma + Supabase Postgres)

## Prereqs

- Node.js (recommended: current LTS)
- A Supabase project (Postgres database)

## Setup

1. Create `.env` from `.env.example` and fill in:
   - `DATABASE_URL`: Supabase pooler URL (PgBouncer, port `6543`)
   - `DIRECT_URL`: Supabase direct URL (port `5432`, used for migrations)

2. Install deps:

```powershell
npm.cmd install
```

3. Create/update DB schema:

```powershell
npm.cmd run db:migrate
```

4. Seed demo data (optional):

```powershell
npm.cmd run db:seed
```

5. Run dev server:

```powershell
npm.cmd run dev
```

## Notes

- For production migrations use `npm.cmd run db:migrate:deploy`.
- Supabase requires SSL; the example connection strings include `sslmode=require`.

