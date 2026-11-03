const { kv } = require('@vercel/kv');

const MAX_WISHES_PER_IP = 2;

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const raw = await kv.lrange('wishes', 0, -1);
    const wishes = raw.map((w) => {
      const { name, message, createdAt } = typeof w === 'string' ? JSON.parse(w) : w;
      return { name, message, createdAt };
    });
    return res.status(200).json(wishes);
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

    const countFromIp = Number(await kv.hget('ip_counts', ip)) || 0;
    if (countFromIp >= MAX_WISHES_PER_IP) {
      return res.status(429).json({
        error: `Bạn đã gửi tối đa ${MAX_WISHES_PER_IP} lời chúc rồi. Cảm ơn bạn rất nhiều! 💛`,
      });
    }

    const wish = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      message: message.trim(),
      ip,
      userAgent,
      createdAt: new Date().toISOString(),
    };

    await kv.lpush('wishes', JSON.stringify(wish));
    await kv.hincrby('ip_counts', ip, 1);

    return res.status(201).json({
      message: 'Cảm ơn bạn đã gửi lời chúc! 💌',
      wish: { name: wish.name, message: wish.message, createdAt: wish.createdAt },
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
};
