//10:11 - Landing page

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


export default function LandingPage(){


    return (

        <>

      
                
            <section className="relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">

                        <span className="text-sm text-primary font-medium tracking-tight bg-primary/10 px-4
                        py-2 rounded-full">Construction Project management solution </span>

                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">Passive construction data collection<span className="block text-primary">It's in the data</span>
                        </h1>
                        <p className="max-w-xl mx-auto mt-4 text-base font-light lg:text-lg
                        text-muted-foreground tracking-tighter">
                           
                          Do you want to always know why your project stands where it does in terms of time, budget, and quality? The answer lies in your construction data. 
                          Collecting and analyzing this data can be costly — we help you automate the process without overloading your management.                      
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

                               <p className=" text-xl justify-end">

                                     <span className="text-2xl font-semibold">What do we do</span>
                                 
                                 
                                 <br/><br/>
                                  We collect all data from your construction projects — invoices, site diary records, timesheets, documents, and more. 
                                  The BUVCONSULT engine structures your data and gives you real-time insights into what’s happening on your project.

                                  <br/><br/>

                               <span className="font-bold">    No integrations. 
                               No lengthy training.  Get ready in minutes. </span>
                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                        <p className=" flex flex-col text-xl justify-start">                                
                                <span className="text-2xl font-semibold">Benefits</span>
                                
                                  <br/><br/>
                                  <ul className="list-disc pl-6 space-y-1 marker:text-primary marker:text-2xl marker:font-semibold">
                                <li>Complete records of your project in one place.</li>
                                <li>Saved management time.</li>
                                <li>Detailed cost breakdown — labor, materials, and machinery.</li>
                                <li>Leverage AI advancements for the construction industry.</li>
                                    </ul>

                                  
                                 
                                
    </p>

    
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