//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\layout.tsx
"use client"
import type { Metadata } from "next";

import { Inter } from "next/font/google";
import "../globals.css";
import {ThemeProvider} from "@/components/dashboard/ThemeProvider";
import {Toaster} from "@/components/ui/sonner"

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import HeroImage from '@/public/hero.png'
import Dashboard from '@/public/frontend/pages/Home/Dashboard.png'
import Dashboard2 from '@/public/frontend/pages/Home/Dashboard2.png'

import { Footer } from "@/components/landing/Footer";
import Header from "@/components/landing/HeaderDesktop";
import { useIsMobile } from "@/lib/utils/hooks/use-mobile"
import HeaderMobile from "@/components/landing/HeaderMobile";
import HeaderDesktop from "@/components/landing/HeaderDesktop";

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
        <Footer/>
           
           <Toaster richColors closeButton/>
      
      </body>
    </html>
  );
}
