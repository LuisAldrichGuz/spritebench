"""
Bench: drive a real Spritebench page (headless Chromium via Playwright) from Python.

Everything the human UI can do goes through the in-page `SB` API, so an agent gets the exact same behaviour
(slicing, sets, flips, undo history, export) plus `SB.renderReview()` to SEE the result as an annotated PNG.

Sprites are addressed by their 0-based *index* in the active sheet (the number drawn on review screenshots),
by `id`, or by exact `name`. Indexes shift when sprites are deleted/merged — call `list_sprites()` again.
"""
from __future__ import annotations

import base64
import glob
import json
import os
from pathlib import Path
from typing import Any, Iterable, Sequence

from playwright.sync_api import Page, sync_playwright

REPO_INDEX = Path(__file__).resolve().parents[2] / "index.html"
HOSTED_URL = "https://luisaldrichguz.github.io/spritebench/"

Ref = int | str


def _chrome_path() -> str | None:
    if os.environ.get("CHROME_PATH"):
        return os.environ["CHROME_PATH"]
    patterns = (
        "~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe",
        "~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome",
        "~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/Chromium.app/Contents/MacOS/Chromium",
    )
    for pat in patterns:
        found = sorted(glob.glob(os.path.expanduser(pat)))
        if found:
            return found[-1]
    return None


_RESOLVE = """
const R = (k) => { const S = SB.sheet().sprites; if (typeof k === 'number') return S[k] || null;
  return SB.findSprite(k) || S.find((s) => s.name === k) || null; };
const IDS = (ks) => ks.map(R).filter(Boolean).map((s) => s.id);
"""


