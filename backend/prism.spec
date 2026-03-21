# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — PRISM Desktop Backend
# Produit : dist/PRISM-backend/PRISM-backend.exe (--onedir)

from PyInstaller.utils.hooks import collect_all, collect_submodules

# Collecter uvicorn en entier (imports dynamiques internes)
uvicorn_datas, uvicorn_binaries, uvicorn_hiddenimports = collect_all('uvicorn')

# Collecter anyio (backend async d'uvicorn)
anyio_datas, anyio_binaries, anyio_hiddenimports = collect_all('anyio')

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=uvicorn_binaries + anyio_binaries,
    datas=[
        # Frontend buildé (copié dans backend/frontend/ par le CI)
        ('frontend', 'frontend'),
        *uvicorn_datas,
        *anyio_datas,
    ],
    hiddenimports=[
        # FastAPI / Starlette
        'starlette.routing',
        'starlette.middleware',
        'starlette.staticfiles',
        'starlette.responses',
        # uvicorn
        *uvicorn_hiddenimports,
        # anyio
        *anyio_hiddenimports,
        'anyio._backends._asyncio',
        # sil-engine
        'sil_engine',
        *collect_submodules('sil_engine'),
        # numpy / scipy (parfois manqués par PyInstaller)
        'numpy',
        'scipy',
        'scipy.special._ufuncs_cxx',
        'scipy.linalg.cython_blas',
        'scipy.linalg.cython_lapack',
        # reportlab
        'reportlab',
        *collect_submodules('reportlab'),
        # Pillow (requis par reportlab)
        'PIL',
        *collect_submodules('PIL'),
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'PIL', 'cv2'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='PRISM-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,   # Pas de fenêtre console en production
    icon='public/logo.png',  # Icône Windows (idéalement .ico)
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='PRISM-backend',
)
