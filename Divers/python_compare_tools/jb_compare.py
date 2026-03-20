import argparse
import sys
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
from xlsx_helper import Workbook, norm, idx_col


def resolve_path(base_dir, value):
    path = Path(value)
    return path if path.is_absolute() else base_dir / path


def parse_args():
    parser = argparse.ArgumentParser(
        description='Compare JB_TAG_2 du master avec JB_TAG/JB_SPI_TAG des retours client.'
    )
    parser.add_argument(
        '--base-dir',
        default='.',
        help='Dossier contenant les fichiers Excel. Par defaut: dossier courant.',
    )
    parser.add_argument('--master', default='660_GLOBAL_MASTER.xlsx')
    parser.add_argument('--compare', default='FR-GPS-660_Comparaison_Client_vs_Master.xlsx')
    parser.add_argument('--return-1', default='FR-GPS-660-1_Retour_client.xlsx')
    parser.add_argument('--return-2', default='FR-GPS-660-2_Retour_client.xlsx')
    parser.add_argument('--return-3', default='FR-GPS-660-3_Retour_client.xlsx')
    parser.add_argument('--output', default='FR-GPS-660_Comparaison_JB_TAG.xlsx')
    args = parser.parse_args()

    base_dir = Path(args.base_dir).resolve()
    return {
        'base_dir': base_dir,
        'master': resolve_path(base_dir, args.master),
        'compare': resolve_path(base_dir, args.compare),
        'returns': {
            '660-1': resolve_path(base_dir, args.return_1),
            '660-2': resolve_path(base_dir, args.return_2),
            '660-3': resolve_path(base_dir, args.return_3),
        },
        'output': resolve_path(base_dir, args.output),
    }


CONFIG = parse_args()
BASE = CONFIG['base_dir']
MASTER_PATH = CONFIG['master']
COMPARE_PATH = CONFIG['compare']
RETURN_PATHS = CONFIG['returns']
OUTPUT_PATH = CONFIG['output']

required_files = [MASTER_PATH, COMPARE_PATH, *RETURN_PATHS.values()]
missing_files = [str(path) for path in required_files if not path.exists()]
if missing_files:
    missing_text = '\n'.join(missing_files)
    raise SystemExit(f'Fichiers introuvables:\n{missing_text}')


def blankish(value):
    text = norm(value)
    if not text:
        return ''
    if not text.replace('-', '').strip():
        return ''
    return text


def split_jb(value):
    raw = blankish(value)
    if not raw:
        return '', '', ''
    if '/' in raw:
        base, suffix = raw.split('/', 1)
        return raw, base.strip(), suffix.strip()
    return raw, raw.strip(), ''


def compare_jb(master_value, client_value):
    master_raw, master_base, master_suffix = split_jb(master_value)
    client_raw, client_base, client_suffix = split_jb(client_value)
    if not master_raw and not client_raw:
        return 'both_blank'
    if not master_raw and client_raw:
        return 'master_blank_client_filled'
    if master_raw and not client_raw:
        return 'master_filled_client_blank'
    if master_raw == client_raw:
        return 'exact'
    if master_base and client_base and master_base == client_base:
        return 'same_base_suffix_diff_or_missing'
    return 'mismatch'


def header_index_map(row):
    return {norm(value): idx for idx, value in enumerate(row)}


def safe_sheet_name(name, used):
    cleaned = ''.join('_' if ch in '[]:*?/\\' else ch for ch in name)
    cleaned = cleaned[:31] if len(cleaned) > 31 else cleaned
    if not cleaned:
        cleaned = 'Sheet'
    base = cleaned
    counter = 1
    while cleaned in used:
        suffix = f'_{counter}'
        limit = 31 - len(suffix)
        cleaned = f"{base[:limit]}{suffix}"
        counter += 1
    used.add(cleaned)
    return cleaned


def xml_text(value):
    text = '' if value is None else str(value)
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    return text


def sheet_xml(rows):
    max_cols = 0
    for row in rows:
        if len(row) > max_cols:
            max_cols = len(row)
    last_ref = 'A1'
    if rows and max_cols:
        last_ref = f"{idx_col(max_cols - 1)}{len(rows)}"
    parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        f'<dimension ref="A1:{last_ref}"/>',
        '<sheetViews><sheetView workbookViewId="0"/></sheetViews>',
        '<sheetFormatPr defaultRowHeight="15"/>',
        '<sheetData>',
    ]
    for r_idx, row in enumerate(rows, start=1):
        parts.append(f'<row r="{r_idx}">')
        for c_idx, value in enumerate(row, start=1):
            if value is None:
                continue
            text = str(value)
            if not text:
                continue
            cell_ref = f"{idx_col(c_idx - 1)}{r_idx}"
            parts.append(f'<c r="{cell_ref}" t="inlineStr"><is><t xml:space="preserve">{xml_text(text)}</t></is></c>')
        parts.append('</row>')
    parts.append('</sheetData>')
    parts.append('</worksheet>')
    return ''.join(parts)


