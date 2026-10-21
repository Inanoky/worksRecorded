import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import { PDFDocument, rgb } from "pdf-lib";
import postcss from "postcss";

const root = process.cwd();
const performancePreview = process.argv.includes("--performance");
const workspacePreview = process.argv.includes("--project-workspace");
const projectPreloadPreview =
	workspacePreview || process.argv.includes("--project-preload");
const sectionCatalog = JSON.parse(
	await readFile(
		path.join(root, "assets/visual-sections/ar-701/catalog.json"),
		"utf8",
	),
);
const fixture = {
	id: "demo-drawing",
	name: "Pirmā stāva darbu plāns.pdf",
	createdAt: "2026-09-24",
	state: {
		version: 1,
		location: "1. stāvs",
		status: "complete",
		pageCount: 1,
		processed: 3,
		error: null,
		lockedAt: null,
		attempts: [],
		unlocated: [],
		evidence: [
			"Smilts līdzināšana",
			"XPS izolācija 150 mm",
			"Estrich grīda 70 mm",
		].map((work, i) => ({
			id: `photo-${i}`,
			recordId: `record-${i}`,
			photoUrl: `https://visual-preview.test/source-${i}.svg`,
			work,
			location: "1. stāvs",
			description: [
				"Sagatavota pamatne telpās 101–103. Smilts slānis izlīdzināts un sablīvēts.",
				"Ieklātas XPS plāksnes dienvidu spārnā. Savienojumi pārbaudīti.",
				"Izbetonētas divas telpas. Darbi pabeigti atbilstoši žurnāla ierakstam.",
			][i],
			date: `2026-09-${20 + i}T09:00:00Z`,
			amount: [140, 85, 67][i],
			unit: "m2",
		})),
		marks: ["sand", "xps", "estrich"].map((layer, i) => ({
			id: `mark-${i}`,
			evidenceId: `photo-${i}`,
			layer,
			page: 1,
			confidence: 0.8,
			anchors: ["A", "B"],
			explanation: "Aptuvena zona pēc atzīmēm avota plānā.",
			polygon: [
				{ x: 0.1 + i * 0.28, y: 0.2 },
				{ x: 0.34 + i * 0.28, y: 0.2 },
				{ x: 0.34 + i * 0.28, y: 0.65 },
				{ x: 0.1 + i * 0.28, y: 0.65 },
			],
		})),
	},
};
fixture.state.marks.push({
	...fixture.state.marks[0],
	id: "mark-split",
	polygon: [
		{ x: 0.1, y: 0.74 },
		{ x: 0.25, y: 0.74 },
		{ x: 0.25, y: 0.84 },
		{ x: 0.1, y: 0.84 },
	],
});
if (process.argv.includes("--updating")) {
	fixture.state.status = "running";
	fixture.state.lockedAt = Date.now();
}
if (process.argv.includes("--failed-analysis")) {
	fixture.state.status = "failed";
	fixture.state.processed = 2;
	fixture.state.error =
		"Neizdevās analizēt 1 attēlu. Pārējie rezultāti ir saglabāti.";
	fixture.state.imageProgress = fixture.state.evidence.map((source, index) => ({
		evidenceId: source.id,
		status: index < 2 ? "complete" : "failed",
		error: index < 2 ? null : "Analīze pārsniedza laika limitu.",
	}));
}
const modules = {
	navigation: `import {useSyncExternalStore} from 'react';export function usePathname(){return useSyncExternalStore(listener=>{window.addEventListener('popstate',listener);return ()=>window.removeEventListener('popstate',listener)},()=>window.location.pathname,()=>'/')}`,
	actions: `let drawing=${JSON.stringify(fixture)}; export async function getVisualDrawings(){return {locations:['1. stāvs'],drawings:[{id:drawing.id,name:drawing.name,location:drawing.state.location,createdAt:drawing.createdAt,status:'complete'}]}}; export async function saveVisualPolygon(site,id,edit){drawing=structuredClone(drawing);drawing.state.marks.find(x=>x.id===edit.markId).polygon=edit.polygon;window.__visualPreviewDrawing=drawing;return drawing}; export async function deleteVisualDrawing(){};export async function deleteVisualPolygon(site,id,input){drawing=structuredClone(drawing);const mark=drawing.state.marks.find(x=>x.id===input.markId);if(!mark)throw Error('Missing polygon');drawing.state.marks=drawing.state.marks.filter(x=>x.id!==input.markId);drawing.state.deletedPolygons=[...(drawing.state.deletedPolygons??[]),{markId:mark.id,evidenceId:mark.evidenceId,polygon:mark.polygon,deletedAt:new Date().toISOString(),deletedBy:'preview'}];window.__visualPreviewDrawing=drawing;return drawing};export async function refreshVisualDrawing(){return {drawing,addedCount:0,updatedCount:0,removedCount:0,analysisCount:0,reviewCount:0}};export async function restartVisualDrawing(){throw Error('Preview only')};export async function getVisualWorkTypes(){return ['Smilts līdzināšana','XPS izolācija 150 mm','Estrich grīda 70 mm']};export async function saveVisualWorkType(site,id,edit){drawing=structuredClone(drawing);const source=drawing.state.evidence.find(x=>x.id===edit.evidenceId);const layer=edit.work.includes('XPS')?'xps':edit.work.includes('Estrich')?'estrich':'sand';for(const item of drawing.state.evidence.filter(x=>x.recordId===source.recordId)){item.work=edit.work;for(const mark of drawing.state.marks.filter(x=>x.evidenceId===item.id))mark.layer=layer}window.__visualPreviewDrawing=drawing;return drawing};export async function resolveVisualSourceReview(){throw Error('Preview only')}`,
	upload: `export const useUploadThing=()=>({startUpload:async()=>{throw Error('Preview only')}});`,
	image: `import React from 'react';export default function Image({fill,unoptimized,sizes,style,...props}){return React.createElement('img',{...props,style:{...(fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{}),...style}})}`,
	link: `import React from 'react';export default function Link(props){return React.createElement('a',props)}`,
	worker: `export const pdfWorkerUrl='/worker.mjs';`,
};
modules.navigation += `export function useRouter(){return {refresh(){throw Error("Unexpected route refresh in preview")}}}`;
const planningFixture = {
	sections: process.argv.includes("--sections")
		? sectionCatalog.sections.map((section) => section.code)
		: ["A korpuss", "B korpuss"],
	sectionDrawingCodes: process.argv.includes("--sections")
		? sectionCatalog.sections.map((section) => section.code)
		: [],
	today: "2026-10-15",
	location: "1. stāvs",
	workOptions: [
		{ work: "Smilts", unit: "m2" },
		{ work: "XPS", unit: "m2" },
	],
	unitOptions: ["m2", "m3"],
	contacts: process.argv.includes("--whatsapp")
		? [
				{
					id: "member:demo-contact",
					name: "Organizācijas kontakts (demo)",
					phone: "37120000000",
					archivedAt: null,
				},
			]
		: [],
	plans: process.argv.includes("--whatsapp")
		? [
				{
					id: "demo-task",
					version: 1,
					drawingId: fixture.id,
					work: "XPS",
					location: "1. stāvs",
					unit: "m2",
					quantity: 85,
					startDate: "2026-10-15",
					endDate: "2026-10-19",
					contactId: "member:demo-contact",
					geometry: {
						version: 1,
						...(process.argv.includes("--sections")
							? { section: "PA1.6" }
							: {}),
						areas: [
							{
								id: "demo-area",
								page: 1,
								polygon: fixture.state.marks[1].polygon,
							},
						],
					},
					geometryReviewRequired: false,
					archivedAt: null,
					progress: {
						actualIds: [],
						actualQuantity: 0,
						progressPercent: 0,
						variance: -85,
						dataIncomplete: false,
						status: "active",
					},
				},
			]
		: [],
};
modules.actions += performancePreview
	? `const planning=${JSON.stringify(planningFixture)};export async function getVisualPlanning(site,id){return {...planning,location:id==='demo-drawing-2'?'2. stāvs':'1. stāvs',plans:planning.plans.filter(plan=>plan.drawingId===id)}};export async function saveVisualPlanningItem(input){await new Promise(resolve=>setTimeout(resolve,15000));const plan={...input,id:input.id??input.clientId,version:(input.version??0)+1,geometryReviewRequired:false,archivedAt:null,progress:{actualIds:[],actualQuantity:0,progressPercent:0,variance:-input.quantity,dataIncomplete:false,status:'active'}};planning.plans=planning.plans.filter(item=>item.id!==plan.id);planning.plans.push(plan);return {ok:true,plan}};export async function archiveVisualPlanningItem(){throw Error('Preview only')};export async function restoreVisualPlanningItem(){throw Error('Preview only')};`
	: `export async function getVisualPlanning(){return ${JSON.stringify(planningFixture)}};export async function saveVisualPlanningItem(){throw Error('Preview only')};export async function archiveVisualPlanningItem(){throw Error('Preview only')};export async function restoreVisualPlanningItem(){throw Error('Preview only')};`;
