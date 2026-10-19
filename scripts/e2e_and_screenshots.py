#!/usr/bin/env python3
"""
End-to-end check + README screenshots for Spritebench, driven by REAL mouse/keyboard events (Playwright).

    pip install playwright            # + `playwright install chromium` once (or set CHROME_PATH)
    python serve.py 8788 &            # in another terminal
    python scripts/e2e_and_screenshots.py [http://127.0.0.1:8788]

Exits non-zero if an assertion fails or the page logs a JS error. Screenshots go to docs/screenshots/.
"""
import glob, os, sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8788"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "screenshots")
os.makedirs(OUT, exist_ok=True)
errors, checks = [], []


def check(name, cond):
    checks.append((name, bool(cond)))
    print(("  ok   " if cond else "  FAIL ") + name)


def chrome_path():
    if os.environ.get("CHROME_PATH"):
        return os.environ["CHROME_PATH"]
    for pat in (os.path.expanduser("~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe"), os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux/chrome")):
        found = sorted(glob.glob(pat))
        if found:
            return found[-1]
    return None


with sync_playwright() as p:
    kw = {"executable_path": chrome_path()} if chrome_path() else {}
    browser = p.chromium.launch(**kw)
    ctx = browser.new_context(viewport={"width": 1440, "height": 860}, device_scale_factor=1.5)
    ctx.add_init_script("localStorage.setItem('spritebench.lang','en'); indexedDB.deleteDatabase('spritebench');")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(URL + "/index.html")
    page.wait_for_selector("#emptyDemo")
    shot = lambda n: page.screenshot(path=os.path.join(OUT, n + ".png"))

    print("empty state")
    check("empty screen visible", page.is_visible("#empty"))
    shot("00-welcome")

    print("load demo + auto-slice (menu clicks)")
    page.click("#emptyDemo")
    page.wait_for_function("SB.sheet() && SB.sheet().w === 224")
    page.click(".mb-item:has-text('Slice')")
    page.click(".mi:has-text('Auto-slice')")
    page.fill(".dlg input[type=number] >> nth=0", "1")
    page.click(".dlg button.primary")
    page.wait_for_function("SB.sprites().length === 23")
    check("auto-slice created 23 sprites", page.evaluate("SB.sprites().length") == 23)

    print("real mouse: select, context menu, draw rectangle")
    sx, sy = page.evaluate("(() => { const s = SB.sprites()[1]; return SB.view.toScreen(s.x + s.w / 2, s.y + s.h / 2); })()")
    page.mouse.click(sx, sy)
    check("click selects a sprite", page.evaluate("SB.sel.size") == 1)
    page.mouse.click(sx, sy, button="right")
    page.wait_for_selector("#ctx .mi")
    check("right-click opens the sprite menu", page.locator("#ctx .mi").count() > 8)
    page.hover("#ctx .mi:has-text('Pivot')")
    shot("03-context-menu")
    page.keyboard.press("Escape")
    page.mouse.click(5, 440)  # empty stage area
    before = page.evaluate("SB.sprites().length")
    page.keyboard.press("m")
    x0, y0 = page.evaluate("SB.view.toScreen(170, 66)"); x1, y1 = page.evaluate("SB.view.toScreen(190, 92)")
    page.mouse.move(x0, y0); page.mouse.down(); page.mouse.move(x1, y1, steps=6); page.mouse.up()
    check("rectangle tool draws a trimmed sprite", page.evaluate("SB.sprites().length") == before + 1)
    page.keyboard.press("Control+z")
    check("Ctrl+Z undoes it", page.evaluate("SB.sprites().length") == before)
    page.keyboard.press("v")

    print("mirror finder + group into a 4-way set")
    page.keyboard.press("Control+k")
    page.fill(".pin", "mirrors")
    page.keyboard.press("Enter")
    page.click(".dlg button.primary")
    page.wait_for_function("SB.project.sets.length === 3")
    check("mirror finder created 3 sets with flips", page.evaluate("SB.project.sets.every(s => s.variants.some(v => v.flipOf))"))
    page.evaluate("""(() => { const A = SB.act, st = SB.project.sets[0], sp = SB.sprites().slice(0, 3);
      A.applyPreset(st.id, '4 direcciones'); A.assign(st.id, 'front', sp[0].id); A.assign(st.id, 'back', sp[2].id); A.patchSet(st.id, { name: 'Wooden chair' });
      SB.select([sp[1].id]); SB.activeSet = st.id; SB.emit('change'); })()""")
    page.evaluate("SB.view.focus(SB.project.sets.length ? [SB.sprites()[1].id] : [])")
    page.evaluate("SB.view.fit()")
    page.evaluate("SB.select([SB.sprites()[1].id])")
    page.wait_for_timeout(300)
    check("set resolves right as flipped left", page.evaluate("(() => { const r = SB.resolveVariant(SB.project.sets[0], 'right'); return r && r.flipX; })()"))
    shot("01-overview")

    page.evaluate("document.getElementById('p-sets').scrollIntoView()")
    page.locator("#p-sets").screenshot(path=os.path.join(OUT, "02-sets-panel.png"))
    page.locator("#p-props").screenshot(path=os.path.join(OUT, "04-properties.png"))

    print("menus + palette")
    page.click(".mb-item:has-text('Set')")
    page.wait_for_selector(".menu.drop")
    shot("05-menu")
    page.keyboard.press("Escape"); page.mouse.click(700, 400)
    page.keyboard.press("Control+k")
    page.fill(".pin", "flip")
    shot("06-command-palette")
    page.keyboard.press("Escape")

    print("export")
    names = page.evaluate("""async () => { const b = await SB.exp.bundle({ texturePacker: true }); return b.files.map(f => f.name); }""")
    check("bundle has catalog + sheet + atlas", len(names) == 3 and names[0].endswith(".catalog.json"))
    check("no JS errors", not errors)
    if errors:
        print("\n".join(errors))
    browser.close()

failed = [n for n, ok in checks if not ok]
print("\n%d checks, %d failed" % (len(checks), len(failed)))
sys.exit(1 if failed else 0)
