/* Spritebench — estado del proyecto, historial (undo/redo), eventos y autoguardado.
   Todo cuelga de window.SB (sin build, sin módulos: funciona abriendo index.html directo). */
(function () {
  const SB = (window.SB = {});

  // ------------------------------------------------------------ utilidades
  SB.uid = (p) => (p || 'id') + Math.random().toString(36).slice(2, 8);
  SB.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  SB.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SB.$ = (s, r) => (r || document).querySelector(s);
  SB.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  SB.el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  };

  // ------------------------------------------------------------ eventos
  const handlers = {};
  SB.on = (evt, fn) => { (handlers[evt] = handlers[evt] || []).push(fn); };
  SB.emit = (evt, a, b) => { (handlers[evt] || []).slice().forEach((f) => f(a, b)); };

  // ------------------------------------------------------------ modelo
  // sprite : { id, name, x, y, w, h, pivot:[px,py] (0..1, origen ABAJO-izquierda como Unity), category, fc, fr, solid, tags:[], props:{} }
  // set    : { id, name, category, variants:[ { name, sprite } | { name, flipOf, flipX, flipY } ] }
  SB.VARIANT_PRESETS = {
    '4 direcciones': ['front', 'left', 'back', 'right'],
    '2 direcciones': ['front', 'back'],
    '8 direcciones': ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    'Estados': ['idle', 'active', 'broken'],
    'Personalizado': [],
  };
  SB.newProject = () => ({ version: 1, name: 'Sin título', cell: 16, ppu: 16, categories: ['object', 'rug', 'wall'], sheets: [], sets: [] });
  SB.project = SB.newProject();
  SB.sel = new Set();           // ids de sprites seleccionados
  SB.activeSheet = null;        // id de la hoja visible
  SB.activeSet = null;          // id del conjunto activo
  SB.images = {};               // sheetId -> { img, canvas, data }
  SB.dirty = false;

  SB.sheet = (id) => SB.project.sheets.find((s) => s.id === (id || SB.activeSheet)) || null;
  SB.sprites = () => { const s = SB.sheet(); return s ? s.sprites : []; };
  SB.findSprite = (id) => { for (const sh of SB.project.sheets) { const s = sh.sprites.find((x) => x.id === id); if (s) return s; } return null; };
  SB.sheetOf = (spriteId) => SB.project.sheets.find((sh) => sh.sprites.some((s) => s.id === spriteId)) || null;
  SB.setOfSprite = (id) => {
    for (const st of SB.project.sets) for (let i = 0; i < st.variants.length; i++) if (st.variants[i].sprite === id) return { set: st, index: i, variant: st.variants[i] };
    return null;
  };
  SB.selected = () => Array.from(SB.sel).map(SB.findSprite).filter(Boolean);

  SB.newSprite = (sheetId, r, extra) => {
    const sh = SB.sheet(sheetId);
    const w = r[2] - r[0], h = r[3] - r[1];
    const cell = SB.project.cell || 16;
    const n = sh.sprites.length + 1;
    const sp = Object.assign({
      id: SB.uid('s'), name: sh.name.replace(/\.[^.]+$/, '').replace(/\W+/g, '_') + '_' + String(n).padStart(3, '0'),
      x: r[0], y: r[1], w, h, pivot: [0.5, 0], category: 'object',
      fc: Math.max(1, Math.ceil(w / cell)), fr: Math.max(1, Math.ceil(Math.min(h, h * 0.6) / cell)), solid: false, tags: [], props: {},
    }, extra || {});
    return sp;
  };

  // ------------------------------------------------------------ historial
  const strip = (k, v) => (k === 'src' ? undefined : v);
  const snap = () => JSON.stringify({ project: SB.project, sel: Array.from(SB.sel), sheet: SB.activeSheet, set: SB.activeSet }, strip);
  const hist = { undo: [], redo: [], labels: [] };
  SB.history = hist;
  function restore(json) {
    const d = JSON.parse(json);
    const src = {}; SB.project.sheets.forEach((s) => { src[s.id] = s.src; });
    d.project.sheets.forEach((s) => { s.src = src[s.id]; });
    SB.project = d.project;
    SB.sel = new Set(d.sel.filter((id) => SB.findSprite(id)));
    SB.activeSheet = SB.sheet(d.sheet) ? d.sheet : (SB.project.sheets[0] || {}).id || null;
    SB.activeSet = d.set;
  }
  /** Ejecuta una edición con deshacer. `label` aparece en el panel Historial. */
  SB.do = (label, fn) => {
    const before = snap();
    const r = fn();
    const after = snap();
    if (before !== after) {
      hist.undo.push({ label, state: before }); hist.redo.length = 0;
      if (hist.undo.length > 100) hist.undo.shift();
      SB.dirty = true; SB.scheduleSave();
    }
    SB.emit('change');
    return r;
  };
  SB.undo = () => {
    const e = hist.undo.pop(); if (!e) return;
    hist.redo.push({ label: e.label, state: snap() }); restore(e.state); SB.dirty = true; SB.scheduleSave(); SB.emit('change'); SB.emit('selection');
  };
  SB.redo = () => {
    const e = hist.redo.pop(); if (!e) return;
    hist.undo.push({ label: e.label, state: snap() }); restore(e.state); SB.dirty = true; SB.scheduleSave(); SB.emit('change'); SB.emit('selection');
  };
  SB.resetHistory = () => { hist.undo.length = 0; hist.redo.length = 0; };

  SB.select = (ids, add) => {
    if (!add) SB.sel.clear();
    for (const id of ids) SB.sel.add(id);
    SB.emit('selection');
  };
  SB.toggleSelect = (id) => { if (SB.sel.has(id)) SB.sel.delete(id); else SB.sel.add(id); SB.emit('selection'); };

  // ------------------------------------------------------------ imágenes de las hojas
  SB.loadImage = (sheet) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
      SB.images[sheet.id] = { img, canvas: c, ctx: g, data: g.getImageData(0, 0, c.width, c.height) };
      sheet.w = c.width; sheet.h = c.height; res(SB.images[sheet.id]);
    };
    img.onerror = () => rej(new Error('No se pudo leer la imagen'));
    img.src = sheet.src;
  });
  SB.pixels = (sheetId) => (SB.images[sheetId || SB.activeSheet] || {}).data || null;

  /** Añade una hoja desde un File (PNG/JPG/GIF/WebP). */
  SB.addSheetFile = (file) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = async () => {
      const sheet = { id: SB.uid('sh'), name: file.name, src: fr.result, w: 0, h: 0, sprites: [] };
      try { await SB.loadImage(sheet); } catch (e) { rej(e); return; }
      SB.do('Abrir hoja ' + file.name, () => { SB.project.sheets.push(sheet); SB.activeSheet = sheet.id; });
      SB.emit('sheets'); res(sheet);
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
  SB.addSheetDataUrl = async (name, url) => {
    const sheet = { id: SB.uid('sh'), name, src: url, w: 0, h: 0, sprites: [] };
    await SB.loadImage(sheet);
    SB.do('Abrir hoja ' + name, () => { SB.project.sheets.push(sheet); SB.activeSheet = sheet.id; });
    SB.emit('sheets'); return sheet;
  };

  // ------------------------------------------------------------ guardar / cargar proyecto
  SB.projectJSON = () => JSON.stringify(SB.project);
  SB.loadProject = async (obj) => {
    const p = Object.assign(SB.newProject(), obj);
    p.sheets = p.sheets || []; p.sets = p.sets || [];
    SB.images = {};
    for (const sh of p.sheets) { sh.sprites = sh.sprites || []; try { await SB.loadImage(sh); } catch (e) { /* hoja sin imagen */ } }
    SB.project = p; SB.sel.clear(); SB.activeSheet = (p.sheets[0] || {}).id || null; SB.activeSet = null;
    SB.resetHistory(); SB.dirty = false; SB.emit('sheets'); SB.emit('change'); SB.emit('selection');
  };

  // autoguardado en IndexedDB (sobrevive a recargar la página)
  const DB = 'spritebench', ST = 'kv';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  let timer = null;
  SB.scheduleSave = () => { clearTimeout(timer); timer = setTimeout(SB.saveLocal, 900); };
  SB.saveLocal = async () => {
    try { const db = await idb(); db.transaction(ST, 'readwrite').objectStore(ST).put(SB.projectJSON(), 'autosave'); SB.emit('saved'); } catch (e) { /* modo privado */ }
  };
  SB.loadLocal = async () => {
    try {
      const db = await idb();
      return await new Promise((res) => { const r = db.transaction(ST).objectStore(ST).get('autosave'); r.onsuccess = () => res(r.result ? JSON.parse(r.result) : null); r.onerror = () => res(null); });
    } catch (e) { return null; }
  };
})();
