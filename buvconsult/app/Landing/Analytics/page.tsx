//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png"
import { NavigationMenuDemo } from "@/components/landing/NavigationBar";
import Analytics1 from  '@/public/frontend/pages/Analytics/Analytics1.png'
import Analytics2 from  '@/public/frontend/pages/Analytics/Analytics2.png'



export default function Page(){

    return (

        <>



            <section className=" p-5 relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">


                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">Analytics
                        </h1>
                   

                 

                        </div>

                    <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   

                        <Image src={Analytics1}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>

                               <p className=" text-xl justify-end">

                                     <span className="text-2xl font-semibold">How?</span>
                                 
                                 
                                 <br/><br/>
                            We use data science and construction industry knowledge to extract analytics from your data automatically.
                                  We will tell you what you need to know, bill of quantity, progress statistics, hindrances, delays, average
                                  perfomance, cost per category, per time period, areas of cost waste and cost improvement and much more.

                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                               <p className=" flex flex-col text-xl justify-start">
                                
                                <span className="text-2xl font-semibold">Why?</span>
                                
                                  <br/><br/>
                              
                                                                    <ul className="list-disc pl-6 space-y-1 marker:text-primary marker:text-2xl marker:font-semibold">
                                <li>   Advanced pre-made analytics for immidiate results </li>
                                 <li>     Custom analytics for specific needs</li>
                                  <li>   Fully dynamic, updates are project progresses </li>
                                  <li> Forecasting finance, cash flow, work progress </li>
                            
                       

                               </ul>
                                 
                                 
                                
    </p>

    
                        <Image src={Analytics2}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>



                    </div>

                </div>


            </section>

        </>
    )


}