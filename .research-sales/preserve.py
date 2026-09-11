from pathlib import Path
import json, re, zipfile, hashlib, io, copy
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
import openpyxl

base=Path('.research-sales')
source=Path('G:/My Drive/worksRecorded/Sales/Marketing experiments/Sales Experiment records - started 17.08.xlsx')
original=(base/'original.xlsx').read_bytes()
notes=json.loads((base/'final-notes.json').read_text(encoding='utf8'))
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
before=openpyxl.load_workbook(io.BytesIO(original))
sheet=before['Experiment 1']
eligible={str(r) for r in range(2,sheet.max_row+1) if sheet.cell(r,3).value and all(sheet.cell(r,c).value is None for c in range(4,22))}
assert eligible==set(notes),(eligible-set(notes),set(notes)-eligible)
zin=zipfile.ZipFile(io.BytesIO(original))
wb=ET.fromstring(zin.read('xl/workbook.xml'))
sid=next(s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'] for s in wb.find('m:sheets',ns) if s.attrib['name']=='Experiment 1')
rels=ET.fromstring(zin.read('xl/_rels/workbook.xml.rels'))
target=next(x.attrib['Target'] for x in rels if x.attrib['Id']==sid)
part=target.lstrip('/') if target.startswith('/') else 'xl/'+target
xml=zin.read(part).decode('utf8')
old_cells={}
for row,value in notes.items():
    ref='D'+row
    pat=rf'<c\b(?=[^>]*\br="{ref}")[^>]*(?:/>|>.*?</c>)'
    matches=list(re.finditer(pat,xml,re.S))
    if not matches:
        new=f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{escape(value)}</t></is></c>'
        rowmatch=re.search(rf'<row\b(?=[^>]*\br="{row}")[^>]*>.*?</row>',xml,re.S)
        assert rowmatch,ref
        rowxml=rowmatch.group()
        later=re.search(r'<c\b[^>]*\br="([A-Z]+)'+row+r'"',rowxml)
        positions=list(re.finditer(r'<c\b[^>]*\br="([A-Z]+)'+row+r'"',rowxml))
        pos=next((m.start() for m in positions if (len(m.group(1)),m.group(1))>(1,'D')),rowxml.index('</row>'))
        inserted=rowxml[:pos]+new+rowxml[pos:]
        xml=xml[:rowmatch.start()]+inserted+xml[rowmatch.end():]
        old_cells[ref]=''
        continue
    assert len(matches)==1,(ref,len(matches))
    old=matches[0].group()
    old_cells[ref]=old
    cell=ET.fromstring(old)
    assert cell.find('m:f',ns) is None
    attrs=old[2:old.index('>')].rstrip('/').strip()
    attrs=re.sub(r'\s+t="[^"]*"','',attrs)
    new=f'<c {attrs} t="inlineStr"><is><t xml:space="preserve">{escape(value)}</t></is></c>'
    xml=xml[:matches[0].start()]+new+xml[matches[0].end():]
out=io.BytesIO()
with zipfile.ZipFile(out,'w') as zout:
    for info in zin.infolist():
        zout.writestr(copy.copy(info),xml.encode('utf8') if info.filename==part else zin.read(info.filename))
updated=out.getvalue()
after=openpyxl.load_workbook(io.BytesIO(updated))
assert before.sheetnames==after.sheetnames
changed=[]
for ws in before:
    aws=after[ws.title]
    for cells in ws:
        for cell in cells:
            other=aws[cell.coordinate]
            expected=notes[str(cell.row)] if ws.title=='Experiment 1' and cell.column==4 and str(cell.row) in notes else cell.value
            assert other.value==expected,(ws.title,cell.coordinate)
            assert cell.style_id==other.style_id,(ws.title,cell.coordinate,'style')
            if cell.value!=other.value: changed.append(f'{ws.title}!{cell.coordinate}')
assert len(changed)==84
znew=zipfile.ZipFile(io.BytesIO(updated))
assert zin.namelist()==znew.namelist()
for name in zin.namelist():
    if name!=part: assert zin.read(name)==znew.read(name),name
# Verify worksheet XML outside the 84 target cells is byte-for-byte unchanged.
restored=xml
for ref,old in old_cells.items():
    pat=rf'<c\b(?=[^>]*\br="{ref}")[^>]*>.*?</c>'
    restored,n=re.subn(pat,lambda _:old,restored,count=1,flags=re.S)
    assert n==1
assert restored.encode('utf8')==zin.read(part)
assert hashlib.sha256(source.read_bytes()).hexdigest()==(base/'source.sha256').read_text(),'Source changed concurrently'
(base/'ready.xlsx').write_bytes(updated)
try:
    source.write_bytes(updated)
    assert source.read_bytes()==updated
    print('Original workbook updated.')
except PermissionError:
    print('Original is locked for writing; verified update saved as .research-sales/ready.xlsx')
(base/'verification.json').write_text(json.dumps({'changed_cells':changed,'all_other_xml_and_parts_unchanged':True,'source_sha256_after':hashlib.sha256(updated).hexdigest()},indent=2))
print('Verified exactly 84 D values changed; all other XML and package parts unchanged.')
