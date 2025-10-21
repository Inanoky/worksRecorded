//10:11 - Landing page
"use client"
import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import HeroImage from '@/public/hero.png'
import Dashboard from '@/public/frontend/pages/Home/Dashboard.png'
import Dashboard2 from '@/public/frontend/pages/Home/Dashboard2.png'
import { NavigationMenuDemo } from "./NavigationBar";
import { Features } from "@/components/landing/Features";
import { isModifier } from "typescript";
import { useIsMobile } from "@/lib/utils/hooks/use-mobile"
import LandingPageDesktop from "@/components/landing/Landing/LandingPageDesktop";
import LandingPageMobile from "@/components/landing/Landing/LandingPageMobile";


export default function LandingPage(){
  
  const isMobile = useIsMobile()

    return (

        <>

                {isMobile ? 
                <LandingPageMobile/> : <LandingPageDesktop/>    }
          

                <Features />

        </>
    )


}