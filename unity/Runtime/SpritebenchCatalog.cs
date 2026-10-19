using System;
using System.Collections.Generic;
using UnityEngine;

namespace Spritebench
{
    /// <summary>Free-form key/value pair (the "custom properties" of a sprite in the editor).</summary>
    [Serializable]
    public class SpritebenchProp
    {
        public string key;
        public string value;
    }

    /// <summary>One sliced sprite plus the metadata Spritebench stores about it.</summary>
    [Serializable]
    public class SpritebenchSprite
    {
        public string id;
        public string name;
        public string category;
        public Sprite sprite;
        /// <summary>Footprint on the ground, in game cells (columns x rows). The footprint is centered under the sprite's bottom edge.</summary>
        public Vector2Int footprint = Vector2Int.one;
        public bool solid;
        public string[] tags = new string[0];
        public SpritebenchProp[] props = new SpritebenchProp[0];

        public string Prop(string key, string fallback = null)
        {
            foreach (var p in props) if (p.key == key) return p.value;
            return fallback;
        }
        public bool HasTag(string tag) { return Array.IndexOf(tags, tag) >= 0; }
    }

    /// <summary>A variant of a set: either its own sprite or another variant of the same set flipped.</summary>
    [Serializable]
    public class SpritebenchVariant
    {
        public string name;
        /// <summary>Id of the sprite for this variant (empty when it is a flip of another variant).</summary>
        public string spriteId;
        /// <summary>Name of the variant this one is a flipped copy of (empty when it has its own sprite).</summary>
        public string flipOf;
        public bool flipX, flipY;
    }

    /// <summary>One object with several orientations/states (front, left, back, right...), possibly sharing art through flips.</summary>
    [Serializable]
    public class SpritebenchSet
    {
        public string id;
        public string name;
        public string category;
        public SpritebenchVariant[] variants = new SpritebenchVariant[0];

        public SpritebenchVariant Variant(string variantName)
        {
            foreach (var v in variants) if (v.name == variantName) return v;
            return null;
        }
    }

    /// <summary>
    /// The imported catalog: sprites + sets. Created by the Spritebench importer (Assets ▸ Spritebench ▸ Import catalog).
    /// </summary>
    [CreateAssetMenu(menuName = "Spritebench/Catalog", fileName = "SpritebenchCatalog")]
    public class SpritebenchCatalog : ScriptableObject
    {
        public int cell = 16;
        public int ppu = 16;
        public SpritebenchSprite[] sprites = new SpritebenchSprite[0];
        public SpritebenchSet[] sets = new SpritebenchSet[0];

        Dictionary<string, SpritebenchSprite> _byId, _byName;
        Dictionary<string, SpritebenchSet> _setByName;

        void Index()
        {
            if (_byId != null) return;
            _byId = new Dictionary<string, SpritebenchSprite>();
            _byName = new Dictionary<string, SpritebenchSprite>();
            _setByName = new Dictionary<string, SpritebenchSet>();
            foreach (var s in sprites) { _byId[s.id] = s; _byName[s.name] = s; }
            foreach (var st in sets) _setByName[st.name] = st;
        }
        void OnEnable() { _byId = null; }

        public SpritebenchSprite FindSprite(string nameOrId)
        {
            Index(); SpritebenchSprite s;
            return _byName.TryGetValue(nameOrId, out s) || _byId.TryGetValue(nameOrId, out s) ? s : null;
        }
        public SpritebenchSet FindSet(string name) { Index(); SpritebenchSet s; return _setByName.TryGetValue(name, out s) ? s : null; }

        /// <summary>Resolves a variant to the sprite to draw and the flips to apply (follows "flip of" links).</summary>
        public bool TryResolve(SpritebenchSet set, string variantName, out Sprite sprite, out bool flipX, out bool flipY)
        {
            Index(); sprite = null; flipX = flipY = false;
            for (int depth = 0; depth < 6; depth++)
            {
                var v = set.Variant(variantName);
                if (v == null) return false;
                if (!string.IsNullOrEmpty(v.spriteId))
                {
                    SpritebenchSprite s;
                    if (!_byId.TryGetValue(v.spriteId, out s)) return false;
                    sprite = s.sprite; return sprite != null;
                }
                if (string.IsNullOrEmpty(v.flipOf)) return false;
                flipX ^= v.flipX; flipY ^= v.flipY; variantName = v.flipOf;
            }
            return false;
        }

        /// <summary>The sprite entry (metadata) behind a variant, after following flips. Handy to read footprint/solid/props of a rotated piece.</summary>
        public SpritebenchSprite ResolveEntry(SpritebenchSet set, string variantName)
        {
            Index();
            for (int depth = 0; depth < 6; depth++)
            {
                var v = set.Variant(variantName); if (v == null) return null;
                if (!string.IsNullOrEmpty(v.spriteId)) { SpritebenchSprite s; return _byId.TryGetValue(v.spriteId, out s) ? s : null; }
                variantName = v.flipOf;
            }
            return null;
        }

        /// <summary>Names of the variants that can actually be drawn, in the set's order (the "turn" cycle).</summary>
        public List<string> DrawableVariants(SpritebenchSet set)
        {
            var list = new List<string>(); Sprite sp; bool fx, fy;
            foreach (var v in set.variants) if (TryResolve(set, v.name, out sp, out fx, out fy)) list.Add(v.name);
            return list;
        }

        /// <summary>Next variant in the turn cycle (step = +1 clockwise, -1 back).</summary>
        public string NextVariant(SpritebenchSet set, string current, int step = 1)
        {
            var list = DrawableVariants(set); if (list.Count == 0) return current;
            int i = list.IndexOf(current); if (i < 0) i = 0; else i = ((i + step) % list.Count + list.Count) % list.Count;
            return list[i];
        }

        /// <summary>Draws a variant on a SpriteRenderer (sets the sprite and flipX/flipY). Returns false if it could not be resolved.</summary>
        public bool Apply(SpriteRenderer renderer, SpritebenchSet set, string variantName)
        {
            Sprite sp; bool fx, fy;
            if (!TryResolve(set, variantName, out sp, out fx, out fy)) return false;
            renderer.sprite = sp; renderer.flipX = fx; renderer.flipY = fy; return true;
        }

        /// <summary>Footprint size in world units (cols * cell / ppu).</summary>
        public Vector2 FootprintWorldSize(SpritebenchSprite s) { return new Vector2(s.footprint.x * cell / (float)ppu, s.footprint.y * cell / (float)ppu); }
    }
}
