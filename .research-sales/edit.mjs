import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const source='G:/My Drive/worksRecorded/Sales/Marketing experiments/Sales Experiment records - started 17.08.xlsx';
const notes={};
for(const f of ['notes','notes2','updates','final-updates']) Object.assign(notes,JSON.parse(await fs.readFile(`.research-sales/${f}.json`,'utf8')));
notes[72]='INACTIVE exact-name match: Elektrosistēmas SIA, reg. 40103496210, removed from register 19 June 2018. No current decision-maker contacts verified. Confirm if a different company was intended. https://www.firmas.lv/en/companies/elektrosistemas/40103496210';
notes[96]='INACTIVE: AVK Sistēmas, reg. 40003706478, liquidated 27 November 2019. No current decision-maker contacts for this entity. https://company.lursoft.lv/avk-sistemas/40003706478';
for(const k of Object.keys(notes)) notes[k]='Checked 10 Sep 2026. '+notes[k].replaceAll('not yet verified','not publicly verified');
if(Object.keys(notes).length!==84) throw Error('Unexpected target count');
await fs.writeFile('.research-sales/final-notes.json',JSON.stringify(notes,null,2));
const original=await fs.readFile(source);
await fs.writeFile('.research-sales/original.xlsx',original,{flag:'wx'});
await fs.writeFile('.research-sales/source.sha256',crypto.createHash('sha256').update(original).digest('hex'));
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const s=w.worksheets.getItem('Experiment 1');
for(const [row,value] of Object.entries(notes)){
 if(s.getRange(`D${row}`).values[0][0]) throw Error(`D${row} is occupied`);
 s.getRange(`D${row}`).values=[[value]];
}
await (await SpreadsheetFile.exportXlsx(w)).save('.research-sales/authored.xlsx');
await fs.writeFile('.research-sales/after.png',new Uint8Array(await (await w.render({sheetName:'Experiment 1',range:'C26:D27',scale:1})).arrayBuffer()));
console.log('Authored 84 D cells; exported staged workbook.');
