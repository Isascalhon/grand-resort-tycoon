"""Fotografa o protótipo da fachada (M1) para revisão visual.
Gera artifacts/m1/<vista>.png para as 6 vistas, mais a frontal com 3 e 10 andares e a entrada ao meio-dia,
e artifacts/m1/info.json com draw calls e triângulos de cada foto (só a cena, sem os passes de tela cheia).

Uso: python tests/visual/shoot.py [url-base] [--q low|medium|high] [--size 1280x720]
A url-base padrão é o servidor de desenvolvimento (bun --bun run dev → http://localhost:5173/)."""
import base64
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

for _stream in (sys.stdout, sys.stderr):
    _stream.reconfigure(encoding='utf-8', errors='replace')

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts' / 'm1'
CHROMIUM_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

SHOTS = [
    ('frontal', {'view': 'frontal'}),
    ('calcada', {'view': 'calcada'}),
    ('lateral', {'view': 'lateral'}),
    ('noite', {'view': 'noite'}),
    ('dia', {'view': 'dia'}),
    ('entrada', {'view': 'entrada'}),
    ('frontal-3-andares', {'view': 'frontal', 'floors': 3}),
    ('frontal-10-andares', {'view': 'frontal', 'floors': 10}),
    ('entrada-dia', {'view': 'entrada', 'hour': 12}),
]


def arg(name, default):
    a = sys.argv[1:]
    return a[a.index(name) + 1] if name in a else default


def open_proto(pg, base, quality):
    pg.goto(f'{base}prototype.html?test=1&q={quality}', wait_until='load')
    pg.wait_for_function('window.__PROTO_READY__ === true || !!window.__PROTO_BOOT_ERROR__', timeout=120000, polling=200)
    err = pg.evaluate('() => window.__PROTO_BOOT_ERROR__ || null')
    if err:
        raise RuntimeError(f'o protótipo não iniciou: {err}')
    # dá tempo para as texturas terminarem de chegar à GPU
    pg.wait_for_timeout(1500)


def shoot(pg, opts):
    return pg.evaluate("""async (o) => {
        const P = window.__PROTO__;
        if (o.floors) P.setFloors(o.floors); else P.setFloors(6);
        P.setView(o.view);
        if (o.hour != null) P.setTime(o.hour);
        P.renderOnce();                                 // primeiro quadro sobe as texturas novas
        await new Promise(r => setTimeout(r, 300));
        const info = P.renderOnce();
        return { info, png: document.getElementById('gl').toDataURL('image/png') };
    }""", opts)


def main():
    positional = [a for a in sys.argv[1:] if not a.startswith('--') and a not in (arg('--q', ''), arg('--size', ''))]
    base = positional[0] if positional else 'http://localhost:5173/'
    quality = arg('--q', 'medium')
    w, h = (int(v) for v in arg('--size', '1280x720').split('x'))
    OUT.mkdir(parents=True, exist_ok=True)
    report, errors = {}, []
    with sync_playwright() as p:
        b = p.chromium.launch(args=CHROMIUM_ARGS)
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.add_init_script('window.requestAnimationFrame = () => 0;')
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text[:300]) if m.type == 'error' else None)
        open_proto(pg, base, quality)
        for name, opts in SHOTS:
            r = shoot(pg, opts)
            (OUT / f'{name}.png').write_bytes(base64.b64decode(r['png'].split(',', 1)[1]))
            report[name] = r['info']
            print(f"{name:20s} {r['info']['calls']:4d} draw calls  {r['info']['triangles'] / 1e6:5.2f} M triângulos")
        b.close()
    (OUT / 'info.json').write_text(json.dumps({'quality': quality, 'size': [w, h], 'shots': report, 'errors': errors},
                                              ensure_ascii=False, indent=2), encoding='utf-8')
    if errors:
        print('erros no console:', *errors[:10], sep='\n  ')
    print(f'fotos em {OUT}')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
