/* Spritebench — operaciones del modelo (todas con deshacer). Las usan menús, atajos, clic derecho y paleta de comandos. */
(function () {
  const SB = window.SB;
  const A = (SB.act = {});

  const clampRect = (r, sh) => [SB.clamp(Math.round(r[0]), 0, sh.w - 1), SB.clamp(Math.round(r[1]), 0, sh.h - 1), SB.clamp(Math.round(r[2]), 1, sh.w), SB.clamp(Math.round(r[3]), 1, sh.h)];

  // ------------------------------------------------------------ sprites
  A.addSprites = (rects, label, extra) => {
    const sh = SB.sheet(); if (!sh || !rects.length) return [];
    let ids = [];
    SB.do(label || 'Crear sprite', () => {
      for (const r0 of rects) { const r = clampRect(r0, sh); if (r[2] - r[0] < 1 || r[3] - r[1] < 1) continue; const sp = SB.newSprite(sh.id, r, extra); sh.sprites.push(sp); ids.push(sp.id); }
      SB.sel = new Set(ids);
    });
    SB.emit('selection'); return ids;
  };
  A.deleteSelected = () => {
    if (!SB.sel.size) return;
    SB.do('Borrar sprites', () => {
      const dead = SB.sel;
      SB.project.sheets.forEach((sh) => { sh.sprites = sh.sprites.filter((s) => !dead.has(s.id)); });
      cleanSets(); SB.sel = new Set();
    });
    SB.emit('selection');
  };
  function cleanSets() {
    const alive = new Set(); SB.project.sheets.forEach((sh) => sh.sprites.forEach((s) => alive.add(s.id)));
    for (const st of SB.project.sets) {
      for (const v of st.variants) if (v.sprite && !alive.has(v.sprite)) delete v.sprite;   // el sprite ya no existe: la variante queda vacia
      for (const v of st.variants) if (v.flipOf && !st.variants.some((o) => o.name === v.flipOf && o.sprite)) { delete v.flipOf; delete v.flipX; delete v.flipY; }
    }
    SB.project.sets = SB.project.sets.filter((st) => st.variants.length);
    if (SB.activeSet && !SB.project.sets.some((s) => s.id === SB.activeSet)) SB.activeSet = null;
  }
  A.duplicateSelected = () => {
    const list = SB.selected(); if (!list.length) return;
    SB.do('Duplicar', () => {
      const ids = [];
      for (const s of list) { const c = JSON.parse(JSON.stringify(s)); c.id = SB.uid('s'); c.name = s.name + '_copy'; SB.sheetOf(s.id).sprites.push(c); ids.push(c.id); }
      SB.sel = new Set(ids);
    });
    SB.emit('selection');
  };
  A.patch = (ids, patch, label) => {
    SB.do(label || 'Cambiar propiedades', () => { for (const id of ids) { const s = SB.findSprite(id); if (s) Object.assign(s, typeof patch === 'function' ? patch(s) : patch); } });
  };
  A.setRect = (id, r, label) => {
    const s = SB.findSprite(id), sh = SB.sheetOf(id); if (!s) return;
    SB.do(label || 'Mover / redimensionar', () => { const c = clampRect(r, sh); s.x = c[0]; s.y = c[1]; s.w = c[2] - c[0]; s.h = c[3] - c[1]; });
  };
  A.nudge = (dx, dy) => {
    const list = SB.selected(); if (!list.length) return;
    SB.do('Mover', () => { for (const s of list) { const sh = SB.sheetOf(s.id); s.x = SB.clamp(s.x + dx, 0, sh.w - s.w); s.y = SB.clamp(s.y + dy, 0, sh.h - s.h); } });
  };
  A.trim = (all) => {
    const sh = SB.sheet(); const list = all ? sh.sprites : SB.selected(); if (!list.length) return;
    SB.do(all ? 'Ajustar todos al dibujo' : 'Ajustar al dibujo', () => {
      const dead = new Set();
      for (const s of list) { const t = SB.trimRect(sh.id, [s.x, s.y, s.x + s.w, s.y + s.h]); if (!t) { dead.add(s.id); continue; } s.x = t[0]; s.y = t[1]; s.w = t[2] - t[0]; s.h = t[3] - t[1]; }
      if (dead.size) { sh.sprites = sh.sprites.filter((s) => !dead.has(s.id)); cleanSets(); SB.sel = new Set([...SB.sel].filter((i) => !dead.has(i))); }
    });
    SB.emit('selection');
  };
  A.mergeSelected = () => {
    const list = SB.selected(); if (list.length < 2) return;
    SB.do('Fusionar', () => {
      const keep = list[0];
      const r = [Math.min(...list.map((s) => s.x)), Math.min(...list.map((s) => s.y)), Math.max(...list.map((s) => s.x + s.w)), Math.max(...list.map((s) => s.y + s.h))];
      keep.x = r[0]; keep.y = r[1]; keep.w = r[2] - r[0]; keep.h = r[3] - r[1];
      const dead = new Set(list.slice(1).map((s) => s.id));
      SB.project.sheets.forEach((sh) => { sh.sprites = sh.sprites.filter((s) => !dead.has(s.id)); });
      cleanSets(); SB.sel = new Set([keep.id]);
    });
    SB.emit('selection');
  };
  A.splitGrid = (cols, rows, trim) => {
    const list = SB.selected(); if (list.length !== 1) return;
    const s = list[0], sh = SB.sheetOf(s.id), cw = s.w / cols, ch = s.h / rows, ids = [];
    SB.do('Partir en rejilla', () => {
      const idx = sh.sprites.indexOf(s), news = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        let rect = [s.x + Math.round(c * cw), s.y + Math.round(r * ch), s.x + Math.round((c + 1) * cw), s.y + Math.round((r + 1) * ch)];
        if (trim) { rect = SB.trimRect(sh.id, rect); if (!rect) continue; }
        const n = SB.newSprite(sh.id, rect, { category: s.category, solid: s.solid, pivot: s.pivot.slice() }); news.push(n); ids.push(n.id);
      }
      sh.sprites.splice(idx, 1, ...news); cleanSets(); SB.sel = new Set(ids);
    });
    SB.emit('selection');
  };
  A.selectAll = () => { SB.select(SB.sprites().map((s) => s.id)); };
  A.deselect = () => SB.select([]);
  A.invertSelection = () => { SB.select(SB.sprites().filter((s) => !SB.sel.has(s.id)).map((s) => s.id)); };
  A.selectLoose = () => { SB.select(SB.sprites().filter((s) => !SB.setOfSprite(s.id)).map((s) => s.id)); };
  A.selectBySet = (setId) => {
    const st = SB.project.sets.find((s) => s.id === setId); if (!st) return;
    SB.select(st.variants.filter((v) => v.sprite).map((v) => v.sprite)); SB.activeSet = setId; SB.emit('change');
  };
  A.rename = (id, name) => A.patch([id], { name }, 'Renombrar');
  /** Renombrado en lote con patrón: {n} contador, {name} nombre actual. */
  A.renameBulk = (pattern, start) => {
    const list = SB.selected().sort((a, b) => a.y - b.y || a.x - b.x); if (!list.length) return;
    SB.do('Renombrar en lote', () => list.forEach((s, i) => { s.name = pattern.replace(/\{n(?::(\d+))?\}/g, (_, pad) => String(start + i).padStart(+pad || 0, '0')).replace(/\{name\}/g, s.name); }));
  };
  A.setPivotPreset = (ids, px, py) => A.patch(ids, { pivot: [px, py] }, 'Cambiar pivote');

  // ------------------------------------------------------------ conjuntos
  const active = () => SB.project.sets.find((s) => s.id === SB.activeSet) || null;
  A.activeSet = active;
  A.newSet = (name, variantNames) => {
    let id;
    SB.do('Nuevo conjunto', () => {
      id = SB.uid('set');
      SB.project.sets.push({ id, name: name || 'Conjunto ' + (SB.project.sets.length + 1), category: 'object', variants: (variantNames || SB.VARIANT_PRESETS['4 direcciones']).map((n) => ({ name: n })) });
      SB.activeSet = id;
    });
    return id;
  };
  /** Crea un conjunto con los sprites seleccionados, de izquierda a derecha en el orden de variantes. */
  A.groupSelection = (names) => {
    const list = SB.selected().sort((a, b) => a.x - b.x); if (list.length < 1) return;
    const vn = names || SB.VARIANT_PRESETS['4 direcciones'];
    let id;
    SB.do('Agrupar en conjunto', () => {
      list.forEach((s) => { const o = SB.setOfSprite(s.id); if (o) o.set.variants[o.index] = { name: o.variant.name }; });
      id = SB.uid('set');
      const variants = vn.map((n) => ({ name: n }));
      list.forEach((s, i) => { if (variants[i]) variants[i] = { name: variants[i].name, sprite: s.id }; });
      SB.project.sets.push({ id, name: A.uniqueSetName(list[0].name.replace(/_\d+$/, '')), category: list[0].category, variants }); SB.activeSet = id;
      cleanSets();
    });
    return id;
  };
  A.assign = (setId, variantName, spriteId) => {
    SB.do('Asignar a ' + variantName, () => {
      const st = SB.project.sets.find((s) => s.id === setId); if (!st) return;
      const o = SB.setOfSprite(spriteId); if (o) o.set.variants[o.index] = { name: o.variant.name };
      const v = st.variants.find((x) => x.name === variantName); if (!v) return;
      for (const k of Object.keys(v)) if (k !== 'name') delete v[k];
      v.sprite = spriteId; SB.activeSet = setId; cleanSets();
    });
  };
  A.setFlip = (setId, variantName, fromName, flipX, flipY) => {
    SB.do('Voltear ' + variantName, () => {
      const st = SB.project.sets.find((s) => s.id === setId); const v = st && st.variants.find((x) => x.name === variantName); if (!v) return;
      for (const k of Object.keys(v)) if (k !== 'name') delete v[k];
      if (fromName) { v.flipOf = fromName; v.flipX = !!flipX; v.flipY = !!flipY; }
    });
  };
  A.clearVariant = (setId, variantName) => A.setFlip(setId, variantName, null);
  A.deleteSet = (setId) => SB.do('Deshacer conjunto', () => { SB.project.sets = SB.project.sets.filter((s) => s.id !== setId); if (SB.activeSet === setId) SB.activeSet = null; });
  A.patchSet = (setId, patch, label) => SB.do(label || 'Cambiar conjunto', () => { const st = SB.project.sets.find((s) => s.id === setId); if (st) Object.assign(st, patch); });
  A.addVariant = (setId, name) => SB.do('Añadir variante', () => { const st = SB.project.sets.find((s) => s.id === setId); if (st && name && !st.variants.some((v) => v.name === name)) st.variants.push({ name }); });
  A.removeVariant = (setId, name) => SB.do('Quitar variante', () => { const st = SB.project.sets.find((s) => s.id === setId); if (st) { st.variants = st.variants.filter((v) => v.name !== name && v.flipOf !== name); cleanSets(); } });
  A.applyPreset = (setId, presetName) => SB.do('Variantes ' + presetName, () => {
    const st = SB.project.sets.find((s) => s.id === setId); const names = SB.VARIANT_PRESETS[presetName]; if (!st || !names || !names.length) return;
    const old = st.variants; st.variants = names.map((n) => old.find((v) => v.name === n) || { name: n });
    old.forEach((v) => { if (!st.variants.some((x) => x.name === v.name) && v.sprite) { /* sprite huérfano queda suelto */ } });
  });
  /** Busca pares espejados en la hoja y crea conjuntos "left/right" con el volteo en vez del duplicado. */
  A.findMirrors = (deleteDuplicates) => {
    const sh = SB.sheet(); if (!sh) return 0;
    const pairs = SB.findMirrorPairs(sh.id, sh.sprites.filter((s) => !SB.setOfSprite(s.id)));
    if (!pairs.length) return 0;
    SB.do('Buscar espejos', () => {
      const dead = new Set();
      for (const [a, b] of pairs) {
        const id = SB.uid('set');
        const variants = [{ name: 'left', sprite: a.id }, { name: 'right', flipOf: 'left', flipX: true, flipY: false }];
        if (!deleteDuplicates) variants[1] = { name: 'right', sprite: b.id };
        SB.project.sets.push({ id: id, name: A.uniqueSetName(a.name.replace(/_\d+$/, '') + '_lr'), category: a.category, variants });
        if (deleteDuplicates) dead.add(b.id);
      }
      sh.sprites = sh.sprites.filter((s) => !dead.has(s.id)); cleanSets();
    });
    return pairs.length;
  };

  A.copyProps = () => {
    const s = SB.selected()[0]; if (!s) return;
    SB.clipboard = JSON.parse(JSON.stringify({ fc: s.fc, fr: s.fr, solid: s.solid, pivot: s.pivot, category: s.category, tags: s.tags || [], props: s.props || {} }));
  };
  A.pasteProps = () => { if (SB.clipboard && SB.sel.size) A.patch([...SB.sel], JSON.parse(JSON.stringify(SB.clipboard)), 'Pegar propiedades'); };
  A.moveVariant = (setId, name, dir) => SB.do('Mover variante', () => {
    const st = SB.project.sets.find((x) => x.id === setId); if (!st) return; const i = st.variants.findIndex((v) => v.name === name), j = i + dir;
    if (i < 0 || j < 0 || j >= st.variants.length) return; const t = st.variants[i]; st.variants[i] = st.variants[j]; st.variants[j] = t;
  });
  A.renameVariant = (setId, oldName, newName) => SB.do('Renombrar variante', () => {
    const st = SB.project.sets.find((x) => x.id === setId); newName = (newName || '').trim(); if (!st || !newName || st.variants.some((v) => v.name === newName)) return;
    st.variants.forEach((v) => { if (v.name === oldName) v.name = newName; if (v.flipOf === oldName) v.flipOf = newName; });
  });
  /** Nombres de sprite repetidos (Unity y otros motores identifican por nombre). */
  SB.duplicateNames = () => { const seen = {}, dup = new Set(); SB.project.sheets.forEach((sh) => sh.sprites.forEach((s) => { if (seen[s.name]) dup.add(s.name); seen[s.name] = 1; })); return [...dup]; };
  A.fixDuplicateNames = () => SB.do('Nombres únicos', () => {
    const used = new Set();
    SB.project.sheets.forEach((sh) => sh.sprites.forEach((s) => { let n = s.name, i = 2; while (used.has(n)) n = s.name + '_' + i++; s.name = n; used.add(n); }));
  });

  A.uniqueSetName = (base) => { let n = base, i = 2; while (SB.project.sets.some((s) => s.name === n)) n = base + '_' + i++; return n; };

  // ------------------------------------------------------------ categorías
  A.addCategory = (name) => SB.do('Nueva categoría', () => { if (name && !SB.project.categories.includes(name)) SB.project.categories.push(name); });

  // ------------------------------------------------------------ resolver una variante (para vistas previas y exportar)
  /** { sprite, flipX, flipY } real de una variante (sigue flipOf). */
  SB.resolveVariant = (set, name, depth) => {
    const v = set.variants.find((x) => x.name === name); if (!v || (depth || 0) > 4) return null;
    if (v.sprite) return { sprite: SB.findSprite(v.sprite), flipX: false, flipY: false };
    if (v.flipOf) { const r = SB.resolveVariant(set, v.flipOf, (depth || 0) + 1); if (!r) return null; return { sprite: r.sprite, flipX: r.flipX !== !!v.flipX, flipY: r.flipY !== !!v.flipY }; }
    return null;
  };
})();
