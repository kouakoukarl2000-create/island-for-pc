const isl = document.getElementById('isl');
const inner = document.getElementById('in');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 16;        // taille de la boule
const MAXW = 520;    // largeur max de la pilule

let cur = null, active = false, expanded = false, runId = 0, tick = null;

const esc = (v, n = 80) => String(v ?? '').slice(0, n).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
const clamp = (v) => Math.max(0, Math.min(100, Math.round(+v || 0)));
const EQ = '<div class="eq"><i></i><i></i><i></i></div>';

const tasks = {
  music: {
    init: (d) => ({ title: d.title || 'Lecture en cours', artist: d.artist || '' }),
    compact: () => ['<div class="cov"></div>', EQ],
    full: (s) => '<div class="cov big"></div><div><div class="tx">' + esc(s.title) + '</div><div class="sub tx">' + esc(s.artist) + '</div></div>' + EQ
  },
  timer: {
    init: (d) => ({ n: Math.max(1, Math.min(86400, +d.seconds || 60)) }),
    every: 1000,
    run: (s) => { if (--s.n <= 0) s.done = true; },
    compact: (s) => ['<span>⏱</span>', '<span class="num">' + fmt(s.n) + '</span>'],
    full: (s) => '<span>⏱</span><span>Minuteur</span><span class="num">' + fmt(s.n) + '</span>'
  },
  notif: {
    init: (d) => ({ n: Math.max(2, Math.min(60, +d.seconds || 4)), title: String(d.title || 'Notification'), text: d.text || '' }),
    every: 1000,
    run: (s) => { if (--s.n <= 0) s.done = true; },
    compact: (s) => ['<div class="av">' + esc(s.title.charAt(0).toUpperCase(), 2) + '</div>', '<span class="sub">' + esc(s.title, 12) + '</span>'],
    full: (s) => '<div class="av">' + esc(s.title.charAt(0).toUpperCase(), 2) + '</div><div class="tx"><span>' + esc(s.title) + '</span> <span class="sub">' + esc(s.text) + '</span></div>'
  },
  progress: {
    init: (d) => ({ p: clamp(d.value), label: d.label || 'Progression' }),
    compact: (s) => ['<div class="ring" style="background:conic-gradient(#0a84ff ' + s.p * 3.6 + 'deg,#2a2d34 0)"></div>', '<span class="num">' + s.p + ' %</span>'],
    full: (s) => '<span class="tx">' + esc(s.label) + '</span><div class="bar"><b style="width:' + s.p + '%"></b></div><span class="sub num">' + s.p + ' %</span>'
  },
  batt: {
    init: (d) => ({ level: clamp(d.level) }),
    compact: (s) => ['<span class="warn">▮</span>', '<span class="warn num">' + s.level + ' %</span>'],
    full: (s) => '<span class="warn">▮</span><span>Batterie <b class="warn">' + s.level + ' %</b></span><span class="sub">Branchez le chargeur</span>'
  }
};

function size(w, h) { isl.style.width = w + 'px'; isl.style.height = h + 'px'; }

function render() {
  const { t, s } = cur;
  if (expanded) {
    inner.innerHTML = t.full(s);
  } else {
    const [a, b] = t.compact(s);
    inner.innerHTML = '<div class="cmp"><div>' + a + '</div><div>' + b + '</div></div>';
  }
  const pad = expanded ? 44 : 26;
  size(Math.min(inner.offsetWidth + pad, MAXW), Math.max(inner.offsetHeight + (expanded ? 26 : 12), 34));
}

// 1. la bulle descend  2. elle devient une pilule tant que la tâche dure
async function show(d) {
  const t = tasks[d.type];
  if (!t) return;
  const id = ++runId;
  clearInterval(tick);
  cur = { t, s: t.init(d), id, type: d.type };
  expanded = false;
  isl.classList.remove('up');
  if (!active) {
    active = true;
    size(B, B);
    inner.style.opacity = 0;
    void isl.offsetWidth;
    isl.classList.add('on');
    await sleep(550);
  } else {
    isl.classList.add('on');
    inner.style.opacity = 0;
    await sleep(160);
  }
  if (id !== runId) return;
  render();
  isl.classList.add('live');
  await sleep(200);
  if (id !== runId) return;
  inner.style.opacity = 1;
  if (t.every) {
    tick = setInterval(() => {
      if (id !== runId) { clearInterval(tick); return; }
      t.run(cur.s);
      render();
      if (cur.s.done) { clearInterval(tick); finish(id); }
    }, t.every);
  }
}

// 3. plus de tâche : la pilule redevient une boule  4. la boule remonte
async function finish(id) {
  if (id !== runId) return;
  isl.classList.remove('live');
  window.island.setInteractive(false);
  await sleep(500);
  if (id !== runId) return;
  inner.style.opacity = 0;
  await sleep(200);
  if (id !== runId) return;
  expanded = false;
  size(B, B);
  await sleep(600);
  if (id !== runId) return;
  isl.classList.add('up');
  isl.classList.remove('on');
  await sleep(650);
  if (id !== runId) return;
  active = false;
  cur = null;
}

function onTask(d) {
  if (!d || typeof d.type !== 'string') return;
  // Une mise à jour de progression ne relance pas l'animation.
  if (cur && cur.type === 'progress' && d.type === 'progress' && isl.classList.contains('live')) {
    cur.s.p = clamp(d.value);
    if (d.label) cur.s.label = d.label;
    render();
    if (cur.s.p >= 100) { clearInterval(tick); finish(cur.id); }
    return;
  }
  show(d);
}

// Clic sur la pilule : déplier / replier
isl.addEventListener('click', async () => {
  if (!cur || !isl.classList.contains('live')) return;
  const id = cur.id;
  inner.style.opacity = 0;
  await sleep(130);
  if (!cur || id !== cur.id) return;
  expanded = !expanded;
  render();
  await sleep(150);
  if (cur && id === cur.id) inner.style.opacity = 1;
});

// La fenêtre ne capte la souris que sur la pilule
isl.addEventListener('mouseenter', () => window.island.setInteractive(true));
isl.addEventListener('mouseleave', () => window.island.setInteractive(false));

window.island.onTask(onTask);
window.island.onEnd(() => { if (cur) { clearInterval(tick); finish(cur.id); } });

// Vraie fonctionnalité : alerte batterie faible (≤ 20 % et sur batterie)
if (navigator.getBattery) {
  navigator.getBattery().then((b) => {
    let shown = false;
    const check = () => {
      const low = !b.charging && b.level <= 0.2;
      const level = Math.round(b.level * 100);
      if (low && !shown) { shown = true; onTask({ type: 'batt', level }); }
      else if (shown && (b.charging || b.level > 0.25)) { shown = false; if (cur && cur.type === 'batt') finish(cur.id); }
      else if (shown && cur && cur.type === 'batt') { cur.s.level = level; render(); }
    };
    ['levelchange', 'chargingchange'].forEach((e) => b.addEventListener(e, check));
    check();
  }).catch(() => {});
}
