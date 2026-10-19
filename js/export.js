/* Spritebench — exportación: catálogo JSON propio, atlas estilo TexturePacker, PNG sueltos y paquete para Unity (.zip o carpeta directa). */
(function () {
  const SB = window.SB;
  const X = (SB.exp = {});

  // ------------------------------------------------------------ zip (modo "store", sin compresión: suficiente y sin dependencias)
  const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const enc = new TextEncoder();
  X.zip = (files) => {   // files: [{name, data:Uint8Array}]
    const parts = [], central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const head = new DataView(new ArrayBuffer(30)); head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true); head.setUint16(8, 0, true);
      head.setUint16(10, 0, true); head.setUint16(12, 0x21, true); head.setUint32(14, crc, true); head.setUint32(18, size, true); head.setUint32(22, size, true); head.setUint16(26, name.length, true); head.setUint16(28, 0, true);
      parts.push(new Uint8Array(head.buffer), name, f.data);
      const cd = new DataView(new ArrayBuffer(46)); cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
      cd.setUint16(12, 0, true); cd.setUint16(14, 0x21, true); cd.setUint32(16, crc, true); cd.setUint32(20, size, true); cd.setUint32(24, size, true); cd.setUint16(28, name.length, true); cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), name);
      offset += 30 + name.length + size;
    }
    let csize = 0; central.forEach((c) => (csize += c.length));
    const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  };

  // ------------------------------------------------------------ utilidades
  const safe = (s) => String(s).replace(/[^\p{L}\p{N}_.-]+/gu, '_');
  X.download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const dataUrlBytes = (u) => { const b = atob(u.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  const canvasBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'));
  const blobBytes = async (b) => new Uint8Array(await b.arrayBuffer());
  X.sheetFile = (sh) => safe(sh.name.replace(/\.[^.]+$/, '')) + '.png';

  // ------------------------------------------------------------ catálogo propio (ver docs/FORMAT.md)
  X.catalog = () => {
    const p = SB.project;
    return {
      format: 'spritebench', version: 1, name: p.name, cell: p.cell, ppu: p.ppu, categories: p.categories,
      sheets: p.sheets.map((sh) => ({ id: sh.id, name: sh.name, file: X.sheetFile(sh), width: sh.w, height: sh.h })),
      sprites: p.sheets.flatMap((sh) => sh.sprites.map((s) => ({
        id: s.id, name: s.name, sheet: sh.id, rect: { x: s.x, y: s.y, w: s.w, h: s.h }, pivot: { x: s.pivot[0], y: s.pivot[1] },
        category: s.category, footprint: { cols: s.fc, rows: s.fr }, solid: !!s.solid, tags: s.tags || [], props: Object.keys(s.props || {}).map((k) => ({ key: k, value: String(s.props[k]) })),
      }))),
      sets: p.sets.map((st) => ({
        id: st.id, name: st.name, category: st.category,
        variants: st.variants.map((v) => (v.sprite ? { name: v.name, sprite: v.sprite } : v.flipOf ? { name: v.name, flipOf: v.flipOf, flipX: !!v.flipX, flipY: !!v.flipY } : { name: v.name })),
      })),
    };
  };
  X.catalogText = () => JSON.stringify(X.catalog(), null, 2);

  /** Formato "JSON hash" de TexturePacker (lo leen Phaser, PixiJS, Godot, libGDX...). Un archivo por hoja. */
  X.texturePacker = (sh) => {
    const frames = {};
    sh.sprites.forEach((s) => { frames[s.name] = { frame: { x: s.x, y: s.y, w: s.w, h: s.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: s.w, h: s.h }, sourceSize: { w: s.w, h: s.h }, pivot: { x: s.pivot[0], y: 1 - s.pivot[1] } }; });
    return { frames, meta: { app: 'Spritebench', version: '1', image: X.sheetFile(sh), format: 'RGBA8888', size: { w: sh.w, h: sh.h }, scale: '1' } };
  };

  // ------------------------------------------------------------ PNG por sprite (con los volteos "horneados" si se pide)
  X.spriteCanvas = (s, sheetId, flipX, flipY) => {
    const im = SB.images[sheetId], c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.save(); g.translate(flipX ? s.w : 0, flipY ? s.h : 0); g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    g.drawImage(im.canvas, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h); g.restore(); return c;
  };
  X.pngFiles = async (bakeFlips) => {
    const files = [], used = new Set();
    const uniq = (n) => { let u = n, i = 2; while (used.has(u)) u = n.replace(/\.png$/, '') + '_' + i++ + '.png'; used.add(u); return u; };
    for (const sh of SB.project.sheets) for (const s of sh.sprites) files.push({ name: uniq('sprites/' + safe(s.name) + '.png'), data: await blobBytes(await canvasBlob(X.spriteCanvas(s, sh.id))) });
    if (bakeFlips) for (const st of SB.project.sets) for (const v of st.variants) {
      if (!v.flipOf) continue; const r = SB.resolveVariant(st, v.name); if (!r || !r.sprite) continue;
      const sh = SB.sheetOf(r.sprite.id); files.push({ name: uniq('sprites/' + safe(st.name + '_' + v.name) + '.png'), data: await blobBytes(await canvasBlob(X.spriteCanvas(r.sprite, sh.id, r.flipX, r.flipY))) });
    }
    return files;
  };

  // ------------------------------------------------------------ paquete completo
  X.bundle = async (opts) => {
    opts = opts || {}; const p = SB.project, base = safe(p.name || 'catalog'), files = [];
    files.push({ name: base + '.catalog.json', data: enc.encode(X.catalogText()) });
    for (const sh of p.sheets) files.push({ name: X.sheetFile(sh), data: sh.src.startsWith('data:image/png') ? dataUrlBytes(sh.src) : await blobBytes(await canvasBlob(SB.images[sh.id].canvas)) });
    if (opts.texturePacker) for (const sh of p.sheets) files.push({ name: safe(sh.name.replace(/\.[^.]+$/, '')) + '.atlas.json', data: enc.encode(JSON.stringify(X.texturePacker(sh), null, 2)) });
    if (opts.pngs) files.push(...(await X.pngFiles(opts.bake)));
    return { base, files };
  };
  X.exportZip = async (opts) => { const b = await X.bundle(opts); X.download(X.zip(b.files), b.base + '.spritebench.zip'); return b.files.length; };
  /** Escribe directamente en una carpeta del disco (Chrome/Edge): p. ej. Assets/Sprites de Unity. */
  X.exportFolder = async (opts) => {
    if (!window.showDirectoryPicker) throw new Error('Tu navegador no permite elegir carpetas: usa “Exportar .zip”.');
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' }); const b = await X.bundle(opts);
    for (const f of b.files) {
      let d = dir; const parts = f.name.split('/'); const fn = parts.pop();
      for (const part of parts) d = await d.getDirectoryHandle(part, { create: true });
      const h = await d.getFileHandle(fn, { create: true }), w = await h.createWritable(); await w.write(f.data); await w.close();
    }
    return b.files.length;
  };
  X.saveProjectFile = () => X.download(new Blob([SB.projectJSON()], { type: 'application/json' }), safe(SB.project.name || 'project') + '.spritebench');
})();
