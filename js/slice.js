/* Spritebench — algoritmos de recorte: auto-slice por transparencia, rejilla, varita, trim y detección de espejos. */
(function () {
  const SB = window.SB;
  const ALPHA = 24;

  const opaque = (d, x, y) => x >= 0 && y >= 0 && x < d.width && y < d.height && d.data[(y * d.width + x) * 4 + 3] >= ALPHA;

  /** Caja ajustada a los píxeles opacos dentro de r=[x0,y0,x1,y1]. null si está vacía. */
  SB.trimRect = (sheetId, r) => {
    const d = SB.pixels(sheetId); if (!d) return null;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = Math.max(0, r[1]); y < Math.min(d.height, r[3]); y++)
      for (let x = Math.max(0, r[0]); x < Math.min(d.width, r[2]); x++)
        if (d.data[(y * d.width + x) * 4 + 3] >= ALPHA) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
  };

  /** Componentes conexos (8 vecinos). Devuelve cajas [x0,y0,x1,y1]. */
  function components(d, region) {
    const W = d.width, H = d.height, seen = new Uint8Array(W * H), out = [];
    const rx0 = region ? region[0] : 0, ry0 = region ? region[1] : 0, rx1 = region ? region[2] : W, ry1 = region ? region[3] : H;
    const stack = [];
    for (let y = ry0; y < ry1; y++)
      for (let x = rx0; x < rx1; x++) {
        const i = y * W + x;
        if (seen[i] || d.data[i * 4 + 3] < ALPHA) continue;
        let x0 = x, y0 = y, x1 = x, y1 = y, area = 0; stack.push(i); seen[i] = 1;
        while (stack.length) {
          const p = stack.pop(), px = p % W, py = (p / W) | 0; area++;
          if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx, ny = py + dy;
            if (nx < rx0 || ny < ry0 || nx >= rx1 || ny >= ry1) continue;
            const q = ny * W + nx;
            if (!seen[q] && d.data[q * 4 + 3] >= ALPHA) { seen[q] = 1; stack.push(q); }
          }
        }
        out.push({ r: [x0, y0, x1 + 1, y1 + 1], area });
      }
    return out;
  }

  const overlap = (a, b, g) => a[0] - g < b[2] && b[0] - g < a[2] && a[1] - g < b[3] && b[1] - g < a[3];
  const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

  /** Une cajas que se tocan o están a menos de `gap` píxeles. */
  function mergeBoxes(boxes, gap) {
    let list = boxes.map((b) => b.slice());
    let changed = true;
    while (changed) {
      changed = false;
      outer: for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++)
          if (overlap(list[i], list[j], gap)) { list[i] = union(list[i], list[j]); list.splice(j, 1); changed = true; break outer; }
    }
    return list;
  }

  const readingOrder = (a, b) => (Math.floor(a[3] / 8) - Math.floor(b[3] / 8)) || (a[0] - b[0]);

  /** Auto-slice: cada objeto separado por transparencia es un sprite. opts: {gap, minArea, region} */
  SB.autoSlice = (sheetId, opts) => {
    const d = SB.pixels(sheetId); if (!d) return [];
    opts = opts || {};
    let boxes = components(d, opts.region).filter((c) => c.area >= (opts.minArea || 6)).map((c) => c.r);
    if (opts.gap) boxes = mergeBoxes(boxes, opts.gap);
    else boxes = boxes.filter((b, i) => !boxes.some((o, j) => j !== i && o[0] <= b[0] && o[1] <= b[1] && o[2] >= b[2] && o[3] >= b[3] && (o[2] - o[0]) * (o[3] - o[1]) > (b[2] - b[0]) * (b[3] - b[1])));
    return boxes.sort(readingOrder);
  };

  /** Varita: el objeto opaco que contiene (x,y). gap > 0 une piezas cercanas. */
  SB.wand = (sheetId, x, y, gap) => {
    const d = SB.pixels(sheetId); if (!d) return null;
    // si el clic cae en transparencia buscamos el píxel opaco más cercano (radio 3)
    let hx = -1, hy = -1;
    for (let r = 0; r <= 3 && hx < 0; r++)
      for (let dy = -r; dy <= r && hx < 0; dy++) for (let dx = -r; dx <= r; dx++) if (opaque(d, x + dx, y + dy)) { hx = x + dx; hy = y + dy; break; }
    if (hx < 0) return null;
    const comps = components(d).map((c) => c.r);
    let box = comps.find((b) => hx >= b[0] && hx < b[2] && hy >= b[1] && hy < b[3]);
    if (!box) return null;
    // la caja del componente no garantiza contener el píxel exacto (cajas anidadas): refinamos con flood fill local
    const W = d.width, seen = new Set(), st = [hy * W + hx]; seen.add(st[0]);
    let x0 = hx, y0 = hy, x1 = hx, y1 = hy;
    while (st.length) {
      const p = st.pop(), px = p % W, py = (p / W) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = (py + dy) * W + px + dx; if (!seen.has(q) && opaque(d, px + dx, py + dy)) { seen.add(q); st.push(q); } }
    }
    box = [x0, y0, x1 + 1, y1 + 1];
    if (gap) {
      let cur = box, changed = true;
      while (changed) { changed = false; for (const o of comps) if (overlap(cur, o, gap) && (o[0] < cur[0] || o[1] < cur[1] || o[2] > cur[2] || o[3] > cur[3])) { cur = union(cur, o); changed = true; } }
      box = cur;
    }
    return box;
  };

  /** Rejilla: celdas cw×ch desde (ox,oy), con separación (px,py). Opcional trim y saltar vacías. */
  SB.gridSlice = (sheetId, o) => {
    const sh = SB.sheet(sheetId), out = [];
    const x1 = o.region ? o.region[2] : sh.w, y1 = o.region ? o.region[3] : sh.h;
    for (let y = (o.region ? o.region[1] : o.oy || 0); y + o.ch <= y1 + (o.partial ? o.ch : 0); y += o.ch + (o.py || 0))
      for (let x = (o.region ? o.region[0] : o.ox || 0); x + o.cw <= x1 + (o.partial ? o.cw : 0); x += o.cw + (o.px || 0)) {
        let r = [x, y, Math.min(x + o.cw, sh.w), Math.min(y + o.ch, sh.h)];
        if (o.trim || o.skipEmpty) { const t = SB.trimRect(sheetId, r); if (!t) continue; if (o.trim) r = t; }
        out.push(r);
      }
    return out;
  };

  // ------------------------------------------------------------ espejos
  function crop(d, s) {
    const out = new Uint8ClampedArray(s.w * s.h * 4);
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const si = ((s.y + y) * d.width + s.x + x) * 4, di = (y * s.w + x) * 4; for (let k = 0; k < 4; k++) out[di + k] = d.data[si + k]; }
    return out;
  }
  /** ¿b es el espejo (horizontal o vertical) de a? Compara silueta y color medio. */
  SB.isMirror = (sheetId, a, b, axis) => {
    if (a.w !== b.w || a.h !== b.h) return false;
    const d = SB.pixels(sheetId), A = crop(d, a), B = crop(d, b); let diff = 0, n = 0, op = 0;
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
      const ia = (y * a.w + x) * 4, ib = axis === 'y' ? ((a.h - 1 - y) * a.w + x) * 4 : (y * a.w + (a.w - 1 - x)) * 4;
      const oa = A[ia + 3] >= ALPHA, ob = B[ib + 3] >= ALPHA; if (oa !== ob) return false;
      if (oa) { op++; for (let k = 0; k < 3; k++) { diff += Math.abs(A[ia + k] - B[ib + k]); n++; } }
    }
    return op >= 20 && diff / Math.max(1, n) < 14;
  };
  /** Un sprite simétrico es idéntico a su espejo: no sirve como "lado". */
  SB.isSymmetric = (sheetId, s) => SB.isMirror(sheetId, s, s, 'x');
  /** Pares (a,b) de sprites de la hoja que son espejo uno del otro y NO simétricos. */
  SB.findMirrorPairs = (sheetId, list) => {
    const buckets = {}; list.forEach((s) => { (buckets[s.w + 'x' + s.h] = buckets[s.w + 'x' + s.h] || []).push(s); });
    const pairs = [];
    for (const k in buckets) {
      const g = buckets[k], used = new Set();
      for (let i = 0; i < g.length; i++) {
        if (used.has(g[i].id) || SB.isSymmetric(sheetId, g[i])) continue;
        for (let j = i + 1; j < g.length; j++) if (!used.has(g[j].id) && SB.isMirror(sheetId, g[i], g[j], 'x')) { pairs.push([g[i], g[j]]); used.add(g[i].id); used.add(g[j].id); break; }
      }
    }
    return pairs;
  };
})();
