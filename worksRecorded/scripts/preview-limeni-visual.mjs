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
			photoUrl: "",
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
	actions: `let drawing=${JSON.stringify(fixture)}; export async function getVisualDrawings(){return {locations:['1. stāvs'],drawings:[{id:drawing.id,name:drawing.name,location:drawing.state.location,createdAt:drawing.createdAt,status:'complete'}]}}; export async function saveVisualPolygon(site,id,edit){drawing=structuredClone(drawing);drawing.state.marks.find(x=>x.id===edit.markId).polygon=edit.polygon;return drawing}; export async function deleteVisualDrawing(){};export async function refreshVisualDrawing(){throw Error('Preview only')};export async function restartVisualDrawing(){throw Error('Preview only')}`,
	upload: `export const useUploadThing=()=>({startUpload:async()=>{throw Error('Preview only')}});`,
	photos: `export const DiaryRecordPhotos=()=>null;`,
	worker: `export const pdfWorkerUrl='/worker.mjs';`,
};
const bundled = await build({
	stdin: {
		contents: `import React from 'react';import {createRoot} from 'react-dom/client';import VisualView from './flows/default-construction/visual/VisualView';const original=window.fetch;window.fetch=(url,options)=>String(url).includes('/api/sites/')?(String(url).includes('?pdf=1')?original('/plan.pdf'):Promise.resolve(new Response(JSON.stringify(${JSON.stringify(fixture)})))):original(url,options);createRoot(document.getElementById('root')).render(<main style={{maxWidth:1700,margin:'0 auto',padding:20}}><VisualView siteId="demo"/></main>);`,
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
				build.onResolve({ filter: /DiaryRecordPhotos$/ }, () => ({
					path: "photos",
					namespace: "fixture",
				}));
				build.onResolve({ filter: /pdf-worker-url$/ }, () => ({
					path: "worker",
					namespace: "fixture",
				}));
				build.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
					contents: modules[args.path],
					loader: "js",
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
