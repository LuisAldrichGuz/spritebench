using UnityEngine;

namespace Spritebench
{
    /// <summary>
    /// Minimal example of using a set at runtime: put it next to a SpriteRenderer, pick the catalog and the set name,
    /// then call <see cref="Turn"/> (for example from a UI button or a build-mode "rotate" action).
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public class SpritebenchFacing : MonoBehaviour
    {
        public SpritebenchCatalog catalog;
        public string setName;
        public string variant = "front";

        SpriteRenderer _renderer;
        SpritebenchSet _set;

        void Awake() { _renderer = GetComponent<SpriteRenderer>(); Refresh(); }
        void OnValidate() { if (_renderer == null) _renderer = GetComponent<SpriteRenderer>(); Refresh(); }

        public void Refresh()
        {
            if (catalog == null || string.IsNullOrEmpty(setName)) return;
            _set = catalog.FindSet(setName);
            if (_set != null) catalog.Apply(_renderer, _set, variant);
        }

        /// <summary>Rotates to the next drawable variant (front -> left -> back -> right...). Returns the new variant name.</summary>
        public string Turn(int step = 1)
        {
            if (_set == null) Refresh();
            if (_set == null) return variant;
            variant = catalog.NextVariant(_set, variant, step);
            catalog.Apply(_renderer, _set, variant);
            return variant;
        }

        /// <summary>Metadata (footprint, solid, props) of the sprite currently shown.</summary>
        public SpritebenchSprite CurrentEntry { get { return _set == null ? null : catalog.ResolveEntry(_set, variant); } }
    }
}
