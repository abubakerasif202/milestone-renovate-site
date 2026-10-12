"""One-off dev step: trim the bundled variable fonts' weight axes to the range the site actually uses.

Inter and Newsreader are SIL OFL 1.1 fonts with no Reserved Font Name, so axis-limiting is permitted; the glyph
outlines at every weight inside the kept range are unchanged. Run only when the used weights change:

    pip install --target .tmp/pylib fonttools brotli
    PYTHONPATH=.tmp/pylib python scripts/instance_fonts.py

Source files (full axis range) live in assets/fonts-src/; output goes to public/assets/fonts/.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'fonts-src'
OUT = ROOT / 'public' / 'assets' / 'fonts'

# (source file, output file, wght range used by the CSS)
JOBS = [
    ('inter-latin-wght-normal.woff2', 'inter-latin-400-900-normal.woff2', (400, 900)),
    ('newsreader-latin-wght-normal.woff2', 'newsreader-latin-400-500-normal.woff2', (400, 500)),
    ('newsreader-latin-wght-italic.woff2', 'newsreader-latin-400-500-italic.woff2', (400, 500)),
]

for source, target, wght in JOBS:
    font = TTFont(SRC / source)
    instancer.instantiateVariableFont(font, {'wght': wght}, inplace=True)
    font.flavor = 'woff2'
    font.save(OUT / target)
    print(f'{target}: {(SRC / source).stat().st_size} -> {(OUT / target).stat().st_size} bytes')
