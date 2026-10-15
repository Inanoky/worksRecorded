const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const os = require("node:os");
const esbuild = require("esbuild");
const { chromium } = require("playwright");
const XLSX = require("xlsx");

const mockSource = `
const proposal={date:"2026-09-04",sourceWork:"Kompensacijas montāža",description:"Spriegošanas ierīču montāža stacijā Olaine, balstos 21-24 un 21-18.",rawMasts:"21-24,21-18",masts:["21-24","21-18"],quantity:2,measurement:"110",unit:"komplekts",workers:4,start:"19:00",end:"05:00",responsibleId:"1",responsibleType:"logbooks_responsible_person",buildingIds:["2"],materials:[],drawings:[],evidence:[],spans:[],notes:"Pārbaudīt rasējuma revīziju",materialSource:"",reviewed:true,authorMode:"api"};
const base={id:"r1",localId:"FIMA-010",siteId:"site",version:1,stage:"ready",proposal,sources:[{file:"KUCE.xlsx",sheet:"4-5",cell:"C17",raw:"Original source"}],bisId:null,bisCaseId:null,bisStatus:null,managed:false,snapshot:null,updatedAt:"2026-10-15T12:00:00Z"};
const data={bisBase:"https://example.test",sites:[{id:"site",name:"Olaine",bisCaseId:"123",bisCaseName:"Kontakttīkla atjaunošana stacijā Olaine"}],records:[base,{...base,id:"r2",localId:"FIMA-011",stage:"recorded",bisId:"777",bisCaseId:"123",bisStatus:"approved",proposal:{...proposal,sourceWork:"Fidera konstrukcijas un izolatorus montāža",description:"Esošais FIMA ieraksts"}},{...base,id:"r3",localId:"FIMA-012",proposal:{...proposal,authorMode:"browser"}}],templates:[],operations:[],truncated:false};
globalThis.__fimaCalls=[];
export async function copyFimaCommonFields(){return 1;}
export async function getFimaWorkspace(){return structuredClone(data);}
export async function saveFimaRecord(id,version,p,stage){const r=data.records.find(r=>r.id===id);if(r.version!==version)throw Error("stale");r.proposal=structuredClone(p);r.stage=stage;r.version++;globalThis.__fimaCalls.push({kind:"save",id,proposal:p});}
export async function executeFimaBis(id,version,kind,accept){if(!accept)throw Error("not accepted");const r=data.records.find(r=>r.id===id);r.bisId="12345";r.bisStatus="draft";r.managed=true;r.stage="recorded";r.version++;globalThis.__fimaCalls.push({kind,id,accept});}
export async function getFimaCaseResources(){return {caseId:"123",base:"https://example.test",errors:[],measures:[{id:"m",attributes:{code:"110",name:"komplekts"}}],available_responsible_persons:[{id:"p",attributes:{responsible_person_id:1,responsible_person_type:"logbooks_responsible_person",person_full_name:"Atbildīgā persona"}}],case_buildings:[{id:"2",attributes:{construction_name:"Kontakttīkls"}}],available_used_materials:[],project:[]};}
export async function importFimaRows(site,file,rows){globalThis.__fimaCalls.push({kind:"import",site,count:rows.length});return {count:rows.length,duplicate:false};}
export async function addFimaRecord(){throw Error("not used in this test");}
export async function mergeFimaRows(){throw Error("not used in this test");}
export async function saveFimaTemplate(){}
export async function searchFimaBisHistory(){return [];}
export async function searchFimaKuceHistory(){return [];}
export async function getFimaHistory(){return [];}
export async function refreshFimaBis(){}
export async function linkFimaBis(){}
export async function inspectFimaBis(){return {};}
`;

