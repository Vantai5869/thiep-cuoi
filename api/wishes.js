const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);
const MAX_WISHES_PER_IP = 2;

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS wishes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      ip TEXT NOT NULL,
      user_agent TEXT,
      location TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS location TEXT`;
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
  await ensureTable();

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT name, message, created_at AS "createdAt"
      FROM wishes
      ORDER BY created_at DESC
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { name, message } = req.body || {};

    if (!name || !message || !name.trim() || !message.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên và lời chúc.' });
    }
    if (name.length > 100 || message.length > 500) {
      return res.status(400).json({ error: 'Tên hoặc lời chúc quá dài.' });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    const [{ count }] = await sql`SELECT COUNT(*) FROM wishes WHERE ip = ${ip}`;
    if (Number(count) >= MAX_WISHES_PER_IP) {
      return res.status(429).json({
        error: `Bạn đã gửi tối đa ${MAX_WISHES_PER_IP} lời chúc rồi. Cảm ơn bạn rất nhiều! 💛`,
      });
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    const location = await lookupLocation(ip);

    const [wish] = await sql`
      INSERT INTO wishes (id, name, message, ip, user_agent, location)
      VALUES (${id}, ${trimmedName}, ${trimmedMessage}, ${ip}, ${userAgent}, ${location})
      RETURNING name, message, created_at AS "createdAt"
    `;

    return res.status(201).json({
      message: 'Cảm ơn bạn đã gửi lời chúc! 💌',
      wish,
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
};