modules.actions += `let sections=${JSON.stringify(planningFixture.sections)};export async function addVisualSection(site,label){sections=[...sections,label.trim()];return sections};export async function revokeVisualWorkShare(){};`;
modules.share = `export async function publishPlanningShare(site,plan){return {token:'synthetic-preview',url:'https://www.worksrecorded.com/shared/work/synthetic-preview',version:plan.version}};`;
modules.send = `export async function sendPlanningWhatsAppTask(){throw Error('Preview only')};`;
modules.actions += `export async function saveVisualPolygonPatch(){throw Error('Preview only')};export async function saveVisualLayers(){throw Error('Preview only')};export async function saveVisualDrawingScale(site,id,{page,scale}){const pageScales={...drawing.state.pageScales};if(scale===null)delete pageScales[page];else pageScales[page]=scale;drawing={...drawing,state:{...drawing.state,pageScales}};return pageScales};`;
if (projectPreloadPreview) {
	modules.actions = modules.actions
		.replace(
			"export async function getVisualDrawings()",
			"async function getPreviewDrawingIndex()",
		)
		.replace(
			"export async function refreshVisualDrawing()",
			"async function refreshPreviewDrawing()",
		)
		.replace(
			"export async function getVisualPlanning()",
			"async function getPreviewPlanning()",
		);
	modules.actions += `export async function getVisualDrawings(){await new Promise(resolve=>setTimeout(resolve,6000));const index=await getPreviewDrawingIndex();return {...index,locations:['1. stāvs','2. stāvs'],drawings:[...index.drawings,{...index.drawings[0],id:'demo-drawing-2',location:'2. stāvs'}]}};export async function getVisualPlanning(site,id){await new Promise(resolve=>setTimeout(resolve,9000));const index=await getPreviewPlanning();return {...index,location:id==='demo-drawing-2'?'2. stāvs':'1. stāvs',plans:index.plans.filter(plan=>plan.drawingId===id)}};`;
	modules.actions += `export async function refreshVisualDrawing(site,id){const result=structuredClone(await refreshPreviewDrawing());if(id==='demo-drawing-2'){result.drawing.id=id;result.drawing.state.location='2. stāvs'}return result};`;
}
modules.actions += `export async function addVisualRecord(site,id,record){
 drawing=structuredClone(drawing);
 const sourceId=record.id+':manual';
 drawing.state.evidence.push({id:sourceId,recordId:record.id,manual:true,photoUrl:'',work:record.work,location:drawing.state.location,description:record.comments,date:record.date+'T00:00:00.000Z',amount:record.quantity,unit:record.unit});
 const layer=record.work.includes('XPS')?'xps':record.work.includes('Estrich')?'estrich':'sand';
 const marks=record.areas.map((area,i)=>({id:sourceId+':'+i,evidenceId:sourceId,layer,page:area.page,polygon:area.polygon,confidence:1,anchors:['Manual',drawing.state.location],explanation:'Manuāli pievienota zona',editedAt:new Date().toISOString(),editedBy:'preview'}));
 drawing.state.marks.push(...marks);
 window.__visualPreviewDrawing=drawing;
 return {ok:true,drawing,markId:marks[0].id};
};`;
const bundled = await build({
	stdin: {
		contents: workspacePreview
			? `import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';import {VisualProjectView} from './flows/default-construction/visual/VisualProjectView';import {RetainedLimeniDiary} from './flows/default-construction/frontend/RetainedLimeniDiary';import {RetainedLimeniForma2} from './flows/default-construction/frontend/RetainedLimeniForma2';import {ProjectLoadingProgressProvider} from './components/providers/ProjectLoadingProgressProvider';import {ProjectOpeningOverlay} from './components/providers/ProjectOpeningOverlay';import {getVisualDrawings,getVisualPlanning} from './flows/default-construction/visual/actions';const original=window.fetch;const counts={};const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));window.fetch=async(url,options)=>{const name=String(url);counts[name]=(counts[name]??0)+1;window.dispatchEvent(new Event('preview-count'));if(name.includes('?pdf=1')){await wait(2000);return original('/plan.pdf')}if(name.endsWith('/limeni-workspace')){await wait(3000);return new Response(JSON.stringify({siteId:'demo',userId:'preview',organizationId:'limeni',bisEnabled:false,organizationLanguage:'lv'}))}if(name.endsWith('/forma2/results')){await wait(1200);return new Response(JSON.stringify({data:{siteName:'Demonstrācijas Forma 2',document:null,resultRows:[]},organizationLanguage:'lv'}),{headers:{etag:'"fixture"'}})}if(name.endsWith('/visual'))return new Response(JSON.stringify(await getVisualDrawings()));if(name.endsWith('/planning'))return new Response(JSON.stringify(await getVisualPlanning('demo',name.includes('demo-drawing-2')?'demo-drawing-2':'demo-drawing')));if(name.includes('/api/sites/')&&!name.includes('/section-drawing?')){const drawing=structuredClone(${JSON.stringify(fixture)});if(name.includes('demo-drawing-2')){drawing.id='demo-drawing-2';drawing.state.location='2. stāvs'}return new Response(JSON.stringify(drawing))}return original(url,options)};history.replaceState(null,'','/dashboard/sites/demo/dashboard');function Preview(){const [requests,setRequests]=useState({});useEffect(()=>{const update=()=>setRequests({...counts});window.addEventListener('preview-count',update);return()=>window.removeEventListener('preview-count',update)},[]);return <ProjectLoadingProgressProvider enabled visualPreloadEnabled><header style={{padding:12,display:'flex',gap:12}}>{[['dashboard','Būvdarbu žurnāls'],['izpildshemas','Izpildshēmas'],['analytics','Forma 2']].map(([path,label])=><button key={path} style={{padding:8,border:'1px solid #ccc'}} onClick={()=>{history.pushState(null,'','/dashboard/sites/demo/'+path);window.dispatchEvent(new PopStateEvent('popstate'))}}>{label}</button>)}</header><VisualProjectView siteId="demo"><RetainedLimeniDiary siteId="demo"><RetainedLimeniForma2 siteId="demo"/><ProjectOpeningOverlay label="Ielādē projektu…"/></RetainedLimeniDiary></VisualProjectView><details style={{padding:12}}><summary>Preview request counts</summary><pre aria-label="Request counts">{JSON.stringify(requests,null,2)}</pre></details></ProjectLoadingProgressProvider>}createRoot(document.getElementById('root')).render(<main style={{padding:20}}><Preview/></main>);`
			: projectPreloadPreview
				? `import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';import {VisualProjectView} from './flows/default-construction/visual/VisualProjectView';import {ProjectLoadingProgressProvider,useProjectPreparationStep} from './components/providers/ProjectLoadingProgressProvider';import {ProjectOpeningOverlay} from './components/providers/ProjectOpeningOverlay';const original=window.fetch;window.fetch=async(url,options)=>{if(String(url).includes('?pdf=1')){await new Promise(resolve=>setTimeout(resolve,5000));return original('/plan.pdf')}if(String(url).includes('/api/sites/')&&!String(url).includes('/section-drawing?')){const drawing=structuredClone(${JSON.stringify(fixture)});if(String(url).includes('demo-drawing-2')){drawing.id='demo-drawing-2';drawing.state.location='2. stāvs'}return new Response(JSON.stringify(drawing))}return original(url,options)};history.replaceState(null,'','/dashboard/sites/demo/dashboard');function Diary(){const [settings,setSettings]=useState(false);const [ready,setReady]=useState(false);useEffect(()=>{const first=setTimeout(()=>setSettings(true),4000);const second=setTimeout(()=>setReady(true),18000);return()=>{clearTimeout(first);clearTimeout(second)}},[]);useProjectPreparationStep('demo','settings',settings);useProjectPreparationStep('demo','diary',ready);return <><h1 style={{fontSize:24,padding:12}}>Limeni · demonstrācijas projekts</h1><button style={{padding:12,border:'1px solid #ccc'}} onClick={()=>{history.pushState(null,'','/dashboard/sites/demo/izpildshemas');window.dispatchEvent(new PopStateEvent('popstate'))}}>Atvērt Izpildshēmas</button>{!ready?<ProjectOpeningOverlay label="Ielādē projektu…"/>:null}</>}createRoot(document.getElementById('root')).render(<main style={{padding:20}}><ProjectLoadingProgressProvider enabled visualPreloadEnabled><VisualProjectView siteId="demo"><Diary/></VisualProjectView></ProjectLoadingProgressProvider></main>);`
				: performancePreview
					? `import React,{useMemo,useState} from 'react';import {createRoot} from 'react-dom/client';import {VisualPlanningPanel} from './flows/default-construction/visual/VisualPlanningPanel';import {VisualClientCache} from './flows/default-construction/visual/visual-client-cache';const original=window.fetch;window.fetch=(url,options)=>String(url).includes('?pdf=1')?original('/plan.pdf'):original(url,options);function Preview(){const [floor,setFloor]=useState('1. stāvs');const [dirty,setDirty]=useState(false);const cache=useMemo(()=>new VisualClientCache('demo'),[]);const drawing={...${JSON.stringify(fixture)},id:floor==='1. stāvs'?'demo-drawing':'demo-drawing-2',state:{...${JSON.stringify(fixture.state)},location:floor}};return <main style={{padding:20,height:'100dvh',display:'flex',flexDirection:'column'}}><label style={{padding:8}}>Stāvs <select aria-label="Stāvs" value={floor} disabled={dirty} onChange={event=>setFloor(event.target.value)}><option>1. stāvs</option><option>2. stāvs</option></select></label><div style={{flex:1,minHeight:0}}><VisualPlanningPanel key={drawing.id} drawing={drawing} siteId="demo" resourceCache={cache} sidebarOpen onDirtyChange={setDirty}/></div></main>}createRoot(document.getElementById('root')).render(<Preview/>);`
					: process.argv.includes("--planning")
						? `import React from 'react';import {createRoot} from 'react-dom/client';import {VisualPlanningPanel} from './flows/default-construction/visual/VisualPlanningPanel';const original=window.fetch;window.fetch=(url,options)=>String(url).includes('?pdf=1')?original('/plan.pdf'):original(url,options);createRoot(document.getElementById('root')).render(<main style={{padding:20,height:'100dvh'}}><VisualPlanningPanel drawing={${JSON.stringify(fixture)}} siteId="demo" sidebarOpen onDirtyChange={()=>{}}/></main>);`
						: `import React from 'react';import {createRoot} from 'react-dom/client';import VisualView from './flows/default-construction/visual/VisualView';const original=window.fetch;window.fetch=(url,options)=>String(url).includes('/api/sites/')&&!String(url).includes('/section-drawing?')?(String(url).includes('?pdf=1')?original('/plan.pdf'):Promise.resolve(new Response(JSON.stringify(window.__visualPreviewDrawing??${JSON.stringify(fixture)})))):original(url,options);createRoot(document.getElementById('root')).render(<main style={{maxWidth:1700,margin:'0 auto',padding:20}}><VisualView siteId="demo"/></main>);`,
		loader: "tsx",
		resolveDir: root,
	},
	bundle: true,
	write: false,
	format: "esm",
	jsx: "automatic",
	target: "es2022",
	define: { "process.env.NODE_ENV": '"development"' },
	plugins: [
		{
			name: "isolated-visual-preview",
			setup(build) {
				if (workspacePreview) {
					modules["workspace-diary"] =
						`import React,{useEffect} from 'react';import {useProjectPreparationReporter} from './components/providers/ProjectLoadingProgressProvider';export default function Diary(){const report=useProjectPreparationReporter('demo');useEffect(()=>{const timer=setTimeout(()=>{report('settings');report('diary')},1800);return()=>clearTimeout(timer)},[report]);return <section style={{padding:24}}><h1>Būvdarbu žurnāls · preview</h1><input aria-label="Žurnāla filtrs" placeholder="Filtrēt darbus" style={{border:'1px solid #aaa',padding:8}}/></section>}`;
					modules["workspace-forma2"] =
						`import React from 'react';export function DefaultConstructionForma2View({data}){return <section style={{padding:24}}><h1>{data.siteName}</h1><input aria-label="Forma 2 filtrs" placeholder="Filtrēt pozīcijas" style={{border:'1px solid #aaa',padding:8}}/><p>Saglabāts Forma 2 priekšskatījums</p></section>}`;
					modules["workspace-queue"] =
						`export function useDiarySaveQueue(){return {snapshot:{revision:0,items:[]}}}`;
					build.onResolve(
						{ filter: /components\/sitediary\/SiteDiaryList$/ },
						() => ({ path: "workspace-diary", namespace: "fixture" }),
					);
					build.onResolve({ filter: /DefaultConstructionForma2View$/ }, () => ({
						path: "workspace-forma2",
						namespace: "fixture",
					}));
					build.onResolve({ filter: /DiarySaveProvider$/ }, () => ({
						path: "workspace-queue",
						namespace: "fixture",
					}));
				}
				build.onResolve({ filter: /^next\/navigation$/ }, () => ({
					path: "navigation",
					namespace: "fixture",
				}));
				build.onResolve(
					{ filter: /^\.\/planning-whatsapp-send-client$/ },
					() => ({ path: "send", namespace: "fixture" }),
				);
				build.onResolve({ filter: /^\.\/planning-share-client$/ }, () => ({
					path: "share",
					namespace: "fixture",
				}));
				build.onResolve({ filter: /^\.\/actions$/ }, (args) =>
					args.importer.includes("visual")
						? { path: "actions", namespace: "fixture" }
						: null,
				);
				build.onResolve(
					{ filter: /flows\/default-construction\/visual\/actions$/ },
					() => ({ path: "actions", namespace: "fixture" }),
				);
				build.onResolve({ filter: /UploadthingsComponents$/ }, () => ({
					path: "upload",
					namespace: "fixture",
				}));
				build.onResolve({ filter: /^next\/image$/ }, () => ({
					path: "image",
					namespace: "fixture",
				}));
				build.onResolve({ filter: /^next\/link$/ }, () => ({
					path: "link",
					namespace: "fixture",
				}));
				build.onResolve({ filter: /pdf-worker-url$/ }, () => ({
					path: "worker",
					namespace: "fixture",
				}));
				build.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
					contents: modules[args.path],
					loader: args.path.startsWith("workspace-") ? "jsx" : "js",
					resolveDir: root,
				}));
			},
		},
	],
});
const css = (
	await postcss([tailwind({ base: root })]).process(
		await readFile(path.join(root, "app/globals.css"), "utf8"),
		{ from: path.join(root, "app/globals.css") },
	)
).css;
const pdf = await PDFDocument.create();
const page = pdf.addPage([1000, 700]);
page.drawText("GROUND FLOOR - DEMONSTRATION DRAWING", {
	x: 70,
	y: 650,
	size: 18,
});
page.drawText("M 1:100", { x: 800, y: 650, size: 14 });
page.drawRectangle({
	x: 75,
	y: 170,
	width: 850,
	height: 410,
	borderColor: rgb(0.2, 0.2, 0.2),
	borderWidth: 3,
});
for (let i = 0; i < 3; i++) {
	page.drawRectangle({
		x: 100 + i * 280,
		y: 245,
		width: 240,
		height: 315,
		borderColor: rgb(0.2, 0.2, 0.2),
		borderWidth: 2,
	});
	page.drawText(`ROOM ${101 + i}`, { x: 155 + i * 280, y: 420, size: 14 });
	page.drawText(`${[140, 85, 67][i]} m2`, {
		x: 160 + i * 280,
		y: 390,
		size: 12,
	});
}
page.drawText("CORRIDOR", { x: 440, y: 200, size: 12 });
const pdfBytes = await pdf.save();
const worker = await readFile(
	path.join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
);
const assets = new Map([
	[
		"/",
		[
			"text/html",
			'<!doctype html><html lang="lv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visual – isolated preview</title><link rel="stylesheet" href="/style.css"><body style="font-family:Arial,sans-serif"><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>',
		],
	],
	["/bundle.js", ["text/javascript", bundled.outputFiles[0].contents]],
	["/style.css", ["text/css", css]],
	["/worker.mjs", ["text/javascript", worker]],
	["/plan.pdf", ["application/pdf", pdfBytes]],
]);
for (let i = 0; i < 3; i++) {
	assets.set(`/source-${i}.svg`, [
		"image/svg+xml",
		`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700"><rect width="1000" height="700" fill="white"/><text x="60" y="60" font-family="Arial" font-size="22">Original message image · ${i + 1}</text><rect x="75" y="120" width="850" height="410" fill="none" stroke="#333" stroke-width="3"/>${[0, 1, 2].map((j) => `<rect x="${100 + j * 280}" y="140" width="240" height="315" fill="none" stroke="#333" stroke-width="2"/><text x="${140 + j * 280}" y="270" font-size="20" font-family="Arial">ROOM ${101 + j}</text>`).join("")}<path d="M${110 + i * 280} 160 l205 265 m-205 -225 l205 225 m-205 -185 l205 185" stroke="${["#16a34a", "#eab308", "#ef4444"][i]}" fill="none" stroke-width="12"/></svg>`,
	]);
}
if (process.argv.includes("--sections")) {
	for (const section of sectionCatalog.sections) {
		assets.set(
			`/api/sites/demo/visual/section-drawing?${new URLSearchParams({ section: section.code })}`,
			[
				"image/png",
				await readFile(
					path.join(root, "assets/visual-sections/ar-701", section.file),
				),
			],
		);
	}
}
createServer((request, response) => {
	const asset = assets.get(request.url);
	if (!asset) {
		response.writeHead(404);
		response.end();
		return;
	}
	response.writeHead(200, {
		"Content-Type": asset[0],
		"Cache-Control": "no-store",
	});
	response.end(asset[1]);
}).listen(4318, "127.0.0.1", () =>
	console.log(
		"Isolated Visual preview: http://127.0.0.1:4318 (synthetic data only; no database or AI calls)",
	),
);
