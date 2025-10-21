//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png"
import { NavigationMenuDemo } from "@/components/landing/NavigationMenuDesktop";
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

                                     <span className="text-2xl font-semibold">How do we do that</span>
                                 
                                 
                                 <br/><br/>
                           We combine data science with AI and construction industry expertise to automatically extract analytics from your data.
We’ll provide insights you need, bill of quantities, progress statistics, hindrances, delays, average performance, cost per category, per time period, areas of waste and improvement, and much more.

                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                               <p className=" flex flex-col text-xl justify-start">
                                
                                <span className="text-2xl font-semibold">What is your benefit</span>
                                
                                  <br/><br/>
                              
                               <ul className="list-disc pl-6 space-y-1 marker:text-primary marker:text-2xl marker:font-semibold">
                            <li>Advanced pre-made analytics for immediate results.</li>
                            <li>Custom analytics for specific needs.</li>
                            <li>Fully dynamic — updates as the project progresses.</li>
                            <li>Forecast finances, cash flow, and work progress.</li>
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