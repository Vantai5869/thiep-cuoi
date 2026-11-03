const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function formatTime(date) {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = async function handler(req, res) {
  await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      location TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const wishes = await sql`
    SELECT name, message, ip, user_agent AS "userAgent", location, created_at AS "createdAt"
    FROM wishes
    ORDER BY created_at DESC
  `;

  const visits = await sql`
    SELECT ip, location, user_agent AS "userAgent", created_at AS "createdAt"
    FROM visits
    ORDER BY created_at DESC
  `;

  const rows = wishes
    .map(
      (w) => `
    <tr>
      <td>${escapeHtml(formatTime(w.createdAt))}</td>
      <td>${escapeHtml(w.name)}</td>
      <td>${escapeHtml(w.message)}</td>
      <td>${escapeHtml(w.ip)}</td>
      <td>${escapeHtml(w.location || '')}</td>
      <td>${escapeHtml(w.userAgent)}</td>
    </tr>`
    )
    .join('');

  const visitRows = visits
    .map(
      (v) => `
    <tr>
      <td>${escapeHtml(formatTime(v.createdAt))}</td>
      <td>${escapeHtml(v.ip)}</td>
      <td>${escapeHtml(v.location || '')}</td>
      <td>${escapeHtml(v.userAgent)}</td>
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Admin - Lời chúc</title>
<style>
  body { font-family: sans-serif; padding: 20px; background: #fafafa; }
  table { border-collapse: collapse; width: 100%; background: white; }
  th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; vertical-align: top; }
  th { background: #f0f0f0; text-align: left; }
  tr:nth-child(even) { background: #f9f9f9; }
</style>
</head>
<body>
<h2>Danh sách lời chúc (${wishes.length})</h2>
<table>
  <thead><tr><th>Thời gian</th><th>Tên</th><th>Lời chúc</th><th>IP</th><th>Vị trí</th><th>User Agent</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<h2>Lượt truy cập (${visits.length})</h2>
<table>
  <thead><tr><th>Thời gian</th><th>IP</th><th>Vị trí</th><th>User Agent</th></tr></thead>
  <tbody>${visitRows}</tbody>
</table>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
