(() => {
const C = Object.fromEntries(COUNTRIES.map(c => [c.c, c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
COUNTRIES.forEach(c => c.k = norm(c.n));
const $ = id => document.getElementById(id);
const flag = c => `https://flagcdn.com/w40/${c.toLowerCase()}.png`;
const svg = $('map'), NS = 'http://www.w3.org/2000/svg';
const MAIN = COUNTRIES.filter(c => c.nb.length); // origen/destino: países con al menos un vecino terrestre

let start, end, guesses, solved, shortest, hints;

// ---------- lógica ----------
function bfs(a, b, allowed) { // camino más corto entre a y b usando solo países de `allowed` (o todos)
  const prev = { [a]: null }, q = [a];
  while (q.length) {
    const x = q.shift(); if (x === b) break;
    for (const n of C[x].nb) if (!(n in prev) && (!allowed || allowed.has(n) || n === b)) { prev[n] = x; q.push(n); }
  }
  if (!(b in prev)) return null;
  const path = []; for (let x = b; x; x = prev[x]) path.push(x); return path.reverse();
}
function newGame() {
  let a, b, p;
  do { a = MAIN[Math.random() * MAIN.length | 0].c; b = MAIN[Math.random() * MAIN.length | 0].c; p = a !== b && bfs(a, b); }
  while (!p || p.length < 4 || p.length > 9);
  start = a; end = b; shortest = p; guesses = []; solved = false; hints = 0;
  $('title').innerHTML = `Ve desde <span class="s">${C[a].n}</span> a <span class="e">${C[b].n}</span>`;
  $('win').hidden = true; $('q').disabled = false; $('q').value = ''; closeList(); $('q').focus();
  stats(`Pasa de ${C[a].n} a ${C[b].n} nombrando países fronterizos. Mínimo: ${p.length - 2} países intermedios.`);
  render(true);
}
function stats(msg, err) { const s = $('stats'); s.textContent = msg; s.className = err ? 'err' : ''; }
function guess(code) {
  if (solved) return;
  if (code === start || code === end || guesses.includes(code)) return stats(`${C[code].n} ya está en el mapa.`, true);
  guesses.push(code);
  const chain = bfs(start, end, new Set(guesses));
  if (chain) return win(chain);
  stats(`${guesses.length} intento${guesses.length > 1 ? 's' : ''}. Aún no hay ruta conectada.`);
  render(false, code);
}
function win(chain) {
  solved = true; $('q').disabled = true;
  const extra = chain.length - shortest.length;
  $('winRoute').textContent = `${C[start].n} → ${C[end].n}`;
  $('winMsg').textContent = `Has encontrado la ruta en ${guesses.length} intentos` + (extra <= 0 ? ' · ¡ruta óptima!' : ` · la óptima tenía ${shortest.length - 2} países intermedios.`);
  $('win').hidden = false; stats(''); render(false, guesses[guesses.length - 1]);
}
function giveUp() {
  if (solved) return;
  guesses = shortest.slice(1, -1); solved = true; $('q').disabled = true;
  $('winRoute').textContent = `${C[start].n} → ${C[end].n}`;
  $('winMsg').textContent = 'Ruta óptima: ' + shortest.map(c => C[c].n).join(' → ');
  $('win').hidden = false; render();
}
function hint() {
  if (solved) return;
  const chain = shortest.slice(1, -1).filter(c => !guesses.includes(c));
  if (!chain.length) return;
  hints++; stats(`💡 Pista: un país de la ruta empieza por «${C[chain[0]].n[0]}» (${C[chain[0]].n.length} letras).`);
}

// ---------- mapa ----------
let vb = null, vbTarget = null, raf = 0;
function targetBox() {
  const codes = [start, end, ...guesses]; let [x0, y0, x1, y1] = [1e9, 1e9, -1e9, -1e9];
  for (const c of codes) { const b = C[c].b; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
  const r = svg.getBoundingClientRect(), asp = (r.width || 4) / (r.height || 3.2);
  let w = Math.max(x1 - x0, 6) * 1.25, h = Math.max(y1 - y0, 6) * 1.25;
  if (w / h < asp) w = h * asp; else h = w / asp;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return [cx - w / 2, cy - h / 2, w, h];
}
function animateTo(t, instant) {
  vbTarget = t; if (!vb || instant) { vb = t.slice(); svg.setAttribute('viewBox', vb.join(' ')); return; }
  cancelAnimationFrame(raf);
  const step = () => {
    vb = vb.map((v, i) => v + (vbTarget[i] - v) * 0.14);
    svg.setAttribute('viewBox', vb.join(' '));
    if (vb.some((v, i) => Math.abs(v - vbTarget[i]) > vbTarget[2] * 0.001)) raf = requestAnimationFrame(step);
  }; step();
}
function render(instant, popCode) {
  const mk = (code, cls) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', C[code].d); p.setAttribute('class', cls + (code === popCode ? ' pop' : '')); p.dataset.c = code; return p;
  };
  svg.replaceChildren(...guesses.map(c => mk(c, 'guess')), mk(start, 'start'), mk(end, 'end'));
  animateTo(targetBox(), instant);
}
// marcador para países diminutos (que se ven como un punto)
svg.addEventListener('mousemove', e => {
  const c = e.target.dataset && e.target.dataset.c, tip = $('tip');
  if (!c) return tip.hidden = true;
  const r = $('map').parentElement.getBoundingClientRect();
  tip.textContent = C[c].n; tip.hidden = false;
  tip.style.left = Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 6) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
});
svg.addEventListener('mouseleave', () => $('tip').hidden = true);
window.addEventListener('resize', () => vb && animateTo(targetBox(), true));

// ---------- buscador ----------
const q = $('q'), list = $('list'); let items = [], sel = -1;
function closeList() { list.hidden = true; items = []; sel = -1; }
function openList() {
  const t = norm(q.value.trim()); if (!t) return closeList();
  items = COUNTRIES.filter(c => c.k.includes(t)).sort((a, b) => (b.k.startsWith(t) - a.k.startsWith(t)) || a.k.localeCompare(b.k)).slice(0, 20);
  list.replaceChildren(...items.map((c, i) => {
    const li = document.createElement('li'); li.innerHTML = `<img src="${flag(c.c)}" alt="" onerror="this.style.display='none'"><span>${c.n}</span>`;
    li.onmousedown = e => { e.preventDefault(); pick(c.c); }; return li;
  }));
  sel = items.length ? 0 : -1; mark(); list.hidden = !items.length;
}
function mark() { [...list.children].forEach((li, i) => li.classList.toggle('on', i === sel)); list.children[sel]?.scrollIntoView({ block: 'nearest' }); }
function pick(code) { q.value = ''; closeList(); guess(code); }
q.addEventListener('input', openList);
q.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); mark(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); mark(); e.preventDefault(); }
  else if (e.key === 'Enter' && items[sel]) pick(items[sel].c);
  else if (e.key === 'Escape') closeList();
});
q.addEventListener('blur', closeList);
$('again').onclick = $('reset').onclick = newGame;
$('giveup').onclick = giveUp; $('hint').onclick = hint;
newGame();
})();
