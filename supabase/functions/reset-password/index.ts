import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MAX_ATTEMPTS = 5;

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

// Mirror of src/shared/utils/crypto.ts hashPassword(): sha256(salt + password)
// stored as `${salt}:${hash}`. Keeps hashes compatible with signIn on the client.
async function hashPassword(password: string): Promise<string> {
  const saltBytes = new Uint8Array(32);
  crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const data = new TextEncoder().encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${salt}:${hash}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: CORS_HEADERS});
  }
  if (req.method !== 'POST') {
    return json({error: 'Method not allowed'}, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({error: 'Server misconfigured'}, 500);
  }

  let email: string;
  let code: string;
  let newPassword: string;
  try {
    const body = await req.json();
    email = String(body?.email ?? '').trim().toLowerCase();
    code = String(body?.code ?? '').trim();
    newPassword = String(body?.new_password ?? '');
  } catch {
    return json({error: 'Invalid JSON body'}, 400);
  }

  if (!email || !code || !newPassword) {
    return json({error: 'Email, code, and new_password are required'}, 400);
  }
  if (newPassword.length < 8) {
    return json({error: 'Password must be at least 8 characters'}, 400);
  }
  if (!/^\d{6}$/.test(code)) {
    return json({error: 'Invalid reset code'}, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const {data: user} = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    return json({error: 'Invalid or expired reset code'}, 400);
  }

  const nowIso = new Date().toISOString();
  const {data: token} = await supabase
    .from('password_reset_tokens')
    .select('id, code, attempts')
    .eq('user_id', user.id)
    .eq('used', false)
    .gt('expires_at', nowIso)
    .order('created_at', {ascending: false})
    .limit(1)
    .maybeSingle();

  if (!token) {
    return json({error: 'Invalid or expired reset code'}, 400);
  }

  const nextAttempts = ((token.attempts as number) ?? 0) + 1;
  await supabase
    .from('password_reset_tokens')
    .update({attempts: nextAttempts})
    .eq('id', token.id);

  if (nextAttempts > MAX_ATTEMPTS) {
    await supabase
      .from('password_reset_tokens')
      .update({used: true})
      .eq('id', token.id);
    return json({error: 'Too many attempts. Request a new code.'}, 400);
  }

  if (!constantTimeEqual(String(token.code), code)) {
    return json({error: 'Invalid or expired reset code'}, 400);
  }

  const passwordHash = await hashPassword(newPassword);

  const {error: updateError} = await supabase
    .from('users')
    .update({password_hash: passwordHash, updated_at: nowIso})
    .eq('id', user.id);

  if (updateError) {
    console.error('[reset-password] update failed', updateError);
    return json({error: 'Failed to update password'}, 500);
  }

  await supabase
    .from('password_reset_tokens')
    .update({used: true})
    .eq('id', token.id);

  // Invalidate every existing session so old devices get logged out.
  await supabase.from('sessions').delete().eq('user_id', user.id);

  return json({success: true});
});
