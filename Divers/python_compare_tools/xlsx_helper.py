import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'rel': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'pkgrel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}

def q(ns, tag):
    return f'{{{NS[ns]}}}{tag}'

def col_idx(ref):
    m = re.match(r'([A-Z]+)', ref or '')
    if not m:
        return 0
    v = 0
    for ch in m.group(1):
        v = v * 26 + (ord(ch) - 64)
    return v - 1

def idx_col(idx):
    idx += 1
    out = []
    while idx:
        idx, rem = divmod(idx - 1, 26)
        out.append(chr(65 + rem))
    return ''.join(reversed(out))

def text(elem):
    return '' if elem is None else ''.join(elem.itertext())

class Workbook:
    def __init__(self, path):
        self.path = Path(path)
        self.z = zipfile.ZipFile(self.path)
        self.shared = self._load_shared()
        self.sheets = self._load_sheets()

    def _xml(self, path):
        with self.z.open(path) as fh:
            return ET.parse(fh).getroot()

    def _load_shared(self):
        if 'xl/sharedStrings.xml' not in self.z.namelist():
            return []
        root = self._xml('xl/sharedStrings.xml')
        return [text(si) for si in root.findall(q('main', 'si'))]

    def _load_sheets(self):
        wb = self._xml('xl/workbook.xml')
        rels = self._xml('xl/_rels/workbook.xml.rels')
        rel_map = {}
        for rel in rels.findall(q('pkgrel', 'Relationship')):
            target = rel.attrib.get('Target', '')
            if not target:
                continue
            rel_map[rel.attrib['Id']] = target.lstrip('/') if target.startswith('/') else f'xl/{target}'
        out = {}
        for sh in wb.findall('main:sheets/main:sheet', NS):
            out[sh.attrib['name']] = rel_map[sh.attrib[q('rel', 'id')]]
        return out

    def _cell(self, cell):
        t = cell.attrib.get('t', '')
        if t == 'inlineStr':
            return text(cell.find(q('main', 'is')))
        raw = text(cell.find(q('main', 'v')))
        if t == 's':
            try:
                return self.shared[int(raw)]
            except Exception:
                return raw
        if t == 'b':
            return 'TRUE' if raw == '1' else 'FALSE' if raw == '0' else raw
        return raw

    def rows(self, sheet):
        with self.z.open(self.sheets[sheet]) as fh:
            ctx = ET.iterparse(fh, events=('start', 'end'))
            row = None
            cur = 0
            rn = 0
            for ev, el in ctx:
                if ev == 'start' and el.tag == q('main', 'row'):
                    row = []
                    cur = 0
                    rn = int(el.attrib.get('r', '0') or 0)
                elif ev == 'end' and el.tag == q('main', 'c') and row is not None:
                    idx = col_idx(el.attrib.get('r', ''))
                    while cur < idx:
                        row.append('')
                        cur += 1
                    row.append(self._cell(el))
                    cur += 1
                    el.clear()
                elif ev == 'end' and el.tag == q('main', 'row') and row is not None:
                    while row and row[-1] == '':
                        row.pop()
                    yield rn, row
                    row = None
                    el.clear()

    def first_row(self, sheet):
        return next(self.rows(sheet))

def norm(s):
    s = '' if s is None else str(s)
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    lines = [' '.join(part.split()) for part in s.split('\n')]
    return '\n'.join([line for line in lines if line]).strip()
