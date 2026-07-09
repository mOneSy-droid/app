from pathlib import Path

path = Path('server.ts')
text = path.read_text(encoding='utf-8')
start_marker = "  // GET /api/countries\n  app.get('/api/countries'"
end_marker = "  app.post('/api/admin/universities', authMiddleware, async (req: Request, res: Response) => {"
start = text.find(start_marker)
if start == -1:
    raise RuntimeError('Start marker not found')
end = text.find(end_marker, start + 1)
if end == -1:
    raise RuntimeError('End marker not found')
print('Removing duplicate block from', start, 'to', end)
new_text = text[:start] + text[end:]
path.write_text(new_text, encoding='utf-8')
print('Done')
