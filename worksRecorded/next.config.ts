import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withWorkflow } from "workflow/next";

// const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//
//
//   //comment this in for bundle analyzer---------------
//   enabled: process.env.ANALYZE === "true",
// });
// //------------------------------

const nextConfig: NextConfig = {
	serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "@embedpdf/pdfium"],
	outputFileTracingIncludes: {
		"/api/uploadthing": [
			"./node_modules/@embedpdf/pdfium/dist/pdfium.wasm",
			"./node_modules/pdfjs-dist/standard_fonts/**",
			"./node_modules/pdfjs-dist/cmaps/**",
			"./node_modules/pdfjs-dist/wasm/**",
			"./node_modules/@napi-rs/canvas-*/**/*.node",
		],
		"/api/sites/*/visual/section-drawing": [
			"./assets/visual-sections/ar-701/*.png",
		],
		"/api/sites/*/visual/planning-share": [
			"./assets/visual-sections/ar-701/*.png",
		],
	},
	turbopack: {
		root: process.cwd(),
	},
	images: {
		qualities: [75, 90],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "utfs.io",
				port: "",
			},
			{
				protocol: "https",
				hostname: "*.ufs.sh",
			},
			{
				protocol: "https",
				hostname: "ufs.sh",
			},
		],
	},

	typescript: {
		ignoreBuildErrors: true,
	},
};

//   webpack: (config, { isServer }) => {
//     if (isServer) {
//       config.plugins.push(new PrismaPlugin());
//     }
//     return config;
//   },
// };

//comment this in for bundle analyzer
// export default withBundleAnalyzer(nextConfig);

//------------------------------

//Comment this in for production
const withNextIntl = createNextIntlPlugin();
export default withWorkflow(withNextIntl(nextConfig));