class Bench:
    def __init__(self, url: str | None = None, headless: bool = True, lang: str = "en", width: int = 1500, height: int = 900):
        self.url = url or (REPO_INDEX.as_uri() if REPO_INDEX.exists() else HOSTED_URL)
        self.headless, self.lang, self.size = headless, lang, (width, height)
        self._pw = self._browser = None
        self.page: Page | None = None

    # ---------------------------------------------------------------- lifecycle
    def start(self) -> "Bench":
        if self.page:
            return self
        self._pw = sync_playwright().start()
        kw: dict[str, Any] = {"headless": self.headless}
        exe = _chrome_path()
        if exe:
            kw["executable_path"] = exe
        self._browser = self._pw.chromium.launch(**kw)
        ctx = self._browser.new_context(viewport={"width": self.size[0], "height": self.size[1]}, accept_downloads=True)
        ctx.add_init_script(f"localStorage.setItem('spritebench.lang','{self.lang}'); indexedDB.deleteDatabase('spritebench');")
        self.page = ctx.new_page()
        self.errors: list[str] = []
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.page.goto(self.url)
        self.page.wait_for_function("!!(window.SB && SB.act && SB.renderReview)")
        return self

    def close(self) -> None:
        if self._browser:
            self._browser.close()
        if self._pw:
            self._pw.stop()
        self.page = self._browser = self._pw = None

    def __enter__(self) -> "Bench":
        return self.start()

    def __exit__(self, *a: Any) -> None:
        self.close()

    def js(self, expr: str, arg: Any = None) -> Any:
        """Evaluate JS in the page (the `SB` global is the whole app API)."""
        assert self.page, "call start() first"
        return self.page.evaluate("async ([arg]) => { " + _RESOLVE + " " + expr + " }", [arg])

    # ---------------------------------------------------------------- sheets & projects
    def open_sheet(self, path: str, name: str | None = None) -> dict:
        p = Path(path)
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "gif": "image/gif"}.get(p.suffix[1:].lower(), "image/png")
        url = f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
        self.js("await SB.addSheetDataUrl(arg.name, arg.url); SB.view.fit();", {"name": name or p.name, "url": url})
        return self.summary()

    def set_cell(self, cell: int, ppu: int | None = None, name: str | None = None) -> None:
        self.js("SB.do('Project settings', () => { SB.project.cell = arg.cell; if (arg.ppu) SB.project.ppu = arg.ppu; if (arg.name) SB.project.name = arg.name; });", {"cell": cell, "ppu": ppu, "name": name})

    def save_project(self, path: str) -> str:
        Path(path).write_text(self.js("return SB.projectJSON();"), encoding="utf-8")
        return str(path)

    def load_project(self, path: str) -> dict:
        self.js("await SB.loadProject(JSON.parse(arg)); SB.view.fit();", Path(path).read_text(encoding="utf-8"))
        return self.summary()

    # ---------------------------------------------------------------- reading
    def summary(self) -> dict:
        return self.js("return SB.summary();")

    def list_sprites(self) -> list[dict]:
        return self.js("return SB.listSprites();")

    def list_sets(self) -> list[dict]:
        return self.js("return SB.project.sets.map((st, i) => ({ i, id: st.id, name: st.name, variants: st.variants.map((v) => v.sprite ? { name: v.name, sprite: SB.sheet().sprites.findIndex((s) => s.id === v.sprite) } : v.flipOf ? { name: v.name, flipOf: v.flipOf, flipX: !!v.flipX, flipY: !!v.flipY } : { name: v.name }) }));")

    def screenshot(self, x: int = 0, y: int = 0, w: int | None = None, h: int | None = None, scale: int | None = None,
                   labels: bool = True, only: Sequence[Ref] | None = None, giant: int = 96) -> bytes:
        """Annotated PNG of a region (boxes numbered by index; orange = bigger than `giant` px; coloured = in a set)."""
        r = self.js("const o = { x: arg.x, y: arg.y, w: arg.w, h: arg.h, scale: arg.scale, labels: arg.labels ? 'index' : 'none', giant: arg.giant };"
                    " if (arg.only) o.onlyIds = IDS(arg.only); return SB.renderReview(o);",
                    {"x": x, "y": y, "w": w, "h": h, "scale": scale, "labels": labels, "only": list(only) if only else None, "giant": giant})
        return base64.b64decode(r["dataUrl"].split(",", 1)[1])

    def sets_sheet(self, names: Sequence[str] | None = None, start: int = 0, limit: int = 24, scale: int = 3, cols: int = 3) -> bytes:
        """Contact sheet of sets: every variant drawn as the game will show it (flips applied). Great to verify groupings."""
        r = self.js(
            "const all = SB.project.sets.filter((s) => !arg.names || arg.names.includes(s.name)).slice(arg.start, arg.start + arg.limit);"
            " const sc = arg.scale, pad = 6, cw = 4 * 0 + 0; let maxw = 0, maxh = 0;"
            " all.forEach((st) => st.variants.forEach((v) => { const r = SB.resolveVariant(st, v.name); if (r && r.sprite) { maxw = Math.max(maxw, r.sprite.w); maxh = Math.max(maxh, r.sprite.h); } }));"
            " const cellW = maxw * sc + pad, cellH = maxh * sc + pad + 12, rowW = 4 * cellW + 90, rows = Math.ceil(all.length / arg.cols);"
            " const c = document.createElement('canvas'); c.width = rowW * arg.cols; c.height = rows * cellH + 4; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;"
            " g.fillStyle = '#2b2b2b'; g.fillRect(0, 0, c.width, c.height);"
            " all.forEach((st, k) => { const ox = (k % arg.cols) * rowW, oy = Math.floor(k / arg.cols) * cellH;"
            "   g.fillStyle = '#e6e6e6'; g.font = '11px monospace'; g.fillText(st.name, ox + 2, oy + 11);"
            "   ['front', 'left', 'back', 'right'].forEach((vn, i) => { const r = SB.resolveVariant(st, vn); const x = ox + i * cellW + 2, y = oy + 14;"
            "     g.fillStyle = '#383838'; g.fillRect(x, y, cellW - 4, cellH - 18);"
            "     if (r && r.sprite) { const cv = SB.exp.spriteCanvas(r.sprite, SB.sheetOf(r.sprite.id).id, r.flipX, r.flipY); g.drawImage(cv, x + (cellW - 4 - cv.width * sc) / 2, y + cellH - 18 - cv.height * sc - 2, cv.width * sc, cv.height * sc); }"
            "     g.fillStyle = r ? '#9be29b' : '#666'; g.font = '9px monospace'; g.fillText(vn[0].toUpperCase() + (r && (r.flipX || r.flipY) ? '↔' : ''), x + 1, y + 9); }); });"
            " return c.toDataURL('image/png');",
            {"names": list(names) if names else None, "start": start, "limit": limit, "scale": scale, "cols": cols})
        return base64.b64decode(r.split(",", 1)[1])

    # ---------------------------------------------------------------- slicing
    def auto_slice(self, gap: int = 0, min_area: int = 6, replace: bool = True, region: Sequence[int] | None = None) -> int:
        return self.js("const sh = SB.sheet(); const rects = SB.autoSlice(sh.id, { gap: arg.gap, minArea: arg.min, region: arg.region });"
                       " if (arg.replace) SB.do('Clear sheet', () => { sh.sprites = []; SB.sel.clear(); });"
                       " SB.act.addSprites(rects, 'Auto-slice'); return rects.length;", {"gap": gap, "min": min_area, "replace": replace, "region": list(region) if region else None})

    def grid_slice(self, cw: int, ch: int, ox: int = 0, oy: int = 0, px: int = 0, py: int = 0, trim: bool = True, skip_empty: bool = True,
                   region: Sequence[int] | None = None, replace: bool = False) -> int:
        return self.js("const sh = SB.sheet(); const rects = SB.gridSlice(sh.id, { cw: arg.cw, ch: arg.ch, ox: arg.ox, oy: arg.oy, px: arg.px, py: arg.py, trim: arg.trim, skipEmpty: arg.skip, region: arg.region });"
                       " if (arg.replace) SB.do('Clear sheet', () => { sh.sprites = []; });"
                       " SB.act.addSprites(rects, 'Grid slice'); return rects.length;",
                       {"cw": cw, "ch": ch, "ox": ox, "oy": oy, "px": px, "py": py, "trim": trim, "skip": skip_empty, "region": list(region) if region else None, "replace": replace})

    def add_rect(self, x0: int, y0: int, x1: int, y1: int, trim: bool = True, category: str | None = None) -> int | None:
        return self.js("let b = [arg.x0, arg.y0, arg.x1, arg.y1]; if (arg.trim) b = SB.trimRect(SB.sheet().id, b); if (!b) return null;"
                       " const ids = SB.act.addSprites([b], 'Add sprite', arg.category ? { category: arg.category } : undefined); return SB.sheet().sprites.findIndex((s) => s.id === ids[0]);",
                       {"x0": x0, "y0": y0, "x1": x1, "y1": y1, "trim": trim, "category": category})

    def wand(self, x: int, y: int, gap: int = 0) -> int | None:
        return self.js("const b = SB.wand(SB.sheet().id, arg.x, arg.y, arg.gap); if (!b) return null; const ids = SB.act.addSprites([b], 'Wand');"
                       " return SB.sheet().sprites.findIndex((s) => s.id === ids[0]);", {"x": x, "y": y, "gap": gap})

    def delete(self, refs: Iterable[Ref]) -> None:
        self.js("SB.sel = new Set(IDS(arg)); SB.act.deleteSelected();", list(refs))

    def trim(self, refs: Iterable[Ref] | None = None) -> None:
        self.js("if (arg) { SB.sel = new Set(IDS(arg)); SB.act.trim(false); } else SB.act.trim(true);", list(refs) if refs is not None else None)

    def merge(self, refs: Iterable[Ref]) -> None:
        self.js("SB.sel = new Set(IDS(arg)); SB.act.mergeSelected();", list(refs))

    def split(self, ref: Ref, cols: int, rows: int, trim: bool = True) -> None:
        self.js("SB.sel = new Set(IDS([arg.ref])); SB.act.splitGrid(arg.cols, arg.rows, arg.trim);", {"ref": ref, "cols": cols, "rows": rows, "trim": trim})

    def set_rect(self, ref: Ref, x0: int, y0: int, x1: int, y1: int) -> None:
        self.js("const s = R(arg.ref); if (s) SB.act.setRect(s.id, [arg.x0, arg.y0, arg.x1, arg.y1]);", {"ref": ref, "x0": x0, "y0": y0, "x1": x1, "y1": y1})

    # ---------------------------------------------------------------- describing sprites
    def patch(self, refs: Iterable[Ref], **fields: Any) -> None:
        """fields: name, fc, fr, solid, category, pivot=[x,y], tags=[...], props={...}. (fc/fr = footprint cols/rows in cells)"""
        self.js("const ids = IDS(arg.refs); SB.act.patch(ids, arg.f, 'Edit properties');", {"refs": list(refs), "f": fields})

    def set_footprint(self, refs: Iterable[Ref], cols: int, rows: int, solid: bool | None = None) -> None:
        f: dict[str, Any] = {"fc": cols, "fr": rows}
        if solid is not None:
            f["solid"] = solid
        self.patch(refs, **f)

    # ---------------------------------------------------------------- sets
    def group(self, refs: Sequence[Ref], variants: Sequence[str] | None = None, name: str | None = None) -> dict:
        """Group sprites into a set; they are assigned to `variants` in the order given (default front/left/back/right)."""
        return self.js("const ids = IDS(arg.refs); const names = arg.variants || SB.VARIANT_PRESETS['4 direcciones'];"
                       " const id = SB.act.newSet(arg.name || '', names); names.forEach((n, i) => { if (ids[i]) SB.act.assign(id, n, ids[i]); });"
                       " const st = SB.project.sets.find((s) => s.id === id); return { id, name: st.name };",
                       {"refs": list(refs), "variants": list(variants) if variants else None, "name": name})

    def assign(self, set_name: str, variant: str, ref: Ref) -> None:
        self.js("const st = SB.project.sets.find((s) => s.name === arg.set || s.id === arg.set); const s = R(arg.ref); if (st && s) SB.act.assign(st.id, arg.variant, s.id);",
                {"set": set_name, "variant": variant, "ref": ref})

    def flip(self, set_name: str, variant: str, of: str, flip_x: bool = True, flip_y: bool = False) -> None:
        self.js("const st = SB.project.sets.find((s) => s.name === arg.set || s.id === arg.set); if (st) SB.act.setFlip(st.id, arg.variant, arg.of, arg.fx, arg.fy);",
                {"set": set_name, "variant": variant, "of": of, "fx": flip_x, "fy": flip_y})

    def find_mirrors(self, delete_duplicates: bool = True) -> int:
        return self.js("return SB.act.findMirrors(arg);", delete_duplicates)

    def delete_set(self, set_name: str) -> None:
        self.js("const st = SB.project.sets.find((s) => s.name === arg || s.id === arg); if (st) SB.act.deleteSet(st.id);", set_name)

    def rename_set(self, set_name: str, new_name: str) -> None:
        self.js("const st = SB.project.sets.find((s) => s.name === arg.a || s.id === arg.a); if (st) SB.act.patchSet(st.id, { name: arg.b }, 'Rename set');", {"a": set_name, "b": new_name})

    # ---------------------------------------------------------------- history / export
    def undo(self) -> None:
        self.js("SB.undo();")

    def fix_duplicate_names(self) -> list[str]:
        return self.js("const d = SB.duplicateNames(); SB.act.fixDuplicateNames(); return d;")

    def export_bundle(self, out_dir: str, texture_packer: bool = False, pngs: bool = False, bake: bool = False) -> list[str]:
        """Write the catalog JSON + sheet PNGs (+ optional extras) into `out_dir`."""
        files = self.js("const b = await SB.exp.bundle(arg); return b.files.map((f) => ({ name: f.name, data: btoa(Array.from(f.data, (c) => String.fromCharCode(c)).join('')) }));",
                        {"texturePacker": texture_packer, "pngs": pngs, "bake": bake})
        out = Path(out_dir)
        names = []
        for f in files:
            target = out / f["name"]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(base64.b64decode(f["data"]))
            names.append(f["name"])
        return names

    def catalog(self) -> dict:
        return self.js("return SB.exp.catalog();")

    def export_json(self) -> str:
        return json.dumps(self.catalog(), indent=2)
