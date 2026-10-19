# Using Spritebench with Unity

Tested with Unity 6 (6000.x); needs the **2D Sprite** package (`com.unity.2d.sprite`, installed by default in 2D templates and pulled in as a dependency).

## 1. Install the package

*Window ▸ Package Manager ▸ + ▸ Add package from git URL…*

```
https://github.com/LuisAldrichGuz/spritebench.git?path=/unity
```

(or copy the `unity/` folder into your project's `Packages/` folder).

## 2. Export from Spritebench into `Assets/`

*File ▸ Export to folder…* and choose e.g. `Assets/Sprites/Furniture` (Chrome/Edge), or export the `.zip` and unpack it there. You get:

```
Furniture.catalog.json
couches.png
```

## 3. Import the catalog

Select `Furniture.catalog.json` in the Project window → **Assets ▸ Spritebench ▸ Import catalog**.

The importer:

* sets each sheet PNG to *Sprite (2D and UI) · Multiple · Point · Uncompressed · no mipmaps · NPOT None*,
* slices it with **your names, rects and pivots**,
* keeps the sprite GUIDs stable on every re-import (matched by name), so prefabs and scenes keep working,
* creates/updates `Furniture.asset` — a `SpritebenchCatalog` ScriptableObject with every sprite, set, flip, footprint and property.

Tick **Assets ▸ Spritebench ▸ Auto-import on change** to re-import automatically whenever you re-export over the same folder.

## 4. Use it in code

```csharp
using Spritebench;

public class Chair : MonoBehaviour
{
    public SpritebenchCatalog catalog;      // the .asset the importer created
    public string setName = "Chair wood";
    string variant = "front";
    SpriteRenderer sr;
    SpritebenchSet set;

    void Awake()
    {
        sr  = GetComponent<SpriteRenderer>();
        set = catalog.FindSet(setName);
        catalog.Apply(sr, set, variant);                 // sets sprite + flipX/flipY
    }

    public void Rotate()
    {
        variant = catalog.NextVariant(set, variant);     // front → left → back → right → …
        catalog.Apply(sr, set, variant);

        var entry = catalog.ResolveEntry(set, variant);  // metadata of the art being shown
        Vector2Int cells = entry.footprint;              // ground cells it occupies
        bool solid       = entry.solid;
        string price     = entry.Prop("price", "0");
    }
}
```

Or just drop the **`SpritebenchFacing`** component on a `SpriteRenderer`, pick the catalog and the set name, and call `Turn()` from a button.

### API summary

| Member | What it does |
|---|---|
| `catalog.FindSprite(nameOrId)` / `FindSet(name)` | Lookup (dictionary-backed) |
| `catalog.TryResolve(set, variant, out sprite, out flipX, out flipY)` | Sprite + flips for a variant, following `flipOf` chains |
| `catalog.Apply(spriteRenderer, set, variant)` | Draws it (sprite + `flipX`/`flipY`) |
| `catalog.NextVariant(set, current, step)` | Turn cycle over the variants that can be drawn |
| `catalog.ResolveEntry(set, variant)` | `SpritebenchSprite` behind a variant (footprint, solid, tags, props) |
| `catalog.FootprintWorldSize(entry)` | Footprint in world units (`cols * cell / ppu`) |

### Flipped variants and colliders

`SpriteRenderer.flipX` mirrors the art around the sprite's pivot. If you build colliders from the footprint (it is centred under the sprite) mirroring needs no change. If you use a custom collider offset, negate its X when `flipX` is true.

## Troubleshooting

* *“Missing sheet image”* — keep the PNG next to the `.catalog.json` (the exporter writes both together).
* *Sprites look blurry* — the importer already sets Point filtering and NPOT *None*; also check your render pipeline's **Render Scale** is 1 and the camera is pixel-perfect.
* *Rects look off by a few rows* — never edit the PNG after exporting without re-exporting the catalog; the importer trusts the `height` stored in the JSON.
