//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\layout.tsx
"use client"
import type { Metadata } from "next";

import { Inter } from "next/font/google";
import "../globals.css";
import {ThemeProvider} from "@/components/dashboard/ThemeProvider";
import {Toaster} from "@/components/ui/sonner"

import { useIsMobile } from "@/lib/utils/hooks/use-mobile"
import HeaderMobile from "@/components/landing/HeaderMobile";
import HeaderDesktop from "@/components/landing/HeaderDesktop";
import FooterMobile from "@/components/landing/FooterMobile";
import FooterDesktop from "@/components/landing/FooterDesktop";

const inter = Inter({ subsets: ["latin"] });







export default function LadningLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  
  const isMobile = useIsMobile()

  return (
    <html lang="en">
      <body
        className={`${inter.className}  antialiased`}


      >


            
      {isMobile ?
       <HeaderMobile/> : <HeaderDesktop/> }
  
 
     
        {children}
       {isMobile ?
       <FooterMobile/> :<FooterDesktop/>  }
           
           <Toaster richColors closeButton/>
      
      </body>
    </html>
  );
}
