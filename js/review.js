/* Spritebench — vista de REVISIÓN: renderiza una región de la hoja con las cajas numeradas a un PNG (data URL).
   La usan el servidor MCP y los scripts de automatización para "ver" el resultado, y sirve también para exportar una vista anotada. */
(function () {
  const SB = window.SB;
  /** opts: {x,y,w,h, scale, labels:'index'|'none', onlyIds:[...]}. Devuelve {dataUrl, scale, rect}. */
  SB.renderReview = (opts) => {
    opts = opts || {};
    const sh = SB.sheet(), im = sh && SB.images[sh.id]; if (!sh || !im) return null;
    const x = Math.max(0, opts.x | 0), y = Math.max(0, opts.y | 0);
    const w = Math.min(sh.w - x, opts.w || sh.w), h = Math.min(sh.h - y, opts.h || sh.h);
    const scale = Math.max(1, opts.scale || Math.max(1, Math.min(8, Math.floor(1400 / Math.max(w, 1)))));
    const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    // damero
    const ck = Math.max(8, scale * 4); g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#464646';
    for (let j = 0; j * ck < c.height; j++) for (let i = j & 1; i * ck < c.width; i += 2) g.fillRect(i * ck, j * ck, ck, ck);
    g.drawImage(im.canvas, x, y, w, h, 0, 0, w * scale, h * scale);
    const only = opts.onlyIds ? new Set(opts.onlyIds) : null, big = opts.giant || 96;
    sh.sprites.forEach((s, idx) => {
      if (only && !only.has(s.id)) return;
      if (s.x + s.w < x || s.y + s.h < y || s.x > x + w || s.y > y + h) return;
      const st = SB.setOfSprite(s.id), isBig = s.w > big || s.h > big;
      const col = isBig ? '#ff9f2e' : st ? `hsl(${(SB.project.sets.indexOf(st.set) * 47 + 200) % 360},85%,62%)` : '#5be37f';
      const bx = (s.x - x) * scale, by = (s.y - y) * scale;
      g.strokeStyle = col; g.lineWidth = isBig ? 3 : 2; g.strokeRect(bx + 1, by + 1, s.w * scale - 2, s.h * scale - 2);
      if (opts.labels !== 'none') {
        const label = String(idx), fs = Math.max(11, Math.min(18, scale * 3.2));
        g.font = `700 ${fs}px ui-monospace, Consolas, monospace`; const tw = g.measureText(label).width + 6;
        g.fillStyle = 'rgba(0,0,0,.78)'; g.fillRect(bx + 1, by + 1, tw, fs + 4); g.fillStyle = col; g.fillText(label, bx + 4, by + fs + 1);
      }
    });
    return { dataUrl: c.toDataURL('image/png'), scale, rect: [x, y, w, h] };
  };
  /** Resumen compacto del estado: lo que un agente necesita para decidir el siguiente paso. */
  SB.summary = () => {
    const sh = SB.sheet(); if (!sh) return { sheets: [] };
    const big = (s) => s.w > 96 || s.h > 96;
    return {
      project: SB.project.name, cell: SB.project.cell, activeSheet: sh.name, size: [sh.w, sh.h],
      sheets: SB.project.sheets.map((s) => ({ name: s.name, sprites: s.sprites.length })),
      sprites: sh.sprites.length, sets: SB.project.sets.length, loose: sh.sprites.filter((s) => !SB.setOfSprite(s.id)).length,
      giants: sh.sprites.map((s, i) => (big(s) ? i : -1)).filter((i) => i >= 0), duplicateNames: SB.duplicateNames(),
    };
  };
  SB.listSprites = () => (SB.sheet() ? SB.sheet().sprites.map((s, i) => { const o = SB.setOfSprite(s.id); return { i, id: s.id, name: s.name, x: s.x, y: s.y, w: s.w, h: s.h, fc: s.fc, fr: s.fr, solid: !!s.solid, category: s.category, set: o ? o.set.name + ':' + o.variant.name : null }; }) : []);
})();
