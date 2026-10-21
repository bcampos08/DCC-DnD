// Generates the built-in battle maps as SVG files in public/maps.
import fs from 'node:fs';
const G = 70; // pixels per 5-ft square
let seed = 7;
const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => a + R() * (b - a);
const out = (name, w, h, body, defs = '') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * G}" height="${h * G}" viewBox="0 0 ${w * G} ${h * G}"><defs>${defs}</defs>${body}</svg>`;
  fs.writeFileSync(`public/maps/${name}.svg`, svg);
  console.log(name, w, h, Math.round(svg.length / 1024) + 'KB');
};
const noise = (id, freq, oct, color, alpha) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${Math.floor(R() * 99)}"/><feColorMatrix values="0 0 0 0 ${color[0]} 0 0 0 0 ${color[1]} 0 0 0 0 ${color[2]} 0 0 0 ${alpha} 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
const blob = (cx, cy, r, n = 10, jit = 0.25) => {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const rr = r * (1 - jit + R() * jit * 2); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) { const p = pts[(i + 1) % n], q = pts[(i + 2) % n]; d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`; }
  return d + 'Z';
};
const tree = (x, y, r) => `<g><ellipse cx="${x + r * 0.25}" cy="${y + r * 0.3}" rx="${r}" ry="${r * 0.9}" fill="#000" opacity=".28"/><path d="${blob(x, y, r, 12, 0.18)}" fill="#2f5d2a"/><path d="${blob(x - r * 0.2, y - r * 0.2, r * 0.7, 10, 0.2)}" fill="#3f7536"/><path d="${blob(x - r * 0.35, y - r * 0.35, r * 0.35, 8, 0.25)}" fill="#55913f" opacity=".8"/></g>`;
const rock = (x, y, r) => `<path d="${blob(x + 4, y + 5, r, 7, 0.3)}" fill="#000" opacity=".25"/><path d="${blob(x, y, r, 7, 0.3)}" fill="#8a8a85" stroke="#5c5c58" stroke-width="2"/><path d="${blob(x - r * 0.2, y - r * 0.25, r * 0.5, 6, 0.3)}" fill="#a7a7a1"/>`;

// 1. Tavern
{
  const w = 20, h = 14; let b = '';
  const defs = noise('wood', '0.004 0.08', 3, [0.25, 0.14, 0.05], 0.5) + noise('stone', 0.05, 3, [0.2, 0.2, 0.2], 0.5);
  b += `<rect width="${w * G}" height="${h * G}" fill="#3b352d"/><rect width="${w * G}" height="${h * G}" fill="#555" filter="url(#stone)"/>`;
  b += `<rect x="${G}" y="${G}" width="${(w - 2) * G}" height="${(h - 2) * G}" fill="#9c6b3c"/>`;
  for (let y = G; y < (h - 1) * G; y += G / 2) b += `<line x1="${G}" y1="${y}" x2="${(w - 1) * G}" y2="${y}" stroke="#6e4723" stroke-width="2"/>`;
  for (let y = G, r = 0; y < (h - 1) * G; y += G / 2, r++) for (let x = G + (r % 2 ? 60 : 130); x < (w - 1) * G; x += 190) b += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + G / 2}" stroke="#6e4723" stroke-width="2"/>`;
  b += `<rect x="${G}" y="${G}" width="${(w - 2) * G}" height="${(h - 2) * G}" fill="#a87443" filter="url(#wood)" opacity=".6"/>`;
  b += `<rect x="${G}" y="${G}" width="${(w - 2) * G}" height="${(h - 2) * G}" fill="none" stroke="#2a241d" stroke-width="18"/>`;
  b += `<rect x="${9 * G}" y="${(h - 1) * G - 12}" width="${2 * G}" height="34" fill="#7a5230" stroke="#3a2a1a" stroke-width="4"/>`; // door
  b += `<rect x="${G}" y="${4 * G}" width="${G * 0.8}" height="${2 * G}" fill="#4a4540" stroke="#2a241d" stroke-width="4"/><rect x="${G + 6}" y="${4.3 * G}" width="${G * 0.5}" height="${1.4 * G}" fill="#e2671b"/><circle cx="${G + 28}" cy="${5 * G}" r="18" fill="#ffcc33" opacity=".8"/>`; // fireplace
  b += `<path d="M${13 * G},${G * 1.4} h${5.6 * G} v${4 * G} h-${G} v-${3 * G} h-${4.6 * G}z" fill="#5b3a1e" stroke="#2f1f10" stroke-width="5"/>`; // bar
  for (let i = 0; i < 5; i++) b += `<circle cx="${13.5 * G + i * G}" cy="${3 * G}" r="18" fill="#7a5230" stroke="#3a2a1a" stroke-width="3"/>`;
  for (let i = 0; i < 3; i++) b += `<ellipse cx="${18.3 * G}" cy="${6.6 * G + i * G * 1.1}" rx="28" ry="28" fill="#6b4423" stroke="#3a2a1a" stroke-width="4"/><ellipse cx="${18.3 * G}" cy="${6.6 * G + i * G * 1.1}" rx="18" ry="18" fill="none" stroke="#3a2a1a" stroke-width="2"/>`; // barrels
  const table = (x, y) => { let s = `<circle cx="${x}" cy="${y}" r="${G * 0.75}" fill="#000" opacity=".2"/><circle cx="${x}" cy="${y}" r="${G * 0.7}" fill="#7d5332" stroke="#3a2a1a" stroke-width="4"/>`; for (let a = 0; a < 4; a++) { const ang = a * Math.PI / 2 + 0.6; s += `<rect x="${x + Math.cos(ang) * G * 1.1 - 15}" y="${y + Math.sin(ang) * G * 1.1 - 15}" width="30" height="30" rx="5" fill="#8a5d38" stroke="#3a2a1a" stroke-width="3"/>`; } return s; };
  [[4, 3.5], [8, 3], [4.5, 9], [8.5, 7.5], [12, 9.5], [15, 9]].forEach(([x, y]) => (b += table(x * G, y * G)));
  b += `<rect x="${2.5 * G}" y="${11.3 * G}" width="${4 * G}" height="${0.7 * G}" fill="#7d5332" stroke="#3a2a1a" stroke-width="4"/>`;
  b += `<rect x="${3 * G}" y="${6 * G}" width="${2.6 * G}" height="${1.6 * G}" fill="#7f1d1d" opacity=".85"/><rect x="${3.1 * G}" y="${6.1 * G}" width="${2.4 * G}" height="${1.4 * G}" fill="none" stroke="#d4a017" stroke-width="3"/>`;
  out('tavern', w, h, b, defs);
}
// 2. Dungeon
{
  const w = 26, h = 18; let b = '';
  const defs = noise('rock', 0.03, 4, [0.1, 0.1, 0.12], 0.7) + noise('flag', 0.08, 2, [0.3, 0.3, 0.3], 0.35);
  b += `<rect width="${w * G}" height="${h * G}" fill="#1d1c20"/><rect width="${w * G}" height="${h * G}" fill="#444" filter="url(#rock)"/>`;
  const rooms = [[1, 1, 7, 6], [11, 1, 6, 5], [19, 2, 6, 7], [2, 10, 8, 7], [12, 9, 8, 8], [21, 12, 4, 5]];
  const halls = [[8, 3, 3, 2], [17, 3, 2, 2], [4, 7, 2, 3], [10, 12, 2, 2], [15, 6, 2, 3], [20, 13, 1, 2], [21, 9, 2, 3]];
  let floor = '';
  for (const [x, y, ww, hh] of [...rooms, ...halls]) floor += `<rect x="${x * G}" y="${y * G}" width="${ww * G}" height="${hh * G}"/>`;
  b += `<g fill="#000" opacity=".6" transform="translate(6,6)">${floor}</g><g fill="#8b8579" stroke="#26231f" stroke-width="10">${floor}</g><g fill="#8b8579">${floor}</g>`;
  b += `<g fill="#9a9488" filter="url(#flag)">${floor}</g>`;
  for (const [x, y, ww, hh] of [...rooms, ...halls]) for (let i = x; i < x + ww; i++) for (let j = y; j < y + hh; j++) b += `<rect x="${i * G + 2}" y="${j * G + 2}" width="${G - 4}" height="${G - 4}" fill="none" stroke="#6a655c" stroke-width="2" rx="3"/>`;
  [[4.5, 3.5], [14, 3.5], [22, 5.5], [16, 13]].forEach(([x, y]) => (b += `<circle cx="${x * G}" cy="${y * G}" r="26" fill="#55504a" stroke="#2c2925" stroke-width="5"/>`)); // pillars
  b += `<rect x="${22 * G}" y="${3 * G}" width="${2 * G}" height="${G}" fill="#5a3a22" stroke="#2c1d10" stroke-width="4"/><rect x="${22 * G + 10}" y="${3 * G + 10}" width="${2 * G - 20}" height="${G - 20}" fill="none" stroke="#d4a017" stroke-width="3"/>`; // chest
  b += `<rect x="${13 * G}" y="${10 * G}" width="${6 * G}" height="${G}" fill="#5d1f1f" opacity=".8"/><rect x="${15 * G}" y="${14 * G}" width="${2 * G}" height="${2 * G}" fill="#3b3b3b" stroke="#1f1f1f" stroke-width="5"/>`; // altar
  for (let i = 0; i < 5; i++) b += `<rect x="${3 * G + i * 14}" y="${11 * G + 10}" width="10" height="${G * 1.5}" fill="#2c2925"/>`;
  b += `<path d="M${2 * G},${15 * G} h${2 * G} v${G} h-${2 * G}z" fill="#3f3a33"/>` + [0, 1, 2, 3].map(i => `<line x1="${2 * G}" y1="${15 * G + i * 18}" x2="${4 * G}" y2="${15 * G + i * 18}" stroke="#2a2620" stroke-width="3"/>`).join(''); // stairs
  out('dungeon', w, h, b, defs);
}
// 3. Forest clearing
{
  const w = 26, h = 18; let b = '';
  const defs = noise('grass', 0.02, 4, [0.15, 0.3, 0.08], 0.5) + noise('dirt', 0.06, 3, [0.35, 0.25, 0.12], 0.45);
  b += `<rect width="${w * G}" height="${h * G}" fill="#4f7a34"/><rect width="${w * G}" height="${h * G}" fill="#6a9a3c" filter="url(#grass)"/>`;
  b += `<path d="M0,${11 * G} C${6 * G},${10 * G} ${9 * G},${8 * G} ${13 * G},${9 * G} S${21 * G},${12 * G} ${26 * G},${10 * G} L${26 * G},${11.6 * G} C${20 * G},${13.6 * G} ${16 * G},${10.6 * G} ${13 * G},${10.6 * G} S${5 * G},${12 * G} 0,${12.7 * G}z" fill="#9b7a4c"/>`;
  b += `<path d="M0,${11 * G} C${6 * G},${10 * G} ${9 * G},${8 * G} ${13 * G},${9 * G} S${21 * G},${12 * G} ${26 * G},${10 * G} L${26 * G},${11.6 * G} C${20 * G},${13.6 * G} ${16 * G},${10.6 * G} ${13 * G},${10.6 * G} S${5 * G},${12 * G} 0,${12.7 * G}z" fill="#a5845a" filter="url(#dirt)"/>`;
  b += `<path d="${blob(19 * G, 4 * G, 2.2 * G, 12, 0.2)}" fill="#2d5f7a" stroke="#5b4a2e" stroke-width="10"/><path d="${blob(18.6 * G, 3.7 * G, 1.4 * G, 10, 0.2)}" fill="#3b7ea0" opacity=".7"/>`;
  b += `<circle cx="${11 * G}" cy="${5 * G}" r="${G * 0.9}" fill="#3a3530"/><circle cx="${11 * G}" cy="${5 * G}" r="${G * 0.5}" fill="#c2410c"/><circle cx="${11 * G}" cy="${5 * G}" r="${G * 0.25}" fill="#fbbf24"/>`;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b += `<circle cx="${11 * G + Math.cos(a) * G * 0.9}" cy="${5 * G + Math.sin(a) * G * 0.9}" r="12" fill="#77746e" stroke="#4a4844" stroke-width="2"/>`; }
  b += `<rect x="${8.6 * G}" y="${6.3 * G}" width="${1.8 * G}" height="${0.5 * G}" rx="15" fill="#6b4a2b" stroke="#3a2a1a" stroke-width="3" transform="rotate(-15 ${9.5 * G} ${6.5 * G})"/>`;
  [[7, 3, 18], [15, 7, 26], [4, 8, 20], [22, 14, 22], [9, 15, 16]].forEach(([x, y, r]) => (b += rock(x * G, y * G, r)));
  const trees = [];
  for (let i = 0; i < 70; i++) {
    const x = between(0, w), y = between(0, h);
    const cx = 13, cy = 7; const d = Math.hypot((x - cx) / 1.4, y - cy);
    if (d < 6.5 && R() > 0.08) continue;
    if (y > 9 && y < 13 && R() > 0.1) continue;
    if (Math.hypot(x - 19, y - 4) < 3) continue;
    trees.push([x * G, y * G, between(0.8, 1.6) * G]);
  }
  trees.sort((a, b2) => a[1] - b2[1]).forEach(([x, y, r]) => (b += tree(x, y, r)));
  out('forest', w, h, b, defs);
}
// 4. Cave
{
  const w = 24, h = 18; let b = '';
  const defs = noise('cave', 0.025, 4, [0.18, 0.15, 0.12], 0.55);
  b += `<rect width="${w * G}" height="${h * G}" fill="#15120f"/>`;
  const cells = [[5, 5, 3.6], [10, 7, 3], [15, 5, 3.4], [19, 9, 3], [14, 12, 3.6], [7, 13, 3], [4, 9, 2], [11, 11, 2.4], [18, 14, 2.4], [20, 4, 2.2]];
  let floor = cells.map(([x, y, r]) => `<path d="${blob(x * G, y * G, r * G, 14, 0.22)}"/>`).join('');
  b += `<g fill="#3a2f25" stroke="#0c0a08" stroke-width="40" stroke-linejoin="round">${floor}</g><g fill="#6e5c49">${floor}</g><g fill="#7a6853" filter="url(#cave)">${floor}</g>`;
  b += `<path d="${blob(15 * G, 12.5 * G, 1.6 * G, 10, 0.25)}" fill="#26506b" opacity=".9"/><path d="${blob(15 * G, 12.4 * G, 1 * G, 9, 0.25)}" fill="#3a7396" opacity=".8"/>`;
  [[6, 5, 20], [10.5, 6.5, 14], [16, 4.5, 24], [19, 9.5, 16], [7, 13, 18], [13, 11, 12]].forEach(([x, y, r]) => (b += rock(x * G, y * G, r)));
  for (let i = 0; i < 30; i++) { const c = cells[Math.floor(R() * cells.length)]; const a = R() * 6.28, d = R() * c[2] * 0.8; b += `<circle cx="${(c[0] + Math.cos(a) * d) * G}" cy="${(c[1] + Math.sin(a) * d) * G}" r="${between(3, 8)}" fill="#4d4033"/>`; }
  for (let i = 0; i < 6; i++) { const c = cells[i]; b += `<circle cx="${(c[0] + 1) * G}" cy="${(c[1] - 1.2) * G}" r="9" fill="#7dd3fc" opacity=".7"/><circle cx="${(c[0] + 1.2) * G}" cy="${(c[1] - 1) * G}" r="6" fill="#a5f3fc" opacity=".7"/>`; }
  out('cave', w, h, b, defs);
}
// 5. Crossroads
{
  const w = 24, h = 18; let b = '';
  const defs = noise('grass2', 0.018, 4, [0.2, 0.32, 0.1], 0.5) + noise('road', 0.07, 3, [0.32, 0.24, 0.14], 0.5);
  b += `<rect width="${w * G}" height="${h * G}" fill="#5f8a3a"/><rect width="${w * G}" height="${h * G}" fill="#7aa548" filter="url(#grass2)"/>`;
  const road = `<path d="M0,${8 * G} C${6 * G},${7.5 * G} ${16 * G},${9 * G} ${24 * G},${8.4 * G} L${24 * G},${10.4 * G} C${16 * G},${11 * G} ${6 * G},${9.6 * G} 0,${10 * G}z"/><path d="M${11 * G},0 C${10.5 * G},${6 * G} ${13 * G},${12 * G} ${12 * G},${18 * G} L${14 * G},${18 * G} C${15 * G},${12 * G} ${12.6 * G},${6 * G} ${13 * G},0z"/>`;
  b += `<g fill="#9c7b4f">${road}</g><g fill="#a8885a" filter="url(#road)">${road}</g>`;
  b += `<rect x="${14.4 * G}" y="${5.5 * G}" width="14" height="${1.6 * G}" fill="#5b3a1e"/><rect x="${14 * G}" y="${5.6 * G}" width="${1.3 * G}" height="22" fill="#8a5d38" stroke="#3a2a1a" stroke-width="2" transform="rotate(-20 ${14.6 * G} ${5.7 * G})"/><rect x="${14.3 * G}" y="${6 * G}" width="${1.3 * G}" height="22" fill="#8a5d38" stroke="#3a2a1a" stroke-width="2" transform="rotate(15 ${14.9 * G} ${6.1 * G})"/>`;
  b += `<g transform="rotate(-6 ${6 * G} ${9 * G})"><rect x="${5 * G}" y="${8.4 * G}" width="${2.6 * G}" height="${1.3 * G}" fill="#7a5230" stroke="#3a2a1a" stroke-width="5"/><line x1="${5.3 * G}" y1="${8.4 * G}" x2="${5.3 * G}" y2="${9.7 * G}" stroke="#3a2a1a" stroke-width="3"/><line x1="${7.3 * G}" y1="${8.4 * G}" x2="${7.3 * G}" y2="${9.7 * G}" stroke="#3a2a1a" stroke-width="3"/><rect x="${5.4 * G}" y="${8.1 * G}" width="${0.9 * G}" height="14" fill="#2b2b2b"/><rect x="${5.4 * G}" y="${9.7 * G}" width="${0.9 * G}" height="14" fill="#2b2b2b"/><rect x="${6.6 * G}" y="${8.1 * G}" width="${0.9 * G}" height="14" fill="#2b2b2b"/><rect x="${6.6 * G}" y="${9.7 * G}" width="${0.9 * G}" height="14" fill="#2b2b2b"/></g>`;
  for (let i = 0; i < 9; i++) b += `<rect x="${(16 + i * 0.9) * G}" y="${12.2 * G}" width="${0.9 * G}" height="8" fill="#6b4a2b"/><rect x="${(16 + i * 0.9) * G - 4}" y="${12.2 * G - 8}" width="10" height="26" fill="#4a321c"/>`;
  b += `<rect x="${17 * G}" y="${13.2 * G}" width="${4 * G}" height="${3 * G}" fill="#6d7f3a" opacity=".6"/>`;
  for (let i = 0; i < 18; i++) b += `<line x1="${17 * G + 6}" y1="${13.2 * G + i * 11.5 + 6}" x2="${21 * G - 6}" y2="${13.2 * G + i * 11.5 + 6}" stroke="#55652b" stroke-width="3"/>`;
  [[3, 3, 18], [20, 4, 22], [9, 14, 16]].forEach(([x, y, r]) => (b += rock(x * G, y * G, r)));
  const tr = [[2, 14], [4, 16], [1, 5], [19, 1.5], [22, 2.5], [21, 6], [7, 2], [5, 4.5], [3, 12], [22.5, 15], [16, 1]];
  tr.forEach(([x, y]) => (b += tree(x * G, y * G, between(0.9, 1.4) * G)));
  out('crossroads', w, h, b, defs);
}
// 6. Blank parchment
{
  const w = 30, h = 20;
  const defs = noise('parch', 0.01, 4, [0.55, 0.45, 0.3], 0.35);
  out('blank', w, h, `<rect width="${w * G}" height="${h * G}" fill="#efe2c4"/><rect width="${w * G}" height="${h * G}" fill="#e6d3a8" filter="url(#parch)"/>`, defs);
}
