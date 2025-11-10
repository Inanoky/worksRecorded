//10:11 - Landing page
// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\landing\Landing\LandingPageDesktop.tsx


import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import HeroImage from '@/public/hero.png'
import Dashboard from '@/public/frontend/pages/Home/Dashboard.png'
import Dashboard2 from '@/public/frontend/pages/Home/Dashboard2.png'

import { Features } from "@/components/landing/Features";
import { Header, Header2, HowDoWeDoThat,NoIntegration,SmallDescription,WhatDoWeDo,Why } from "@/components/landing/Landing/Text";


export default function LandingPage(){


    return (

        <>

      
                
            <section className="relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">

                        <span className="text-sm text-primary font-medium tracking-tight bg-primary/10 px-4
                        py-2 rounded-full">Construction Project management solution </span>

                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">{Header}<span className="block text-primary">{Header2}</span>
                        </h1>
                        <p className="max-w-xl mx-auto mt-4 text-base font-light lg:text-2xl
                        text-muted-foreground tracking-tighter">
                           
                      {SmallDescription}                  
                        </p>

                        <div className="flex items-center gap-x-5 w-full justify-center mt-5">
                            <LoginLink>

                                <Button variant="secondary">Sign in</Button>


                            </LoginLink>
                            <RegisterLink>

                                <Button>Try for free</Button>
                            </RegisterLink>

                        </div>


                        </div>

                    <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   

                        <Image src={Dashboard }
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>
                                <div className="text-xl pr-5">
                                    <HowDoWeDoThat/>
                                  
                                </div>
                          
                                   
                                
 

                    </div>



                     <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   <div className="text-xl pl-5">
                                <WhatDoWeDo/>

</div>

    
                        <Image src={Dashboard2}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>



                    </div>

                </div>

            


            </section>

                <Features />

        </>
    )


}