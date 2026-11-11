# Usado por importar-leis-iomo.mjs nas edições até 2014 da Imprensa Oficial, diagramadas em colunas. Precisa de: pip install pypdf
# Texto de PDF diagramado em colunas: cada fragmento vai para a coluna cuja margem esquerda está mais perto (à esquerda),
# e cada coluna é lida de cima para baixo.
import pypdf, collections, sys
def texto_por_colunas(caminho):
    r = pypdf.PdfReader(caminho)
    saida = []
    for p in r.pages:
        frag = []
        def vis(t, cm, tm, fd, fs):
            if t.strip():
                x = tm[4] * cm[0] + cm[4]; y = tm[5] * cm[3] + cm[5]
                frag.append((x, y, t.replace("\n", " ").strip()))
        try: p.extract_text(visitor_text=vis)
        except Exception: continue
        if not frag: continue
        hist = collections.Counter(round(x / 4) * 4 for x, y, t in frag)
        inicios = sorted(x for x, n in hist.items() if n >= 6)
        # junta inícios muito próximos
        cols = []
        for x in inicios:
            if not cols or x - cols[-1] > 40: cols.append(x)
        if not cols: cols = [0]
        porcol = collections.defaultdict(list)
        for x, y, t in frag:
            c = max([i for i, cx in enumerate(cols) if cx <= x + 6] or [0])
            porcol[c].append((y, x, t))
        for c in sorted(porcol):
            linhas = collections.OrderedDict()
            for y, x, t in sorted(porcol[c], key=lambda f: (-round(f[0]), f[1])):
                linhas.setdefault(round(y), []).append(t)
            for y, ts in linhas.items(): saida.append(" ".join(ts))
            saida.append("")
        saida.append("\f")
    return "\n".join(saida)
if __name__ == "__main__":
    print(texto_por_colunas(sys.argv[1]))