def write_xlsx(path, sheets):
    used_names = set()
    named_sheets = []
    for name, rows in sheets:
        named_sheets.append((safe_sheet_name(name, used_names), rows))
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', ''.join([
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
            '<Default Extension="xml" ContentType="application/xml"/>',
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
            '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
            ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i, _ in enumerate(named_sheets, start=1)),
            '</Types>',
        ]))
        zf.writestr('_rels/.rels', ''.join([
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
            '</Relationships>',
        ]))
        zf.writestr('docProps/core.xml', ''.join([
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
            '<dc:creator>Codex</dc:creator>',
            '<cp:lastModifiedBy>Codex</cp:lastModifiedBy>',
            '<dcterms:created xsi:type="dcterms:W3CDTF">', now, '</dcterms:created>',
            '<dcterms:modified xsi:type="dcterms:W3CDTF">', now, '</dcterms:modified>',
            '<dc:title>FR-GPS-660 JB Compare</dc:title>',
            '</cp:coreProperties>',
        ]))
        zf.writestr('docProps/app.xml', ''.join([
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
            '<Application>Codex</Application>',
            f'<TitlesOfParts><vt:vector size="{len(named_sheets)}" baseType="lpstr">',
            ''.join(f'<vt:lpstr>{xml_text(name)}</vt:lpstr>' for name, _ in named_sheets),
            '</vt:vector></TitlesOfParts>',
            f'<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>{len(named_sheets)}</vt:i4></vt:variant></vt:vector></HeadingPairs>',
            '</Properties>',
        ]))
        zf.writestr('xl/workbook.xml', ''.join([
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
            '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>',
            '<sheets>',
            ''.join(f'<sheet name="{xml_text(name)}" sheetId="{i}" r:id="rId{i}"/>' for i, (name, _) in enumerate(named_sheets, start=1)),
            '</sheets>',
            '</workbook>',
        ]))
        zf.writestr('xl/_rels/workbook.xml.rels', ''.join([
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
            ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i, _ in enumerate(named_sheets, start=1)),
            '</Relationships>',
        ]))
        for i, (_, rows) in enumerate(named_sheets, start=1):
            zf.writestr(f'xl/worksheets/sheet{i}.xml', sheet_xml(rows))


comparison = Workbook(COMPARE_PATH)
master = Workbook(MASTER_PATH)
master_header = master.first_row('BDD-14')[1]
master_idx = header_index_map(master_header)
master_rows = {rn: row for rn, row in master.rows('BDD-14') if rn > 1}

return_books = {}
return_header_map = {}
return_rows_map = {}
for label, path in RETURN_PATHS.items():
    wb = Workbook(path)
    return_books[label] = wb
    header = None
    rows_map = {}
    for rn, row in wb.rows('IO_LIST'):
        if rn == 9:
            header = row
        elif rn > 9:
            rows_map[rn] = row
    return_header_map[label] = header_index_map(header)
    return_rows_map[label] = rows_map

rows_out = []
summary = Counter()
exact_rows = []
base_rows = []
mismatch_rows = []
unmatched_rows = []

header = [
    'File', 'Return_Row', 'Master_Row', 'Point_Status', 'Match_Method',
    'Return_Tag', 'Master_Tag', 'Return_Loop', 'Return_Service',
    'Master_JB_TAG_2', 'Master_JB_TAG', 'Client_JB_TAG', 'Client_JB_SPI_TAG',
    'Cmp_MasterJB2_vs_ClientJB', 'Cmp_MasterJB2_vs_ClientSPI', 'Best_Conclusion', 'Best_Source',
    'Master_JB2_Base', 'Master_JB2_Suffix',
    'Client_JB_Base', 'Client_JB_Suffix',
    'Client_SPI_Base', 'Client_SPI_Suffix'
]
rows_out.append(header)

