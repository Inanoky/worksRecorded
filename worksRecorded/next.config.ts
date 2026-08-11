import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";


// const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//
//
//   //comment this in for bundle analyzer---------------
//   enabled: process.env.ANALYZE === "true",
// });
// //------------------------------

const nextConfig: NextConfig = {
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
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);


