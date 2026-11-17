"""Fotografa o jogo jogável (index.html) em pontos fixos para revisão visual da qualidade gráfica.
Gera artifacts/jogo/<vista>.png. Sem laço contínuo: posiciona a câmera, roda um quadro do jogo e captura.
As draw calls contadas são as do quadro inteiro (sombra, espelho do lobby, AO e passes de tela cheia).
Uso: python tests/visual/shoot_legacy.py [url] [--q baixa|media|alta] [--size 1280x720]
url padrão é o servidor de desenvolvimento (http://localhost:5173/index.html); file:// também funciona,
mas aí as texturas fotográficas não carregam e o jogo fica com as procedurais."""
import base64
import json
import pathlib
import sys
from playwright.sync_api import sync_playwright

for _stream in (sys.stdout, sys.stderr):
    _stream.reconfigure(encoding='utf-8', errors='replace')

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts' / 'jogo'
CHROMIUM_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

# (nome, posição da câmera, ponto olhado)
SHOTS = [
    ('lobby', (0, 1.65, 5.5), (0, 1.8, -6)),
    ('recepcao', (-3.5, 1.65, 2), (2, 1.2, -4)),
    ('corredor', (-8.6, 1.65, 0), (-26, 1.6, 0)),
    ('restaurante', (9, 1.65, 6), (22, 1.2, -4)),
    ('cozinha', (20, 1.65, 4), (26, 1.2, -6)),
    ('piscina', (2, 1.8, -9.5), (-4, 0, -26)),
    ('fachada', (4, 2.2, 27), (0, 5, 6)),
    ('rua', (-14, 1.7, 19), (14, 4, 10)),
    # equipe com modelos 3D (o harness contrata recepcionista, camareira e chef antes das fotos)
    ('equipe-recepcao', (1.6, 1.7, -1.2), (1.6, 1.2, -4.6)),
    ('equipe-chef', (21.5, 1.7, -1.5), (26.1, 1.2, -1.5)),
    ('equipe-camareira', (-11.5, 1.7, 0.6), (-9.6, 1.1, -0.8)),
    ('gramado-fundos', (-4, 2.2, -12), (-22, 3, -28)),
]


def arg(name, default):
    a = sys.argv[1:]
    return a[a.index(name) + 1] if name in a else default


def main():
    flags = {arg('--q', None), arg('--size', None), arg('--hora', None), arg('--etapa', None)}
    pos = [a for a in sys.argv[1:] if not a.startswith('--') and a not in flags]
    url = pos[0] if pos else 'http://localhost:5173/index.html'
    q = arg('--q', None)
    hora = arg('--hora', None)       # hora do relógio do jogo (8 a 22); padrão: o início do dia
    etapa = arg('--etapa', None)     # etapa da reforma (0 Ruína … 3 Alto Padrão) para fotografar a fachada
    w, h = (int(v) for v in arg('--size', '1280x720').split('x'))
    OUT.mkdir(parents=True, exist_ok=True)
    report, errors = {}, []
    with sync_playwright() as p:
        b = p.chromium.launch(args=CHROMIUM_ARGS)
        pg = b.new_page(viewport={'width': w, 'height': h})
        init = 'window.requestAnimationFrame = () => 0;'
        if q:
            init += f"try {{ localStorage.setItem('grand_resort_gfx', '{q}'); }} catch (e) {{}}"
        pg.add_init_script(init)
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text[:300]) if m.type == 'error' else None)
        # no SwiftShader (CPU) a carga com reflexos e pós-processamento passa de 30 s
        pg.goto(url, wait_until='load', timeout=240000)
        # equipe com modelos 3D nas fotos: contrata quem ainda não existe (só no navegador de teste)
        pg.evaluate("""() => { for (const r of ['recep', 'maid', 'chef']) if (!STAFF.some(n => n.role === r)) { G.staff[r]++; spawnStaff(r, 0); } }""")
        # texturas fotográficas e modelos chegam depois do load: dá tempo para baixarem e subirem para a GPU
        pg.wait_for_timeout(6000)
        pg.evaluate("() => { const s = document.getElementById('start'); if (s) s.style.display = 'none'; }")
        if etapa is not None:
            pg.evaluate(f"() => WORLD.applyStage({int(etapa)})")
            pg.wait_for_timeout(1500)
        if hora is not None:
            pg.evaluate(f"() => {{ G.t = ({float(hora)} - 8) / 14 * G.dayLen; }}")
        for name, cam, look in SHOTS:
            r = pg.evaluate("""([c, l]) => {
                camera.position.set(...c); camera.lookAt(...l); camera.updateMatrixWorld();
                renderer.info.autoReset = false; renderer.info.reset();
                loop();
                const i = renderer.info.render; renderer.info.autoReset = true;
                return { calls: i.calls, tris: i.triangles, png: document.getElementById('gl').toDataURL('image/png') };
            }""", [cam, look])
            (OUT / f'{name}.png').write_bytes(base64.b64decode(r.pop('png').split(',', 1)[1]))
            report[name] = r
            print(f"{name:12s} {r['calls']:5d} draw calls  {r['tris'] / 1e3:7.0f} mil triângulos")
        b.close()
    (OUT / 'info.json').write_text(json.dumps({'quality': q, 'shots': report, 'errors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
    if errors:
        print('erros no console:', *errors[:10], sep='\n  ')
    print(f'fotos em {OUT}')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