for label in ['660-1', '660-2', '660-3']:
    sheet = f'{label} Rows'
    rows_iter = comparison.rows(sheet)
    next(rows_iter)
    for rn, row in rows_iter:
        file_label = row[0] if len(row) > 0 else ''
        return_row = int(row[1]) if len(row) > 1 and row[1] else None
        master_row = int(row[2]) if len(row) > 2 and row[2] else None
        point_status = row[3] if len(row) > 3 else ''
        match_method = row[4] if len(row) > 4 else ''
        return_tag = row[7] if len(row) > 7 else ''
        master_tag = row[8] if len(row) > 8 else ''
        return_loop = row[9] if len(row) > 9 else ''
        return_service = row[11] if len(row) > 11 else ''

        client_row = return_rows_map[label].get(return_row, [])
        client_idx = return_header_map[label]
        client_jb = blankish(client_row[client_idx['JB_TAG']]) if client_row and 'JB_TAG' in client_idx and client_idx['JB_TAG'] < len(client_row) else ''
        client_spi = blankish(client_row[client_idx['JB_SPI_TAG']]) if client_row and 'JB_SPI_TAG' in client_idx and client_idx['JB_SPI_TAG'] < len(client_row) else ''

        master_jb2 = ''
        master_jb = ''
        if master_row and master_row in master_rows:
            mrow = master_rows[master_row]
            idx_jb2 = master_idx['JB_TAG_2']
            idx_jb = master_idx['JB_TAG']
            master_jb2 = blankish(mrow[idx_jb2]) if idx_jb2 < len(mrow) else ''
            master_jb = blankish(mrow[idx_jb]) if idx_jb < len(mrow) else ''

        cmp_jb = compare_jb(master_jb2, client_jb) if master_row else 'point_unmatched'
        cmp_spi = compare_jb(master_jb2, client_spi) if master_row else 'point_unmatched'

        priority = {
            'exact': 1,
            'same_base_suffix_diff_or_missing': 2,
            'both_blank': 3,
            'master_blank_client_filled': 4,
            'master_filled_client_blank': 5,
            'mismatch': 6,
            'point_unmatched': 7,
        }
        best_source = 'Client_JB_TAG'
        best_cmp = cmp_jb
        if priority[cmp_spi] < priority[cmp_jb]:
            best_source = 'Client_JB_SPI_TAG'
            best_cmp = cmp_spi

        _, master_base, master_suffix = split_jb(master_jb2)
        _, client_base, client_suffix = split_jb(client_jb)
        _, spi_base, spi_suffix = split_jb(client_spi)

        out_row = [
            file_label, return_row, master_row or '', point_status, match_method,
            return_tag, master_tag, return_loop, return_service,
            master_jb2, master_jb, client_jb, client_spi,
            cmp_jb, cmp_spi, best_cmp, best_source,
            master_base, master_suffix,
            client_base, client_suffix,
            spi_base, spi_suffix,
        ]
        rows_out.append(out_row)
        summary[(label, best_cmp)] += 1
        summary[('GLOBAL', best_cmp)] += 1

        if best_cmp == 'exact':
            exact_rows.append(out_row)
        elif best_cmp == 'same_base_suffix_diff_or_missing':
            base_rows.append(out_row)
        elif best_cmp in ('mismatch', 'master_blank_client_filled', 'master_filled_client_blank'):
            mismatch_rows.append(out_row)
        else:
            if best_cmp == 'point_unmatched':
                unmatched_rows.append(out_row)

summary_rows = [['Metric', '660-1', '660-2', '660-3', 'Global']]
for metric in ['exact', 'same_base_suffix_diff_or_missing', 'both_blank', 'master_blank_client_filled', 'master_filled_client_blank', 'mismatch', 'point_unmatched']:
    summary_rows.append([
        metric,
        summary[('660-1', metric)],
        summary[('660-2', metric)],
        summary[('660-3', metric)],
        summary[('GLOBAL', metric)],
    ])
summary_rows.append(['Note', 'Le retour client ne contient pas de colonne JBTAG2 explicite.', '', '', 'Comparaison primaire faite contre JB_TAG, et secondaire via JB_SPI_TAG.'])

sheets = [
    ('Summary', summary_rows),
    ('JB Compare', rows_out),
    ('Exact', [header] + exact_rows),
    ('Base Match', [header] + base_rows),
    ('Mismatch', [header] + mismatch_rows),
    ('Point Unmatched', [header] + unmatched_rows),
]
write_xlsx(OUTPUT_PATH, sheets)
print(f'OUTPUT\t{OUTPUT_PATH}', flush=True)
for metric in ['exact', 'same_base_suffix_diff_or_missing', 'both_blank', 'master_blank_client_filled', 'master_filled_client_blank', 'mismatch', 'point_unmatched']:
    print(metric, summary[('GLOBAL', metric)], flush=True)
