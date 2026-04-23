import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
// Pinned to 1.4.0 because 1.5.x+ has a STARTTLS regression on Supabase Edge
// (see https://github.com/EC-Nordbund/denomailer/issues/82). We also prefer
// port 465 (implicit TLS) over 587 (STARTTLS) for the same reason.
import {SMTPClient} from 'https://deno.land/x/denomailer@1.4.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SMTP_HOST = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com';
// Default to 465 (implicit TLS) because STARTTLS on 587 is broken on Edge.
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? '465');
const SMTP_USER = Deno.env.get('SMTP_USER') ?? 'tamiratkebede120@gmail.com';
const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? 'hswudlxtuzxkmora';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? `WalletPulse <${SMTP_USER}>`;

const CODE_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...CORS_HEADERS, 'Content-Type': 'application/json'},
  });
}

function generateCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = new DataView(bytes.buffer).getUint32(0) % 1_000_000;
  return n.toString().padStart(6, '0');
}

function buildEmail(code: string, userName: string) {
  const text = `Hi ${userName},\n\nYour WalletPulse password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\n- WalletPulse`;
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;">
  <h2 style="color:#6C5CE7;margin:0 0 16px;font-size:20px;">WalletPulse</h2>
  <p style="color:#1A1D1F;font-size:15px;margin:0 0 8px;">Hi ${userName},</p>
  <p style="color:#6F767E;font-size:15px;margin:0 0 20px;line-height:22px;">You requested a password reset. Enter the code below in the app to continue:</p>
  <div style="background:#F4F4FF;border-radius:12px;padding:24px;text-align:center;margin:16px 0 20px;">
    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#6C5CE7;font-variant-numeric:tabular-nums;">${code}</span>
  </div>
  <p style="color:#6F767E;font-size:13px;margin:0 0 8px;">This code expires in 15 minutes.</p>
  <p style="color:#9A9FA5;font-size:12px;margin:24px 0 0;line-height:18px;">If you did not request this reset, you can safely ignore this email. Your password will not be changed.</p>
</div>`;
  return {text, html};
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: CORS_HEADERS});
  }
  if (req.method !== 'POST') {
    return json({error: 'Method not allowed'}, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[send-reset-email] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return json({error: 'Server misconfigured'}, 500);
  }
  if (!SMTP_USER || !SMTP_PASS) {
    console.error('[send-reset-email] SMTP credentials missing');
    return json({error: 'Email service not configured'}, 500);
  }

  let email: string;
  try {
    const body = await req.json();
    email = String(body?.email ?? '').trim().toLowerCase();
  } catch {
    return json({error: 'Invalid JSON body'}, 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({error: 'Valid email is required'}, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const {data: user, error: userErr} = await supabase
    .from('users')
    .select('id, full_name')
    .eq('email', email)
    .maybeSingle();

  if (userErr) {
    console.error('[send-reset-email] user lookup failed', userErr);
    return json({error: 'Lookup failed'}, 500);
  }

  if (!user) {
    // Anti-enumeration: return 200 for unknown emails.
    return json({success: true});
  }

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const {count: recentCount} = await supabase
    .from('password_reset_tokens')
    .select('id', {count: 'exact', head: true})
    .eq('user_id', user.id)
    .gte('created_at', since);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    console.warn(`[send-reset-email] rate limit hit for user ${user.id}`);
    return json({success: true});
  }

  await supabase
    .from('password_reset_tokens')
    .update({used: true})
    .eq('user_id', user.id)
    .eq('used', false);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const {error: insertErr} = await supabase.from('password_reset_tokens').insert({
    user_id: user.id,
    code,
    expires_at: expiresAt,
    used: false,
  });

  if (insertErr) {
    console.error('[send-reset-email] token insert failed', insertErr);
    return json({error: 'Failed to create reset code'}, 500);
  }

  const useImplicitTls = SMTP_PORT === 465;
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: useImplicitTls,
      auth: {username: SMTP_USER, password: SMTP_PASS},
    },
  });

  const userName = (user.full_name as string)?.trim() || 'there';
  const {text, html} = buildEmail(code, userName);

  try {
    await client.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your WalletPulse password reset code',
      content: text,
      html,
    });
  } catch (err) {
    console.error(
      '[send-reset-email] SMTP send failed',
      err instanceof Error ? err.message : err,
    );
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    await supabase
      .from('password_reset_tokens')
      .update({used: true})
      .eq('user_id', user.id)
      .eq('code', code);
    return json({error: 'Failed to send email'}, 500);
  }

  try {
    await client.close();
  } catch {
    /* ignore */
  }

  return json({success: true});
});
