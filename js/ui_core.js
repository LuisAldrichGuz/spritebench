/* Spritebench — núcleo de la interfaz: iconos, comandos, menús (barra y clic derecho), diálogos, avisos y paleta de comandos. */
(function () {
  const SB = window.SB;
  const U = (SB.ui = {});
  const { $, el, esc } = SB;

  // ------------------------------------------------------------ iconos (trazo simple, un solo color)
  const P = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  U.icons = {
    select: P('<path d="M5 3l14 8-6 2-2 6z"/>'), rect: P('<rect x="4" y="5" width="16" height="14" rx="1" stroke-dasharray="3 2.5"/>'), wand: P('<path d="M4 20L15 9"/><path d="M15 3v3M15 12v3M12 9h3M18 9h3M17 5l-1.2 1.2M17 13l-1.2-1.2"/>'),
    hand: P('<path d="M8 12V5.5a1.5 1.5 0 013 0V11m0-1V4.5a1.5 1.5 0 013 0V11m0-4.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L4 14.5a1.6 1.6 0 012.6-1.8L8 14"/>'),
    zoom: P('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M8 10.5h5M10.5 8v5"/>'), grid: P('<rect x="4" y="4" width="16" height="16"/><path d="M4 12h16M12 4v16"/>'),
    flip: P('<path d="M12 3v18" stroke-dasharray="2 2.5"/><path d="M9 7L3 17h6zM15 7l6 10h-6z"/>'), flipv: P('<path d="M3 12h18" stroke-dasharray="2 2.5"/><path d="M7 9L17 3v6zM7 15l10 6v-6z"/>'),
    trash: P('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'), copy: P('<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>'), set: P('<rect x="3" y="7" width="7" height="10" rx="1"/><rect x="14" y="7" width="7" height="10" rx="1"/><path d="M10.5 12h3"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'), undo: P('<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 010 12" transform="translate(0,-6)"/>'), redo: P('<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 000 12" transform="translate(0,-6)"/>'),
    chev: P('<path d="M9 6l6 6-6 6"/>'), eye: P('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'), x: P('<path d="M6 6l12 12M18 6L6 18"/>'),
    check: P('<path d="M5 12l5 5 9-10"/>'), file: P('<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>'), save: P('<path d="M5 3h12l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'), export: P('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 15v6h16v-6"/>'),
    link: P('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'), trim: P('<path d="M7 3v14h14M3 7h14v14"/>'),
  };
  U.icon = (n) => U.icons[n] || '';

  // ------------------------------------------------------------ comandos
  U.cmds = {};
  U.cmd = (id, label, run, o) => { U.cmds[id] = Object.assign({ id, label, run }, o || {}); };
  U.run = (id) => { const c = U.cmds[id]; if (c && (!c.enabled || c.enabled())) c.run(); };
  const keyText = (k) => (k || '').replace('Ctrl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');

  // ------------------------------------------------------------ menú genérico (barra + contextual + submenús)
  // item: {label, key, icon, run|cmd, enabled, checked, sub:[items], sep:true, danger}
  function renderMenu(items, onClose, level) {
    const m = el('div', { class: 'menu', role: 'menu' });
    for (const it of items) {
      if (!it) continue;
      if (it.sep) { m.append(el('div', { class: 'sep' })); continue; }
      const cmd = it.cmd && U.cmds[it.cmd];
      const label = it.label || (cmd && cmd.label), key = it.key || (cmd && cmd.key);
      const enabled = it.enabled ? it.enabled() : cmd && cmd.enabled ? cmd.enabled() : true;
      const checked = it.checked ? it.checked() : cmd && cmd.checked ? cmd.checked() : null;
      const row = el('div', { class: 'mi' + (enabled ? '' : ' off') + (it.danger ? ' danger' : '') },
        el('span', { class: 'ck', html: checked ? U.icon('check') : '' }),
        el('span', { class: 'lb' }, label),
        el('span', { class: 'ky' }, it.sub ? '' : keyText(key)),
        el('span', { class: 'ar', html: it.sub ? U.icon('chev') : '' }));
      if (it.sub) {
        let subEl = null;
        row.addEventListener('mouseenter', () => {
          SB.$$('.menu.sub', m).forEach((s) => s.remove());
          const sm = renderMenu(typeof it.sub === 'function' ? it.sub() : it.sub, onClose, (level || 0) + 1); sm.classList.add('sub');
          row.append(sm); subEl = sm;
          const r = row.getBoundingClientRect(), w = sm.offsetWidth, h = sm.offsetHeight;
          sm.style.left = (r.right + w > innerWidth ? -w + 4 : r.width - 4) + 'px';
          sm.style.top = Math.min(0, innerHeight - r.top - h - 8) + 'px';
        });
        row.addEventListener('click', (e) => e.stopPropagation());
      } else if (enabled) {
        row.addEventListener('mouseenter', () => SB.$$('.menu.sub', m).forEach((s) => s.remove()));
        row.addEventListener('click', (e) => { e.stopPropagation(); onClose(); if (it.run) it.run(); else if (cmd) cmd.run(); });
      }
      m.append(row);
    }
    return m;
  }
  const ctxEl = $('#ctx');
  U.hideContext = () => { ctxEl.innerHTML = ''; ctxEl.style.display = 'none'; };
  U.showContext = (items, x, y) => {
    U.closeMenubar(); ctxEl.innerHTML = ''; ctxEl.style.display = 'block';
    const m = renderMenu(items, U.hideContext); ctxEl.append(m);
    const w = m.offsetWidth, h = m.offsetHeight;
    ctxEl.style.left = Math.max(4, Math.min(x, innerWidth - w - 6)) + 'px'; ctxEl.style.top = Math.max(4, Math.min(y, innerHeight - h - 6)) + 'px';
  };
  document.addEventListener('mousedown', (e) => { if (!e.target.closest('#ctx') && !e.target.closest('#menubar')) { U.hideContext(); U.closeMenubar(); } });
  window.addEventListener('blur', () => { U.hideContext(); U.closeMenubar(); });

  // ------------------------------------------------------------ barra de menús
  let openIdx = -1; const bar = $('#menubar');
  U.closeMenubar = () => { openIdx = -1; SB.$$('.mb-item', bar).forEach((b) => { b.classList.remove('open'); const d = b.querySelector('.menu'); if (d) d.remove(); }); };
  U.buildMenubar = (defs) => {
    bar.innerHTML = '';
    bar.append(el('div', { class: 'logo', title: 'Spritebench' }, 'Spritebench'));
    defs.forEach((def, i) => {
      const b = el('div', { class: 'mb-item' }, el('span', {}, def.label));
      const open = () => {
        U.hideContext(); const wasOpen = openIdx; U.closeMenubar(); if (wasOpen === i && event && event.type === 'click') return;
        openIdx = i; b.classList.add('open'); const m = renderMenu(typeof def.items === 'function' ? def.items() : def.items, U.closeMenubar); m.classList.add('drop'); b.append(m);
      };
      b.addEventListener('click', open);
      b.addEventListener('mouseenter', () => { if (openIdx >= 0 && openIdx !== i) open(); });
      bar.append(b);
    });
    bar.append(el('div', { class: 'grow' }), el('button', { class: 'pal', onclick: () => U.palette(), title: 'Paleta de comandos (Ctrl+K)' }, 'Buscar comando…', el('kbd', {}, 'Ctrl K')));
  };

  // ------------------------------------------------------------ avisos
  let tt = null;
  U.toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600); };

  // ------------------------------------------------------------ diálogos
  /** fields: [{id,label,type:'number'|'text'|'select'|'checkbox'|'note', value, min, max, options, hint}] → Promise<valores|null> */
  U.dialog = (o) => new Promise((res) => {
    const host = $('#modal'); host.innerHTML = ''; host.style.display = 'flex';
    const form = el('form', { class: 'dlg', onsubmit: (e) => { e.preventDefault(); done(true); } });
    const inputs = {};
    form.append(el('h2', {}, o.title));
    for (const f of o.fields || []) {
      if (f.type === 'note') { form.append(el('p', { class: 'note' }, f.label)); continue; }
      let inp;
      if (f.type === 'select') inp = el('select', {}, (f.options || []).map((op) => el('option', { value: op, selected: op === f.value }, op)));
      else if (f.type === 'checkbox') { inp = el('input', { type: 'checkbox' }); inp.checked = !!f.value; }
      else inp = el('input', { type: f.type || 'text', value: f.value == null ? '' : f.value, min: f.min, max: f.max, step: f.step });
      inputs[f.id] = inp;
      form.append(el('label', { class: 'frow' + (f.type === 'checkbox' ? ' chk' : '') }, el('span', {}, f.label), inp, f.hint ? el('small', {}, f.hint) : null));
    }
    form.append(el('div', { class: 'btns' }, el('button', { type: 'button', onclick: () => done(false) }, 'Cancelar'), el('button', { type: 'submit', class: 'primary' }, o.ok || 'Aceptar')));
    host.append(form);
    function done(ok) {
      host.style.display = 'none'; host.innerHTML = '';
      if (!ok) return res(null);
      const v = {}; for (const f of o.fields || []) if (inputs[f.id]) v[f.id] = f.type === 'checkbox' ? inputs[f.id].checked : f.type === 'number' ? +inputs[f.id].value : inputs[f.id].value;
      res(v);
    }
    host.onmousedown = (e) => { if (e.target === host) done(false); };
    form.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(false); });
    const first = form.querySelector('input,select'); if (first) { first.focus(); if (first.select) first.select(); }
  });
  U.alert = (title, html) => new Promise((res) => {
    const host = $('#modal'); host.innerHTML = ''; host.style.display = 'flex';
    const d = el('div', { class: 'dlg wide' }, el('h2', {}, title), el('div', { class: 'body', html }), el('div', { class: 'btns' }, el('button', { class: 'primary', onclick: close }, 'Cerrar')));
    function close() { host.style.display = 'none'; host.innerHTML = ''; res(); }
    host.onmousedown = (e) => { if (e.target === host) close(); }; d.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }); host.append(d); d.querySelector('button').focus();
  });

  // ------------------------------------------------------------ paleta de comandos (Ctrl+K)
  U.palette = () => {
    const host = $('#modal'); host.innerHTML = ''; host.style.display = 'flex'; host.classList.add('top');
    const input = el('input', { class: 'pin', placeholder: 'Escribe un comando…  (Slice, Exportar, Voltear, Conjunto…)' });
    const list = el('div', { class: 'plist' });
    const box = el('div', { class: 'dlg pal' }, input, list); host.append(box);
    let items = [], idx = 0;
    const close = () => { host.style.display = 'none'; host.innerHTML = ''; host.classList.remove('top'); };
    const render = () => {
      const q = input.value.trim().toLowerCase();
      const T = (x) => (SB.t ? SB.t(x) : x);
      items = Object.values(U.cmds).filter((c) => (!q || (c.label + ' ' + T(c.label) + ' ' + (c.group || '') + ' ' + T(c.group || '')).toLowerCase().includes(q))).slice(0, 14); idx = Math.min(idx, Math.max(0, items.length - 1));
      list.innerHTML = ''; items.forEach((c, i) => { const ok = !c.enabled || c.enabled(); list.append(el('div', { class: 'pi' + (i === idx ? ' on' : '') + (ok ? '' : ' off'), onclick: () => { close(); if (ok) setTimeout(() => c.run(), 0); } }, el('span', {}, c.label), el('span', { class: 'mut' }, c.group || '', c.key ? '  ' + keyText(c.key) : ''))); });
    };
    input.addEventListener('input', () => { idx = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); render(); e.preventDefault(); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); render(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); const c = items[idx]; close(); if (c && (!c.enabled || c.enabled())) setTimeout(() => c.run(), 0); }   // diferido: si no, el Enter se "cuela" al diálogo que abre el comando
    });
    host.onmousedown = (e) => { if (e.target === host) close(); }; render(); input.focus();
  };
})();
