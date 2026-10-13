import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

directory = Path(__file__).parent
source = Path("g:/My Drive/worksRecorded/companies/ProDev/Technical Task/L6_BIS (02.10.-09.10. ).xlsx")
ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
sheets = {sheet["name"]: sheet["values"] for sheet in json.loads((directory / "sheets.json").read_text(encoding="utf-8"))}
with zipfile.ZipFile(source) as archive:
    shared = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = ["".join(node.itertext()) for node in shared.findall("x:si", ns)]
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relations = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {node.attrib["Id"]: node.attrib["Target"] for node in relations}
    checked = 0
    for sheet in workbook.findall("x:sheets/x:sheet", ns):
        name = sheet.attrib["name"]
        rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        target = targets[rid]
        xml = ET.fromstring(archive.read(target.lstrip("/") if target.startswith("/") else "xl/" + target))
        for cell in xml.findall("x:sheetData/x:row/x:c", ns):
            ref = cell.attrib["r"]
            row = int("".join(c for c in ref if c.isdigit())) - 1
            column = 0
            for char in "".join(c for c in ref if c.isalpha()):
                column = column * 26 + ord(char) - 64
            column -= 1
            value = cell.find("x:v", ns)
            if value is None:
                continue
            assert cell.attrib.get("t") != "e", (name, ref, value.text)
            expected = strings[int(value.text)] if cell.attrib.get("t") == "s" else float(value.text)
            if row >= len(sheets[name]) or column >= len(sheets[name][row]):
                raise AssertionError((name, ref, "Missing extracted value"))
            actual = sheets[name][row][column]
            assert expected == actual, (name, ref, expected, actual)
            checked += 1
    print(json.dumps({"sourceSheetsVerified": len(sheets), "nonEmptySourceCellsCompared": checked, "sourceFormulaErrors": 0}))
