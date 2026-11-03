// ====== Hiệu ứng cánh hoa rơi (canvas) ======
(function initPetals() {
  const canvas = document.getElementById('petal-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let petals = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function makePetal() {
    return {
      x: Math.random() * w,
      y: Math.random() * -h,
      size: 6 + Math.random() * 8,
      speedY: 0.5 + Math.random() * 1.2,
      speedX: Math.random() * 0.6 - 0.3,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.02,
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.35 + Math.random() * 0.35,
    };
  }

  const PETAL_COUNT = window.innerWidth < 500 ? 16 : 26;
  for (let i = 0; i < PETAL_COUNT; i++) petals.push(makePetal());

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = '#c99a8e';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of petals) {
      p.sway += p.swaySpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.sway) * 0.4;
      p.rotation += p.rotationSpeed;
      if (p.y > h + 20) {
        Object.assign(p, makePetal(), { y: -20 });
      }
      drawPetal(p);
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

// ====== Hiệu ứng xuất hiện khi cuộn trang ======
(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  items.forEach((el) => observer.observe(el));
})();

// ====== Đếm ngược đến ngày cưới ======
// Đổi ngày này cho đúng ngày cưới thật (giờ địa phương)
const WEDDING_DATE = new Date('2026-12-20T11:00:00+07:00');

function updateCountdown() {
  const now = new Date();
  let diff = WEDDING_DATE.getTime() - now.getTime();

  if (diff < 0) diff = 0;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  const pad = (n) => String(n).padStart(2, '0');

  document.getElementById('cd-days').textContent = pad(days);
  document.getElementById('cd-hours').textContent = pad(hours);
  document.getElementById('cd-mins').textContent = pad(mins);
  document.getElementById('cd-secs').textContent = pad(secs);
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ====== Lời chúc ======
const wishForm = document.getElementById('wish-form');
const wishFeedback = document.getElementById('wish-feedback');
const wishList = document.getElementById('wish-list');
const submitBtn = document.getElementById('wish-submit');

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadWishes() {
  try {
    const res = await fetch('/api/wishes');
    const wishes = await res.json();
    wishList.innerHTML = wishes
      .map(
        (w) => `
        <li>
          <span class="wish-name">${escapeHtml(w.name)}</span>
          <span class="wish-message">${escapeHtml(w.message)}</span>
          <span class="wish-time">${formatTime(w.createdAt)}</span>
        </li>
      `
      )
      .join('');
  } catch (err) {
    console.error('Không tải được danh sách lời chúc', err);
  }
}

function showFeedback(message, type) {
  wishFeedback.textContent = message;
  wishFeedback.className = `wish-feedback ${type}`;
}

wishForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('wish-name').value.trim();
  const message = document.getElementById('wish-message').value.trim();

  if (!name || !message) {
    showFeedback('Vui lòng nhập đầy đủ tên và lời chúc.', 'error');
    return;
  }

  submitBtn.disabled = true;
  showFeedback('Đang gửi...', '');

  try {
    const res = await fetch('/api/wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message }),
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.error || 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
      return;
    }

    showFeedback(data.message || 'Cảm ơn bạn đã gửi lời chúc!', 'success');
    wishForm.reset();
    await loadWishes();
  } catch (err) {
    showFeedback('Không thể kết nối tới server. Vui lòng thử lại.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

loadWishes();
