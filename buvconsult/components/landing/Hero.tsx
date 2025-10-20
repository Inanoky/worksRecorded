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

export function Hero(){

    return (

        <>

        {/* This is parent container for the navigation  */}
            <div className="relative z-50 grid grid-cols-4 p-5">

                
                    {/* Element 1 */}
                    <div className="">
                        <Link href="/" className="flex flex-row items-center">
                            <Image src={Logo} width={40} height={40} className="size-12" alt="Logo" />
                            <h4 className="text-3xl">
                                Buv<span className="text-primary">consult</span>
                            </h4>
                        </Link>
                    </div>
                    {/* Element 2 */}
                    <div className="flex col-span-2 col-start-2 justify-center items-center">
                        <NavigationMenuDemo />
                    </div>
                    {/* Element 3 */}
                    <div className="flex justify-end items-center gap-2">
                        <ThemeToggle />
                        <LoginLink>
                            <Button variant="secondary">
                                Sign in
                            </Button>
                        </LoginLink>
                        <RegisterLink>
                            <Button>
                                Sign up
                            </Button>
                        </RegisterLink>
                    </div>
            
            </div>

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
                           
                          Do you want to know why your project is where it is in terms of times, budget and quality? Asnwer is in the construction data.
                          Collection and analysis of consutrction data is costly. We help you to automatically collect and analyze construction data
                          without overloading your managment                          
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

                                     <span className="text-2xl font-semibold">What do we do?</span>
                                 
                                 
                                 <br/><br/>
                                  We collect all data from your construciton projects such as invoices, site diary records, timesheets,
                                  documents and more. BUVCONSULT engine structurizes data and gives you insights of what is going on
                                  in your project in real time. 

                                  <br/><br/>

                                  No integration. No lenghty training.  No lenghty Get ready in minutes. 
                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                        <p className=" flex flex-col text-xl justify-start">                                
                                <span className="text-2xl font-semibold">Benefits</span>
                                
                                  <br/><br/>
                                  <ul className="list-disc pl-6 space-y-1 marker:text-primary marker:text-2xl marker:font-semibold">
                                        <li> Complete records of your project in one place.</li>
                                 <li> Saved managment time. </li>
                                 <li> Detailed cost breakdown - labor, materials and machinery</li>
                                 <li> Leverage AI advancment for construction industry</li>
                                    </ul>

                                  
                                 
                                
    </p>

    
                        <Image src={Dashboard2}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>



                    </div>

                </div>


            </section>

        </>
    )


}