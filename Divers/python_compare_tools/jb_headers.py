import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
from xlsx_helper import Workbook, norm


def resolve_path(base_dir, value):
    path = Path(value)
    return path if path.is_absolute() else base_dir / path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Liste les colonnes contenant JB dans les fichiers Excel."
    )
    parser.add_argument(
        "--base-dir",
        default=".",
        help="Dossier contenant les fichiers Excel. Par defaut: dossier courant.",
    )
    parser.add_argument("--return-1", default="FR-GPS-660-1_Retour_client.xlsx")
    parser.add_argument("--return-2", default="FR-GPS-660-2_Retour_client.xlsx")
    parser.add_argument("--return-3", default="FR-GPS-660-3_Retour_client.xlsx")
    parser.add_argument("--master", default="660_GLOBAL_MASTER.xlsx")
    return parser.parse_args()


args = parse_args()
base_dir = Path(args.base_dir).resolve()
files = [
    resolve_path(base_dir, args.return_1),
    resolve_path(base_dir, args.return_2),
    resolve_path(base_dir, args.return_3),
    resolve_path(base_dir, args.master),
]

missing_files = [str(path) for path in files if not path.exists()]
if missing_files:
    missing_text = "\n".join(missing_files)
    raise SystemExit(f"Fichiers introuvables:\n{missing_text}")

for path in files:
    wb = Workbook(path)
    print("FILE", path.name, flush=True)
    if path.name.endswith("GLOBAL_MASTER.xlsx"):
        row = wb.first_row("BDD-14")[1]
        for i, value in enumerate(row, start=1):
            text = norm(value)
            if "JB" in text.upper():
                print(i, text, flush=True)
    else:
        row = None
        for rn, current in wb.rows("IO_LIST"):
            if rn == 9:
                row = current
                break
        for i, value in enumerate(row, start=1):
            text = norm(value)
            if "JB" in text.upper():
                print(i, text, flush=True)
    print("---", flush=True)
