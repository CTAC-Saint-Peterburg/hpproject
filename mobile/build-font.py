"""Build the Android-only local font using fontTools (OFL source fonts).
Usage: python mobile/build-font.py <NotoSansSC.ttf> <Symbols2.ttf>
"""
import json
import sys
import math
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
from fontTools.merge import Merger
from fontTools.pens.ttGlyphPen import TTGlyphPen

root = Path(__file__).resolve().parent.parent
chars = set('0123456789\u00b0%\u2668\u2744\u21bb\u25f7')
for path in (root / 'src/translate').glob('*.json'):
    for key, value in json.loads(path.read_text(encoding='utf-8')).items():
        if key.startswith('ingredients.') or (key.startswith('spells.') and key.endswith('.name')) or key.startswith('brewing.next'):
            chars.update(value)
codes = {ord(c) for c in chars} | set(range(32, 127))
output = root / 'mobile/web/fonts'
output.mkdir(parents=True, exist_ok=True)
primary = instantiateVariableFont(TTFont(sys.argv[1]), {'wght': 400}, inplace=True)
# A small original circular-arrow glyph avoids downloading a third font for U+21BB.
pen = TTGlyphPen(None)
points = [(500 + radius * math.cos(angle), 400 + radius * math.sin(angle))
          for radius, angles in [(300, range(35, 316, 10)), (240, range(315, 34, -10))]
          for angle in [math.radians(a) for a in angles]]
pen.moveTo(points[0])
for point in points[1:]: pen.lineTo(point)
pen.closePath()
pen.moveTo((640, 105)); pen.lineTo((820, 115)); pen.lineTo((790, 300)); pen.closePath()
name = 'hyped.circularArrow'
primary['glyf'][name] = pen.glyph()
primary['hmtx'][name] = (1000, 0)
if 'vmtx' in primary: primary['vmtx'][name] = (1000, 0)
primary.setGlyphOrder(list(dict.fromkeys(primary.getGlyphOrder() + [name])))
for table in primary['cmap'].tables:
    if table.isUnicode(): table.cmap[0x21bb] = name
fonts = [primary, TTFont(sys.argv[2])]
remaining = codes.copy()
paths = []
for index, font in enumerate(fonts):
    points = remaining & set(font.getBestCmap())
    remaining -= points
    tool = subset.Subsetter()
    tool.populate(unicodes=points)
    tool.subset(font)
    path = output / f'part-{index}.ttf'
    font.save(path)
    paths.append(str(path))
assert not remaining, f'Missing glyphs: {remaining}'
merged = Merger().merge(paths)
assert codes <= set(merged.getBestCmap())
for name_id, value in [(1, 'Hyped Pot Android'), (2, 'Regular'), (4, 'Hyped Pot Android Regular'), (6, 'HypedPotAndroid-Regular')]:
    merged['name'].setName(value, name_id, 3, 1, 0x409)
merged.save(output / 'HypedPotAndroid.ttf')
for path in paths:
    Path(path).unlink()
print('Local glyphs:', len(codes), 'bytes:', (output / 'HypedPotAndroid.ttf').stat().st_size)
