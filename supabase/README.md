# Supabase — WalletPulse

Project ref: `bcfoapakolbatnubxgqt` (region `eu-west-1`).

This folder mirrors what is deployed on the Supabase project so the backend is
reproducible from the repo. The code was deployed via the Cursor Supabase MCP
on 2026-04-23; any subsequent change should go through `supabase` CLI or MCP
and be mirrored here.

## Layout

- `config.toml` — CLI project config (pins project ref, `verify_jwt=false` for reset functions).
- `migrations/*.sql` — DDL, idempotent.
- `functions/send-reset-email/index.ts` — generates + emails a 6-digit reset code.
- `functions/reset-password/index.ts` — verifies code and updates `users.password_hash`.

## Password reset flow

```
Client (ForgotPasswordScreen)
  -> POST /functions/v1/send-reset-email { email }
       -> users table lookup (anti-enumeration: unknown emails still return 200)
       -> rate limit: max 3 codes / hour / user
       -> invalidate previous unused codes
       -> insert new 6-digit code into password_reset_tokens (TTL 15 min)
       -> denomailer SMTP (Gmail 465 implicit TLS) sends the email

Client (ResetPasswordScreen)
  -> POST /functions/v1/reset-password { email, code, new_password }
       -> look up latest unused, unexpired code
       -> bump attempts (max 5, then invalidate)
       -> constant-time compare
       -> hash new password (sha256(salt + password), same scheme as client)
       -> update users.password_hash, mark token used
       -> delete all sessions for user (force re-login everywhere)
```

Error handling contract:
- `send-reset-email` returns 200 for unknown emails *or* rate-limited requests
  (anti-enumeration). Real failures return a 4xx/5xx with `{error}` so the
  client can show a useful message.
- `reset-password` returns 400 with a generic `"Invalid or expired reset code"`
  whenever the code is wrong / expired / user unknown — never reveals which.

## SMTP choice: Gmail over port 465, denomailer pinned to 1.4.0

Gmail on port **587** (STARTTLS) does not work on Supabase Edge because
denomailer ≥ 1.5.0 has a regression that breaks the TLS upgrade
(https://github.com/EC-Nordbund/denomailer/issues/82). Using port **465**
(implicit TLS) with denomailer **1.4.0** is the known-working combination.

If you rotate to a different SMTP provider (Resend, Postmark, SendGrid), strip
the `denomailer` import and use their HTTPS API instead — no TLS handshake
shenanigans.

## Deploying

### With the Supabase CLI

```bash
# One-time
supabase link --project-ref bcfoapakolbatnubxgqt

# DB
supabase db push

# Functions
supabase functions deploy send-reset-email reset-password --no-verify-jwt

# Secrets (recommended — rotate SMTP creds out of source)
supabase secrets set \
  SMTP_HOST=smtp.gmail.com \
  SMTP_PORT=465 \
  SMTP_USER=tamiratkebede120@gmail.com \
  SMTP_PASS='<gmail app password>' \
  EMAIL_FROM='WalletPulse <tamiratkebede120@gmail.com>'
```

The function source currently ships fallback SMTP values so it runs without
any secrets configured. Once `supabase secrets set` is run, the secrets take
precedence and you can scrub the fallbacks from the source.

### Via the Cursor Supabase MCP

Use `apply_migration` and `deploy_edge_function` tools — there is no `secrets
set` equivalent, so secrets must still go through the CLI or the dashboard
(Project Settings → Edge Functions → Secrets).

## Testing

```bash
# From a laptop, with anon key (required by gateway even when verify_jwt=false)
ANON=$(grep SUPABASE_ANON_KEY .env | cut -d= -f2)
curl -sS -X POST "https://bcfoapakolbatnubxgqt.supabase.co/functions/v1/send-reset-email" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -d '{"email":"you@example.com"}'
# -> {"success": true} and an email arrives within ~10s
```

To see the active code row while testing:

```sql
SELECT id, code, used, attempts, expires_at
FROM public.password_reset_tokens
ORDER BY created_at DESC
LIMIT 5;
```
