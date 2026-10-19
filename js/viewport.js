/* Spritebench — lienzo: zoom/pan, dibujo de cajas, herramientas (selección, rectángulo, varita, mano, zoom). */
(function () {
  const SB = window.SB;
  const V = (SB.view = {});
  const cv = SB.$('#cv'), ctx = cv.getContext('2d');
  SB.opts = { tool: 'select', snap: false, trim: true, gap: 0, grid: true, footprint: true, labels: true, checker: true, pixelGrid: true };
  const views = {};            // sheetId -> {z, ox, oy}
  let z = 2, ox = 20, oy = 20, drag = null, space = false, hover = null, mouse = [0, 0], wandBox = null;
  const HANDLE = 5;
  const setHue = (id) => { const i = SB.project.sets.findIndex((s) => s.id === id); return (i * 47 + 200) % 360; };

  const cssSize = () => { const r = cv.parentElement.getBoundingClientRect(); return [r.width, r.height]; };
  V.resize = () => {
    const [w, h] = cssSize(), d = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(w * d)); cv.height = Math.max(1, Math.round(h * d));
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; V.draw();
  };
  const saveView = () => { if (SB.activeSheet) views[SB.activeSheet] = { z, ox, oy }; };
  V.zoom = () => z;
  V.setView = (id) => { const v = views[id]; if (v) { z = v.z; ox = v.ox; oy = v.oy; } else V.fit(); };
  V.fit = () => {
    const sh = SB.sheet(); if (!sh) return; const [w, h] = cssSize();
    z = Math.max(0.25, Math.min(24, Math.min((w - 40) / sh.w, (h - 40) / sh.h)));
    if (z >= 1) z = Math.floor(z);
    ox = (w - sh.w * z) / 2; oy = (h - sh.h * z) / 2; saveView(); V.draw(); SB.emit('view');
  };
  V.zoomTo = (nz, cx, cy) => {
    const [w, h] = cssSize(); cx = cx == null ? w / 2 : cx; cy = cy == null ? h / 2 : cy;
    const ix = (cx - ox) / z, iy = (cy - oy) / z;
    z = SB.clamp(nz, 0.1, 48); ox = cx - ix * z; oy = cy - iy * z; saveView(); V.draw(); SB.emit('view');
  };
  V.zoomBy = (f) => V.zoomTo(z * f);
  V.focus = (ids) => {
    const list = ids.map(SB.findSprite).filter(Boolean); if (!list.length) return; const [w, h] = cssSize();
    const x0 = Math.min(...list.map((s) => s.x)), y0 = Math.min(...list.map((s) => s.y)), x1 = Math.max(...list.map((s) => s.x + s.w)), y1 = Math.max(...list.map((s) => s.y + s.h));
    z = SB.clamp(Math.floor(Math.min((w * 0.6) / (x1 - x0 + 24), (h * 0.6) / (y1 - y0 + 24))), 1, 16);
    ox = w / 2 - ((x0 + x1) / 2) * z; oy = h / 2 - ((y0 + y1) / 2) * z; saveView(); V.draw(); SB.emit('view');
  };
  V.toScreen = (x, y) => { const r = cv.getBoundingClientRect(); return [r.left + ox + x * z, r.top + oy + y * z]; };   // para pruebas/automatización
  const toImg = (sx, sy) => [(sx - ox) / z, (sy - oy) / z];
  const snapV = (v) => (SB.opts.snap ? Math.round(v / SB.project.cell) * SB.project.cell : Math.round(v));

  // ------------------------------------------------------------ dibujo
  V.draw = () => {
    const d = window.devicePixelRatio || 1, [W, H] = cssSize();
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(0, 0, W, H);
    const sh = SB.sheet(), im = sh && SB.images[sh.id]; if (!sh || !im) return;
    // fondo de la hoja (damero)
    if (SB.opts.checker) {
      const c = 8; ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, sh.w * z, sh.h * z); ctx.clip();
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(ox, oy, sh.w * z, sh.h * z); ctx.fillStyle = '#444';
      for (let y = 0; y * c < sh.h * z; y++) for (let x = (y & 1); x * c < sh.w * z; x += 2) ctx.fillRect(ox + x * c, oy + y * c, c, c);
      ctx.restore();
    } else { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(ox, oy, sh.w * z, sh.h * z); }
    ctx.drawImage(im.canvas, ox, oy, sh.w * z, sh.h * z);
    // rejillas
    const cell = SB.project.cell || 16;
    if (SB.opts.pixelGrid && z >= 10) { ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= sh.w; x++) { ctx.moveTo(ox + x * z + .5, oy); ctx.lineTo(ox + x * z + .5, oy + sh.h * z); } for (let y = 0; y <= sh.h; y++) { ctx.moveTo(ox, oy + y * z + .5); ctx.lineTo(ox + sh.w * z, oy + y * z + .5); } ctx.stroke(); }
    if (SB.opts.grid && cell * z >= 6) { ctx.strokeStyle = 'rgba(90,170,255,.22)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= sh.w; x += cell) { ctx.moveTo(ox + x * z + .5, oy); ctx.lineTo(ox + x * z + .5, oy + sh.h * z); } for (let y = 0; y <= sh.h; y += cell) { ctx.moveTo(ox, oy + y * z + .5); ctx.lineTo(ox + sh.w * z, oy + y * z + .5); } ctx.stroke(); }
    // cajas
    for (const s of sh.sprites) {
      const sel = SB.sel.has(s.id), st = SB.setOfSprite(s.id), hov = hover === s.id;
      const col = sel ? '#4b9bff' : st ? `hsl(${setHue(st.set.id)},80%,62%)` : s.category === 'rug' ? '#e6c86a' : s.category === 'wall' ? '#d58bff' : '#5be37f';
      ctx.lineWidth = sel || hov ? 2 : 1; ctx.strokeStyle = col;
      ctx.strokeRect(ox + s.x * z + .5, oy + s.y * z + .5, s.w * z - 1, s.h * z - 1);
      if (sel) { ctx.fillStyle = 'rgba(75,155,255,.14)'; ctx.fillRect(ox + s.x * z, oy + s.y * z, s.w * z, s.h * z); }
      if (st && SB.opts.labels && z >= 2) { ctx.fillStyle = col; ctx.font = '600 10px system-ui'; ctx.fillText((SB.project.sets.indexOf(st.set) + 1) + '·' + st.variant.name.slice(0, 5), ox + s.x * z + 3, oy + s.y * z + 11); }
    }
    // huella + pivote de la selección
    if (SB.opts.footprint) for (const s of SB.selected()) V.drawFootprint(s);
    // asas
    const one = SB.sel.size === 1 ? SB.findSprite([...SB.sel][0]) : null;
    if (one && one.id && SB.sheetOf(one.id) === sh) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4b9bff'; for (const [hx, hy] of handles(one)) { ctx.fillRect(ox + hx * z - 4, oy + hy * z - 4, 8, 8); ctx.strokeRect(ox + hx * z - 4, oy + hy * z - 4, 8, 8); } }
    // vista previa de la varita
    if (SB.opts.tool === 'wand' && wandBox) { ctx.strokeStyle = '#fff'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.strokeRect(ox + wandBox[0] * z + .5, oy + wandBox[1] * z + .5, (wandBox[2] - wandBox[0]) * z - 1, (wandBox[3] - wandBox[1]) * z - 1); ctx.setLineDash([]); }
    // arrastre
    if (drag && (drag.k === 'new' || drag.k === 'marquee')) {
      const r = drag.r; ctx.strokeStyle = drag.k === 'new' ? '#fff' : '#4b9bff'; ctx.fillStyle = drag.k === 'new' ? 'rgba(255,255,255,.08)' : 'rgba(75,155,255,.12)';
      ctx.setLineDash([5, 3]); ctx.fillRect(ox + r[0] * z, oy + r[1] * z, (r[2] - r[0]) * z, (r[3] - r[1]) * z); ctx.strokeRect(ox + r[0] * z + .5, oy + r[1] * z + .5, (r[2] - r[0]) * z, (r[3] - r[1]) * z); ctx.setLineDash([]);
      if (drag.k === 'new') { ctx.fillStyle = '#fff'; ctx.font = '11px system-ui'; ctx.fillText(Math.round(r[2] - r[0]) + ' × ' + Math.round(r[3] - r[1]), ox + r[0] * z + 2, oy + r[1] * z - 5); }
    }
  };
  V.footRect = (s) => { const cell = SB.project.cell || 16, cx = s.x + s.w / 2; return [cx - (s.fc * cell) / 2, s.y + s.h - s.fr * cell, cx + (s.fc * cell) / 2, s.y + s.h]; };
  V.drawFootprint = (s) => {
    const cell = SB.project.cell || 16, f = V.footRect(s);
    ctx.fillStyle = s.solid ? 'rgba(255,90,90,.28)' : 'rgba(51,230,230,.16)'; ctx.fillRect(ox + f[0] * z, oy + f[1] * z, (f[2] - f[0]) * z, (f[3] - f[1]) * z);
    ctx.strokeStyle = '#33e6e6'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= s.fc; i++) { const x = ox + (f[0] + i * cell) * z + .5; ctx.moveTo(x, oy + f[1] * z); ctx.lineTo(x, oy + f[3] * z); }
    for (let i = 0; i <= s.fr; i++) { const y = oy + (f[1] + i * cell) * z + .5; ctx.moveTo(ox + f[0] * z, y); ctx.lineTo(ox + f[2] * z, y); }
    ctx.stroke();
    // pivote
    const px = s.x + s.w * s.pivot[0], py = s.y + s.h * (1 - s.pivot[1]);
    ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(ox + px * z, oy + py * z, 4, 0, 7); ctx.fill(); ctx.stroke();
  };
  const handles = (s) => { const mx = s.x + s.w / 2, my = s.y + s.h / 2, x1 = s.x + s.w, y1 = s.y + s.h; return [[s.x, s.y, 'nw'], [mx, s.y, 'n'], [x1, s.y, 'ne'], [x1, my, 'e'], [x1, y1, 'se'], [mx, y1, 's'], [s.x, y1, 'sw'], [s.x, my, 'w']]; };
  const handleAt = (sx, sy) => {
    if (SB.sel.size !== 1) return null; const s = SB.findSprite([...SB.sel][0]); if (!s) return null;
    for (const [hx, hy, n] of handles(s)) if (Math.abs(ox + hx * z - sx) <= HANDLE + 2 && Math.abs(oy + hy * z - sy) <= HANDLE + 2) return { s, n };
    return null;
  };
  V.hit = (x, y) => { let best = null, ba = 1e18; for (const s of SB.sprites()) if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) { const a = s.w * s.h; if (a < ba) { ba = a; best = s; } } return best; };

  // ------------------------------------------------------------ cursor
  const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
  function updateCursor(e) {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (space || SB.opts.tool === 'hand' || (drag && drag.k === 'pan')) { cv.style.cursor = drag && drag.k === 'pan' ? 'grabbing' : 'grab'; return; }
    if (SB.opts.tool === 'zoom') { cv.style.cursor = e.altKey ? 'zoom-out' : 'zoom-in'; return; }
    if (SB.opts.tool === 'rect' || SB.opts.tool === 'wand') { cv.style.cursor = 'crosshair'; return; }
    const h = handleAt(sx, sy); if (h) { cv.style.cursor = CURSORS[h.n]; return; }
    const [ix, iy] = toImg(sx, sy); cv.style.cursor = V.hit(ix, iy) ? 'move' : 'default';
  }

  // ------------------------------------------------------------ ratón
  cv.addEventListener('contextmenu', (e) => {
    e.preventDefault(); const r = cv.getBoundingClientRect(), [ix, iy] = toImg(e.clientX - r.left, e.clientY - r.top), s = V.hit(ix, iy);
    if (s && !SB.sel.has(s.id)) SB.select([s.id]);
    if (!s && !e.shiftKey) { /* menú del lienzo vacío */ }
    SB.ui.showContext(s ? SB.ui.spriteMenu() : SB.ui.canvasMenu([ix, iy]), e.clientX, e.clientY);
  });
  cv.addEventListener('mousedown', (e) => {
    SB.ui.hideContext(); const sh = SB.sheet(); if (!sh) return;
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, [ix, iy] = toImg(sx, sy), tool = SB.opts.tool;
    if (e.button === 2) return;
    if (e.button === 1 || space || tool === 'hand') { drag = { k: 'pan', sx, sy, ox, oy }; updateCursor(e); return; }
    if (tool === 'zoom') { V.zoomTo(z * (e.altKey ? 0.5 : 2), sx, sy); return; }
    if (tool === 'wand') {
      const b = SB.wand(sh.id, Math.floor(ix), Math.floor(iy), SB.opts.gap);
      if (b) { const ids = SB.act.addSprites([b], 'Varita'); if (ids.length) SB.ui.toast('Sprite creado: ' + (b[2] - b[0]) + ' × ' + (b[3] - b[1]) + ' px'); } else SB.ui.toast('No hay nada opaco ahí');
      return;
    }
    if (tool === 'select') {
      const h = handleAt(sx, sy);
      if (h) { drag = { k: 'size', id: h.s.id, n: h.n, before: JSON.stringify(h.s), moved: false }; return; }
      const s = V.hit(ix, iy);
      if (s) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) SB.toggleSelect(s.id); else if (!SB.sel.has(s.id)) SB.select([s.id]);
        if (SB.sel.has(s.id)) drag = { k: 'move', x: ix, y: iy, orig: SB.selected().map((q) => [q.id, q.x, q.y]), moved: false, clicked: s.id, plain: !(e.shiftKey || e.ctrlKey || e.metaKey) };
        V.draw(); return;
      }
      if (!e.shiftKey) SB.select([]);
      drag = { k: 'marquee', x: ix, y: iy, r: [ix, iy, ix, iy], add: e.shiftKey }; return;
    }
    if (tool === 'rect') { drag = { k: 'new', x: ix, y: iy, r: [ix, iy, ix, iy] }; }
  });
  window.addEventListener('mousemove', (e) => {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, [ix, iy] = toImg(sx, sy); mouse = [ix, iy];
    SB.emit('cursor', ix, iy);
    if (!drag) {
      const s = e.target === cv ? V.hit(ix, iy) : null, id = s ? s.id : null;
      let redraw = false; if (id !== hover) { hover = id; redraw = true; }
      if (SB.opts.tool === 'wand' && e.target === cv && SB.sheet()) { wandBox = SB.wand(SB.sheet().id, Math.floor(ix), Math.floor(iy), SB.opts.gap); redraw = true; }
      if (redraw) V.draw(); if (e.target === cv) updateCursor(e); return;
    }
    if (drag.k === 'pan') { ox = drag.ox + (sx - drag.sx); oy = drag.oy + (sy - drag.sy); }
    else if (drag.k === 'new') { drag.r = [snapV(Math.min(drag.x, ix)), snapV(Math.min(drag.y, iy)), snapV(Math.max(drag.x, ix)), snapV(Math.max(drag.y, iy))]; }
    else if (drag.k === 'marquee') { drag.r = [Math.min(drag.x, ix), Math.min(drag.y, iy), Math.max(drag.x, ix), Math.max(drag.y, iy)]; }
    else if (drag.k === 'move') {
      const dx = Math.round(ix - drag.x), dy = Math.round(iy - drag.y); if (dx || dy) drag.moved = true;
      for (const [id, x0, y0] of drag.orig) { const s = SB.findSprite(id), sh = SB.sheetOf(id); s.x = SB.clamp(snapV(x0 + dx), 0, sh.w - s.w); s.y = SB.clamp(snapV(y0 + dy), 0, sh.h - s.h); }
      SB.emit('live');
    } else if (drag.k === 'size') {
      const s = SB.findSprite(drag.id), n = drag.n, px = snapV(ix), py = snapV(iy); drag.moved = true;
      let x0 = s.x, y0 = s.y, x1 = s.x + s.w, y1 = s.y + s.h;
      if (n.includes('w')) x0 = Math.min(px, x1 - 1); if (n.includes('e')) x1 = Math.max(px, x0 + 1); if (n.includes('n')) y0 = Math.min(py, y1 - 1); if (n.includes('s')) y1 = Math.max(py, y0 + 1);
      s.x = Math.max(0, x0); s.y = Math.max(0, y0); s.w = Math.min(SB.sheet().w, x1) - s.x; s.h = Math.min(SB.sheet().h, y1) - s.y; SB.emit('live');
    }
    V.draw();
  });
  window.addEventListener('mouseup', () => {
    if (!drag) return; const d = drag; drag = null;
    const sh = SB.sheet();
    if (d.k === 'new') {
      let b = d.r.map(Math.round);
      if (b[2] - b[0] >= 2 && b[3] - b[1] >= 2) { if (SB.opts.trim) b = SB.trimRect(sh.id, b); if (b) SB.act.addSprites([b], 'Crear sprite'); else SB.ui.toast('Esa zona está vacía'); }
    } else if (d.k === 'marquee') {
      const r = d.r, ids = sh.sprites.filter((s) => s.x < r[2] && s.x + s.w > r[0] && s.y < r[3] && s.y + s.h > r[1]).map((s) => s.id);
      if (r[2] - r[0] > 2 || r[3] - r[1] > 2) SB.select(ids, d.add);
    } else if (d.k === 'move' && !d.moved && d.plain && SB.sel.size > 1) {
      SB.select([d.clicked]);   // clic sin arrastrar dentro de una selección múltiple: queda solo ese
    } else if (d.k === 'move' && d.moved) {
      // el modelo ya cambió en vivo: registramos el paso de deshacer reconstruyendo el "antes"
      const now = d.orig.map(([id]) => { const s = SB.findSprite(id); return [id, s.x, s.y]; });
      d.orig.forEach(([id, x, y]) => { const s = SB.findSprite(id); s.x = x; s.y = y; });
      SB.do('Mover', () => now.forEach(([id, x, y]) => { const s = SB.findSprite(id); s.x = x; s.y = y; }));
    } else if (d.k === 'size' && d.moved) {
      const s = SB.findSprite(d.id), now = { x: s.x, y: s.y, w: s.w, h: s.h }, b = JSON.parse(d.before);
      s.x = b.x; s.y = b.y; s.w = b.w; s.h = b.h; SB.do('Redimensionar', () => Object.assign(s, now));
    }
    V.draw(); SB.emit('selection');
  });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault(); const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (e.shiftKey) { ox -= e.deltaY; V.draw(); return; }
    V.zoomTo(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), sx, sy);
  }, { passive: false });
  cv.addEventListener('dblclick', (e) => {
    const r = cv.getBoundingClientRect(), [ix, iy] = toImg(e.clientX - r.left, e.clientY - r.top), s = V.hit(ix, iy);
    if (s && SB.opts.tool === 'select') SB.ui.focusName();
  });
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) { space = true; e.preventDefault(); cv.style.cursor = 'grab'; } });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') { space = false; } });
  new ResizeObserver(() => V.resize()).observe(cv.parentElement);
  SB.on('change', () => V.draw()); SB.on('selection', () => V.draw()); SB.on('live', () => V.draw());
  SB.on('sheets', () => { if (SB.activeSheet && !views[SB.activeSheet]) V.fit(); else V.draw(); });
})();
