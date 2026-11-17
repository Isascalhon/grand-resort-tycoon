"""M1 — Protótipo da fachada: inicia sem erros, monta 3, 6 e 10 andares, troca dia e noite, as 6 vistas
renderizam e o orçamento do preset Média (600 draw calls, 2 M de triângulos) é respeitado.
Roda contra o `vite preview` com ?test=1 (sem laço contínuo; cada quadro é pedido por renderOnce)."""
from playwright.sync_api import sync_playwright

CHROMIUM_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
BUDGET = {'calls': 600, 'triangles': 2_000_000}


def wait_ready(pg, console):
    """polling em ms: o padrão 'raf' nunca repete a checagem, porque o teste anula o requestAnimationFrame."""
    try:
        pg.wait_for_function('window.__PROTO_READY__ === true || !!window.__PROTO_BOOT_ERROR__', timeout=120000, polling=200)
    except Exception as e:
        raise RuntimeError(f'o protótipo não iniciou em 120 s; console: {" / ".join(console[-6:])}') from e
    err = pg.evaluate('() => window.__PROTO_BOOT_ERROR__ || null')
    if err:
        raise RuntimeError(f'o protótipo não iniciou: {err}')


def run(base_url):
    results, errors, console = [], [], []

    def check(name, ok, detail=''):
        results.append((name, bool(ok), detail))

    with sync_playwright() as p:
        b = p.chromium.launch(args=CHROMIUM_ARGS)
        pg = b.new_page(viewport={'width': 640, 'height': 360})
        pg.add_init_script('window.requestAnimationFrame = () => 0;')
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: console.append(f'{m.type}: {m.text}'[:400]) if m.type in ('error', 'warning') else None)
        pg.goto(base_url + 'prototype.html?test=1&q=medium', wait_until='load')
        wait_ready(pg, console)

        floors = pg.evaluate("""() => [3, 6, 10].map(n => { __PROTO__.setFloors(n); const i = __PROTO__.renderOnce();
            return { n: i.floors, top: i.top, windows: i.windows, calls: i.calls, tris: i.triangles }; })""")
        check('monta 3, 6 e 10 andares', [f['n'] for f in floors] == [3, 6, 10], str(floors))
        check('altura cresce com os andares', floors[0]['top'] < floors[1]['top'] < floors[2]['top'], str([f['top'] for f in floors]))
        check('janelas modulares acompanham os andares', floors[0]['windows'] < floors[1]['windows'] < floors[2]['windows'],
              str([f['windows'] for f in floors]))

        shots = pg.evaluate("""() => __PROTO__.VIEWS.map(v => { __PROTO__.setFloors(10); __PROTO__.setView(v); const i = __PROTO__.renderOnce();
            return { v, calls: i.calls, tris: i.triangles }; })""")
        worst_calls = max(s['calls'] for s in shots)
        worst_tris = max(s['tris'] for s in shots)
        check('as 6 vistas renderizam', len(shots) == 6 and all(s['calls'] > 0 for s in shots), str(shots))
        check(f'orçamento: até {BUDGET["calls"]} draw calls (10 andares)', worst_calls <= BUDGET['calls'], f'pior={worst_calls}')
        check('orçamento: até 2 M de triângulos (10 andares)', worst_tris <= BUDGET['triangles'], f'pior={worst_tris}')

        # a hora controla a luz: de dia as lâmpadas ficam quase apagadas, à noite acendem e o bloom entra
        r = pg.evaluate("""() => { const P = __PROTO__, lamp = P.mats.get('lamp');
            P.setTime(12); const day = { e: lamp.emissiveIntensity, bloom: P.post.bloom.enabled, sky: P.env.sky.visible };
            P.setTime(22); const night = { e: lamp.emissiveIntensity, bloom: P.post.bloom.enabled, sky: P.env.sky.visible };
            P.renderOnce(); return { day, night }; }""")
        check('noite acende as lâmpadas e o bloom', r['night']['e'] > r['day']['e'] * 2 and r['night']['bloom'] and not r['day']['bloom'], str(r))

        # a imagem não sai preta nem estourada: brilho médio do quadro de dia dentro de uma faixa razoável
        lum = pg.evaluate("""() => { const P = __PROTO__; P.setView('frontal'); P.renderOnce();
            const c = document.getElementById('gl'), t = document.createElement('canvas'); t.width = 64; t.height = 36;
            const g = t.getContext('2d'); g.drawImage(c, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data;
            let s = 0; for (let i = 0; i < d.length; i += 4) s += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
            return s / (d.length / 4); }""")
        check('quadro de dia nem preto nem estourado', 60 < lum < 215, f'brilho médio={lum:.0f}')

        check('sem erros de página', not errors, ' | '.join(errors[:3]))
        b.close()
    return results
