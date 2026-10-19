# Spritebench — user guide

Everything below is reachable from three places, so use whichever you prefer: the **menu bar**, the **right-click menus**, or the **command palette** (`Ctrl+K`, type a few letters of any command).

## The window

```
┌ Menu bar ───────────────────────────────────────────────  [ Search command… Ctrl K ] ┐
│ Options bar (changes with the active tool; X/Y/W/H of the selection; undo/redo)        │
├────┬───────────────────────────────────────────────────────────┬──────────────────────┤
│Tool│ Sheet tabs                                                 │ ▸ Sprites            │
│bar │ ┌──────────────── canvas ─────────────────┐                │ ▸ Properties         │
│    │ │  sprite sheet with boxes, grid, pivots  │                │ ▸ Sets               │
│    │ └─────────────────────────────────────────┘                │ ▸ History            │
├────┴───────────────────────────────────────────────────────────┴──────────────────────┤
│ Status bar: hint · counts · cursor pixel · sheet size · cell size · zoom               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Tabs** — one per sheet. Right-click a tab to rename or close it. A project can hold several sheets.
* **Canvas colours** — green box = loose sprite, coloured box = belongs to a set (the label shows `set·variant`), blue = selected, yellow dot = pivot, cyan/red area = ground footprint (red when solid).
* **Panels** — click a header to collapse. *History* is collapsed by default.

## 1. Load a sheet

Drag a PNG/JPG/WebP onto the window, **File ▸ Open sprite sheet…** (`Ctrl+O`), or **File ▸ Load example sheet**. Pixel art is always drawn with nearest-neighbour filtering.

Set your game's grid in **File ▸ Project settings…**: *cell size* (e.g. 16 px — footprints are measured in these cells) and *pixels per unit*.

## 2. Slice

| Tool | How |
|---|---|
| **Auto-slice** (`Alt+S`) | Every object separated by transparency becomes a sprite. *Join pieces closer than N px* fixes objects that come out in fragments. |
| **Slice by grid** (`Shift+G`) | For regular sheets: cell size, offset, spacing, *trim each cell*, *skip empty cells*. |
| **Magic wand** (`W`) | Click an object. The *join pieces* option is in the options bar. Right-click on empty canvas ▸ *Create sprite here*. |
| **Rectangle** (`M`) | Drag a box. *Fit to artwork* shrinks it to the opaque pixels; *Snap to cells* aligns to your grid. |
| **Select** (`V`) | Click / `Shift`-click / drag a marquee. Drag to move, drag the 8 handles to resize, arrows to nudge. |

Fixing mistakes: **Trim to artwork** (`T`), **Merge** (`G`, joins the selection into one box), **Split into grid…** (`Shift+S`, e.g. 3×1 to cut a strip), **Delete**, **Duplicate** (`Ctrl+D`). Everything is undoable (`Ctrl+Z`, and the *History* panel lets you jump back).

## 3. Describe each sprite (Properties panel)

* **Name** — also what the export calls the sprite. *Edit ▸ Bulk rename…* supports patterns like `chair_{n:3}`.
* **X / Y / W / H** — exact pixel rectangle.
* **Occupies on the ground (cells)** — width × depth in game cells. The preview underneath draws your grid, the footprint (cyan; red if solid) and the sprite standing on it with its pivot (yellow). The footprint is centred under the sprite's bottom edge.
* **Solid** — blocks movement (your game decides what to do with it).
* **Category** — free text list (`object`, `rug`, `wall`… add your own with *+ New category…*).
* **Pivot** — 3×3 widget or exact X/Y (0–1, origin bottom-left like Unity).
* **Tags** and **custom properties** — exported verbatim (price, room type, anything).

Select several sprites to edit them together (fields that differ show `—`).

## 4. Sets: one object, several views

A **set** is *one* object with named **variants** (front, left, back, right by default; presets for 2 and 8 directions and for states; add your own).

**Create** — select the sprites that belong together and press `K` (*Group into set*): they are assigned left-to-right. Or **Set ▸ New empty set…** and fill the slots.

**Fill a slot** — select a sprite on the canvas and press **← selection** on the slot. Click a slot thumbnail to jump to its sprite.

**Flips** — for a side you didn't draw, choose **“flip of…”** on the slot and pick the variant it mirrors. Two toggles appear: **↔** (horizontal) and **↕** (vertical). The slot thumbnail shows the flipped result; the *Turn* strip at the bottom of the card shows the whole rotation cycle in the order your game will step through it.

**Mirror finder** — *Set ▸ Find mirrors and create flips* compares every loose sprite with the others of the same size; exact mirrors become `left` + `right (flip of left)` and the duplicate is removed (optional).

Right-click a slot: *Use selection here*, *Clear*, *Remove this variant*. Right-click a sprite ▸ **Set ▸ …** to push it into any existing set variant.

## 5. Check your work

* **Sprites panel** — search, filter (*Loose* shows what you haven't grouped yet, *Giants* flags sprites over 96 px that are probably badly cut), `L` selects all loose sprites, double-click focuses the sprite on the canvas.
* **View ▸** toggles the cell grid, pixel grid (at high zoom), footprints, set labels and the checkerboard.

## 6. Export

**File ▸ Export bundle (.zip)…** (`Ctrl+E`) or **Export to folder…** (`Ctrl+Shift+E`, Chrome/Edge — pick your Unity `Assets/Sprites` folder and you're done).

| Always | Optional |
|---|---|
| `<project>.catalog.json` (sprites, sets, flips, footprints, props — see [FORMAT.md](FORMAT.md)) and the sheet PNG(s) | TexturePacker-style `*.atlas.json` per sheet · one PNG per sprite · flips baked into PNGs for engines without flip support |

Save your work with **File ▸ Save project** (`Ctrl+S`, a `.spritebench` file you can reopen later). Spritebench also keeps an automatic copy in your browser.

## Shortcuts

Press `F1` inside the app for the live list. The most useful: `V M W H Z` tools · `T` trim · `G` merge · `K` group · `L` loose · `F` focus · `Ctrl+D` duplicate · `Del` delete · `F2` rename · `Ctrl+A` / `Ctrl+I` select all / invert · `0` fit · `1` 100 % · `4` 400 % · `Ctrl+K` command palette.

## Tips

* Cut first, group later: do *Auto-slice*, filter by **Giants**, fix those, then group.
* If a lamp or chair comes out in two pieces, undo and use **Join pieces closer than 2–3 px**, or select the two boxes and press `G`.
* Pixel-perfect pivots: use `bottom center` for things that stand on the floor, `center` for items that rotate.
* Re-exporting over the same folder keeps your Unity references alive — the importer matches sprites by **name**, so keep names stable.
