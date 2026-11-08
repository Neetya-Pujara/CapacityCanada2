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
- `/admin/resources` — protected Resource Library for managing resources, categories, and verification dates.
- `/onboarding` — redirects to nonprofit registration; the permanent orientation editor is in `/profile`.
- `/forgot-password` — password recovery UI; email delivery and reset tokens are not implemented yet.

Passwords are hashed server-side with bcrypt before storage. Session tokens are random, stored only as hashes in the database, and issued to the browser in an HTTP-only, SameSite=Lax cookie (Secure in production). “Remember me” sessions last 30 days; other sessions expire after 12 hours. Logout revokes the database session. Protected pages and API operations check the current database role.

## AI assistant configuration

Set `GEMINI_API_KEY` in `.env.local` to a Google AI Studio API key. Gemini calls are made only from the server with the `@google/genai` SDK and `gemini-3.5-flash-lite`, using a low thinking level, a 1,100-token response limit, and a 30-second request timeout with SDK retries disabled to avoid long waits; the key is never sent to the browser. Organization profile context and conversation messages are read from Tiger Data on the server for the authenticated nonprofit account. Responses are saved in the database, retries reuse an idempotency key, and unfinished requests are marked failed after one minute so they can be retried.

The assistant matches recent conversation context and organization support areas against resources with a verification date less than one year old. Gemini can only select from those database candidates; resource links and details are rendered from database records and saved as snapshots with assistant messages so conversation history remains intact after library edits or deletions. If no suitable verified resources are available, the assistant says so while still providing general strategies.

## Voice interaction

Set `ELEVENLABS_API_KEY` in `.env.local` to enable voice input and spoken assistant responses. The server uses ElevenLabs Speech to Text with `scribe_v2` and Text to Speech with `eleven_multilingual_v2`; it chooses the first default voice available to the account. Optionally set `ELEVENLABS_VOICE_ID` to select a specific voice instead. These settings are server-only and are never exposed to the browser.

In the assistant, choose **Record voice message**, speak for up to two minutes, and stop to transcribe. The editable transcript appears in the normal message composer and is only sent after you press **Send**. It then uses the existing authenticated conversation endpoint and Gemini pipeline, including organization context, history, resource recommendations, and message persistence. Use **Listen** on an assistant response to generate and play speech; pause, resume, and stop controls are available. Generated audio is cached only in browser memory for that page session and is not stored in the database.

Voice recording requires microphone permission and a secure browser context (HTTPS, or localhost). Recordings are limited to two minutes in the interface and 10 MB by the server; ElevenLabs rate limits, account access, or quota can prevent voice features from working, but typed chat remains available. Audio uploads are processed in memory and are not logged or persisted by this application. ElevenLabs handles its own API-side processing and retention according to the account’s plan and settings; configure the provider’s data-retention options appropriately for your organization.

After applying migrations, seed the initial 17 independently verified resources with:

```bash
npm run db:seed-resources
```

The seed script uses stable keys and skips existing records without changing administrator edits. Administrators can search, filter, add, edit, delete, and review verification status at `/admin/resources`. Links credited to other publishers in the Ontario Nonprofit Network library retain the credited source organization in the record.

## Schema and code layout

- `src/lib/db/schema.ts` defines users, organizations, profiles, sessions, conversations, messages, resources, and resource categories.
- Each nonprofit user references an organization; multiple staff accounts can reference one organization. Each organization has one profile row.
- `src/lib/db/index.ts` creates the reusable Tiger Data PostgreSQL/Drizzle connection.
- `src/lib/accounts.ts`, `src/lib/auth.ts`, and `src/lib/profile.ts` contain server-side account, session, and profile operations.
- `src/app/api/` contains account, profile, admin, and authenticated conversation endpoints.
- `src/lib/resources.ts` and `src/app/api/admin/resources/` implement the category-aware resource library and admin-only management APIs.
- `scripts/seed-resources.ts` inserts the verified initial library without overwriting existing resources.
- `drizzle/` contains generated migrations.
- `scripts/seed-admin.ts` creates the initial admin from local environment variables.

`.env.example` is safe to commit. `.env.local`, which holds the real database URL and admin password, is excluded from Git. Keep the temporary admin password private and change it through a deliberate account-maintenance process before production use.
