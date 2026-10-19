/* Spritebench — hoja de ejemplo generada por código (sin arte de terceros): sillas con 4 orientaciones (la derecha es el espejo de la izquierda), sofás, plantas y alfombras. */
(function () {
  const SB = window.SB;
  SB.demoSheet = () => {
    const c = document.createElement('canvas'); c.width = 224; c.height = 128; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const O = (x, y, w, h, col, ol) => { R(x - 1, y - 1, w + 2, h + 2, ol || '#2b2118'); R(x, y, w, h, col); };
    // silla 20x24 en (x,y). dir: front | left | back  (right = left espejado)
    function chair(x, y, dir, wood, cush) {
      const dk = shade(wood, -35), lt = shade(cush, 40);
      if (dir === 'front') { O(x + 4, y + 1, 12, 9, wood); O(x + 3, y + 11, 14, 5, cush); R(x + 3, y + 11, 14, 1, lt); O(x + 3, y + 17, 2, 6, dk); O(x + 15, y + 17, 2, 6, dk); }
      else if (dir === 'back') { O(x + 3, y + 2, 14, 14, wood); R(x + 4, y + 3, 12, 2, shade(wood, 25)); O(x + 3, y + 17, 2, 6, dk); O(x + 15, y + 17, 2, 6, dk); }
      else { O(x + 13, y + 1, 4, 15, wood); O(x + 3, y + 11, 11, 5, cush); R(x + 3, y + 11, 11, 1, lt); R(x + 3, y + 8, 4, 3, lt); O(x + 3, y + 17, 2, 6, dk); O(x + 13, y + 17, 2, 6, dk); }
    }
    function mirror(x, y, w, h, dx) { g.save(); g.translate(dx + w, 0); g.scale(-1, 1); g.drawImage(c, x, y, w, h, 0, y, w, h); g.restore(); }
    const woods = ['#a8703a', '#5f7fa8', '#7d9a5a'], cushs = ['#d9534f', '#e8d27a', '#f0f0e0'];
    woods.forEach((w, r) => {
      const y = 4 + r * 30;
      chair(4, y, 'front', w, cushs[r]); chair(30, y, 'left', w, cushs[r]); chair(56, y, 'back', w, cushs[r]);
      g.save(); g.restore(); mirror(26, y - 1, 24, 26, 78);   // derecha = espejo de la izquierda (a 78 px)
    });
    // sofá 2 variantes (frente / espalda) 44x22
    function sofa(x, y, back, col) {
      const dk = shade(col, -30), lt = shade(col, 30);
      if (!back) { O(x, y, 44, 10, dk); O(x + 2, y + 9, 40, 9, col); R(x + 2, y + 9, 40, 1, lt); O(x - 1, y + 7, 6, 12, dk); O(x + 39, y + 7, 6, 12, dk); O(x + 3, y + 19, 3, 3, '#3a2a1a'); O(x + 38, y + 19, 3, 3, '#3a2a1a'); }
      else { O(x, y + 2, 44, 17, dk); R(x + 2, y + 4, 40, 2, shade(dk, 25)); O(x + 3, y + 19, 3, 3, '#3a2a1a'); O(x + 38, y + 19, 3, 3, '#3a2a1a'); }
    }
    sofa(108, 6, false, '#6e8fd0'); sofa(160, 6, true, '#6e8fd0'); sofa(108, 34, false, '#cf6e7a'); sofa(160, 34, true, '#cf6e7a');
    // plantas
    function plant(x, y) { O(x + 3, y + 14, 8, 8, '#b5651d'); R(x + 3, y + 14, 8, 2, '#d98a3a'); O(x + 6, y + 6, 2, 8, '#3f7a2c', '#1f3a16'); O(x + 1, y + 2, 5, 7, '#58a83c', '#1f3a16'); O(x + 8, y + 1, 5, 8, '#58a83c', '#1f3a16'); }
    plant(110, 66); plant(130, 66); plant(150, 66);
    // lámpara
    O(176, 66, 8, 7, '#f5d97a'); O(179, 73, 2, 14, '#6b6b6b'); O(176, 87, 8, 3, '#4a4a4a');
    // alfombras (capa suelo)
    function rug(x, y, w, h, a, b) { O(x, y, w, h, a, '#3a2540'); R(x + 3, y + 3, w - 6, h - 6, b); R(x + 6, y + 6, w - 12, h - 12, a); }
    rug(4, 96, 32, 24, '#c0504d', '#f0c070'); rug(44, 100, 48, 20, '#4a7fa0', '#cfe3ee'); rug(104, 96, 30, 24, '#6a9a58', '#e0f0c0');
    return c.toDataURL('image/png');
  };
  function shade(hex, d) { const n = parseInt(hex.slice(1), 16), cl = (v) => Math.max(0, Math.min(255, v)); return '#' + [(n >> 16) + d, ((n >> 8) & 255) + d, (n & 255) + d].map((v) => cl(v).toString(16).padStart(2, '0')).join(''); }
})();
