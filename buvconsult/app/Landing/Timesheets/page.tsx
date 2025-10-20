//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png"
import { NavigationMenuDemo } from "@/components/landing/NavigationBar";
import Timesheets1 from '@/public/frontend/pages/Timesheets/Timesheets1.png'
import TimesheetsWhatsapp from '@/public/frontend/pages/Timesheets/TimesheetsWhatsapp.png'



export default function Page(){

    return (

        <>

  

            <section className=" p-5 relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">


                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">Timesheets
                        </h1>
                   

                 

                        </div>

                    <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   

                      <div className="relative col-span-2 "> 
                  
                                    <Image
                                        src={Timesheets1}
                                        alt="Site diary"
                                        priority
                                        className="relative w-fullrelative object-cover w-full border rounded-lg shadow-2xl 
                                        shadow-black/40 lg:rounded-2xl"
                                    />
                                    
                                    <Image
                                        src={TimesheetsWhatsapp}
                                        alt="WhatsApp"
                                        priority
                                       
                                        className="absolute bottom-4 right-4 rounded-xl shadow-xl border z-10 w-[23.3%] aspect-[1/2.1679]  "
                                    />


                                    </div>

                               <p className=" text-xl justify-end">

                                     <span className="text-2xl font-semibold">How?</span>
                                 
                                 
                                 <br/><br/>
                                 Worker uses whatsapp to chat with BUVCONSULT AI, to clock in/out of work. Before clocking back in AI ask to describe what was achieved during day. Information structurized and stored in database automatically.

                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                               <p className=" flex flex-col text-xl justify-start">
                                
                                <span className="text-2xl font-semibold">Why?</span>
                                
                                  <br/><br/>

                                                                    <ul className="list-disc pl-6 space-y-1 marker:text-primary marker:text-2xl marker:font-semibold">
                                <li>   Get every work hour accounted for. </li>
                                 <li>     Bid labour precisely next project. </li>
                                  <li>   Identify wastage, set targets and measure KPI for labour.</li>
                            
                       

                               </ul>
                                 
                                
    </p>

    
                        <Image src={InvoicesPage}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>



                    </div>

                </div>


            </section>

        </>
    )


}