/* Spritebench — idiomas. El código está escrito en español; para inglés (y futuros idiomas) un traductor recorre el DOM
   y cambia los textos exactos del diccionario. Añadir un idioma = añadir otro diccionario en SB.i18n.dicts. */
(function () {
  const SB = window.SB;
  const I = (SB.i18n = { dicts: {}, rules: {}, frags: {} });
  const saved = (() => { try { return localStorage.getItem('spritebench.lang'); } catch (e) { return null; } })();
  SB.lang = saved || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');

  I.dicts.en = {
    // barra de menús y herramientas
    'Archivo': 'File', 'Edición': 'Edit', 'Recorte': 'Slice', 'Conjunto': 'Set', 'Vista': 'View', 'Ayuda': 'Help', 'Idioma': 'Language', 'Herramienta': 'Tool',
    'Buscar comando…': 'Search command…', 'Paleta de comandos (Ctrl+K)': 'Command palette (Ctrl+K)',
    'Selección': 'Select', 'Rectángulo': 'Rectangle', 'Varita': 'Wand', 'Mano': 'Hand', 'Zoom': 'Zoom',
    'Selección (V)': 'Select (V)', 'Rectángulo (M)': 'Rectangle (M)', 'Varita mágica (W)': 'Magic wand (W)', 'Mano (H)': 'Hand (H)', 'Zoom (Z)': 'Zoom (Z)',
    'Cortar por rejilla… (Shift+G)': 'Slice by grid… (Shift+G)', 'Agrupar en conjunto (K)': 'Group into set (K)',
    // comandos
    'Nuevo proyecto': 'New project', 'Abrir hoja de sprites…': 'Open sprite sheet…', 'Abrir proyecto…': 'Open project…', 'Guardar proyecto (.spritebench)': 'Save project (.spritebench)',
    'Ajustes del proyecto…': 'Project settings…', 'Exportar paquete (.zip)…': 'Export bundle (.zip)…', 'Exportar a carpeta (Unity Assets)…': 'Export to folder (Unity Assets)…',
    'Descargar solo el catálogo JSON': 'Download catalog JSON only', 'Cargar hoja de ejemplo': 'Load example sheet',
    'Deshacer': 'Undo', 'Rehacer': 'Redo', 'Duplicar': 'Duplicate', 'Borrar': 'Delete', 'Renombrar…': 'Rename…', 'Renombrar en lote…': 'Bulk rename…',
    'Seleccionar todo': 'Select all', 'Deseleccionar': 'Deselect', 'Invertir selección': 'Invert selection', 'Seleccionar sprites sueltos (sin conjunto)': 'Select loose sprites (no set)',
    'Auto-slice por transparencia…': 'Auto-slice by transparency…', 'Cortar por rejilla…': 'Slice by grid…', 'Ajustar selección al dibujo': 'Trim selection to artwork', 'Ajustar TODOS al dibujo': 'Trim ALL to artwork',
    'Fusionar seleccionados': 'Merge selected', 'Partir en rejilla…': 'Split into grid…', 'Borrar todos los sprites de la hoja': 'Delete all sprites in the sheet',
    'Nuevo conjunto vacío…': 'New empty set…', 'Agrupar selección en un conjunto…': 'Group selection into a set…', 'Buscar espejos y crear volteos': 'Find mirrors and create flips', 'Deshacer conjunto activo': 'Ungroup active set',
    'Acercar': 'Zoom in', 'Alejar': 'Zoom out', 'Ajustar a la ventana': 'Fit to window', 'Zoom 100 %': 'Zoom 100 %', 'Zoom 400 %': 'Zoom 400 %', 'Centrar en la selección': 'Center on selection',
    'Rejilla de celdas': 'Cell grid', 'Rejilla de píxeles (zoom alto)': 'Pixel grid (high zoom)', 'Huella y pivote': 'Footprint and pivot', 'Etiquetas de conjunto': 'Set labels', 'Fondo de damero': 'Checkerboard background',
    'Paleta de comandos': 'Command palette', 'Atajos de teclado': 'Keyboard shortcuts', 'Acerca de Spritebench': 'About Spritebench',
    // menús contextuales
    'Pivote': 'Pivot', 'Categoría': 'Category', 'Ocupa en el suelo': 'Occupies on the ground', 'Sólido': 'Solid', 'Copiar nombre': 'Copy name', 'Nombre copiado': 'Name copied',
    'Crear sprite aquí (varita)': 'Create sprite here (wand)', 'Automático (según el tamaño)': 'Automatic (from size)', 'Sacar del conjunto': 'Remove from set',
    '(no hay conjuntos todavía)': '(no sets yet)', 'Renombrar hoja…': 'Rename sheet…', 'Cerrar hoja': 'Close sheet', 'Usar la selección aquí': 'Use the selection here', 'Quitar esta variante': 'Remove this variant',
    'Arriba izquierda': 'Top left', 'Arriba centro': 'Top center', 'Arriba derecha': 'Top right', 'Centro izquierda': 'Middle left', 'Centro': 'Center', 'Centro derecha': 'Middle right', 'Abajo izquierda': 'Bottom left', 'Abajo centro': 'Bottom center', 'Abajo derecha': 'Bottom right',
    // barra de opciones / estado
    'Ajustar a celdas': 'Snap to cells', 'Ajustar al dibujo': 'Fit to artwork', 'Huella': 'Footprint', 'Ajustar': 'Fit', 'Sin hoja': 'No sheet', 'Sin título': 'Untitled',
    'Clic: seleccionar · arrastra: mover · Shift: sumar · clic derecho: opciones': 'Click: select · drag: move · Shift: add · right-click: options', 'Arrastra para dibujar un sprite': 'Drag to draw a sprite',
    'Clic sobre un objeto para recortarlo': 'Click an object to cut it out', 'Arrastra para mover la vista': 'Drag to pan the view', 'Clic acerca · Alt+clic aleja': 'Click zooms in · Alt+click zooms out',
    'Autoguardado ✔': 'Autosaved ✔', 'Cerrar': 'Close', 'Abrir hoja (Ctrl+O)': 'Open sheet (Ctrl+O)',
    // pantalla vacía
    'Arrastra aquí una hoja de sprites (PNG) para empezar.': 'Drop a sprite sheet (PNG) here to begin.', 'Abrir hoja…': 'Open sheet…', 'Probar con una hoja de ejemplo': 'Try an example sheet',
    'Todo ocurre en tu navegador. Nada se sube a ningún servidor.': 'Everything happens in your browser. Nothing is uploaded to any server.', 'Suelta tu hoja de sprites': 'Drop your sprite sheet',
    // paneles
    'Sprites': 'Sprites', 'Propiedades': 'Properties', 'Conjuntos': 'Sets', 'Historial': 'History', 'Buscar sprite…': 'Search sprite…', 'Todos': 'All', 'Sueltos': 'Loose', 'En conjuntos': 'In sets', 'Gigantes': 'Giants',
    'Aún no hay sprites. Usa Slice ▸ Auto-slice, la herramienta Rectángulo (M) o la Varita (W).': 'No sprites yet. Use Slice ▸ Auto-slice, the Rectangle tool (M) or the Wand (W).',
    'Selecciona un sprite para ver cuánto mide, cuántas celdas ocupa y dónde está su pivote.': 'Select a sprite to see its size, how many cells it occupies and where its pivot is.',
    'Nombre': 'Name', 'Ocupa en el suelo (celdas)': 'Occupies on the ground (cells)', 'Ancho': 'Width', 'Fondo': 'Depth', 'Sólido (bloquea el paso)': 'Solid (blocks movement)',
    'Etiquetas (separadas por coma)': 'Tags (comma separated)', 'Propiedades personalizadas (se exportan tal cual)': 'Custom properties (exported as-is)', '+ Propiedad': '+ Property', '+ Nueva categoría…': '+ New category…', '— varias —': '— several —',
    '+ Nuevo': '+ New', 'Agrupar selección': 'Group selection', 'Buscar espejos': 'Find mirrors', 'Agrupa lo seleccionado (de izquierda a derecha)': 'Groups the selection (left to right)', 'Detecta sprites que son el espejo de otro y crea el volteo': 'Detects sprites that mirror another one and creates the flip',
    'Un conjunto es UN objeto con varias variantes (frente, izquierda, espalda, derecha…). Una variante puede ser otra volteada: sin duplicar arte.': 'A set is ONE object with several variants (front, left, back, right…). A variant can be another one flipped: no duplicated art.',
    'Nombre del conjunto': 'Set name', 'Variantes…': 'Variants…', '+ Añadir variante…': '+ Add variant…', '2 direcciones': '2 directions', '4 direcciones': '4 directions', '8 direcciones': '8 directions', 'Estados': 'States', 'Personalizado': 'Custom',
    'Deshacer conjunto': 'Ungroup set', 'Frente': 'Front', 'Izquierda': 'Left', 'Espalda': 'Back', 'Derecha': 'Right', 'vacío': 'empty', 'Vacío': 'Empty', 'Vaciar': 'Clear',
    '← selección': '← selection', 'volteo de…': 'flip of…', '— sin volteo': '— no flip', 'Voltear horizontal': 'Flip horizontal', 'Voltear vertical': 'Flip vertical', 'Usar el sprite seleccionado': 'Use the selected sprite',
    'Clic: seleccionar · clic derecho: más': 'Click: select · right-click: more', 'Girar:': 'Turn:', 'Cada cambio queda aquí. Ctrl+Z / Ctrl+Shift+Z.': 'Every change is listed here. Ctrl+Z / Ctrl+Shift+Z.', 'Ahora': 'Now',
    'Cambiar variantes': 'Change variants', 'Quitar': 'Remove', 'Mover': 'Move',
    // diálogos
    'Aceptar': 'OK', 'Cancelar': 'Cancel', 'Cortar': 'Slice', 'Partir': 'Split', 'Agrupar': 'Group', 'Exportar': 'Export', 'Buscar': 'Search',
    'Ajustes del proyecto': 'Project settings', 'Tamaño de celda del juego (px)': 'Game cell size (px)', 'La huella se mide en celdas de este tamaño.': 'Footprints are measured in cells of this size.', 'Píxeles por unidad (PPU)': 'Pixels per unit (PPU)',
    'Exportar a una carpeta': 'Export to a folder', 'Exportar paquete': 'Export bundle', 'Incluye siempre el catálogo (.catalog.json) y las hojas PNG.': 'Always includes the catalog (.catalog.json) and the PNG sheets.',
    'Atlas JSON (TexturePacker: Phaser, Pixi, Godot…)': 'Atlas JSON (TexturePacker: Phaser, Pixi, Godot…)', 'Un PNG por sprite': 'One PNG per sprite', 'Con los volteos ya horneados (para motores sin flip)': 'With flips baked in (for engines without flip)',
    'Renombrar en lote': 'Bulk rename', 'Usa {n} para el contador ({n:3} = 001) y {name} para el nombre actual. Orden: arriba→abajo, izquierda→derecha.': 'Use {n} for the counter ({n:3} = 001) and {name} for the current name. Order: top→bottom, left→right.', 'Patrón': 'Pattern', 'Empezar en': 'Start at',
    'Auto-slice': 'Auto-slice', 'Cada objeto separado por transparencia se vuelve un sprite.': 'Every object separated by transparency becomes a sprite.', 'Unir piezas a menos de (px)': 'Join pieces closer than (px)', '0 = no unir. Sube a 2–4 si un objeto sale partido en trozos.': '0 = do not join. Raise to 2–4 if an object comes out in pieces.',
    'Ignorar manchas menores a (píxeles)': 'Ignore specks smaller than (pixels)', 'Reemplazar los sprites actuales de esta hoja': 'Replace this sheet’s current sprites', 'Reemplazar los sprites actuales': 'Replace the current sprites',
    'Cortar por rejilla': 'Slice by grid', 'Ancho de celda (px)': 'Cell width (px)', 'Alto de celda (px)': 'Cell height (px)', 'Desplazamiento X': 'Offset X', 'Desplazamiento Y': 'Offset Y', 'Separación X': 'Spacing X', 'Separación Y': 'Spacing Y',
    'Ajustar cada celda a su dibujo': 'Trim each cell to its artwork', 'Saltar celdas vacías': 'Skip empty cells', 'Partir sprite en rejilla': 'Split sprite into grid', 'Columnas': 'Columns', 'Filas': 'Rows', 'Ajustar cada parte al dibujo': 'Trim each part to its artwork',
    'Nuevo conjunto': 'New set', 'Variantes': 'Variants', 'Agrupar en conjunto': 'Group into set', 'Los sprites seleccionados se asignan de izquierda a derecha.': 'The selected sprites are assigned from left to right.',
    'Encuentra sprites que son el espejo exacto de otro y crea conjuntos izquierda/derecha.': 'Finds sprites that are the exact mirror of another and creates left/right sets.', 'Borrar el duplicado y usar volteo': 'Delete the duplicate and use a flip',
    'Nueva categoría': 'New category', 'Nueva propiedad': 'New property', 'Clave': 'Key', 'Valor': 'Value', 'Nueva variante': 'New variant', 'Renombrar hoja': 'Rename sheet',
    'Escribe un comando…  (Slice, Exportar, Voltear, Conjunto…)': 'Type a command…  (Slice, Export, Flip, Set…)', 'Atajos': 'Shortcuts',
    'Catalogador de sprites con conjuntos, volteos, huella en celdas y exportación a Unity y otros motores.': 'Sprite cataloguer with sets, flips, grid footprints and export to Unity and other engines.', 'Código abierto (MIT). Todo corre en tu navegador: tus imágenes no salen de tu equipo.': 'Open source (MIT). Everything runs in your browser: your images never leave your computer.', '+arrastrar · botón central · herramienta Mano': '+drag · middle button · Hand tool', '+rueda desplaza': '+wheel scrolls', 'Espacio': 'Space', 'Mover la selección': 'Move the selection', 'Mover la vista': 'Pan the view', 'Menú contextual': 'Context menu', 'rueda del ratón ·': 'mouse wheel ·', 'clic derecho sobre sprites, lienzo, listas y huecos de conjuntos': 'right-click on sprites, canvas, lists and set slots',
    // avisos
    'Proyecto abierto': 'Project opened', 'Archivo no válido': 'Invalid file', 'Proyecto guardado': 'Project saved', 'Proyecto anterior recuperado': 'Previous project restored', 'No hay nada opaco ahí': 'Nothing opaque there', 'Esa zona está vacía': 'That area is empty',
    'No encontré espejos': 'No mirrors found', 'No se pudo leer la imagen': 'Could not read the image', 'Tu navegador no permite elegir carpetas: usa “Exportar .zip”.': 'Your browser cannot pick folders: use “Export .zip”.',
    'Hay cambios sin guardar. ¿Empezar un proyecto nuevo?': 'There are unsaved changes. Start a new project?', '¿Borrar todos los sprites de esta hoja?': 'Delete all sprites in this sheet?', '¿Cerrar esta hoja? Se pierden sus sprites (puedes deshacer).': 'Close this sheet? Its sprites are lost (you can undo).',
    // atajos (etiquetas de la tabla)
    'Copiar': 'Copy', 'Copiar propiedades del sprite': 'Copy sprite properties', 'Pegar propiedades en la selección': 'Paste properties onto selection', 'Propiedades copiadas': 'Properties copied', 'Pegar propiedades': 'Paste properties', 'Renombrar variante…': 'Rename variant…', 'Renombrar variante': 'Rename variant', 'Mover antes': 'Move earlier', 'Mover después': 'Move later', 'Mover variante': 'Move variant', 'Nombres repetidos': 'Duplicate names', 'Continuar': 'Continue', 'Hacerlos únicos automáticamente (_2, _3…)': 'Make them unique automatically (_2, _3…)', 'Nombres únicos': 'Unique names',
    // pie del historial
    'Cambiar propiedades': 'Change properties', 'Cambiar pivote': 'Change pivot', 'Cambiar conjunto': 'Change set', 'Crear sprite': 'Create sprite', 'Borrar sprites': 'Delete sprites', 'Mover / redimensionar': 'Move / resize', 'Redimensionar': 'Resize',
    'Renombrar': 'Rename', 'Renombrar conjunto': 'Rename set', 'Limpiar hoja': 'Clear sheet', 'Fusionar': 'Merge', 'Partir en rejilla': 'Split into grid', 'Ajustar al dibujo (hist)': 'Trim to artwork', 'Ajustar todos al dibujo': 'Trim all to artwork',
    'Quitar propiedad': 'Remove property', 'Añadir variante': 'Add variant', 'Quitar variante': 'Remove variant', 'Buscar espejos (hist)': 'Find mirrors', 'Nueva categoría (hist)': 'New category', 'Etiquetas': 'Tags', 'Propiedad': 'Property',
    'Cerrar hoja (hist)': 'Close sheet', 'Duplicar (hist)': 'Duplicate', 'Varita (hist)': 'Wand', 'Ajustes del proyecto (hist)': 'Project settings', 'Cerrar hoja ': 'Close sheet ',
  };
  // frases con números o nombres dentro: [regex, reemplazo]
  I.rules.en = [
    [/^(\d+) sprites creados$/, '$1 sprites created'], [/^(\d+) conjuntos creados$/, '$1 sets created'], [/^Exportados (\d+) archivos ✔$/, 'Exported $1 files ✔'], [/^Sprite creado: (.*)$/, 'Sprite created: $1'],
    [/^Auto-slice \((\d+)\)$/, 'Auto-slice ($1)'], [/^Estos nombres se repiten y los motores identifican los sprites por nombre: (.*)$/, 'These names repeat and engines identify sprites by name: $1'], [/^Rejilla \((\d+)\)$/, 'Grid ($1)'], [/^Abrir hoja (.*)$/, 'Open sheet $1'], [/^Mostrando (\d+) de (\d+)\. Usa la búsqueda\.$/, 'Showing $1 of $2. Use the search.'],
    [/^(\d+) seleccionados$/, '$1 selected'], [/^(\d+) sprites$/, '$1 sprites'], [/^Pivote ([\d.]+), ([\d.]+)$/, 'Pivot $1, $2'], [/^Asignar a (.*)$/, 'Assign to $1'], [/^Voltear (.*)$/, 'Flip $1'], [/^Variantes (.*)$/, 'Variants $1'],
    [/^volteo de (.*)$/, 'flip of $1'], [/^Usar como “(.*)”$/, 'Use as “$1”'], [/^Conjunto (\d+)$/, 'Set $1'], [/^(\d+) sprites seleccionados — los cambios se aplican a todos\.$/, '$1 sprites selected — changes apply to all.'],
    [/^(\d+) sprites seleccionados$/, '$1 sprites selected'], [/^(.*) sprites · (\d+) conjuntos(?: · (\d+) seleccionados)?$/, (m, a, b, c) => a + ' sprites · ' + b + ' sets' + (c ? ' · ' + c + ' selected' : '')],
    [/^(.*) — Spritebench$/, '$1 — Spritebench'], [/^↔ (.*)$/, '↔ $1'],
  ];
  // trozos sueltos dentro de textos compuestos (se aplican en orden)
  I.frags.en = [[' celdas', ' cells'], [' celda', ' cell'], [' · sólido', ' · solid'], [' (celda de ', ' (cell of '], ['ocupa ', 'occupies '], [' ·   celda ', ' ·   cell '], ['seleccionados', 'selected'], [' conjuntos', ' sets']];

  const attrs = ['title', 'placeholder', 'aria-label'];
  function tr(s) {
    if (SB.lang === 'es' || !s) return s;
    const d = I.dicts[SB.lang]; if (!d) return s;
    const t = s.trim(); if (!t) return s;
    if (d[t] !== undefined) return s.replace(t, d[t]);
    for (const [re, rep] of I.rules[SB.lang] || []) { if (re.test(t)) return s.replace(t, t.replace(re, rep)); }
    let out = s; for (const [a, b] of I.frags[SB.lang] || []) if (out.includes(a)) out = out.split(a).join(b);
    return out;
  }
  SB.t = tr;
  function walk(node) {
    if (node.nodeType === 3) { const v = tr(node.nodeValue); if (v !== node.nodeValue) node.nodeValue = v; return; }
    if (node.nodeType !== 1) return;
    if (/SCRIPT|STYLE/.test(node.tagName) || (node.classList && node.classList.contains('usr'))) return;
    for (const a of attrs) { if (node.hasAttribute && node.hasAttribute(a)) { const v = tr(node.getAttribute(a)); if (v !== node.getAttribute(a)) node.setAttribute(a, v); } }
    if (node.tagName === 'CANVAS') return;
    if (node.tagName === 'OPTION' || (node.tagName === 'INPUT' && node.dataset && node.dataset.tr)) { /* textos de option se tratan como nodos de texto */ }
    for (const c of node.childNodes) walk(c);
  }
  I.start = () => {
    if (SB.lang === 'es') return;
    document.documentElement.lang = SB.lang;
    let busy = false;
    const mo = new MutationObserver((muts) => {
      if (busy) return; busy = true;
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach((n) => walk(n));
        else if (m.type === 'characterData') { const v = tr(m.target.nodeValue); if (v !== m.target.nodeValue) m.target.nodeValue = v; }
        else if (m.type === 'attributes') { const v = tr(m.target.getAttribute(m.attributeName)); if (v !== m.target.getAttribute(m.attributeName)) m.target.setAttribute(m.attributeName, v); }
      }
      busy = false;
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: attrs });
    walk(document.body);
  };
  I.set = async (lang) => { try { localStorage.setItem('spritebench.lang', lang); } catch (e) { /* ignore */ } if (SB.saveLocal) await SB.saveLocal(); location.reload(); };
})();
