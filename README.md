# SimpleJobTracker

A minimal job-search tracker built with Next.js, Supabase, and Tailwind CSS.
Users authenticate with a magic link, organize applications by job search, and
track statuses, follow-ups, and timeline events.

## Stack

- Next.js 16 and React 19
- Supabase Auth and PostgreSQL with row-level security
- Tailwind CSS
- Vitest, pgTAP, and Playwright
- GitHub Actions

## Prerequisites

Install these before starting:

- Node.js 22 or newer
- npm
- Docker Desktop or another Docker-compatible container runtime
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Local Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Start the local Supabase stack:

   ```bash
   supabase start
   ```

3. Read the local API URL and anonymous key:

   ```bash
   supabase status
   ```

4. Create `.env.local` using the `API_URL` and `ANON_KEY` values:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
   ```

5. Start Next.js:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

Use one hostname consistently. The local auth configuration uses
`http://localhost:3000` for redirects, so opening the app with `localhost` is
recommended.

### Local Services

| Service | URL |
| --- | --- |
| Application | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Local email inbox | http://127.0.0.1:54324 |

### Magic-Link Sign-In

Open `/app`, enter an email address, and submit the magic-link form. Local
emails are captured rather than delivered:

1. Open the [local email inbox](http://127.0.0.1:54324).
2. Select the newest sign-in email.
3. Follow its link.
4. Supabase redirects back to `/auth/callback`, establishes the session, and
   sends the browser to `/app`.

## Database Development

Schema changes live in `supabase/migrations`.

Apply new migrations without deleting local data:

```bash
supabase migration up --local
```

Recreate the database and replay every migration:

```bash
supabase db reset --local --no-seed
```

This reset permanently deletes local users and application data.

Regenerate the committed Supabase TypeScript definitions after a schema or
function change:

```bash
npm run db:types
```

CI regenerates `types/database.ts` and fails if the committed definitions are
stale.

## Quality Checks

Local Supabase must be running for integration and database tests.

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run test:unit` | Run validation and mapping unit tests |
| `npm run test:unit:coverage` | Run unit tests with an HTML coverage report |
| `npm run test:integration` | Test the Supabase API, RPCs, and user isolation |
| `npm run test:db` | Run pgTAP RLS and database-function tests |
| `npm run test:e2e` | Run real magic-link and CRUD browser tests |
| `npm test` | Run unit, API integration, and database tests |
| `npm run check` | Run lint, type checking, and `npm test` |
| `npm run build` | Create a production Next.js build |

Playwright stores screenshots, videos, and traces only when a test fails.

## Continuous Integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`. It:

1. Starts local Supabase.
2. Rebuilds the database from migrations.
3. Verifies generated database types.
4. Runs pgTAP, unit, and API integration tests.
5. Runs lint and TypeScript checks.
6. Builds the production application.
7. Runs Playwright in Chromium.

Coverage and failed Playwright reports are uploaded as workflow artifacts.

## Deployment

The recommended production setup is a Supabase Cloud project plus a Vercel
Next.js deployment.

### 1. Deploy the Database

Create a Supabase project, then authenticate and link the CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Review and apply the committed migrations:

```bash
supabase db push --dry-run
supabase db push
```

Do not make production-only schema changes manually in the dashboard. Add a
migration locally, test it, and push it through the same workflow.

### 2. Configure Supabase Auth

In **Supabase Dashboard > Authentication > URL Configuration**, set:

- **Site URL:** `https://your-domain.example`
- **Redirect URLs:**
  - `https://your-domain.example/auth/callback?next=/app`
  - `https://your-domain.example/auth/confirm?next=/app`

Add separate allowed URLs for staging or preview deployments that need to
authenticate. Keep production, staging, and preview databases separate when
they contain different migration states or test data.

### 3. Configure Vercel

Import the GitHub repository into Vercel and add these environment variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-project-anon-or-publishable-key
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_PUBLIC_DSN@YOUR_SENTRY_HOST/YOUR_PROJECT_ID
SENTRY_AUTH_TOKEN=your-sentry-build-token
```

Apply them to the appropriate Preview and Production environments. Never expose
the Supabase service-role key or give it a `NEXT_PUBLIC_` prefix.
`NEXT_PUBLIC_SENTRY_DSN` enables error reporting in each runtime and is safe to
expose to the browser. `SENTRY_AUTH_TOKEN` is a secret used only during builds
to upload source maps; do not give it a `NEXT_PUBLIC_` prefix. For local error
reporting, add `NEXT_PUBLIC_SENTRY_DSN` to `.env.local`. Local builds do not
need `SENTRY_AUTH_TOKEN`.

Deploy the application after the database migrations and auth URLs are in
place. Vercel will detect Next.js and use the repository's build command.

## Useful References

- [Supabase local development](https://supabase.com/docs/guides/cli/local-development)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
