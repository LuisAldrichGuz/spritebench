# Spritebench MCP server

Lets Claude Code / Claude Desktop (any MCP client) **slice, look at, fix and catalog sprite sheets** using the real Spritebench editor in a headless Chromium. The agent gets annotated screenshots, so it can verify its own work instead of cutting blind.

## Install

```bash
cd mcp-server
pip install -e .                 # installs the MCP SDK + Playwright
playwright install chromium      # once (or set CHROME_PATH to an existing Chrome/Chromium)
```

## Register it

Claude Code (from any folder):

```bash
claude mcp add spritebench -- python -m spritebench_mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{ "mcpServers": { "spritebench": { "command": "python", "args": ["-m", "spritebench_mcp"], "cwd": "/path/to/spritebench/mcp-server" } } }
```

It opens the local `index.html` of this repo (falls back to the hosted app). Nothing leaves your machine.

## Tools

| Group | Tools |
|---|---|
| Open / read | `open_sheet`, `state`, `list_sprites`, `list_sets` |
| See | `screenshot` (annotated region), `sets_sheet` (every variant as the game shows it) |
| Slice | `auto_slice`, `grid_slice`, `add_rect`, `wand`, `delete_sprites`, `trim_sprites`, `merge_sprites`, `split_sprite`, `set_rect` |
| Describe | `describe_sprites` (footprint, solid, category, pivot, name, tags, props) |
| Sets | `group`, `flip_variant`, `assign_variant`, `find_mirrors`, `delete_set`, `rename_set`, `undo` |
| Files | `export_bundle`, `save_project`, `load_project`, `fix_duplicate_names` |
| Escape hatch | `run_js` (the whole `SB` app API) |

## Python without MCP

```python
from spritebench_mcp.bench import Bench
with Bench() as b:
    b.open_sheet("couches.png")
    b.auto_slice()
    open("look.png", "wb").write(b.screenshot(0, 0, 480, 250, scale=3))
    b.group([0, 1, 2], variants=["front", "left", "back"], name="sofa_red")
    b.export_bundle("out/")
```

## The skill

`.claude/skills/spritebench/SKILL.md` teaches the agent the loop (open → slice → look → fix → group → verify → export) and the recipes for giant boxes, stacked pieces, mirrored pairs and fragments. Claude Code picks it up automatically when you work inside this repo; copy the folder to `~/.claude/skills/` to use it everywhere.
