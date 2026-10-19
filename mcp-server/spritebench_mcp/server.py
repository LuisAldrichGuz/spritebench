"""
Spritebench MCP server — lets an AI agent (Claude Code, Claude Desktop, …) slice, review and catalog sprite sheets
with the real Spritebench editor running in a headless browser.

Run:  python -m spritebench_mcp        (stdio transport)

The agent loop that works best:  open_sheet → auto_slice → screenshot (LOOK at it) → fix (delete/merge/split/add_rect/wand)
→ group sprites into sets (group / flip / find_mirrors) → sets_sheet (verify) → export.
"""
from __future__ import annotations

import json
from typing import Any

try:  # MCP SDK v2
    from mcp.server.mcpserver import Image, MCPServer as _Server
except ImportError:  # MCP SDK v1
    from mcp.server.fastmcp import FastMCP as _Server, Image  # type: ignore

from .bench import Bench

mcp = _Server("spritebench")
_bench: Bench | None = None


def B() -> Bench:
    global _bench
    if _bench is None or _bench.page is None:
        _bench = Bench().start()
    return _bench


def _j(x: Any) -> str:
    return json.dumps(x, ensure_ascii=False)


# ------------------------------------------------------------------ project & sheets
@mcp.tool()
def open_sheet(path: str, cell: int = 16) -> str:
    """Load a sprite sheet image (PNG/JPG/WebP) into Spritebench. `cell` = your game's grid cell in px (footprints are measured in cells)."""
    b = B()
    b.set_cell(cell)
    return _j(b.open_sheet(path))


@mcp.tool()
def state() -> str:
    """Summary: active sheet, sprite/set counts, loose sprites, GIANTS (suspiciously big boxes, usually badly cut) and duplicate names."""
    return _j(B().summary())


@mcp.tool()
def list_sprites(limit: int = 200, only_loose: bool = False, min_size: int = 0) -> str:
    """List sprites of the active sheet: index, id, name, rect, footprint (fc×fr cells), solid, set:variant. Indexes are what screenshots show."""
    rows = B().list_sprites()
    if only_loose:
        rows = [r for r in rows if not r["set"]]
    if min_size:
        rows = [r for r in rows if r["w"] >= min_size or r["h"] >= min_size]
    return _j(rows[:limit])


@mcp.tool()
def list_sets() -> str:
    """List sets (objects with variants front/left/back/right…); each variant is a sprite index or a flip of another variant."""
    return _j(B().list_sets())


# ------------------------------------------------------------------ seeing
@mcp.tool()
def screenshot(x: int = 0, y: int = 0, w: int = 0, h: int = 0, scale: int = 0, labels: bool = True) -> Image:
    """Annotated PNG of a sheet region. Boxes are numbered by sprite index; green = loose, coloured = belongs to a set, ORANGE = giant (>96 px).
    Zoom into suspicious areas (small w/h, scale 6-10) before deciding. w/h = 0 means the whole sheet; scale 0 = automatic."""
    png = B().screenshot(x, y, w or None, h or None, scale or None, labels)
    return Image(data=png, format="png")


@mcp.tool()
def sets_sheet(start: int = 0, limit: int = 24, scale: int = 3, cols: int = 3) -> Image:
    """Contact sheet of sets: each variant (F/L/B/R) drawn as the game will show it, flips applied (↔). Use it to verify groupings."""
    return Image(data=B().sets_sheet(None, start, limit, scale, cols), format="png")


# ------------------------------------------------------------------ slicing
@mcp.tool()
def auto_slice(gap: int = 0, min_area: int = 6, replace: bool = True) -> str:
    """Cut every object separated by transparency. gap>0 joins pieces closer than N px (use 2-3 when objects come out in fragments)."""
    n = B().auto_slice(gap, min_area, replace)
    return _j({"created": n, **B().summary()})


@mcp.tool()
def grid_slice(cw: int, ch: int, x: int = 0, y: int = 0, w: int = 0, h: int = 0, trim: bool = True, skip_empty: bool = True, replace: bool = False) -> str:
    """Cut a region (or the whole sheet) into cw×ch cells; each cell is trimmed to its artwork. Best for sheets with a regular grid or for
    splitting giant boxes whose pieces touch (delete the giant first, then grid_slice its region)."""
    region = [x, y, x + w, y + h] if w and h else None
    return _j({"created": B().grid_slice(cw, ch, 0, 0, 0, 0, trim, skip_empty, region, replace)})


@mcp.tool()
def add_rect(x0: int, y0: int, x1: int, y1: int, trim: bool = True) -> str:
    """Add a sprite from a pixel rectangle (top-left origin). trim=True shrinks it to the opaque pixels. Returns the new sprite index."""
    return _j({"index": B().add_rect(x0, y0, x1, y1, trim)})


@mcp.tool()
def wand(x: int, y: int, gap: int = 0) -> str:
    """Add the opaque object under pixel (x, y) as a sprite. gap>0 also joins nearby pieces."""
    return _j({"index": B().wand(x, y, gap)})


