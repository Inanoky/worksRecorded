import type { NextConfig } from "next";
// const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//
//
//   //comment this in for bundle analyzer---------------
//   enabled: process.env.ANALYZE === "true",
// });
// //------------------------------

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        port: "",
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
}

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

export default nextConfig
