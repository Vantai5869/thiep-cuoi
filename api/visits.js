const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      location TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

async function lookupLocation(ip) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'success') return null;
    return [data.city, data.regionName, data.country].filter(Boolean).join(', ') || null;
  } catch (err) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  await ensureTable();

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const location = await lookupLocation(ip);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  await sql`
    INSERT INTO visits (id, ip, location, user_agent)
    VALUES (${id}, ${ip}, ${location}, ${userAgent})
  `;

  return res.status(204).end();
};
