//10:11 - Landing page
"use client"

import { useIsMobile } from "@/lib/utils/hooks/use-mobile"
import LandingPageDesktop from "@/components/landing/Landing/LandingPageDesktop";
import LandingPageMobile from "@/components/landing/Landing/LandingPageMobile";


export default function LandingPage(){
  
  const isMobile = useIsMobile()

    return (

        <>

                {isMobile ? 
                <LandingPageMobile/> : <LandingPageDesktop/>    }
          

      
        </>
    )


}