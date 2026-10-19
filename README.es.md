# Spritebench

**Cataloga hojas de sprites en minutos: córtalas, agrúpalas en conjuntos, enlaza variantes volteadas, mide la huella en la cuadrícula y exporta a Unity (o a cualquier motor).**

Spritebench funciona 100 % en tu navegador: sin instalar nada, sin cuentas, sin subir archivos. Nació para un constructor de casas donde un sillón dibujado hacia la *izquierda* también tiene que servir hacia la *derecha* (volteado) y cada mueble debe decir cuántas celdas ocupa y cómo se coloca.

> 🇬🇧 [English README](README.md) · **Pruébalo:** <https://luisaldrichguz.github.io/spritebench/> o abre `index.html` (doble clic).

![Spritebench](docs/screenshots/01-overview.png)

## Qué hace

- **Recorte**: auto-slice por transparencia (con “unir piezas cercanas”), rejilla (offset, separación, trim), varita mágica, rectángulo libre, ajustar al dibujo, fusionar, partir en rejilla.
- **Conjuntos**: UN objeto con variantes con nombre (frente/izquierda/espalda/derecha, 8 direcciones, estados o las tuyas). Una variante puede ser **otra volteada** (↔ y/o ↕): cero arte duplicado.
- **Buscador de espejos**: detecta sprites que son el espejo exacto de otro y crea el volteo.
- **Huella en celdas**: columnas × filas que ocupa en el suelo, sólido, pivote y una **vista previa de colocación** sobre la cuadrícula.
- **Metadatos**: categoría, etiquetas y propiedades libres (clave/valor).
- **Interfaz tipo Adobe**: barra de menús, barra de opciones que cambia con la herramienta, herramientas, pestañas por hoja, paneles plegables, **clic derecho en todo**, historial de deshacer, paleta de comandos `Ctrl+K`, atajos.
- **Exportación**: catálogo JSON documentado, atlas estilo TexturePacker, PNG por sprite (con volteos horneados opcional), `.zip` o escritura directa a una carpeta (Chrome/Edge).
- **Paquete de Unity**: importador de un clic (corta el PNG con pivotes, conserva los GUID al reimportar) + ScriptableObject y API de runtime (`Apply`, `NextVariant`…).
- La interfaz está en **español e inglés** (Ayuda ▸ Idioma).

## Empezar en 2 minutos

1. Arrastra un PNG a la ventana (o *Archivo ▸ Cargar hoja de ejemplo*).
2. **Recorte ▸ Auto-slice** (o `M` rectángulo, `W` varita, `Shift+G` rejilla).
3. Clic en un sprite: define cuántas **celdas ocupa**, su **pivote** y si es **sólido**.
4. Selecciona los sprites que son el mismo objeto de lado distinto → **K** (*Agrupar en conjunto*). Para el lado que no dibujaste elige **“volteo de…”** en el hueco, o usa **Conjunto ▸ Buscar espejos**.
5. **Archivo ▸ Exportar paquete** → importa en tu motor. Unity: [docs/UNITY.md](docs/UNITY.md).

Guía completa: [docs/USAGE.md](docs/USAGE.md) · Formato: [docs/FORMAT.md](docs/FORMAT.md).

## Atajos

`V M W H Z` herramientas · `T` ajustar · `G` fusionar · `Shift+G` rejilla · `K` agrupar · `L` seleccionar sueltos · `F` centrar · `Ctrl+Z / Ctrl+Shift+Z` · `Ctrl+D` duplicar · `Supr` borrar · `F2` renombrar · `Ctrl+S` guardar · `Ctrl+E` exportar · `Ctrl+K` paleta · `F1` todos.

## Ejecutarlo tú

```bash
git clone https://github.com/LuisAldrichGuz/spritebench.git
cd spritebench
python serve.py 8000      # y abre http://localhost:8000  (o solo abre index.html)
```

## Unity

*Window ▸ Package Manager ▸ + ▸ Add package from git URL…* → `https://github.com/LuisAldrichGuz/spritebench.git?path=/unity`

## Licencia

MIT © Luis Aldrich Guzmán. No incluye arte de terceros (la hoja de ejemplo se genera por código).
