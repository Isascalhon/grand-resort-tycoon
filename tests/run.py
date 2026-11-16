"""Executa todos os testes do Grand Resort:
1. unidade (bun test tests/unit)
2. build de produção (vite build)
3. e2e no navegador (Playwright contra `vite preview`, um arquivo tests/e2e/test_*.py por marco)
4. regressão do jogo atual (tests/fase1_regressao.py, via file://)

Uso: python tests/run.py [--no-build] [--only nome]
O Chromium headless deste ambiente não aguenta render contínuo; os testes avançam a lógica em passos."""
import importlib.util
import os
import pathlib
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 4173
BASE = f'http://localhost:{PORT}/'
BUN = shutil.which('bun') or str(pathlib.Path.home() / '.bun' / 'bin' / ('bun.exe' if os.name == 'nt' else 'bun'))


def sh(cmd):
    print('$', ' '.join(cmd), flush=True)
    return subprocess.run(cmd, cwd=ROOT).returncode


def wait_http(url, timeout=60):
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(.5)
    return False


def start_preview():
    flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
    return subprocess.Popen([BUN, '--bun', 'run', 'preview'], cwd=ROOT, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, creationflags=flags)


def stop(proc):
    if os.name == 'nt':
        subprocess.run(['taskkill', '/T', '/F', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        proc.terminate()


def load_suite(path):
    spec = importlib.util.spec_from_file_location(path.stem, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    args = sys.argv[1:]
    only = args[args.index('--only') + 1] if '--only' in args else None
    results = []

    results.append(('unidade (bun test)', sh([BUN, 'test', 'tests/unit']) == 0, ''))
    if '--no-build' not in args:
        results.append(('build de produção', sh([BUN, '--bun', 'run', 'build']) == 0, ''))

    proc = start_preview()
    try:
        if not wait_http(BASE + 'game.html'):
            results.append(('servidor de preview', False, 'não respondeu em 60 s'))
        else:
            for path in sorted((ROOT / 'tests' / 'e2e').glob('test_*.py')):
                if only and only not in path.stem:
                    continue
                print(f'== {path.name}', flush=True)
                try:
                    for name, ok, detail in load_suite(path).run(BASE):
                        results.append((f'{path.stem}: {name}', ok, detail))
                except Exception as e:  # uma suíte quebrada não esconde as outras
                    results.append((f'{path.stem}: execução', False, repr(e)))
    finally:
        stop(proc)

    if not only:
        results.append(('jogo atual (fase1_regressao.py)', sh([sys.executable, 'tests/fase1_regressao.py']) == 0, ''))

    print('\n' + '=' * 72)
    failed = 0
    for name, ok, detail in results:
        print(('PASSOU ' if ok else 'FALHOU ') + name + ('' if ok or not detail else f' — {detail}'))
        failed += not ok
    print(f'{len(results) - failed}/{len(results)} verificações passaram')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
