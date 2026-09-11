import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const w=await SpreadsheetFile.importXlsx(await FileBlob.load('.research-sales/ready.xlsx'));
console.log((await w.inspect({kind:'sheet',include:'id,name'})).ndjson);
await fs.writeFile('.research-sales/after.png',new Uint8Array(await (await w.render({sheetName:'Experiment 1',range:'C26:D27',scale:1})).arrayBuffer()));
