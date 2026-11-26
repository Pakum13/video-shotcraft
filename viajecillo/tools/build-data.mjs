// Genera ../data.js a partir de world-atlas (Natural Earth 50m): paths SVG (Mercator), vecinos, nombres en español.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const { feature, neighbors } = require('topojson-client');
const iso = require('i18n-iso-countries');
iso.registerLocale(require('i18n-iso-countries/langs/es.json'));

const geoms = topo.objects.countries.geometries;
const nb = neighbors(geoms);
const fc = feature(topo, topo.objects.countries).features;

const ES_FIX = { // nombres más naturales en español
  US: 'Estados Unidos', GB: 'Reino Unido', RU: 'Rusia', CZ: 'Chequia', CD: 'RD del Congo', CG: 'República del Congo',
  KR: 'Corea del Sur', KP: 'Corea del Norte', CI: 'Costa de Marfil', MK: 'Macedonia del Norte', SZ: 'Esuatini',
  TL: 'Timor Oriental', BA: 'Bosnia y Herzegovina', CV: 'Cabo Verde', MM: 'Birmania', PS: 'Palestina', TR: 'Turquía',
  VA: 'Ciudad del Vaticano', LA: 'Laos', SY: 'Siria', IR: 'Irán', VN: 'Vietnam', BN: 'Brunéi', MD: 'Moldavia', BY: 'Bielorrusia',
  TZ: 'Tanzania', BO: 'Bolivia', VE: 'Venezuela', FM: 'Micronesia', TW: 'Taiwán', XK: 'Kosovo', EH: 'Sáhara Occidental',
};
const SKIP = new Set(['AQ', 'TF', 'FK', 'GS', 'PN', 'SH', 'IO', 'CC', 'CX', 'HM', 'NF', 'UM', 'AX']); // territorios sin interés
const mer = lat => Math.log(Math.tan(Math.PI / 4 + (Math.max(-80, Math.min(84, lat)) * Math.PI) / 360)) * 180 / Math.PI;
const SHIFT = new Set(['RU', 'FJ']); // cruzan el antimeridiano: llevamos lo de lon<0 al lado este

const info = [];
const idxByI = {};
fc.forEach((f, i) => {
  let a2 = f.id ? iso.numericToAlpha2(String(f.id).padStart(3, '0')) : null;
  if (!f.id && f.properties.name === 'Kosovo') a2 = 'XK';
  if (!a2 || SKIP.has(a2)) return;
  idxByI[i] = info.length;
  info.push({ i, a2, f });
});

const out = [];
for (const { i, a2, f } of info) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const area = poly => { let s = 0; const r = poly[0]; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(s / 2); };
  const maxA = Math.max(...polys.map(area));
  let d = '', minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const poly of polys) {
    // omitir islitas diminutas salvo que sea todo el país
    const main = area(poly) >= maxA * 0.4; // el encuadre solo usa las masas principales
    for (const ring of poly) {
      const pts = [];
      let last = '';
      for (let [lon, lat] of ring) {
        if (SHIFT.has(a2) && lon < 0) lon += 360;
        const x = +lon.toFixed(2), y = +(-mer(lat)).toFixed(2);
        const k = x + ',' + y; if (k === last) continue; last = k;
        pts.push([x, y]);
      }
      if (pts.length < 3) continue;
      if (main) for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      d += 'M' + pts.map(p => p.join(' ')).join('L') + 'Z';
    }
  }
  const name = ES_FIX[a2] || iso.getName(a2, 'es', { select: 'official' }) || f.properties.name;
  out.push({ c: a2, n: name, d, b: [minX, minY, maxX, maxY].map(v => +v.toFixed(2)), nb: nb[i].filter(j => j in idxByI).map(j => info[idxByI[j]].a2) });
}
// simetría de vecinos
const byC = Object.fromEntries(out.map(o => [o.c, o]));
for (const o of out) for (const n of o.nb) if (!byC[n].nb.includes(o.c)) byC[n].nb.push(o.c);
fs.writeFileSync('../data.js', 'window.COUNTRIES=' + JSON.stringify(out) + ';');
console.log(out.length, 'países', (fs.statSync('../data.js').size / 1024) | 0, 'KB');
for (const c of ['EC','RU','PK','ME','XK','FR']) console.log(c, byC[c]?.n, byC[c]?.nb.join(','));
