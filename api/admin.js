const { kv } = require('@vercel/kv');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

module.exports = async function handler(req, res) {
  const raw = await kv.lrange('wishes', 0, -1);
  const wishes = raw.map((w) => (typeof w === 'string' ? JSON.parse(w) : w));

  const rows = wishes
    .map(
      (w) => `
    <tr>
      <td>${escapeHtml(w.createdAt)}</td>
      <td>${escapeHtml(w.name)}</td>
      <td>${escapeHtml(w.message)}</td>
      <td>${escapeHtml(w.ip)}</td>
      <td>${escapeHtml(w.userAgent)}</td>
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
  <thead><tr><th>Thời gian</th><th>Tên</th><th>Lời chúc</th><th>IP</th><th>User Agent</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
