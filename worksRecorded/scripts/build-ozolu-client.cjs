const esbuild = require("esbuild");
const fs = require("node:fs/promises");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const client = path.join(root, "flows/demo/client");
function localFile(specifier, parent) {
	const base = specifier.startsWith("@/")
		? path.join(root, specifier.slice(2))
		: specifier.startsWith(".")
			? path.resolve(parent, specifier)
			: null;
	if (!base) return null;
	for (const suffix of [
		"",
		".ts",
		".tsx",
		".js",
		".json",
		"/index.ts",
		"/index.tsx",
	]) {
		const target = base + suffix;
		if (
			require("node:fs").existsSync(target) &&
			require("node:fs").statSync(target).isFile()
		)
			return target;
	}
	return null;
}
async function build() {
	await fs.mkdir(path.join(root, "flows/demo/generated"), { recursive: true });
	await esbuild.build({
		absWorkingDir: root,
		entryPoints: ["flows/demo/client/Workspace.tsx"],
		outfile: "flows/demo/generated/workspace.js",
		bundle: true,
		packages: "external",
		platform: "browser",
		format: "esm",
		jsx: "automatic",
		target: "es2022",
		legalComments: "none",
		inject: [path.join(client, "fetch-inject.ts")],
		plugins: [
			{
				name: "ozolu-local-services",
				setup(build) {
					build.onResolve({ filter: /.*/ }, (args) => {
						if (args.path === "next/navigation")
							return { path: path.join(client, "navigation.ts") };
						if (args.path === "next/image")
							return { path: path.join(client, "Image.tsx") };
						if (args.path === "@/lib/utils/UploadthingsComponents")
							return { path: path.join(client, "uploads.ts") };
						const file = localFile(args.path, args.resolveDir);
						if (!file) return null;
						const normalized = file.replaceAll("\\", "/");
						if (normalized.endsWith("demo/client/OzoluClient.tsx"))
							return { path: path.join(client, "navigation.ts") };
						if (normalized.endsWith("frontend/LimeniProjectData.tsx"))
							return { path: path.join(client, "ProjectData.tsx") };
						if (
							normalized.endsWith("/lib/utils/db.ts") ||
							normalized.includes("/server/ai-flows/")
						)
							throw new Error("Server module reached client bundle: " + file);
						return { path: file };
					});
					build.onLoad({ filter: /\.[tj]sx?$/ }, async (args) => {
						let contents = await fs.readFile(args.path, "utf8");
						const normalized = args.path.replaceAll("\\", "/");
						if (/^\s*["']use server["'];?/m.test(contents)) {
							const ast = ts.createSourceFile(
								args.path,
								contents,
								ts.ScriptTarget.Latest,
								true,
							);
							const names = [];
							for (const statement of ast.statements) {
								if (
									statement.modifiers?.some(
										(mod) => mod.kind === ts.SyntaxKind.ExportKeyword,
									)
								) {
									if (ts.isFunctionDeclaration(statement) && statement.name)
										names.push(statement.name.text);
									if (ts.isVariableStatement(statement))
										for (const dec of statement.declarationList.declarations)
											if (ts.isIdentifier(dec.name)) names.push(dec.name.text);
								}
								if (
									ts.isExportDeclaration(statement) &&
									statement.exportClause &&
									ts.isNamedExports(statement.exportClause)
								)
									for (const item of statement.exportClause.elements)
										if (!item.isTypeOnly) names.push(item.name.text);
							}
							const key = path.relative(root, args.path).replaceAll("\\", "/");
							return {
								contents:
									`import {invokeLocalAction} from ${JSON.stringify(path.join(client, "actions.ts"))};\n` +
									names
										.map(
											(name) =>
												`export const ${name} = (...args) => invokeLocalAction(${JSON.stringify(key)},${JSON.stringify(name)},args);`,
										)
										.join("\n"),
								loader: "js",
								resolveDir: path.dirname(args.path),
							};
						}
						if (
							normalized.endsWith("visual/VisualView.tsx") ||
							normalized.endsWith("visual/visual-client-cache.ts")
						) {
							contents =
								"import { localDrawingUrl } from " +
								JSON.stringify(path.join(client, "store.ts")) +
								";\n" +
								contents;
							contents = contents.replace(
								/`\$\{(?:this\.)?endpoint\((.*?)\)\}\?pdf=1`/g,
								"localDrawingUrl($1)",
							);
						}
						if (normalized.endsWith("components/sitediary/SiteDiaryList.tsx")) {
							contents = contents.replace(
								"{isZtcSite ? t.productionJournalTitle : t.title}",
								'{fimaDiary ? "BIS žurnāls" : isZtcSite ? t.productionJournalTitle : t.title}',
							);
							contents = contents.replace(
								"<FimaRecordPanel key={siteId}",
								"<FimaRecordPanel key={`fima-panel:${siteId}`}",
							);
						}
						if (normalized.endsWith("lib/diary-photos.ts"))
							contents = contents
								.replace(
									"new URL(value)",
									"new URL(value, window.location.origin)",
								)
								.replace(
									'url.protocol === "https:"',
									'(url.protocol === "https:" || url.protocol === "data:" || url.protocol === "blob:" || (url.origin === window.location.origin && url.pathname.startsWith("/demo/")))',
								);
						return {
							contents,
							loader: args.path.endsWith("tsx") ? "tsx" : "ts",
							resolveDir: path.dirname(args.path),
						};
					});
				},
			},
		],
	});
	await fs.writeFile(
		path.join(root, "flows/demo/generated/workspace.d.ts"),
		'import type { ComponentType } from "react";\ndeclare const Workspace: ComponentType;\nexport default Workspace;\n',
	);
	console.log("Built browser-only Ozolu workspace from original screens.");
}
build().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
