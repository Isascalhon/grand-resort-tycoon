"""Regressão da Fase 1: loop robusto, save protegido, cancelamento após servir e obras em quarto ocupado.

Roda a lógica do jogo sem renderização contínua (requestAnimationFrame desligado),
porque o Chromium headless trava com render contínuo neste ambiente.
Uso: python tests/fase1_regressao.py
"""
import pathlib
from playwright.sync_api import sync_playwright

INDEX = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
URL = INDEX.as_uri()
results = []


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))


def new_page(p, errors):
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 480, 'height': 270})
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.add_init_script("window.requestAnimationFrame = () => 0;")
    return b, pg


def run():
    errors = []
    with sync_playwright() as p:
        # 1) loop: uma exceção em um quadro não derruba o laço (requestAnimationFrame continua sendo chamado)
        b, pg = new_page(p, errors)
        pg.goto(URL, wait_until='load')
        r = pg.evaluate("""() => {
          let calls = 0; window.requestAnimationFrame = () => { calls++; return 0; };
          const realHud = hud; hud = () => { throw new Error('falha de teste'); };
          loop(); hud = realHud;
          return {calls, errors: loopErrors};
        }""")
        check('loop continua após exceção', r['calls'] == 1 and r['errors'] >= 1, str(r))
        b.close()

        # 2) save ilegível (versão antiga) é preservado: o autosave não pode sobrescrever
        # semeia o save antes de qualquer script do jogo (e antes do beforeunload da página anterior)
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 480, 'height': 270})
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.add_init_script("""window.requestAnimationFrame = () => 0;
          if (!sessionStorage.getItem('seeded')){ localStorage.setItem('grand_resort_save', JSON.stringify({v: 1, money: 999})); sessionStorage.setItem('seeded', '1'); }""")
        pg.goto(URL, wait_until='load')
        pg.reload(wait_until='load')
        before = pg.evaluate("() => localStorage.getItem('grand_resort_save')")
        blocked = pg.evaluate("() => saveBlocked")
        pg.evaluate("() => { if (!saveBlocked) GAME.save.save(); }")
        after = pg.evaluate("() => localStorage.getItem('grand_resort_save')")
        check('save ilegível bloqueia autosave', blocked is True, f'saveBlocked={blocked}')
        check('save ilegível é preservado', before == after, 'conteúdo igual antes e depois')
        b.close()

        # 3) cancelar receita depois de servida não cobra nem limpa a missão
        b, pg = new_page(p, errors)
        pg.goto(URL, wait_until='load')
        r = pg.evaluate("""() => {
          MISSION.active = true; MISSION.step = 'eat';
          const before = G.money; failMission('cancel');
          return {stillActive: MISSION.active, money: G.money - before};
        }""")
        check('cancelar após servir é ignorado', r['stillActive'] is True and r['money'] == 0, str(r))
        pg.evaluate("() => { MISSION.active = false; MISSION.step = 'collect'; }")
        b.close()

        # 4) obra em quarto ocupado é recusada e não cobra
        b, pg = new_page(p, errors)
        pg.goto(URL, wait_until='load')
        r = pg.evaluate("""() => {
          const room = ROOMS[0]; room.owned = true; room.level = 1; room.state = 'free'; room.guest = {fake: true};
          G.money = 5000; const before = G.money; const lvl = room.level;
          upgradeRoom(room);
          return {money: G.money - before, level: room.level - lvl};
        }""")
        check('obra em quarto ocupado é recusada', r['money'] == 0 and r['level'] == 0, str(r))
        b.close()

    check('sem erros de página', not errors, '; '.join(errors))


if __name__ == '__main__':
    run()
    falhas = 0
    for name, ok, detail in results:
        print(('PASSOU ' if ok else 'FALHOU ') + name + ('' if ok else f' — {detail}'))
        falhas += (not ok)
    print(f'{len(results) - falhas}/{len(results)} testes passaram')
    raise SystemExit(1 if falhas else 0)
