import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const p='G:/My Drive/worksRecorded/Sales/Marketing experiments/Sales Experiment records - started 17.08.xlsx';
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(p));
console.log((await w.inspect({kind:'sheet',include:'id,name'})).ndjson);
await fs.writeFile('.research-sales/before.png',new Uint8Array(await (await w.render({sheetName:'Experiment 1',range:'B26:D31',scale:1})).arrayBuffer()));
