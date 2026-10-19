---
name: spritebench
description: Slice, review and catalog sprite sheets with Spritebench (real editor in a headless browser, driven through its MCP server or the Python Bench class). Use when asked to cut sprites out of a sheet, fix badly cut/giant boxes, group sprites into sets (front/left/back/right), link flipped variants, set grid footprints/pivots, or export a catalog for Unity and other engines.
---

# Spritebench — recut sprite sheets by LOOKING at them

Spritebench cuts, groups and catalogs sprites. You drive the same editor a human uses, and you can **see** the result with annotated screenshots. Never trust a slice you have not looked at.

## Tools (MCP server `spritebench`) or Python (`from spritebench_mcp.bench import Bench`)
`open_sheet → auto_slice → screenshot → fix → group/flip → sets_sheet → export_bundle`. Full list: see `mcp-server/README.md`. Sprites are addressed by **index** (the number printed on screenshots), id or name; indexes shift after deletes/merges, so call `list_sprites` again.

## The loop that works
1. `open_sheet(path, cell=<game grid px>)` then `auto_slice()`. Read `state()`: `giants` lists suspicious boxes (>96 px), `loose` how many sprites are ungrouped.
2. **Look at the whole sheet** (`screenshot()` scale 2). Then zoom (`screenshot(x,y,w,h,scale=8)`) into every region you do not understand. Work out the sheet's STRUCTURE before touching anything — sheets are almost always regular (grids of colour variants, groups of 4 views, stacked pieces).
3. Fix giants/fragments (recipes below), re-screenshot.
4. Group: `group(refs, ["front","left","back","right"], name)`. If right is the exact mirror of left use `flip_variant` (or `find_mirrors`) — no duplicate art.
5. Verify with `sets_sheet()` (every variant drawn as the game will show it, flips applied). Fix and repeat.
6. `describe_sprites`: footprint cells, solid, pivot (bottom-center for things standing on the floor).
7. `export_bundle(out_dir)` and/or `save_project(path)`.

## Recipes (learned on real furniture sheets)
* **Giant box = pieces that touch.** Delete it, then `grid_slice(cw, ch, x,y,w,h)` over its region if the pieces sit on a regular grid (cells of 16/32 px), or `add_rect` per piece, or `split_sprite(ref, cols, rows)`.
* **Pieces stacked vertically** (a table on top of another): find the seam row where the opaque width jumps after thin legs (`run_js` counting opaque pixels per row), then add two rects. Seams repeat across colour columns — measure once.
* **Groups of N consecutive sprites per colour** (e.g. 7 pieces, or 4 views): chunk the reading-order list (`list_sprites`) and verify the chunk shape (widths/heights, mirror pairs) before grouping.
* **Left/right pairs** are usually exact mirrors → `flip_variant`. Check with `sets_sheet` (the `↔` mark appears on flipped variants).
* **Thin fragments / crumbs** (legs, arms, 2-px lines to the side) are not furniture: `delete_sprites`. Say so in your report instead of guessing.
* **Joined duplicates** (two armchairs side by side) → `split_sprite(ref, 2)`.
* **Do not add what you cannot cut cleanly.** List the uncertain ones for the human.

## Footprint / pivot defaults
Footprint cols = ceil(width/cell); rows ≈ ceil(0.6·height/cell) for things standing on the floor (rugs: full height). A side view that is taller than wide naturally gets rows=2. Pivot = bottom center (0.5, 0).

## Output
Report: what the sheet structure is, how many sprites/sets, which flips, what you dropped and why, and the paths of the project/catalog files.
