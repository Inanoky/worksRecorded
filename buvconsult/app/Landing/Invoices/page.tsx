//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'

import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png"
import Invoices2 from "@/public/frontend/pages/Invoices/Invoices2.png"
import { NavigationMenuDemo } from "@/components/landing/NavigationBar";


export default function Page(){

    return (

        <>

     
            <section className=" p-5 relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">


                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">Invoices
                        </h1>
                   

                 

                        </div>

                    <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   

                        <Image src={InvoicesPage}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>

                               <p className=" text-xl justify-end">

                                     <span className="text-2xl font-semibold">How?</span>
                                 
                                 
                                 <br/><br/>
                                  Add invoices@buvconsult.com to your existing invoice flow. We get copy of your invoices,
                                  and BUVCOSNULT AI will digitalize them and store in a structured way. 
                                  
                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                               <p className=" flex flex-col text-xl justify-start">
                                
                                <span className="text-2xl font-semibold">Why?</span>
                                
                                  <br/><br/>
                               Get a detailed cost breakdown. Categorize in seconds. Need to change cost codes? Summarize? AI will parse
                               through thoushands of invoice position to present detaile insights of your cost. 
                                 
                                
    </p>

    
                        <Image src={Invoices2}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>



                    </div>

                </div>


            </section>

        </>
    )


}