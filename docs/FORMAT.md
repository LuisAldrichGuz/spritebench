# Catalog format (`*.catalog.json`)

Plain JSON, UTF-8. Coordinates are in **pixels of the sheet, origin top-left**; pivots are **normalised, origin bottom-left** (Unity convention). `format: "spritebench"`, `version: 1`.

```jsonc
{
  "format": "spritebench",
  "version": 1,
  "name": "Furniture",              // project name
  "cell": 16,                       // your game's grid cell, in px
  "ppu": 16,                        // pixels per unit
  "categories": ["object", "rug", "wall"],

  "sheets": [
    { "id": "shab12", "name": "couches.png", "file": "couches.png", "width": 960, "height": 496 }
  ],

  "sprites": [
    {
      "id": "s7k2m9",               // stable id (used by sets)
      "name": "couch_red_front",    // unique name (Unity matches sprites by it)
      "sheet": "shab12",
      "rect": { "x": 65, "y": 14, "w": 47, "h": 18 },
      "pivot": { "x": 0.5, "y": 0 },
      "category": "object",
      "footprint": { "cols": 3, "rows": 1 },   // ground cells; centred under the bottom edge
      "solid": true,
      "tags": ["red", "couch"],
      "props": [ { "key": "price", "value": "120" } ]
    }
  ],

  "sets": [
    {
      "id": "set9x1q2",
      "name": "Couch red",
      "category": "object",
      "variants": [
        { "name": "front", "sprite": "s7k2m9" },
        { "name": "left",  "sprite": "s3f8aa" },
        { "name": "right", "flipOf": "left", "flipX": true, "flipY": false },   // no sprite of its own
        { "name": "back" }                                                      // empty slot
      ]
    }
  ]
}
```

## Rules

* A variant has **either** `sprite` (its own art), **or** `flipOf` (+ `flipX`/`flipY`), **or** neither (empty slot, ignore it).
* `flipOf` points to another variant **of the same set** (by name) and may chain; resolve with a depth limit.
* The variant order **is the turn cycle** (front → left → back → right → front …). Skip empty/unresolvable variants when cycling.
* `rect.y` is measured from the **top** of the sheet. In engines with a bottom-left origin use `sheetHeight - y - h`.
* The footprint is `cols × rows` cells of `cell` px, centred horizontally under the sprite and sitting on its bottom edge. A flipped variant keeps the footprint of its source.
* Names are not guaranteed to be valid file names; the exporter sanitises PNG file names (`sprites/<name>.png`).

## Atlas JSON (optional)

`*.atlas.json` follows TexturePacker's "JSON hash" layout (`frames`, `meta`), one file per sheet, with a `pivot` per frame (**top-left origin**, as that format expects). It works with Phaser, PixiJS, libGDX and Godot importers that read that format.

## Project file (`*.spritebench`)

The editor's own save format (includes the sheet images as data URLs and the sets). It is JSON too, but its shape may change between versions — use the catalog for engine imports.
