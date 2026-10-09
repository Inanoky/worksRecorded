import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import { PDFDocument, rgb } from "pdf-lib";
import postcss from "postcss";

const root = process.cwd();
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
const modules = {
	actions: `let drawing=${JSON.stringify(fixture)}; export async function getVisualDrawings(){return {locations:['1. stāvs'],drawings:[{id:drawing.id,name:drawing.name,location:drawing.state.location,createdAt:drawing.createdAt,status:'complete'}]}}; export async function saveVisualPolygon(site,id,edit){drawing=structuredClone(drawing);drawing.state.marks.find(x=>x.id===edit.markId).polygon=edit.polygon;window.__visualPreviewDrawing=drawing;return drawing}; export async function deleteVisualDrawing(){};export async function refreshVisualDrawing(){return {drawing,addedCount:0,updatedCount:0,removedCount:0,analysisCount:0,reviewCount:0}};export async function restartVisualDrawing(){throw Error('Preview only')};export async function getVisualWorkTypes(){return ['Smilts līdzināšana','XPS izolācija 150 mm','Estrich grīda 70 mm']};export async function saveVisualWorkType(site,id,edit){drawing=structuredClone(drawing);const source=drawing.state.evidence.find(x=>x.id===edit.evidenceId);const layer=edit.work.includes('XPS')?'xps':edit.work.includes('Estrich')?'estrich':'sand';for(const item of drawing.state.evidence.filter(x=>x.recordId===source.recordId)){item.work=edit.work;for(const mark of drawing.state.marks.filter(x=>x.evidenceId===item.id))mark.layer=layer}window.__visualPreviewDrawing=drawing;return drawing};export async function resolveVisualSourceReview(){throw Error('Preview only')}`,
	upload: `export const useUploadThing=()=>({startUpload:async()=>{throw Error('Preview only')}});`,
	image: `import React from 'react';export default function Image({fill,unoptimized,sizes,style,...props}){return React.createElement('img',{...props,style:{...(fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{}),...style}})}`,
	worker: `export const pdfWorkerUrl='/worker.mjs';`,
};
const bundled = await build({
	stdin: {
		contents: `import React from 'react';import {createRoot} from 'react-dom/client';import VisualView from './flows/default-construction/visual/VisualView';const original=window.fetch;window.fetch=(url,options)=>String(url).includes('/api/sites/')?(String(url).includes('?pdf=1')?original('/plan.pdf'):Promise.resolve(new Response(JSON.stringify(window.__visualPreviewDrawing??${JSON.stringify(fixture)})))):original(url,options);createRoot(document.getElementById('root')).render(<main style={{maxWidth:1700,margin:'0 auto',padding:20}}><VisualView siteId="demo"/></main>);`,
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
				build.onResolve({ filter: /^\.\/actions$/ }, (args) =>
					args.importer.includes("visual")
						? { path: "actions", namespace: "fixture" }
						: null,
				);
				build.onResolve({ filter: /UploadthingsComponents$/ }, () => ({
					path: "upload",
					namespace: "fixture",
				}));
				build.onResolve({ filter: /^next\/image$/ }, () => ({
					path: "image",
					namespace: "fixture",
				}));
				build.onResolve({ filter: /pdf-worker-url$/ }, () => ({
					path: "worker",
					namespace: "fixture",
				}));
				build.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
					contents: modules[args.path],
					loader: "js",
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
