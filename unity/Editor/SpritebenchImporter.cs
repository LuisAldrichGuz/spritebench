using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.U2D.Sprites;
using UnityEngine;

namespace Spritebench.Editor
{
    /// <summary>
    /// Imports a Spritebench catalog (*.catalog.json): slices every sheet PNG next to it (names, rects, pivots) and
    /// creates/updates a <see cref="SpritebenchCatalog"/> asset with the sets, flips, footprints and properties.
    /// Select the .catalog.json in the Project window and use  Assets ▸ Spritebench ▸ Import catalog.
    /// It is idempotent: re-importing keeps the sprite GUIDs (by name), so references in prefabs and scenes survive.
    /// </summary>
    public static class SpritebenchImporter
    {
        // ---- JSON shape (see docs/FORMAT.md) ----
        [Serializable] class RectJ { public int x, y, w, h; }
        [Serializable] class PivotJ { public float x, y; }
        [Serializable] class FootJ { public int cols = 1, rows = 1; }
        [Serializable] class PropJ { public string key, value; }
        [Serializable] class SheetJ { public string id, name, file; public int width, height; }
        [Serializable] class SpriteJ { public string id, name, sheet, category; public RectJ rect; public PivotJ pivot; public FootJ footprint; public bool solid; public string[] tags; public PropJ[] props; }
        [Serializable] class VariantJ { public string name, sprite, flipOf; public bool flipX, flipY; }
        [Serializable] class SetJ { public string id, name, category; public VariantJ[] variants; }
        [Serializable] class CatalogJ { public string format, name; public int version, cell, ppu; public SheetJ[] sheets; public SpriteJ[] sprites; public SetJ[] sets; }

        const string MenuPath = "Assets/Spritebench/Import catalog";

        [MenuItem(MenuPath, true)]
        static bool CanImport()
        {
            return Selection.objects.Any(o => IsCatalog(AssetDatabase.GetAssetPath(o)));
        }

        [MenuItem(MenuPath)]
        static void ImportSelected()
        {
            foreach (var o in Selection.objects)
            {
                var p = AssetDatabase.GetAssetPath(o);
                if (IsCatalog(p)) Import(p);
            }
        }

        static bool IsCatalog(string path) { return !string.IsNullOrEmpty(path) && path.EndsWith(".catalog.json", StringComparison.OrdinalIgnoreCase); }

        /// <summary>Imports one catalog. Returns the created/updated asset (or null on failure).</summary>
        public static SpritebenchCatalog Import(string jsonPath)
        {
            CatalogJ cat;
            try { cat = JsonUtility.FromJson<CatalogJ>(File.ReadAllText(jsonPath)); }
            catch (Exception e) { Debug.LogError("[Spritebench] Could not read " + jsonPath + ": " + e.Message); return null; }
            if (cat == null || cat.format != "spritebench") { Debug.LogError("[Spritebench] " + jsonPath + " is not a Spritebench catalog."); return null; }

            string dir = Path.GetDirectoryName(jsonPath).Replace('\\', '/');
            var sheetPath = new Dictionary<string, string>();
            foreach (var sh in cat.sheets)
            {
                string tex = dir + "/" + sh.file;
                if (!File.Exists(tex)) { Debug.LogWarning("[Spritebench] Missing sheet image: " + tex); continue; }
                AssetDatabase.ImportAsset(tex, ImportAssetOptions.ForceUpdate);
                SliceSheet(tex, sh, cat);
                sheetPath[sh.id] = tex;
            }

            // ---- ScriptableObject ----
            string assetPath = dir + "/" + SafeName(string.IsNullOrEmpty(cat.name) ? Path.GetFileNameWithoutExtension(jsonPath) : cat.name) + ".asset";
            var asset = AssetDatabase.LoadAssetAtPath<SpritebenchCatalog>(assetPath);
            if (asset == null) { asset = ScriptableObject.CreateInstance<SpritebenchCatalog>(); AssetDatabase.CreateAsset(asset, assetPath); }

            var byName = new Dictionary<string, Sprite>();
            foreach (var path in sheetPath.Values)
                foreach (var sp in AssetDatabase.LoadAllAssetsAtPath(path).OfType<Sprite>()) byName[sp.name] = sp;

            asset.cell = Mathf.Max(1, cat.cell); asset.ppu = Mathf.Max(1, cat.ppu);
            asset.sprites = cat.sprites.Select(s =>
            {
                Sprite sp; byName.TryGetValue(s.name, out sp);
                return new SpritebenchSprite
                {
                    id = s.id, name = s.name, category = s.category, sprite = sp,
                    footprint = new Vector2Int(Mathf.Max(1, s.footprint == null ? 1 : s.footprint.cols), Mathf.Max(1, s.footprint == null ? 1 : s.footprint.rows)),
                    solid = s.solid, tags = s.tags ?? new string[0],
                    props = (s.props ?? new PropJ[0]).Select(p => new SpritebenchProp { key = p.key, value = p.value }).ToArray(),
                };
            }).ToArray();
            asset.sets = (cat.sets ?? new SetJ[0]).Select(st => new SpritebenchSet
            {
                id = st.id, name = st.name, category = st.category,
                variants = st.variants.Select(v => new SpritebenchVariant { name = v.name, spriteId = v.sprite, flipOf = v.flipOf, flipX = v.flipX, flipY = v.flipY }).ToArray(),
            }).ToArray();

            EditorUtility.SetDirty(asset);
            AssetDatabase.SaveAssets();
            Debug.Log("[Spritebench] Imported " + asset.sprites.Length + " sprites and " + asset.sets.Length + " sets → " + assetPath, asset);
            return asset;
        }

