/* Spritebench — comandos, menús, barras (herramientas, opciones, pestañas, estado), atajos, arrastrar-y-soltar y arranque. */
(function () {
  const SB = window.SB, U = SB.ui, A = SB.act, V = SB.view, X = SB.exp;
  const { $, el } = SB;

  const hasSheet = () => !!SB.sheet();
  const hasSel = () => SB.sel.size > 0;
  const hasOne = () => SB.sel.size === 1;
  const hasMany = () => SB.sel.size > 1;
  const PIVOT_NAMES = [['Arriba izquierda', 0, 1], ['Arriba centro', 0.5, 1], ['Arriba derecha', 1, 1], ['Centro izquierda', 0, 0.5], ['Centro', 0.5, 0.5], ['Centro derecha', 1, 0.5], ['Abajo izquierda', 0, 0], ['Abajo centro', 0.5, 0], ['Abajo derecha', 1, 0]];

  // ------------------------------------------------------------ archivos
  const pick = (accept, multiple) => new Promise((res) => { const i = el('input', { type: 'file', accept, multiple: !!multiple }); i.onchange = () => res(Array.from(i.files)); i.click(); });
  async function openSheets(files) {
    for (const f of files) {
      if (/\.spritebench$|\.json$/i.test(f.name)) { try { await SB.loadProject(JSON.parse(await f.text())); U.toast('Proyecto abierto'); } catch (e) { U.toast('Archivo no válido'); } continue; }
      if (!f.type.startsWith('image/')) continue;
      try { await SB.addSheetFile(f); } catch (e) { U.toast(e.message); }
    }
    V.fit();
  }
  U.cmd('file.new', 'Nuevo proyecto', async () => { if (SB.dirty && !confirm(SB.t('Hay cambios sin guardar. ¿Empezar un proyecto nuevo?'))) return; await SB.loadProject(SB.newProject()); }, { group: 'Archivo', key: 'Ctrl+N' });
  U.cmd('file.openSheet', 'Abrir hoja de sprites…', async () => openSheets(await pick('image/*', true)), { group: 'Archivo', key: 'Ctrl+O' });
  U.cmd('file.openProject', 'Abrir proyecto…', async () => openSheets(await pick('.spritebench,.json')), { group: 'Archivo' });
  U.cmd('file.save', 'Guardar proyecto (.spritebench)', () => { X.saveProjectFile(); SB.dirty = false; U.toast('Proyecto guardado'); }, { group: 'Archivo', key: 'Ctrl+S' });
  U.cmd('file.settings', 'Ajustes del proyecto…', async () => {
    const r = await U.dialog({ title: 'Ajustes del proyecto', fields: [{ id: 'name', label: 'Nombre', value: SB.project.name }, { id: 'cell', label: 'Tamaño de celda del juego (px)', type: 'number', value: SB.project.cell, min: 1, hint: 'La huella se mide en celdas de este tamaño.' }, { id: 'ppu', label: 'Píxeles por unidad (PPU)', type: 'number', value: SB.project.ppu, min: 1 }] });
    if (r) SB.do('Ajustes del proyecto', () => { SB.project.name = r.name || 'Sin título'; SB.project.cell = Math.max(1, r.cell | 0); SB.project.ppu = Math.max(1, r.ppu | 0); });
  }, { group: 'Archivo' });
  async function exportDialog(toFolder) {
    const dups = SB.duplicateNames();
    if (dups.length) {
      const f = await U.dialog({ title: 'Nombres repetidos', ok: 'Continuar', fields: [{ type: 'note', label: 'Estos nombres se repiten y los motores identifican los sprites por nombre: ' + dups.slice(0, 6).join(', ') + (dups.length > 6 ? '…' : '') }, { id: 'fix', label: 'Hacerlos únicos automáticamente (_2, _3…)', type: 'checkbox', value: true }] });
      if (!f) return; if (f.fix) A.fixDuplicateNames();
    }
    const r = await U.dialog({ title: toFolder ? 'Exportar a una carpeta' : 'Exportar paquete', ok: 'Exportar', fields: [
      { type: 'note', label: 'Incluye siempre el catálogo (.catalog.json) y las hojas PNG.' },
      { id: 'texturePacker', label: 'Atlas JSON (TexturePacker: Phaser, Pixi, Godot…)', type: 'checkbox', value: false },
      { id: 'pngs', label: 'Un PNG por sprite', type: 'checkbox', value: false },
      { id: 'bake', label: 'Con los volteos ya horneados (para motores sin flip)', type: 'checkbox', value: false }] });
    if (!r) return;
    try { const n = toFolder ? await X.exportFolder(r) : await X.exportZip(r); U.toast('Exportados ' + n + ' archivos ✔'); } catch (e) { if (e.name !== 'AbortError') U.toast(e.message); }
  }
  U.cmd('file.exportZip', 'Exportar paquete (.zip)…', () => exportDialog(false), { group: 'Exportar', key: 'Ctrl+E', enabled: hasSheet });
  U.cmd('file.exportFolder', 'Exportar a carpeta (Unity Assets)…', () => exportDialog(true), { group: 'Exportar', key: 'Ctrl+Shift+E', enabled: hasSheet });
  U.cmd('file.exportCatalog', 'Descargar solo el catálogo JSON', () => { X.download(new Blob([X.catalogText()], { type: 'application/json' }), (SB.project.name || 'catalog').replace(/\W+/g, '_') + '.catalog.json'); }, { group: 'Exportar', enabled: hasSheet });
  U.cmd('file.demo', 'Cargar hoja de ejemplo', async () => { await SB.addSheetDataUrl('demo_furniture.png', SB.demoSheet()); V.fit(); }, { group: 'Archivo' });

  // ------------------------------------------------------------ edición
  U.cmd('edit.undo', 'Deshacer', () => SB.undo(), { group: 'Edición', key: 'Ctrl+Z', enabled: () => SB.history.undo.length > 0 });
  U.cmd('edit.redo', 'Rehacer', () => SB.redo(), { group: 'Edición', key: 'Ctrl+Shift+Z', enabled: () => SB.history.redo.length > 0 });
  U.cmd('edit.duplicate', 'Duplicar', () => A.duplicateSelected(), { group: 'Edición', key: 'Ctrl+D', enabled: hasSel });
  U.cmd('edit.delete', 'Borrar', () => A.deleteSelected(), { group: 'Edición', key: 'Delete', enabled: hasSel });
  U.cmd('edit.rename', 'Renombrar…', () => U.focusName(), { group: 'Edición', key: 'F2', enabled: hasOne });
  U.cmd('edit.renameBulk', 'Renombrar en lote…', async () => {
    const r = await U.dialog({ title: 'Renombrar en lote', fields: [{ type: 'note', label: 'Usa {n} para el contador ({n:3} = 001) y {name} para el nombre actual. Orden: arriba→abajo, izquierda→derecha.' }, { id: 'p', label: 'Patrón', value: 'sprite_{n:3}' }, { id: 's', label: 'Empezar en', type: 'number', value: 1 }] });
    if (r) A.renameBulk(r.p, r.s);
  }, { group: 'Edición', enabled: hasSel });
  U.cmd('edit.copyProps', 'Copiar propiedades del sprite', () => { A.copyProps(); U.toast('Propiedades copiadas'); }, { group: 'Edición', key: 'Ctrl+Shift+C', enabled: hasOne });
  U.cmd('edit.pasteProps', 'Pegar propiedades en la selección', () => A.pasteProps(), { group: 'Edición', key: 'Ctrl+Shift+V', enabled: () => !!SB.clipboard && hasSel() });
  U.cmd('edit.selectAll', 'Seleccionar todo', () => A.selectAll(), { group: 'Selección', key: 'Ctrl+A', enabled: hasSheet });
  U.cmd('edit.deselect', 'Deseleccionar', () => A.deselect(), { group: 'Selección', key: 'Ctrl+Shift+A' });
  U.cmd('edit.invert', 'Invertir selección', () => A.invertSelection(), { group: 'Selección', key: 'Ctrl+I', enabled: hasSheet });
  U.cmd('edit.loose', 'Seleccionar sprites sueltos (sin conjunto)', () => A.selectLoose(), { group: 'Selección', key: 'L', enabled: hasSheet });

  // ------------------------------------------------------------ recorte
  U.cmd('slice.auto', 'Auto-slice por transparencia…', async () => {
    const sh = SB.sheet(); const r = await U.dialog({ title: 'Auto-slice', ok: 'Cortar', fields: [
      { type: 'note', label: 'Cada objeto separado por transparencia se vuelve un sprite.' },
      { id: 'gap', label: 'Unir piezas a menos de (px)', type: 'number', value: 0, min: 0, hint: '0 = no unir. Sube a 2–4 si un objeto sale partido en trozos.' },
      { id: 'min', label: 'Ignorar manchas menores a (píxeles)', type: 'number', value: 6, min: 1 },
      { id: 'replace', label: 'Reemplazar los sprites actuales de esta hoja', type: 'checkbox', value: !sh.sprites.length }] });
    if (!r) return;
    const rects = SB.autoSlice(sh.id, { gap: r.gap, minArea: r.min });
    if (r.replace) SB.do('Limpiar hoja', () => { sh.sprites = []; A.deselect(); });
    A.addSprites(rects, 'Auto-slice (' + rects.length + ')'); V.fit(); U.toast(rects.length + ' sprites creados');
  }, { group: 'Recorte', key: 'Alt+S', enabled: hasSheet });
  U.cmd('slice.grid', 'Cortar por rejilla…', async () => {
    const sh = SB.sheet(), c = SB.project.cell; const r = await U.dialog({ title: 'Cortar por rejilla', ok: 'Cortar', fields: [
      { id: 'cw', label: 'Ancho de celda (px)', type: 'number', value: c, min: 1 }, { id: 'ch', label: 'Alto de celda (px)', type: 'number', value: c, min: 1 },
      { id: 'ox', label: 'Desplazamiento X', type: 'number', value: 0, min: 0 }, { id: 'oy', label: 'Desplazamiento Y', type: 'number', value: 0, min: 0 },
      { id: 'px', label: 'Separación X', type: 'number', value: 0, min: 0 }, { id: 'py', label: 'Separación Y', type: 'number', value: 0, min: 0 },
      { id: 'trim', label: 'Ajustar cada celda a su dibujo', type: 'checkbox', value: true }, { id: 'skip', label: 'Saltar celdas vacías', type: 'checkbox', value: true },
      { id: 'replace', label: 'Reemplazar los sprites actuales', type: 'checkbox', value: !sh.sprites.length }] });
    if (!r) return;
    const rects = SB.gridSlice(sh.id, { cw: r.cw, ch: r.ch, ox: r.ox, oy: r.oy, px: r.px, py: r.py, trim: r.trim, skipEmpty: r.skip });
    if (r.replace) SB.do('Limpiar hoja', () => { sh.sprites = []; A.deselect(); });
    A.addSprites(rects, 'Rejilla (' + rects.length + ')'); U.toast(rects.length + ' sprites creados');
  }, { group: 'Recorte', key: 'Shift+G', enabled: hasSheet });
  U.cmd('slice.trim', 'Ajustar selección al dibujo', () => A.trim(false), { group: 'Recorte', key: 'T', enabled: hasSel });
  U.cmd('slice.trimAll', 'Ajustar TODOS al dibujo', () => A.trim(true), { group: 'Recorte', enabled: hasSheet });
  U.cmd('slice.merge', 'Fusionar seleccionados', () => A.mergeSelected(), { group: 'Recorte', key: 'G', enabled: hasMany });
  U.cmd('slice.split', 'Partir en rejilla…', async () => {
    const r = await U.dialog({ title: 'Partir sprite en rejilla', ok: 'Partir', fields: [{ id: 'c', label: 'Columnas', type: 'number', value: 2, min: 1 }, { id: 'r', label: 'Filas', type: 'number', value: 1, min: 1 }, { id: 't', label: 'Ajustar cada parte al dibujo', type: 'checkbox', value: true }] });
    if (r) A.splitGrid(r.c, r.r, r.t);
  }, { group: 'Recorte', key: 'Shift+S', enabled: hasOne });
  U.cmd('slice.clear', 'Borrar todos los sprites de la hoja', () => { if (confirm(SB.t('¿Borrar todos los sprites de esta hoja?'))) SB.do('Limpiar hoja', () => { SB.sheet().sprites = []; SB.sel.clear(); A.deselect(); }); }, { group: 'Recorte', enabled: hasSheet });

  // ------------------------------------------------------------ conjuntos
  U.cmd('set.new', 'Nuevo conjunto vacío…', async () => {
    const r = await U.dialog({ title: 'Nuevo conjunto', fields: [{ id: 'n', label: 'Nombre', value: 'Conjunto ' + (SB.project.sets.length + 1) }, { id: 'p', label: 'Variantes', type: 'select', options: Object.keys(SB.VARIANT_PRESETS).filter((k) => k !== 'Personalizado'), value: '4 direcciones' }] });
    if (r) A.newSet(r.n, SB.VARIANT_PRESETS[r.p]);
  }, { group: 'Conjunto' });
  U.cmd('set.group', 'Agrupar selección en un conjunto…', async () => {
    const r = await U.dialog({ title: 'Agrupar en conjunto', ok: 'Agrupar', fields: [{ type: 'note', label: 'Los sprites seleccionados se asignan de izquierda a derecha.' }, { id: 'p', label: 'Variantes', type: 'select', options: Object.keys(SB.VARIANT_PRESETS).filter((k) => k !== 'Personalizado'), value: SB.sel.size === 2 ? '2 direcciones' : '4 direcciones' }] });
    if (r) A.groupSelection(SB.VARIANT_PRESETS[r.p]);
  }, { group: 'Conjunto', key: 'K', enabled: hasSel });
  U.cmd('set.mirrors', 'Buscar espejos y crear volteos', async () => {
    const r = await U.dialog({ title: 'Buscar espejos', ok: 'Buscar', fields: [{ type: 'note', label: 'Encuentra sprites que son el espejo exacto de otro y crea conjuntos izquierda/derecha.' }, { id: 'd', label: 'Borrar el duplicado y usar volteo', type: 'checkbox', value: true }] });
    if (!r) return; const n = A.findMirrors(r.d); U.toast(n ? n + ' conjuntos creados' : 'No encontré espejos');
  }, { group: 'Conjunto', enabled: hasSheet });
  U.cmd('set.delete', 'Deshacer conjunto activo', () => A.deleteSet(SB.activeSet), { group: 'Conjunto', enabled: () => !!SB.activeSet });

  // ------------------------------------------------------------ vista
  U.cmd('view.zoomIn', 'Acercar', () => V.zoomBy(1.5), { group: 'Vista', key: '+' });
  U.cmd('view.zoomOut', 'Alejar', () => V.zoomBy(1 / 1.5), { group: 'Vista', key: '-' });
  U.cmd('view.fit', 'Ajustar a la ventana', () => V.fit(), { group: 'Vista', key: '0' });
  U.cmd('view.100', 'Zoom 100 %', () => V.zoomTo(1), { group: 'Vista', key: '1' });
  U.cmd('view.200', 'Zoom 400 %', () => V.zoomTo(4), { group: 'Vista', key: '4' });
  U.cmd('view.focus', 'Centrar en la selección', () => V.focus([...SB.sel]), { group: 'Vista', key: 'F', enabled: hasSel });
  const toggle = (id, label, k, key) => U.cmd('view.' + id, label, () => { SB.opts[k] = !SB.opts[k]; V.draw(); buildOptions(); }, { group: 'Vista', key, checked: () => SB.opts[k] });
  toggle('grid', 'Rejilla de celdas', 'grid', 'Ctrl+\''); toggle('pixelGrid', 'Rejilla de píxeles (zoom alto)', 'pixelGrid'); toggle('footprint', 'Huella y pivote', 'footprint'); toggle('labels', 'Etiquetas de conjunto', 'labels'); toggle('checker', 'Fondo de damero', 'checker');
  const tool = (id, label, key) => U.cmd('tool.' + id, label, () => setTool(id), { group: 'Herramienta', key, checked: () => SB.opts.tool === id });
  tool('select', 'Selección', 'V'); tool('rect', 'Rectángulo', 'M'); tool('wand', 'Varita', 'W'); tool('hand', 'Mano', 'H'); tool('zoom', 'Zoom', 'Z');

  // ------------------------------------------------------------ ayuda
  U.cmd('help.palette', 'Paleta de comandos', () => U.palette(), { group: 'Ayuda', key: 'Ctrl+K' });
  U.cmd('help.shortcuts', 'Atajos de teclado', () => {
    const rows = Object.values(U.cmds).filter((c) => c.key).map((c) => `<tr><td>${SB.esc(c.label)}</td><td><kbd>${SB.esc(c.key)}</kbd></td></tr>`).join('');
    U.alert('Atajos de teclado', `<table class="kbd">${rows}<tr><td>Mover la selección</td><td><kbd>←↑↓→</kbd> (<kbd>Shift</kbd> = 10 px)</td></tr><tr><td>Mover la vista</td><td><kbd>Espacio</kbd>+arrastrar · botón central · herramienta Mano</td></tr><tr><td>Zoom</td><td>rueda del ratón · <kbd>Shift</kbd>+rueda desplaza</td></tr><tr><td>Menú contextual</td><td>clic derecho sobre sprites, lienzo, listas y huecos de conjuntos</td></tr></table>`);
  }, { group: 'Ayuda', key: 'F1' });
  U.cmd('lang.es', 'Español', () => SB.i18n.set('es'), { group: 'Idioma', checked: () => SB.lang === 'es' });
  U.cmd('lang.en', 'English', () => SB.i18n.set('en'), { group: 'Idioma', checked: () => SB.lang === 'en' });
  U.cmd('help.about', 'Acerca de Spritebench', () => U.alert('Spritebench', '<p>Catalogador de sprites con conjuntos, volteos, huella en celdas y exportación a Unity y otros motores.</p><p>Código abierto (MIT). Todo corre en tu navegador: tus imágenes no salen de tu equipo.</p>'), { group: 'Ayuda' });

  // ------------------------------------------------------------ menús contextuales
  U.spriteMenu = () => {
    const ids = [...SB.sel];
    const sets = SB.project.sets;
    return [
      { cmd: 'edit.rename' }, { cmd: 'edit.duplicate' }, { cmd: 'edit.copyProps' }, { cmd: 'edit.pasteProps' }, { cmd: 'edit.delete', danger: true }, { sep: true },
      { cmd: 'slice.trim' }, { cmd: 'slice.merge' }, { cmd: 'slice.split' }, { sep: true },
      { label: 'Pivote', sub: PIVOT_NAMES.map(([n, x, y]) => ({ label: n, run: () => A.setPivotPreset(ids, x, y) })) },
      { label: 'Categoría', sub: () => SB.project.categories.map((c) => ({ label: c, run: () => A.patch(ids, { category: c }, 'Categoría') })) },
      { label: 'Ocupa en el suelo', sub: [[1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [3, 2], [3, 3], [4, 2], [4, 4]].map(([c, r]) => ({ label: c + ' × ' + r + ' celdas', run: () => A.patch(ids, { fc: c, fr: r }, 'Huella') })).concat([{ sep: true }, { label: 'Automático (según el tamaño)', run: () => A.patch(ids, (s) => { const k = SB.project.cell; return { fc: Math.max(1, Math.ceil(s.w / k)), fr: Math.max(1, Math.ceil((s.h * 0.6) / k)) }; }, 'Huella') }]) },
      { label: 'Sólido', checked: () => SB.selected().every((s) => s.solid), run: () => A.patch(ids, (s) => ({ solid: !SB.selected().every((q) => q.solid) }), 'Sólido') }, { sep: true },
      { label: 'Conjunto', sub: () => [{ cmd: 'set.group' }, { sep: true }].concat(sets.length ? sets.map((st) => ({ label: st.name || 'Conjunto', sub: st.variants.map((v) => ({ label: 'Usar como “' + v.name + '”', enabled: () => ids.length === 1, run: () => A.assign(st.id, v.name, ids[0]) })) })) : [{ label: '(no hay conjuntos todavía)', enabled: () => false }]).concat([{ sep: true }, { label: 'Sacar del conjunto', enabled: () => ids.length === 1 && !!SB.setOfSprite(ids[0]), run: () => { const o = SB.setOfSprite(ids[0]); A.clearVariant(o.set.id, o.variant.name); } }]) },
      { sep: true }, { cmd: 'view.focus' },
      { label: 'Copiar nombre', enabled: hasOne, run: () => { navigator.clipboard && navigator.clipboard.writeText(SB.selected()[0].name); U.toast('Nombre copiado'); } },
    ];
  };
  U.canvasMenu = (pos) => [
    { label: 'Crear sprite aquí (varita)', enabled: hasSheet, run: () => { const b = SB.wand(SB.sheet().id, Math.floor(pos[0]), Math.floor(pos[1]), SB.opts.gap); if (b) A.addSprites([b], 'Varita'); else U.toast('No hay nada opaco ahí'); } },
    { sep: true }, { cmd: 'edit.selectAll' }, { cmd: 'edit.invert' }, { cmd: 'edit.loose' }, { sep: true },
    { cmd: 'slice.auto' }, { cmd: 'slice.grid' }, { sep: true },
    { cmd: 'view.fit' }, { cmd: 'view.grid' }, { cmd: 'view.footprint' }, { cmd: 'view.checker' },
  ];

  // ------------------------------------------------------------ barra de menús
  U.buildMenubar([
    { label: 'Archivo', items: [{ cmd: 'file.new' }, { cmd: 'file.openSheet' }, { cmd: 'file.openProject' }, { sep: true }, { cmd: 'file.save' }, { cmd: 'file.settings' }, { sep: true }, { cmd: 'file.exportZip' }, { cmd: 'file.exportFolder' }, { cmd: 'file.exportCatalog' }, { sep: true }, { cmd: 'file.demo' }] },
    { label: 'Edición', items: [{ cmd: 'edit.undo' }, { cmd: 'edit.redo' }, { sep: true }, { cmd: 'edit.duplicate' }, { cmd: 'edit.delete' }, { cmd: 'edit.rename' }, { cmd: 'edit.renameBulk' }, { sep: true }, { cmd: 'edit.copyProps' }, { cmd: 'edit.pasteProps' }, { sep: true }, { cmd: 'edit.selectAll' }, { cmd: 'edit.deselect' }, { cmd: 'edit.invert' }, { cmd: 'edit.loose' }] },
    { label: 'Recorte', items: [{ cmd: 'slice.auto' }, { cmd: 'slice.grid' }, { sep: true }, { cmd: 'slice.trim' }, { cmd: 'slice.trimAll' }, { cmd: 'slice.merge' }, { cmd: 'slice.split' }, { sep: true }, { cmd: 'slice.clear' }] },
    { label: 'Conjunto', items: [{ cmd: 'set.group' }, { cmd: 'set.new' }, { cmd: 'set.mirrors' }, { sep: true }, { cmd: 'set.delete' }] },
    { label: 'Vista', items: [{ cmd: 'view.zoomIn' }, { cmd: 'view.zoomOut' }, { cmd: 'view.fit' }, { cmd: 'view.100' }, { cmd: 'view.200' }, { cmd: 'view.focus' }, { sep: true }, { cmd: 'view.grid' }, { cmd: 'view.pixelGrid' }, { cmd: 'view.footprint' }, { cmd: 'view.labels' }, { cmd: 'view.checker' }] },
    { label: 'Ayuda', items: [{ cmd: 'help.palette' }, { cmd: 'help.shortcuts' }, { sep: true }, { label: 'Idioma', sub: [{ cmd: 'lang.es' }, { cmd: 'lang.en' }] }, { sep: true }, { cmd: 'help.about' }] },
  ]);

  // ------------------------------------------------------------ barra de herramientas
  const TOOLS = [['select', 'Selección (V)', 'select'], ['rect', 'Rectángulo (M)', 'rect'], ['wand', 'Varita mágica (W)', 'wand'], ['hand', 'Mano (H)', 'hand'], ['zoom', 'Zoom (Z)', 'zoom']];
  function buildToolbar() {
    const tb = $('#toolbar'); tb.innerHTML = '';
    TOOLS.forEach(([id, title, ic]) => tb.append(el('button', { class: 'tool' + (SB.opts.tool === id ? ' on' : ''), title, html: U.icon(ic), onclick: () => setTool(id) })));
    tb.append(el('div', { class: 'tsep' }), el('button', { class: 'tool', title: 'Cortar por rejilla… (Shift+G)', html: U.icon('grid'), onclick: () => U.run('slice.grid') }), el('button', { class: 'tool', title: 'Agrupar en conjunto (K)', html: U.icon('set'), onclick: () => U.run('set.group') }));
  }
  function setTool(id) { SB.opts.tool = id; buildToolbar(); buildOptions(); V.draw(); }

  // ------------------------------------------------------------ barra de opciones (cambia con la herramienta, como en Adobe)
  const chk = (label, key) => { const i = el('input', { type: 'checkbox' }); i.checked = !!SB.opts[key]; i.addEventListener('change', () => { SB.opts[key] = i.checked; V.draw(); }); return el('label', { class: 'chk' }, i, ' ' + label); };
  function buildOptions() {
    const o = $('#optbar'); o.innerHTML = ''; const t = SB.opts.tool;
    const name = { select: 'Selección', rect: 'Rectángulo', wand: 'Varita', hand: 'Mano', zoom: 'Zoom' }[t]; o.append(el('b', { class: 'ot' }, name));
    if (t === 'rect') o.append(chk('Ajustar al dibujo', 'trim'), chk('Ajustar a celdas', 'snap'));
    if (t === 'wand') { const g = el('input', { type: 'number', class: 'num', min: 0, value: SB.opts.gap, onchange: (e) => { SB.opts.gap = Math.max(0, +e.target.value | 0); } }); o.append(el('label', {}, 'Unir piezas a ', g, ' px')); }
    if (t === 'select') o.append(chk('Ajustar a celdas', 'snap'), chk('Huella', 'footprint'));
    if (t === 'zoom' || t === 'hand') o.append(el('button', { class: 'small', onclick: () => V.fit() }, 'Ajustar'), el('button', { class: 'small', onclick: () => V.zoomTo(1) }, '100 %'), el('button', { class: 'small', onclick: () => V.zoomTo(4) }, '400 %'));
    o.append(el('div', { class: 'grow' }));
    const s = SB.selected();
    if (s.length === 1) {
      const one = s[0]; [['X', 'x'], ['Y', 'y'], ['W', 'w'], ['H', 'h']].forEach(([l, k]) => o.append(el('label', {}, l, el('input', { type: 'number', class: 'num', value: one[k], onchange: (e) => { const n = +e.target.value | 0, r = [one.x, one.y, one.x + one.w, one.y + one.h]; if (k === 'x') { r[0] = n; r[2] = n + one.w; } else if (k === 'y') { r[1] = n; r[3] = n + one.h; } else if (k === 'w') r[2] = one.x + Math.max(1, n); else r[3] = one.y + Math.max(1, n); A.setRect(one.id, r); } }))));
    } else if (s.length > 1) o.append(el('span', { class: 'mut' }, s.length + ' seleccionados'));
    const sel = SB.selected();
    o.append(el('button', { class: 'small', title: 'Deshacer', disabled: !SB.history.undo.length, html: U.icon('undo'), onclick: () => SB.undo() }), el('button', { class: 'small', title: 'Rehacer', disabled: !SB.history.redo.length, html: U.icon('redo'), onclick: () => SB.redo() }));
  }

  // ------------------------------------------------------------ pestañas de hojas
  function buildTabs() {
    const t = $('#tabs'); t.innerHTML = '';
    SB.project.sheets.forEach((sh) => {
      const tab = el('div', { class: 'tab' + (sh.id === SB.activeSheet ? ' on' : ''), title: sh.name + ' — ' + sh.w + '×' + sh.h, onclick: () => { SB.activeSheet = sh.id; SB.sel.clear(); V.setView(sh.id); SB.emit('sheets'); SB.emit('selection'); } },
        el('span', {}, sh.name + ' '), el('small', {}, String(sh.sprites.length)), el('button', { class: 'x', title: 'Cerrar hoja', html: U.icon('x'), onclick: (e) => { e.stopPropagation(); closeSheet(sh.id); } }));
      tab.addEventListener('contextmenu', (e) => { e.preventDefault(); U.showContext([{ label: 'Renombrar hoja…', run: async () => { const r = await U.dialog({ title: 'Renombrar hoja', fields: [{ id: 'n', label: 'Nombre', value: sh.name }] }); if (r && r.n.trim()) SB.do('Renombrar hoja', () => { sh.name = r.n.trim(); }); } }, { label: 'Cerrar hoja', danger: true, run: () => closeSheet(sh.id) }], e.clientX, e.clientY); });
      t.append(tab);
    });
    t.append(el('button', { class: 'tab add', title: 'Abrir hoja (Ctrl+O)', html: U.icon('plus'), onclick: () => U.run('file.openSheet') }));
    $('#empty').style.display = SB.project.sheets.length ? 'none' : 'flex';
  }
  function closeSheet(id) {
    if (!confirm(SB.t('¿Cerrar esta hoja? Se pierden sus sprites (puedes deshacer).'))) return;
    SB.do('Cerrar hoja', () => { const i = SB.project.sheets.findIndex((s) => s.id === id); SB.project.sheets.splice(i, 1); SB.activeSheet = (SB.project.sheets[Math.max(0, i - 1)] || {}).id || null; SB.sel.clear(); SB.project.sets.forEach((st) => (st.variants = st.variants.filter((v) => !v.sprite || SB.findSprite(v.sprite)))); });
    SB.emit('sheets'); SB.emit('selection');
  }

  // ------------------------------------------------------------ barra de estado
  let cur = [0, 0];
  function buildStatus() {
    const sh = SB.sheet(), s = SB.selected(), sets = SB.project.sets.length;
    $('#st-l').textContent = sh ? sh.sprites.length + ' sprites · ' + sets + ' conjuntos' + (s.length ? ' · ' + s.length + ' seleccionados' : '') : 'Sin hoja';
    $('#st-c').textContent = sh ? 'x ' + Math.floor(cur[0]) + '  y ' + Math.floor(cur[1]) + '   ·   ' + sh.w + ' × ' + sh.h + ' px   ·   celda ' + SB.project.cell + ' px' : '';
    $('#st-r').textContent = Math.round(V.zoom() * 100) + ' %';
    const hint = { select: 'Clic: seleccionar · arrastra: mover · Shift: sumar · clic derecho: opciones', rect: 'Arrastra para dibujar un sprite', wand: 'Clic sobre un objeto para recortarlo', hand: 'Arrastra para mover la vista', zoom: 'Clic acerca · Alt+clic aleja' }[SB.opts.tool];
    $('#st-h').textContent = hint;
  }
  SB.on('cursor', (x, y) => { cur = [x, y]; buildStatus(); });
  SB.on('view', buildStatus); SB.on('saved', () => { $('#st-s').textContent = 'Autoguardado ✔'; });

  const rebuild = () => { buildTabs(); buildOptions(); buildStatus(); document.title = (SB.dirty ? '• ' : '') + (SB.project.name === 'Sin título' ? SB.t('Sin título') : SB.project.name) + ' — Spritebench'; };
  SB.on('change', rebuild); SB.on('selection', rebuild); SB.on('sheets', rebuild);

  // ------------------------------------------------------------ atajos
  function parseKey(s) { if (s === '+') return { key: '+', ctrl: false, shift: false, alt: false }; const p = s.split('+'); return { key: p.pop(), ctrl: p.includes('Ctrl'), shift: p.includes('Shift'), alt: p.includes('Alt') }; }
  window.addEventListener('keydown', (e) => {
    const typing = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'checkbox';
    if (e.key === 'Escape') { U.hideContext(); U.closeMenubar(); if (!typing) A.deselect(); return; }
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key, mod = e.ctrlKey || e.metaKey;
    if (typing && !(mod && ['S', 'K', 'E', 'O', 'N'].includes(k))) return;
    if (e.target.tagName === 'SELECT') return;
    if (!mod && !e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && SB.sel.size) { const d = e.shiftKey ? 10 : 1; A.nudge(e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0); e.preventDefault(); return; }
    for (const c of Object.values(U.cmds)) {
      if (!c.key) continue; const p = parseKey(c.key);
      const kk = p.key.length === 1 ? p.key.toUpperCase() : p.key;
      if ((k === kk || (k === '=' && kk === '+') || (k === 'Backspace' && kk === 'Delete')) && p.ctrl === mod && p.shift === e.shiftKey && p.alt === e.altKey) { e.preventDefault(); U.run(c.id); return; }
    }
    if (mod && k === 'Y') { e.preventDefault(); U.run('edit.redo'); }
  });

  // ------------------------------------------------------------ arrastrar y soltar archivos
  const dz = $('#drop');
  ['dragenter', 'dragover'].forEach((ev) => window.addEventListener(ev, (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); dz.classList.add('on'); } }));
  ['dragleave', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => { if (ev === 'dragleave' && e.relatedTarget) return; dz.classList.remove('on'); }));
  window.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); openSheets(Array.from(e.dataTransfer.files)); } });
  window.addEventListener('beforeunload', (e) => { if (SB.dirty) { SB.saveLocal(); } });
  $('#emptyOpen').onclick = () => U.run('file.openSheet'); $('#emptyDemo').onclick = () => U.run('file.demo');

  // ------------------------------------------------------------ arranque
  SB.i18n.start();
  buildToolbar(); buildOptions(); buildTabs(); buildStatus(); V.resize();
  (async () => {
    const saved = await SB.loadLocal();
    if (saved && saved.sheets && saved.sheets.length) { await SB.loadProject(saved); V.fit(); SB.dirty = false; U.toast('Proyecto anterior recuperado'); }
    SB.panels.refresh(); rebuild();
  })();
})();
