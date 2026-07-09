from pathlib import Path
p = Path('server.ts')
text = p.read_text(encoding='utf-8')
start = text.find("  // GET /api/countries")
print('start', start)
if start == -1:
    raise RuntimeError('marker not found')
print(repr(text[start:start+1200]))
