# Capacity Connect

Capacity Connect helps nonprofit organizations understand their operational needs and connect with capacity-building support.

## Run locally

Requirements: Node.js 20.9 or later and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Tiger Data database setup

1. In the Tiger Data console, open your PostgreSQL service and use its **Connect** instructions to copy the service connection string. Use the PostgreSQL URI for your application and preserve the SSL settings Tiger Data provides.
2. Put that full URI in `DATABASE_URL` in the local `.env.local` file. Do not commit this file.
3. Generate and apply the database migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local` to the initial admin credentials, then create the single initial admin account:

   ```bash
   npm run db:seed-admin
   ```

   The seed script hashes the password, creates an admin with no organization, and does not change an existing admin password when re-run. If `ADMIN_EMAIL` is set, it is used for the admin email; otherwise the script uses a reserved `.invalid` address. Public admin registration is not available.

The configured Tiger Data connection was verified before migration. The initial migration was applied to the empty `tsdb.public` database, and the admin account was seeded from `.env.local`. No test accounts or successful database writes are fabricated; temporary nonprofit records used during integration tests were removed.

## Account and profile experience

- `/register` and `/register/nonprofit` — create a Nonprofit Staff account and complete the six-step orientation.
- `/login` — choose Nonprofit Staff or Capacity Canada Admin; account role is checked against the database. Staff sign in to `/dashboard`.
- `/dashboard` — personalized workspace with a starting prompt and recent conversations.
- `/assistant` — profile-informed Gemini chat; `/history` — reopen or delete saved conversations.
- `/profile` — view and edit personal details, organization information, and orientation answers.
- `/admin` — protected Capacity Canada Admin landing page.
- `/onboarding` — redirects to nonprofit registration; the permanent orientation editor is in `/profile`.
- `/forgot-password` — password recovery UI; email delivery and reset tokens are not implemented yet.

Passwords are hashed server-side with bcrypt before storage. Session tokens are random, stored only as hashes in the database, and issued to the browser in an HTTP-only, SameSite=Lax cookie (Secure in production). “Remember me” sessions last 30 days; other sessions expire after 12 hours. Logout revokes the database session. Protected pages and API operations check the current database role.

## AI assistant configuration

Set `GEMINI_API_KEY` in `.env.local` to a Google AI Studio API key. Gemini calls are made only from the server with the `@google/genai` SDK and `gemini-3.8-flash`; the key is never sent to the browser. Organization profile context and conversation messages are read from Tiger Data on the server for the authenticated nonprofit account. Responses are saved in the database, and retries reuse an idempotency key.

Capacity Connect does not yet have a curated resource directory. The assistant is instructed to distinguish general resource types from verified resources and not fabricate organizations or links.

## Schema and code layout

- `src/lib/db/schema.ts` defines users, organizations, profiles, sessions, conversations, and messages.
- Each nonprofit user references an organization; multiple staff accounts can reference one organization. Each organization has one profile row.
- `src/lib/db/index.ts` creates the reusable Tiger Data PostgreSQL/Drizzle connection.
- `src/lib/accounts.ts`, `src/lib/auth.ts`, and `src/lib/profile.ts` contain server-side account, session, and profile operations.
- `src/app/api/` contains account, profile, admin, and authenticated conversation endpoints.
- `drizzle/` contains generated migrations.
- `scripts/seed-admin.ts` creates the initial admin from local environment variables.

`.env.example` is safe to commit. `.env.local`, which holds the real database URL and admin password, is excluded from Git. Keep the temporary admin password private and change it through a deliberate account-maintenance process before production use.
