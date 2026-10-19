# Contributing

Spritebench is plain HTML + JavaScript (no build step, no dependencies). Clone, run `python serve.py 8788` and open <http://localhost:8788>.

* **Layout** — `js/state.js` (model + undo), `slice.js` (algorithms), `actions.js` (every edit goes through `SB.do(label, fn)` so it is undoable),
  `export.js`, `viewport.js` (canvas + tools), `ui_core.js` (menus, dialogs, palette), `panels.js` (dock), `app.js` (commands, bars, shortcuts), `i18n.js`.
* **Add a command** — `U.cmd(id, label, run, {key, group, enabled})` in `app.js`, then list it in a menu: it automatically shows up in the command palette and shortcuts.
* **Add a language** — add a dictionary to `SB.i18n.dicts` in `js/i18n.js` (keys are the Spanish source strings), plus a `lang.xx` command.
* **Tests** — open `tests/index.html` (logic) and run `scripts/e2e_and_screenshots.py` (real mouse/keyboard, regenerates `docs/screenshots`).
* **Unity package** — `unity/` (compile-tested on Unity 6000.x).

Please keep the interface keyboard-friendly and every action undoable.
