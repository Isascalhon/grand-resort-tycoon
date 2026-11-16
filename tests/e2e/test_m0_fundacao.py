"""M0 — Fundação: importação do save atual, relógio, save em IndexedDB, preservação de save ilegível
e isolamento de erros. Roda contra o `vite preview`, sem renderização contínua (modo ?test=1)."""
import json
from playwright.sync_api import sync_playwright

LEGACY = {
    'v': 2, 'money': 4321, 'rep': 23.5, 'day': 6, 't': 30, 'elapsed': 900, 'served': 4, 'debt': 0, 'friend': 2, 'guestSeq': 12,
    'upg': {'bar': True, 'floor': False, 'light': False}, 'staff': {'recep': 1, 'maid': 1, 'chef': 0, 'waiter': 0},
    'staffLv': {'recep': 1, 'maid': 2}, 'branch': 'city', 'owned': ['city'], 'plus': {}, 'partners': {'adsT': 0, 'supplier': False},
    'rooms': [{'owned': True, 'level': 2}, {'owned': True, 'level': 1}, {'owned': False, 'level': 0}, {'owned': False, 'level': 0}],
    'upper': [{'owned': True, 'level': 2}, {'owned': False, 'level': 0}, {'owned': False, 'level': 0}], 'log': [],
}
SEED = json.dumps(LEGACY)


def run(base_url):
    results, errors = [], []

    def check(name, ok, detail=''):
        results.append((name, bool(ok), detail))

    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        ctx = b.new_context(viewport={'width': 640, 'height': 360})
        # o save do jogo atual existe antes de qualquer script do jogo rodar
        ctx.add_init_script(f"""window.requestAnimationFrame = () => 0;
          if (!localStorage.getItem('grand_resort_save')) localStorage.setItem('grand_resort_save', {json.dumps(SEED)});""")
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(base_url + 'game.html?test=1', wait_until='load')
        pg.wait_for_function('window.__GAME_READY__ === true', timeout=30000)

        r = pg.evaluate("""() => { const g = __GAME__; return {
            origin: g.result.origin, cash: g.state.economy.cash, rooms: g.state.hotel.rooms.map(r => r.id + ':' + r.category),
            floors: g.state.hotel.floors, staff: g.state.staff.hired.length, card: !!document.querySelector('.card') }; }""")
        check('importa o progresso do jogo atual', r['origin'] == 'legacy' and r['cash'] == 4321, str(r))
        check('quartos importados para os andares certos',
              r['rooms'] == ['101:executivo', '102:standard', '201:executivo'] and r['floors'] == 2, str(r))
        check('mostra o cartão com o resumo', r['card'])
        check('chave do jogo atual continua idêntica', pg.evaluate("() => localStorage.getItem('grand_resort_save')") == SEED)

        day0 = pg.evaluate('() => __GAME__.state.clock.day')
        pg.evaluate('() => __GAME__.step(240)')
        check('o relógio vira o dia após 240 s de simulação', pg.evaluate('() => __GAME__.state.clock.day') == day0 + 1)

        saved = pg.evaluate("async () => { await __GAME__.saveSlot('manual-1'); return __GAME__.state.clock.day; }")
        pg.reload(wait_until='load')
        pg.wait_for_function('window.__GAME_READY__ === true', timeout=30000)
        loaded = pg.evaluate("async () => { const s = await __GAME__.loadSlot('manual-1'); return s && s.clock.day; }")
        check('save manual em IndexedDB sobrevive ao recarregar', loaded == saved, f'salvo={saved} lido={loaded}')

        n = pg.evaluate("""() => { const g = __GAME__;
            g.addSystem({ name: 'quebra', frame() { throw new Error('teste'); } });
            const original = console.error; console.error = () => {};
            g.frame(.1); g.frame(.1); console.error = original;
            return g.game.errors; }""")
        check('um sistema com erro não derruba o laço', n >= 2, f'erros={n}')

        # save automático ilegível: é guardado com outro nome e nada é apagado
        pg.evaluate("async () => __GAME__.saves.put({ slot: 'auto', version: 3, state: { version: 99 } })")
        pg.reload(wait_until='load')
        pg.wait_for_function('window.__GAME_READY__ === true', timeout=30000)
        r = pg.evaluate("""async () => { const list = await __GAME__.saves.list();
            return { warn: __GAME__.result.warnings.join(' | '), origin: __GAME__.result.origin,
                     slots: list.map(x => x.slot) }; }""")
        check('save ilegível é preservado como "corrompido"',
              'corrompido' in r['warn'] and any(s.startswith('corrompido-') for s in r['slots']), str(r))
        check('com o save ilegível, volta ao progresso do jogo atual', r['origin'] == 'legacy', str(r))

        pg2 = ctx.new_page()
        pg2.on('pageerror', lambda e: errors.append('protótipo: ' + str(e)))
        pg2.goto(base_url + 'prototype.html', wait_until='load')
        pg2.wait_for_timeout(500)
        b.close()

    check('sem erros de página', not errors, '; '.join(errors))
    return results
