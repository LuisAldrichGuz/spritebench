/* Spritebench — paneles del dock derecho: Sprites, Propiedades, Conjuntos e Historial. */
(function () {
  const SB = window.SB, U = SB.ui, A = SB.act;
  const { el, esc } = SB;
  const P = (SB.panels = {});
  const dock = SB.$('#dock');
  const collapsed = {};
  const DIR_LABEL = { front: 'Frente', left: 'Izquierda', back: 'Espalda', right: 'Derecha' };
  const vlabel = (n) => SB.t(DIR_LABEL[n] || n);

  // ------------------------------------------------------------ miniaturas
  function thumb(cnv, s, flipX, flipY) {
    const sh = SB.sheetOf(s.id), im = sh && SB.images[sh.id]; const g = cnv.getContext('2d'); g.clearRect(0, 0, cnv.width, cnv.height); if (!im) return;
    g.imageSmoothingEnabled = false; const k = Math.min((cnv.width - 4) / s.w, (cnv.height - 4) / s.h), kk = k >= 1 ? Math.floor(k) : k, dw = s.w * kk, dh = s.h * kk;
    g.save(); g.translate(cnv.width / 2, cnv.height - 2 - dh / 2); g.scale(flipX ? -1 : 1, flipY ? -1 : 1); g.drawImage(im.canvas, s.x, s.y, s.w, s.h, -dw / 2, -dh / 2, dw, dh); g.restore();
  }
  P.thumb = thumb;
  const mkThumb = (s, size, fx, fy) => { const c = el('canvas', { width: size, height: size }); thumb(c, s, fx, fy); return c; };

  // ------------------------------------------------------------ estructura de paneles (acordeón)
  const defs = [];
  function panel(id, title, build, o) {
    const body = el('div', { class: 'pbody' }), head = el('div', { class: 'phead', onclick: () => { collapsed[id] = !collapsed[id]; box.classList.toggle('closed', !!collapsed[id]); } }, el('span', { class: 'chev', html: U.icon('chev') }), el('span', { class: 'pt' }, title), el('span', { class: 'pc', id: 'cnt-' + id }), ...(o && o.tools ? [o.tools] : []));
    const box = el('section', { class: 'panel' + (o && o.grow ? ' grow' : ''), id: 'p-' + id }, head, body); dock.append(box); defs.push({ id, body, build });
  }
  P.refresh = () => defs.forEach((d) => { try { d.build(d.body); } catch (e) { console.error(d.id, e); } });
  let pending = false;
  const later = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; P.refresh(); }); };

  // ------------------------------------------------------------ SPRITES
  let filter = '', filterMode = 'all', lastClicked = null;
  panel('sprites', 'Sprites', (body) => {
    const sh = SB.sheet(), list = sh ? sh.sprites : [];
    const scroll = body.querySelector('.slist'); const st = scroll ? scroll.scrollTop : 0;
    body.innerHTML = '';
    const q = el('input', { class: 'search', placeholder: 'Buscar sprite…', value: filter, oninput: (e) => { filter = e.target.value; later(); } });
    const mode = el('select', { class: 'small', onchange: (e) => { filterMode = e.target.value; later(); } }, [['all', 'Todos'], ['loose', 'Sueltos'], ['set', 'En conjuntos'], ['big', 'Gigantes']].map(([v, t]) => el('option', { value: v, selected: v === filterMode }, t)));
    body.append(el('div', { class: 'row' }, q, mode));
    const rows = list.filter((s) => (!filter || s.name.toLowerCase().includes(filter.toLowerCase())) && (filterMode === 'all' || (filterMode === 'loose' && !SB.setOfSprite(s.id)) || (filterMode === 'set' && SB.setOfSprite(s.id)) || (filterMode === 'big' && (s.w > 96 || s.h > 96))));
    SB.$('#cnt-sprites').textContent = list.length ? rows.length + ' / ' + list.length : '';
    const wrap = el('div', { class: 'slist' });
    if (!list.length) wrap.append(el('div', { class: 'empty' }, 'Aún no hay sprites. Usa Slice ▸ Auto-slice, la herramienta Rectángulo (M) o la Varita (W).'));
    rows.slice(0, 600).forEach((s) => {
      const so = SB.setOfSprite(s.id);
      const row = el('div', { class: 'srow' + (SB.sel.has(s.id) ? ' sel' : ''), 'data-id': s.id },
        mkThumb(s, 36), el('div', { class: 'nm' }, el('b', { class: 'usr' }, s.name), el('small', {}, s.w + '×' + s.h + ' · ' + s.fc + '×' + s.fr + ' celdas' + (s.solid ? ' · sólido' : ''))),
        so ? el('span', { class: 'badge', title: 'Conjunto ' + so.set.name }, so.variant.name.slice(0, 5)) : null);
      row.addEventListener('click', (e) => {
        const ids = rows.map((r) => r.id);
        if (e.shiftKey && lastClicked) { const a = ids.indexOf(lastClicked), b = ids.indexOf(s.id); SB.select(ids.slice(Math.min(a, b), Math.max(a, b) + 1), e.ctrlKey || e.metaKey); }
        else if (e.ctrlKey || e.metaKey) SB.toggleSelect(s.id); else SB.select([s.id]); lastClicked = s.id;
      });
      row.addEventListener('dblclick', () => { SB.view.focus([s.id]); });
      row.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!SB.sel.has(s.id)) SB.select([s.id]); U.showContext(U.spriteMenu(), e.clientX, e.clientY); });
      wrap.append(row);
    });
    if (rows.length > 600) wrap.append(el('div', { class: 'empty' }, 'Mostrando 600 de ' + rows.length + '. Usa la búsqueda.'));
    body.append(wrap); wrap.scrollTop = st;
  }, { grow: true });

  // ------------------------------------------------------------ PROPIEDADES
  const numInput = (val, on, o) => { const i = el('input', { type: 'number', class: 'num', value: val, min: o && o.min, max: o && o.max, step: o && o.step || 1 }); i.addEventListener('change', () => on(+i.value)); return i; };
  const PIVOTS = [[0, 1], [0.5, 1], [1, 1], [0, 0.5], [0.5, 0.5], [1, 0.5], [0, 0], [0.5, 0], [1, 0]];
  panel('props', 'Propiedades', (body) => {
    body.innerHTML = ''; const list = SB.selected();
    if (!list.length) { body.append(el('div', { class: 'empty' }, 'Selecciona un sprite para ver cuánto mide, cuántas celdas ocupa y dónde está su pivote.')); return; }
    const ids = list.map((s) => s.id), one = list.length === 1 ? list[0] : null, s0 = list[0];
    const same = (f) => list.every((s) => JSON.stringify(f(s)) === JSON.stringify(f(s0)));
    if (one) {
      const nm = el('input', { class: 'full', id: 'nameField', value: one.name, onchange: (e) => A.rename(one.id, e.target.value.trim() || one.name) });
      body.append(el('div', { class: 'frm' }, el('label', {}, 'Nombre'), nm));
      const g = el('div', { class: 'grid4' });
      [['X', one.x], ['Y', one.y], ['W', one.w], ['H', one.h]].forEach(([l, v], i) => g.append(el('label', {}, l, numInput(v, (n) => { const r = [one.x, one.y, one.x + one.w, one.y + one.h]; if (i < 2) { const d = n - r[i]; r[i] += d; r[i + 2] += d; } else r[i] = r[i - 2] + Math.max(1, n); A.setRect(one.id, r); }, { min: 0 }))));
      body.append(g);
      body.append(el('div', { class: 'info' }, el('b', {}, one.w + ' × ' + one.h + ' px'), ' · ocupa ', el('b', {}, one.fc + ' × ' + one.fr + ' celdas'), ' (celda de ' + SB.project.cell + ' px)'));
      const pv = el('canvas', { width: 320, height: 170, class: 'pview' }); body.append(pv); drawPlacement(pv, one);
    } else body.append(el('div', { class: 'info' }, el('b', {}, list.length + ' sprites'), ' seleccionados — los cambios se aplican a todos.'));

    // huella
    body.append(el('div', { class: 'frm' }, el('label', {}, 'Ocupa en el suelo (celdas)'),
      el('div', { class: 'row' }, stepper('Ancho', same((s) => s.fc) ? s0.fc : '', (n) => A.patch(ids, { fc: n }, 'Huella')), stepper('Fondo', same((s) => s.fr) ? s0.fr : '', (n) => A.patch(ids, { fr: n }, 'Huella')))));
    const solid = el('input', { type: 'checkbox' }); solid.checked = list.every((s) => s.solid); solid.indeterminate = !solid.checked && list.some((s) => s.solid);
    solid.addEventListener('change', () => A.patch(ids, { solid: solid.checked }, 'Sólido'));
    body.append(el('label', { class: 'chk' }, solid, ' Sólido (bloquea el paso)'));
    // categoría
    const cats = SB.project.categories;
    const cat = el('select', { class: 'full', onchange: async (e) => { let v = e.target.value; if (v === '__new') { const r = await U.dialog({ title: 'Nueva categoría', fields: [{ id: 'n', label: 'Nombre' }] }); if (!r || !r.n.trim()) { later(); return; } v = r.n.trim(); A.addCategory(v); } A.patch(ids, { category: v }, 'Categoría'); } },
      ...cats.map((c) => el('option', { value: c, selected: same((s) => s.category) && c === s0.category }, c)), el('option', { value: '__new' }, '+ Nueva categoría…'));
    if (!same((s) => s.category)) cat.prepend(el('option', { selected: true, value: '' }, '— varias —'));
    body.append(el('div', { class: 'frm' }, el('label', {}, 'Categoría'), cat));
    // pivote
    const pg = el('div', { class: 'pivot' });
    PIVOTS.forEach(([px, py]) => { const on = same((s) => s.pivot) && s0.pivot[0] === px && s0.pivot[1] === py; pg.append(el('button', { class: on ? 'on' : '', title: 'Pivote ' + px + ', ' + py, onclick: () => A.setPivotPreset(ids, px, py) })); });
    body.append(el('div', { class: 'frm' }, el('label', {}, 'Pivote'), el('div', { class: 'row' }, pg, el('div', { class: 'grid2' }, el('label', {}, 'X', numInput(same((s) => s.pivot[0]) ? s0.pivot[0] : '', (n) => A.patch(ids, (s) => ({ pivot: [SB.clamp(n, 0, 1), s.pivot[1]] })), { step: 0.05 })), el('label', {}, 'Y', numInput(same((s) => s.pivot[1]) ? s0.pivot[1] : '', (n) => A.patch(ids, (s) => ({ pivot: [s.pivot[0], SB.clamp(n, 0, 1)] })), { step: 0.05 }))))));
    // etiquetas
    body.append(el('div', { class: 'frm' }, el('label', {}, 'Etiquetas (separadas por coma)'), el('input', { class: 'full', value: same((s) => s.tags) ? (s0.tags || []).join(', ') : '', placeholder: same((s) => s.tags) ? '' : 'varias…', onchange: (e) => A.patch(ids, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }, 'Etiquetas') })));
    // propiedades personalizadas
    if (one) {
      const pw = el('div', { class: 'frm' }, el('label', {}, 'Propiedades personalizadas (se exportan tal cual)'));
      Object.keys(one.props || {}).forEach((k) => pw.append(el('div', { class: 'row' }, el('input', { value: k, disabled: true }), el('input', { value: one.props[k], onchange: (e) => A.patch([one.id], (s) => ({ props: Object.assign({}, s.props, { [k]: e.target.value }) }), 'Propiedad') }), el('button', { class: 'ico', title: 'Quitar', html: U.icon('x'), onclick: () => A.patch([one.id], (s) => { const p = Object.assign({}, s.props); delete p[k]; return { props: p }; }, 'Quitar propiedad') }))));
      pw.append(el('button', { class: 'small', onclick: async () => { const r = await U.dialog({ title: 'Nueva propiedad', fields: [{ id: 'k', label: 'Clave' }, { id: 'v', label: 'Valor' }] }); if (r && r.k.trim()) A.patch([one.id], (s) => ({ props: Object.assign({}, s.props, { [r.k.trim()]: r.v }) }), 'Propiedad'); } }, '+ Propiedad'));
      body.append(pw);
    }
  });
  function stepper(label, val, on) {
    const i = el('input', { type: 'number', class: 'num', min: 1, max: 40, value: val, placeholder: '—' });
    const set = (n) => on(SB.clamp(Math.round(n) || 1, 1, 40)); i.addEventListener('change', () => set(+i.value));
    return el('label', { class: 'stp' }, label, el('span', { class: 'row' }, el('button', { class: 'small', onclick: () => set((+i.value || 1) - 1) }, '−'), i, el('button', { class: 'small', onclick: () => set((+i.value || 0) + 1) }, '+')));
  }
  /** Cómo se colocará: cuadrícula de celdas con la huella y el sprite sobre ella (pivote = punto amarillo). */
  function drawPlacement(cnv, s) {
    const sh = SB.sheetOf(s.id), im = SB.images[sh.id], g = cnv.getContext('2d'), cell = SB.project.cell || 16; g.imageSmoothingEnabled = false; g.clearRect(0, 0, cnv.width, cnv.height);
    const wc = Math.max(s.fc, Math.ceil(s.w / cell)) + 1, hc = Math.max(s.fr, Math.ceil(s.h / cell)) + 1, k = Math.max(1, Math.min(Math.floor((cnv.width - 8) / (wc * cell)), Math.floor((cnv.height - 8) / (hc * cell)))), cs = cell * k;
    const gw = wc * cs, gh = hc * cs, gx = (cnv.width - gw) / 2, gy = cnv.height - gh - 4;
    g.fillStyle = '#161616'; g.fillRect(gx, gy, gw, gh);
    const fx = gx + (gw - s.fc * cs) / 2, fy = gy + gh - s.fr * cs; g.fillStyle = s.solid ? 'rgba(255,90,90,.35)' : 'rgba(51,230,230,.25)'; g.fillRect(fx, fy, s.fc * cs, s.fr * cs);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= wc; x++) { g.moveTo(gx + x * cs + .5, gy); g.lineTo(gx + x * cs + .5, gy + gh); } for (let y = 0; y <= hc; y++) { g.moveTo(gx, gy + y * cs + .5); g.lineTo(gx + gw, gy + y * cs + .5); } g.stroke();
    g.strokeStyle = '#33e6e6'; g.lineWidth = 2; g.strokeRect(fx, fy, s.fc * cs, s.fr * cs);
    const dx = gx + (gw - s.w * k) / 2, dy = gy + gh - s.h * k; g.drawImage(im.canvas, s.x, s.y, s.w, s.h, dx, dy, s.w * k, s.h * k);
    g.fillStyle = '#ffd24a'; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(dx + s.w * k * s.pivot[0], dy + s.h * k * (1 - s.pivot[1]), 4, 0, 7); g.fill(); g.stroke();
  }

  // ------------------------------------------------------------ CONJUNTOS
  panel('sets', 'Conjuntos', (body) => {
    body.innerHTML = ''; const sets = SB.project.sets; SB.$('#cnt-sets').textContent = sets.length || '';
    body.append(el('div', { class: 'row' }, el('button', { class: 'small', onclick: () => U.run('set.new') }, '+ Nuevo'), el('button', { class: 'small', onclick: () => U.run('set.group'), title: 'Agrupa lo seleccionado (de izquierda a derecha)' }, 'Agrupar selección'), el('button', { class: 'small', onclick: () => U.run('set.mirrors'), title: 'Detecta sprites que son el espejo de otro y crea el volteo' }, 'Buscar espejos')));
    if (!sets.length) body.append(el('div', { class: 'empty' }, 'Un conjunto es UN objeto con varias variantes (frente, izquierda, espalda, derecha…). Una variante puede ser otra volteada: sin duplicar arte.'));
    sets.forEach((st, si) => {
      const card = el('div', { class: 'card' + (st.id === SB.activeSet ? ' act' : '') });
      card.addEventListener('click', (e) => { if (e.target.closest('input,select,button,canvas')) return; A.selectBySet(st.id); });
      const preset = el('select', { class: 'small', title: 'Cambiar variantes', onchange: (e) => { const v = e.target.value; if (v === 'Personalizado') { U.dialog({ title: 'Nueva variante', fields: [{ id: 'n', label: 'Nombre' }] }).then((r) => { if (r && r.n.trim()) A.addVariant(st.id, r.n.trim()); }); } else A.applyPreset(st.id, v); e.target.selectedIndex = 0; } },
        el('option', {}, 'Variantes…'), ...Object.keys(SB.VARIANT_PRESETS).map((k) => el('option', { value: k }, k === 'Personalizado' ? '+ Añadir variante…' : k)));
      card.append(el('div', { class: 'row' }, el('b', { class: 'hue', style: 'color:hsl(' + ((si * 47 + 200) % 360) + ',80%,66%)' }, '#' + (si + 1)), el('input', { class: 'full', value: st.name, placeholder: 'Nombre del conjunto', onchange: (e) => A.patchSet(st.id, { name: e.target.value }, 'Renombrar conjunto') }), preset, el('button', { class: 'ico', title: 'Deshacer conjunto', html: U.icon('trash'), onclick: () => A.deleteSet(st.id) })));
      const slots = el('div', { class: 'slots' });
      st.variants.forEach((v) => {
        const res = SB.resolveVariant(st, v.name), isFlip = !!v.flipOf, empty = !v.sprite && !v.flipOf;
        const th = el('canvas', { width: 52, height: 52, title: res && res.sprite ? 'Clic: seleccionar · clic derecho: más' : 'Vacío' }); if (res && res.sprite) thumb(th, res.sprite, res.flipX, res.flipY);
        th.addEventListener('click', () => { if (res && res.sprite) { SB.select([res.sprite.id]); SB.view.focus([res.sprite.id]); } });
        const others = st.variants.filter((o) => o.name !== v.name && o.sprite);
        const flipSel = el('select', { class: 'small', onchange: (e) => A.setFlip(st.id, v.name, e.target.value || null, true, false) }, el('option', { value: '' }, isFlip ? '— sin volteo' : 'volteo de…'), ...others.map((o) => el('option', { value: o.name, selected: v.flipOf === o.name }, '↔ ' + vlabel(o.name))));
        const slot = el('div', { class: 'slot' + (empty ? '' : ' on') }, th, el('div', { class: 'ctl' }, el('b', {}, vlabel(v.name)),
          el('span', { class: 'mut' }, v.sprite ? SB.findSprite(v.sprite).name : isFlip ? 'volteo de ' + vlabel(v.flipOf) : 'vacío'), flipSel,
          isFlip ? el('div', { class: 'row' }, tog('↔', 'Voltear horizontal', v.flipX, () => A.setFlip(st.id, v.name, v.flipOf, !v.flipX, v.flipY)), tog('↕', 'Voltear vertical', v.flipY, () => A.setFlip(st.id, v.name, v.flipOf, v.flipX, !v.flipY))) : null,
          el('div', { class: 'row' }, el('button', { class: 'small', disabled: SB.sel.size !== 1, title: 'Usar el sprite seleccionado', onclick: () => A.assign(st.id, v.name, [...SB.sel][0]) }, '← selección'), !empty ? el('button', { class: 'ico', title: 'Vaciar', html: U.icon('x'), onclick: () => A.clearVariant(st.id, v.name) }) : null)));
        slot.addEventListener('contextmenu', (e) => { e.preventDefault(); U.showContext([{ label: 'Usar la selección aquí', enabled: () => SB.sel.size === 1, run: () => A.assign(st.id, v.name, [...SB.sel][0]) }, { label: 'Vaciar', run: () => A.clearVariant(st.id, v.name) }, { label: 'Renombrar variante…', run: async () => { const r = await U.dialog({ title: 'Renombrar variante', fields: [{ id: 'n', label: 'Nombre', value: v.name }] }); if (r) A.renameVariant(st.id, v.name, r.n); } }, { label: 'Mover antes', run: () => A.moveVariant(st.id, v.name, -1) }, { label: 'Mover después', run: () => A.moveVariant(st.id, v.name, 1) }, { sep: true }, { label: 'Quitar esta variante', danger: true, run: () => A.removeVariant(st.id, v.name) }], e.clientX, e.clientY); });
        slots.append(slot);
      });
      card.append(slots);
      // vista de giro: recorre las variantes como lo hará el juego
      const seq = st.variants.map((v) => SB.resolveVariant(st, v.name)).filter((r) => r && r.sprite);
      if (seq.length > 1) { const row = el('div', { class: 'row turn' }, el('small', { class: 'mut' }, 'Girar: ')); seq.forEach((r) => row.append(mkThumb(r.sprite, 26, r.flipX, r.flipY))); card.append(row); }
      body.append(card);
    });
  });
  const tog = (t, title, on, fn) => el('button', { class: 'small tg' + (on ? ' on' : ''), title, onclick: fn }, t);

  // ------------------------------------------------------------ HISTORIAL
  panel('history', 'Historial', (body) => {
    body.innerHTML = ''; const h = SB.history;
    if (!h.undo.length && !h.redo.length) { body.append(el('div', { class: 'empty' }, 'Cada cambio queda aquí. Ctrl+Z / Ctrl+Shift+Z.')); return; }
    const wrap = el('div', { class: 'hlist' });
    h.undo.forEach((e, i) => wrap.append(el('div', { class: 'hrow', onclick: () => { while (SB.history.undo.length > i) SB.undo(); } }, e.label)));
    wrap.append(el('div', { class: 'hrow cur' }, 'Ahora'));
    h.redo.slice().reverse().forEach((e, i) => wrap.append(el('div', { class: 'hrow dim', onclick: () => { for (let k = 0; k <= i; k++) SB.redo(); } }, e.label)));
    body.append(wrap);
  });
  collapsed.history = true; SB.$('#p-history').classList.add('closed');

  SB.on('change', later); SB.on('selection', later); SB.on('sheets', later);
  SB.on('live', () => { const s = SB.selected()[0]; if (s) { const pv = SB.$('.pview'); if (pv) drawPlacement(pv, s); } });
  U.focusName = () => { const f = SB.$('#nameField'); if (f) { f.focus(); f.select(); } };
})();