@mcp.tool()
def delete_sprites(refs: list[int | str]) -> str:
    """Delete sprites (indexes, ids or names). Indexes shift afterwards: list again."""
    B().delete(refs)
    return _j(B().summary())


@mcp.tool()
def trim_sprites(refs: list[int | str] | None = None) -> str:
    """Shrink boxes to their opaque pixels (all sprites if refs omitted)."""
    B().trim(refs)
    return _j(B().summary())


@mcp.tool()
def merge_sprites(refs: list[int | str]) -> str:
    """Merge several boxes into one (their union)."""
    B().merge(refs)
    return _j(B().summary())


@mcp.tool()
def split_sprite(ref: int | str, cols: int, rows: int = 1, trim: bool = True) -> str:
    """Split one sprite into a cols×rows grid (e.g. two touching halves → cols=2)."""
    B().split(ref, cols, rows, trim)
    return _j(B().summary())


@mcp.tool()
def set_rect(ref: int | str, x0: int, y0: int, x1: int, y1: int) -> str:
    """Move/resize a sprite box to an exact rectangle."""
    B().set_rect(ref, x0, y0, x1, y1)
    return "ok"


# ------------------------------------------------------------------ describing
@mcp.tool()
def describe_sprites(refs: list[int | str], footprint_cols: int | None = None, footprint_rows: int | None = None, solid: bool | None = None,
                     category: str | None = None, pivot_x: float | None = None, pivot_y: float | None = None, name: str | None = None,
                     tags: list[str] | None = None, props: dict[str, str] | None = None) -> str:
    """Set metadata on sprites: footprint (cells on the ground), solid, category, pivot (0-1, origin bottom-left), name, tags, custom props."""
    f: dict[str, Any] = {}
    if footprint_cols is not None:
        f["fc"] = footprint_cols
    if footprint_rows is not None:
        f["fr"] = footprint_rows
    for k, v in (("solid", solid), ("category", category), ("name", name), ("tags", tags), ("props", props)):
        if v is not None:
            f[k] = v
    if pivot_x is not None or pivot_y is not None:
        f["pivot"] = [0.5 if pivot_x is None else pivot_x, 0.0 if pivot_y is None else pivot_y]
    B().patch(refs, **f)
    return "ok"


# ------------------------------------------------------------------ sets
@mcp.tool()
def group(refs: list[int | str], variants: list[str] | None = None, name: str | None = None) -> str:
    """Group sprites into ONE set. They are assigned to `variants` in order (default front, left, back, right). Name must be unique."""
    return _j(B().group(refs, variants, name))


@mcp.tool()
def flip_variant(set_name: str, variant: str, of: str, flip_x: bool = True, flip_y: bool = False) -> str:
    """Make `variant` a flipped copy of another variant of the set (no art of its own). Use when right = left mirrored."""
    B().flip(set_name, variant, of, flip_x, flip_y)
    return "ok"


@mcp.tool()
def assign_variant(set_name: str, variant: str, ref: int | str) -> str:
    """Put a sprite into a set variant."""
    B().assign(set_name, variant, ref)
    return "ok"


@mcp.tool()
def find_mirrors(delete_duplicates: bool = True) -> str:
    """Detect loose sprites that are the EXACT mirror of another and create left/right sets with a flip (optionally deleting the duplicate)."""
    return _j({"sets_created": B().find_mirrors(delete_duplicates)})


@mcp.tool()
def delete_set(set_name: str) -> str:
    """Ungroup a set (sprites stay as loose sprites)."""
    B().delete_set(set_name)
    return "ok"


@mcp.tool()
def rename_set(set_name: str, new_name: str) -> str:
    """Rename a set."""
    B().rename_set(set_name, new_name)
    return "ok"


@mcp.tool()
def undo() -> str:
    """Undo the last edit."""
    B().undo()
    return _j(B().summary())


# ------------------------------------------------------------------ files
@mcp.tool()
def export_bundle(out_dir: str, texture_packer: bool = False, pngs: bool = False, bake_flips: bool = False) -> str:
    """Write <project>.catalog.json + sheet PNG(s) (+ optional TexturePacker atlas, one PNG per sprite, flips baked) into out_dir.
    Unity: put them under Assets/ and use Assets ▸ Spritebench ▸ Import catalog."""
    return _j(B().export_bundle(out_dir, texture_packer, pngs, bake_flips))


@mcp.tool()
def save_project(path: str) -> str:
    """Save the editor project (.spritebench) so a human can reopen and retouch it in the app."""
    return B().save_project(path)


@mcp.tool()
def load_project(path: str) -> str:
    """Open a .spritebench project file."""
    return _j(B().load_project(path))


@mcp.tool()
def fix_duplicate_names() -> str:
    """Make sprite names unique (_2, _3…). Engines identify sprites by name."""
    return _j(B().fix_duplicate_names())


@mcp.tool()
def run_js(code: str) -> str:
    """Escape hatch: run JavaScript in the page (async function body; `SB` is the whole app API; return a JSON-able value)."""
    return _j(B().js(code))


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
