from pathlib import Path
p = Path('server.ts')
t = p.read_text(encoding='utf-8')
start = t.index("  // GET /api/countries\n  app.get('/api/countries'")
end = t.index("  app.post('/api/admin/universities', authMiddleware, async (req: Request, res: Response) => {", start + 1)
print(start, end)
p.write_text(t[:start] + t[end:], encoding='utf-8')