(async()=>{
 const app=process.cwd();const out=await fs.mkdtemp(path.join(os.tmpdir(),"fima-ui-"));let browser,server;
 try{
 await esbuild.build({stdin:{contents:'import React from "react";import{createRoot}from"react-dom/client";import{FimaWorkspace}from"./flows/fima/frontend/FimaWorkspace";createRoot(document.getElementById("root")).render(<FimaWorkspace/>);',resolveDir:app,loader:"tsx"},outfile:path.join(out,"app.js"),bundle:true,platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"development"'},plugins:[{name:"mock-fima-services",setup(build){build.onResolve({filter:/backend\/(actions|operations|client)$/},()=>({path:"fima-mocks",namespace:"mock"}));build.onLoad({filter:/.*/,namespace:"mock"},()=>({contents:mockSource,loader:"js"}));}}]});
 const html='<!doctype html><html lang="lv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#edf1f3;padding:20px}button,input,select{font:inherit}</style><div id="root"></div><script src="/app.js"></script></html>';
 server=http.createServer(async(req,res)=>{try{const file=req.url==="/app.js"?path.join(out,"app.js"):req.url==="/app.css"?path.join(out,"app.css"):req.url==="/logos/fima-official.png"?path.join(app,"public/logos/fima-official.png"):null;res.setHeader("Content-Type",req.url?.endsWith('.js')?'text/javascript':req.url?.endsWith('.css')?'text/css':req.url?.endsWith('.png')?'image/png':'text/html');res.end(file?await fs.readFile(file):html);}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,channel:process.env.FIMA_BROWSER_CHANNEL||(process.platform==="win32"?"msedge":undefined)});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on("pageerror",e=>{errors.push(e.message);console.error("Browser error:",e.message);});await page.route("**/*",route=>route.request().url().startsWith(origin)?route.continue():route.abort());await page.goto(origin);
 await page.getByRole("button",{name:"FIMA-010",exact:true}).waitFor();
 await page.getByRole("button",{name:"FIMA-011",exact:true}).click();assert.equal(await page.getByRole("textbox",{name:/BIS darbu apraksts/}).isDisabled(),true);
 await page.getByLabel("Atlasīt FIMA-011",{exact:true}).check();assert.equal(await page.getByRole("button",{name:"Materiālus uz 0",exact:true}).isDisabled(),true);await page.getByRole("button",{name:"Noņemt atlasi"}).click();
 await page.getByRole("button",{name:"FIMA-010",exact:true}).click();await page.getByRole("textbox",{name:/BIS darbu apraksts/}).fill("Exact reviewed description\nSecond line");await page.getByRole("button",{name:"Saglabāt priekšlikumu",exact:true}).click();await page.waitForFunction(()=>globalThis.__fimaCalls.some(c=>c.kind==="save"));assert.equal(await page.getByLabel("Darbu apjoms",{exact:true}).inputValue(),"2");
 await page.getByLabel("Pārbaudīts apraksts",{exact:false}).check();await page.getByRole("button",{name:"Atzīmēt pārbaudītu",exact:true}).click();await page.waitForFunction(()=>globalThis.__fimaCalls.filter(c=>c.kind==="save").length===2);
 await page.getByLabel("Atlasīt FIMA-010",{exact:true}).check();await page.getByRole("button",{name:"Izveidot API sagataves",exact:true}).click();assert.equal(await page.getByRole("button",{name:"Izpildīt 1 ierakstiem"}).isDisabled(),true);
 await page.getByLabel("Piekrītu API izveidei",{exact:false}).check();await page.getByRole("button",{name:"Izpildīt 1 ierakstiem"}).click();await page.getByText("FIMA-010: saglabāts un pārbaudīts",{exact:true}).waitFor();assert.equal(await page.evaluate(()=>globalThis.__fimaCalls.filter(c=>c.kind==="create").length),1);
 const link=page.getByRole("link",{name:"BIS 12345 ↗",exact:true});assert.match(await link.getAttribute("href"),/example.test.*\/edit\?entry_ids/);
 await page.getByRole("button",{name:"Aizvērt detaļas"}).click();await page.getByText("Importēt KUCE atskaiti vai sagatavoto Excel reģistru",{exact:true}).click();
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Lokālais ID","Darbu datums","KUCE oriģināls","Buvconsult piedāvātais BIS ieraksts","BIS lietas nosaukums"],["FIMA-020","04.09.2026","Work","Proposal","Olaine"],["FIMA-021","04.09.2026","Work 2","Proposal 2","Torņakalns"]]),"Register");
 await page.getByLabel("Excel fails").setInputFiles({name:"review.xlsx",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",buffer:XLSX.write(wb,{type:"buffer",bookType:"xlsx"})});await page.getByLabel("Avota BIS lieta",{exact:false}).waitFor();await page.getByRole("combobox",{name:/Piesaistīt projektam/}).selectOption("site");await page.getByRole("button",{name:"Saglabāt importu",exact:true}).click();await page.waitForFunction(()=>globalThis.__fimaCalls.some(c=>c.kind==="import"));assert.equal(await page.evaluate(()=>globalThis.__fimaCalls.find(c=>c.kind==="import").count),1);
 await page.getByText("Importēt KUCE atskaiti vai sagatavoto Excel reģistru",{exact:true}).click();await page.getByRole("button",{name:"FIMA-012",exact:true}).click();await page.getByRole("heading",{name:"Izveide no sava BIS profila"}).waitFor();
 const screenshotDir=path.resolve(process.env.FIMA_TEST_OUTPUT||path.join(app,"outputs/fima-ui"));await fs.mkdir(screenshotDir,{recursive:true});await page.screenshot({path:path.join(screenshotDir,"desktop.png"),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(screenshotDir,"mobile.png"),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,"mobile viewport overflows");assert.deepEqual(errors,[]);
 console.log("PASS: protected records, exact editing, readiness, API author acknowledgement, verified link, case-specific Excel import, browser assistance, desktop/mobile layouts. All services mocked.");console.log(screenshotDir);
 }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