        static void SliceSheet(string texPath, SheetJ sheet, CatalogJ cat)
        {
            var ti = AssetImporter.GetAtPath(texPath) as TextureImporter;
            if (ti == null) return;
            ti.textureType = TextureImporterType.Sprite;
            ti.spriteImportMode = SpriteImportMode.Multiple;
            ti.spritePixelsPerUnit = Mathf.Max(1, cat.ppu);
            ti.filterMode = FilterMode.Point;
            ti.textureCompression = TextureImporterCompression.Uncompressed;
            ti.mipmapEnabled = false;
            ti.alphaIsTransparency = true;
            ti.npotScale = TextureImporterNPOTScale.None;   // never resample pixel art
            ti.SaveAndReimport();

            var factory = new SpriteDataProviderFactories();
            factory.Init();
            var provider = factory.GetSpriteEditorDataProviderFromObject(ti);
            provider.InitSpriteEditorDataProvider();

            var existing = provider.GetSpriteRects().ToDictionary(r => r.name, r => r);
            var rects = new List<SpriteRect>();
            foreach (var s in cat.sprites.Where(x => x.sheet == sheet.id))
            {
                SpriteRect sr;
                if (!existing.TryGetValue(s.name, out sr)) sr = new SpriteRect { name = s.name, spriteID = GUID.Generate() };
                // Spritebench uses a top-left origin; Unity's texture space starts at the bottom-left.
                sr.rect = new Rect(s.rect.x, sheet.height - s.rect.y - s.rect.h, s.rect.w, s.rect.h);
                sr.alignment = SpriteAlignment.Custom;
                sr.pivot = new Vector2(s.pivot == null ? 0.5f : s.pivot.x, s.pivot == null ? 0f : s.pivot.y);
                sr.border = Vector4.zero;
                rects.Add(sr);
            }
            provider.SetSpriteRects(rects.ToArray());

            // keep the sprite ids stable across re-imports (so existing references do not break)
            var nameIds = provider.GetDataProvider<ISpriteNameFileIdDataProvider>();
            if (nameIds != null) nameIds.SetNameFileIdPairs(rects.Select(r => new SpriteNameFileIdPair(r.name, r.spriteID)).ToList());

            provider.Apply();
            ti.SaveAndReimport();
        }

        static string SafeName(string s)
        {
            foreach (var c in Path.GetInvalidFileNameChars()) s = s.Replace(c, '_');
            return s;
        }
    }

    /// <summary>Re-imports a catalog automatically when its .catalog.json changes (e.g. you re-export from Spritebench over the same folder).</summary>
    class SpritebenchPostprocessor : AssetPostprocessor
    {
        const string AutoKey = "Spritebench.AutoImport";

        [MenuItem("Assets/Spritebench/Auto-import on change")]
        static void ToggleAuto() { EditorPrefs.SetBool(AutoKey, !EditorPrefs.GetBool(AutoKey, true)); }

        [MenuItem("Assets/Spritebench/Auto-import on change", true)]
        static bool ToggleAutoChecked() { Menu.SetChecked("Assets/Spritebench/Auto-import on change", EditorPrefs.GetBool(AutoKey, true)); return true; }

        static void OnPostprocessAllAssets(string[] imported, string[] deleted, string[] moved, string[] movedFrom)
        {
            if (!EditorPrefs.GetBool(AutoKey, true)) return;
            var catalogs = imported.Where(p => p.EndsWith(".catalog.json", StringComparison.OrdinalIgnoreCase)).ToArray();
            if (catalogs.Length == 0) return;
            // import after this postprocess pass (the sheet images may arrive in the same batch)
            EditorApplication.delayCall += () => { foreach (var p in catalogs) SpritebenchImporter.Import(p); };
        }
    }
}
