
// /C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\layout.tsx

import type { Metadata } from "next";

import "./globals.css";
import {ThemeProvider} from "@/components/dashboard/ThemeProvider";
import {Toaster} from "@/components/ui/sonner"
import {GoogleTagManager} from '@next/third-parties/google'


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.worksrecorded.com"),
  applicationName: "WorksRecorded",
  title: {
    default: "Būvdarbu žurnāls WhatsApp un BIS integrācija | WorksRecorded",
    template: "%s | WorksRecorded",
  },
  description:
    "WorksRecorded palīdz Latvijas būvniecības uzņēmumiem veidot būvdarbu žurnālu, darba laika uzskaiti un BIS ierakstus no WhatsApp ziņām ar MI automatizāciju.",
  keywords: [
    "būvdarbu žurnāls",
    "BIS integrācija",
    "darba laika uzskaite būvniecībā",
    "būvniecības programmatūra Latvijā",
    "WhatsApp būvdienasgrāmata",
    "WorksRecorded",
  ],
  alternates: {
    canonical: "/lv/Landing",
    languages: {
      "lv-LV": "/lv/Landing",
      "en-US": "/en/Landing",
      "x-default": "/lv/Landing",
    },
  },
  openGraph: {
    title: "Būvdarbu žurnāls WhatsApp un BIS integrācija | WorksRecorded",
    description:
      "Būvobjekta balss ziņas, foto, darba stundas un BIS ieraksti vienā digitālā plūsmā Latvijas būvniecības komandām.",
    url: "/lv/Landing",
    siteName: "WorksRecorded",
    locale: "lv_LV",
    alternateLocale: ["en_US"],
    type: "website",
    images: [
      {
        url: "/hero.png",
        width: 1200,
        height: 630,
        alt: "WorksRecorded būvdarbu žurnāls un BIS integrācija",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Būvdarbu žurnāls WhatsApp un BIS integrācija | WorksRecorded",
    description:
      "Būvobjekta balss ziņas, foto, darba stundas un BIS ieraksti vienā digitālā plūsmā Latvijas būvniecības komandām.",
    images: ["/hero.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // const idGa = process.env.NEXT_PUBLIC_GA_ID as string

  

  return (
    <html lang="en" suppressHydrationWarning>
            
              <GoogleTagManager gtmId="GTM-TSLDCSGF" />


      

      <body
        className="antialiased"
      >
       <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >

            

            
        {children}
 
   
           
           <Toaster richColors closeButton/>
           </ThemeProvider>
      </body>
    </html>
  );
}
