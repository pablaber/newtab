# Optional account sync setup

Account sync is available only in hosted builds. Guest and self-hosted builds continue to use the existing `newtab-config` localStorage entry and do not require Supabase.

## 1. Provision Supabase

1. Create or link the production Supabase project.
2. Apply the migrations in `supabase/migrations/` with the Supabase CLI or the SQL editor.
3. In **Authentication → Hooks**, enable the **Before User Created** Postgres hook and select `public.hook_restrict_sync_beta_signup`.
4. Keep email signup enabled. The hook rejects new users whose normalized email is not in `public.sync_beta_allowlist`; existing users can continue signing in.
5. Confirm that anonymous sign-ins and password login are not exposed by the app.

Never expose a secret or service-role key to Vite. The browser needs only the project URL and publishable key; row-level security protects config rows.

The desired hook is also declared in `supabase/config.toml`. The database-only CI workflow cannot apply hosted Auth service configuration: `supabase config push` uses the Supabase Management API and requires account-level authentication. The dashboard step is therefore a one-time production bootstrap while CI remains restricted to the project database URL.

## 2. Configure login email

1. Verify `thenewtab.app` in Resend and publish the requested SPF and DKIM DNS records.
2. Configure Supabase custom SMTP with a sender such as `newtab <login@thenewtab.app>`.
3. Replace the Supabase magic-link email body with `supabase/templates/login-code.html`, which displays `{{ .Token }}`.
4. Keep the OTP length at six digits and configure the desired expiry and rate limits in Supabase Auth.
5. Send test codes to at least two email providers before enabling the production build.

## 3. Add beta users

Normalize beta emails to lowercase before inserting them:

```sql
insert into public.sync_beta_allowlist (email)
values ('person@example.com');
```

Removing an allowlist row does not revoke an existing account. To revoke access, ban or delete the user from **Authentication → Users**.

## 4. Deploy the hosted build

Set these build-time variables in the hosted deployment:

```text
VITE_HOSTED=true
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

If either Supabase value is absent, account UI and network access remain disabled. This is also the rollback path; guest configs are unaffected.

For the repository Docker image, pass the same values as build arguments:

```bash
docker build -f docker/Dockerfile \
  --build-arg VITE_HOSTED=true \
  --build-arg VITE_SUPABASE_URL=https://PROJECT.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
  -t newtab .
```

### GitHub release configuration

The Release Please workflow applies unapplied migrations before deploying the hosted Cloudflare build. It performs a dry run followed by `supabase db push`; Cloudflare deployment does not start if either step fails. Docker publishing remains independent because the default Docker image is local-only.

Add these **repository secrets** under **GitHub → repository Settings → Secrets and variables → Actions → Secrets → New repository secret**:

| Secret | Value |
| --- | --- |
| `SUPABASE_DB_URL` | The production project's Session pooler connection string from **Supabase project → Connect**, with `[YOUR-PASSWORD]` replaced by the URL-encoded database password. |

Add these **repository variables** under **GitHub → repository Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | The project URL, such as `https://abcdefgh.supabase.co`. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project's publishable browser key from **Project Settings → API Keys**. This value is intentionally public and protected by RLS. |

Do not use the Supabase secret/service-role key for `VITE_SUPABASE_PUBLISHABLE_KEY`. Vite embeds `VITE_` values into the public browser bundle.

The migration workflow intentionally uses a project-specific database URL instead of a Supabase personal access token. The URL grants PostgreSQL administration access to this one project but does not grant Supabase account-management access or access to other projects. Treat it as a sensitive production secret.

Use the **Session pooler** string because GitHub-hosted runners support IPv4. It normally resembles:

```text
postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@REGION.pooler.supabase.com:5432/postgres
```

If the database password contains reserved URL characters such as `@`, `:`, `/`, `?`, `#`, or `%`, percent-encode the password portion before saving the URL. Keep schema changes in `supabase/migrations/`; direct production changes through the SQL or Table Editor can cause migration history drift.

For the initial setup, apply the schema before releasing the account UI:

1. Open the repository's **Actions** tab in GitHub.
2. Select **Migrate Supabase**.
3. Choose **Run workflow**, select `main`, and confirm.
4. Wait for both the migration preview and apply steps to succeed.
5. Add beta emails to `public.sync_beta_allowlist` and enable the auth hook before releasing the hosted app.

The manual workflow uses the same concurrency lock as release migrations, so it will wait rather than run alongside a release migration.

## 5. Support and deletion

Route `support@thenewtab.app` to a monitored mailbox. For a verified deletion request:

1. Remove the email from `public.sync_beta_allowlist`.
2. Delete the user from **Authentication → Users**.
3. Confirm the matching `public.user_configs` row was removed by the foreign-key cascade.

The service stores the account email in Supabase Auth, the allowlisted email in the private beta table, and the complete config JSON in `public.user_configs`. It does not provide end-to-end encryption.

## 6. Release smoke test

1. Confirm an unlisted email is rejected and an allowlisted email receives a six-digit code.
2. Sign in from two browsers and verify saves appear after refocusing the other browser.
3. Disconnect one browser, save locally, reconnect, and retry sync.
4. Sign out and confirm the browser's original guest config returns.
5. Use two test users to confirm neither can select or update the other's `user_configs` row.
