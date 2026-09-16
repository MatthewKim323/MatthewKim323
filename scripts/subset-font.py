"""Regenerate the compact SVG font: uv run --with fonttools --with brotli scripts/subset-font.py."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
font = TTFont(root / "assets/fonts/JetBrainsMono-Regular.woff2")
options = subset.Options()
options.flavor = "woff2"
options.recalc_timestamp = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=range(32, 127))
subsetter.subset(font)
for record in font["name"].names:
    if record.nameID in (1, 3, 4, 6, 16):
        value = "ProfileMono-Ascii" if record.nameID == 6 else "Profile Mono ASCII"
        record.string = value.encode(record.getEncoding(), errors="replace")
font.flavor = "woff2"
font.save(root / "assets/fonts/ProfileMono-Ascii.woff2")
