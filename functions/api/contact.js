// Cloudflare Pages Function: POST /api/contact
// Sends the contact form to the enquiries@ shared mailbox via Microsoft Graph,
// as that mailbox, with Reply-To set to the enquirer.
//
// Environment (Pages > Settings > Variables and Secrets):
//   GRAPH_TENANT_ID      plain text
//   GRAPH_CLIENT_ID      plain text
//   GRAPH_CLIENT_SECRET  secret
//   MAIL_TO              plain text, e.g. enquiries@battramassociates.co.uk

const MAX = { name: 120, email: 200, phone: 40, service: 60, message: 5000 };
const SERVICES = ['Building Survey', 'Specific Defect', 'Party Wall', 'Historic Building',
  'Extension', 'Renovation', 'New Bespoke Dwelling', 'Something Else', ''];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function reply(request, ok, message, status = ok ? 200 : 400) {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify({ ok, message }), {
      status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
  const url = new URL(ok ? '/thanks/' : '/contact/?error=1', request.url);
  return Response.redirect(url.toString(), 303);
}

async function rateLimited(request) {
  // Simple per-IP limit: 3 submissions per 10 minutes, per Cloudflare location.
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const key = new Request(`https://rate-limit.internal/contact/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  const hit = await cache.match(key);
  const count = hit ? parseInt(await hit.text(), 10) || 0 : 0;
  if (count >= 3) return true;
  await cache.put(key, new Response(String(count + 1), { headers: { 'cache-control': 'max-age=600' } }));
  return false;
}

async function graphToken(env) {
  const body = new URLSearchParams({
    client_id: env.GRAPH_CLIENT_ID,
    client_secret: env.GRAPH_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const r = await fetch(`https://login.microsoftonline.com/${env.GRAPH_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  if (!r.ok) throw new Error(`token ${r.status}`);
  return (await r.json()).access_token;
}

export async function onRequestPost({ request, env }) {
  let form;
  try { form = await request.formData(); } catch { return reply(request, false, 'Invalid submission.'); }
  const f = {};
  for (const k of ['name', 'email', 'phone', 'service', 'message', 'company', 'ts']) {
    f[k] = String(form.get(k) || '').trim();
  }

  // Bots: honeypot filled, or submitted within 3 seconds of the page loading.
  // Pretend success so they don't retry.
  const age = Date.now() - Number(f.ts || 0);
  if (f.company || (f.ts && age < 3000)) return reply(request, true, 'Thank you.');

  // Validation
  if (!f.name || !f.email || !f.message) return reply(request, false, 'Please fill in your name, email and message.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return reply(request, false, 'Please check your email address.');
  for (const k in MAX) if (f[k].length > MAX[k]) return reply(request, false, 'One of the fields is too long.');
  if (!SERVICES.includes(f.service)) f.service = 'Something Else';
  if (/\r|\n/.test(f.name + f.email)) return reply(request, false, 'Invalid submission.');

  if (await rateLimited(request)) return reply(request, false, 'Too many messages from your connection. Please try again later or call us on 01442 890019.', 429);

  if (!env.GRAPH_TENANT_ID || !env.GRAPH_CLIENT_ID || !env.GRAPH_CLIENT_SECRET || !env.MAIL_TO) {
    return reply(request, false, 'The form is not configured yet. Please email enquiries@battramassociates.co.uk.', 503);
  }

  const subject = `Website enquiry: ${f.service || 'General'} from ${f.name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#20201e">
      <p style="font-size:16px"><strong>New enquiry from the website</strong></p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td style="color:#77736b">Name</td><td>${esc(f.name)}</td></tr>
        <tr><td style="color:#77736b">Email</td><td><a href="mailto:${esc(f.email)}">${esc(f.email)}</a></td></tr>
        <tr><td style="color:#77736b">Telephone</td><td>${esc(f.phone) || '-'}</td></tr>
        <tr><td style="color:#77736b">Project type</td><td>${esc(f.service) || '-'}</td></tr>
      </table>
      <p style="color:#77736b;margin-top:18px">Message</p>
      <p style="white-space:pre-wrap">${esc(f.message)}</p>
      <hr style="border:0;border-top:1px solid #d6d2ca;margin:24px 0">
      <p style="font-size:12px;color:#77736b">Sent from the contact form on battramassociates.co.uk. Reply to this email to respond directly to ${esc(f.name)}.</p>
    </div>`;

  try {
    const token = await graphToken(env);
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.MAIL_TO)}/sendMail`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: env.MAIL_TO } }],
          replyTo: [{ emailAddress: { address: f.email, name: f.name } }],
        },
        saveToSentItems: false,
      }),
    });
    if (r.status !== 202) throw new Error(`sendMail ${r.status}`);
  } catch (err) {
    console.log('contact form send failed:', err.message); // never logs the secret
    return reply(request, false, 'Sorry, something went wrong sending your message. Please email enquiries@battramassociates.co.uk or call 01442 890019.', 502);
  }

  return reply(request, true, 'Thank you. Your message has been sent and we will be in touch shortly.');
}

export function onRequest() {
  return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
}
