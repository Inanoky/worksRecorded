//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png"
import { NavigationMenuDemo } from "@/components/landing/NavigationBar";


export default function Page(){

    return (

        <>

    

            <section className=" p-5 relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">


                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">Pricing
                        </h1>
                   

                 

                        </div>

                    <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   

                    

                               <p className="col-span-1 col-start-2 grid-span-2 text-xl justify-end">
                                

                                    

                                     <h1 className="text-2xl font-semibold">SUBSCRIPTION</h1><br/>

                              <p>
  The cost of the service is determined by the amount of data that needs to be collected, analyzed, and structured.
</p>

<br />

<ul>
  <li>150 EUR/month per project up to 1 M EUR.</li><br />
  <li>250 EUR/month per project up to 5 M EUR.</li><br />
  <li>350 EUR/month per project up to 10 M EUR.</li><br />
  <br />
  <li>For larger projects, please contact sales.</li>
</ul>

                                 
                                 
                                 <br/><br/>
                           

                                   
                                
    </p>


    
                               <p className="col-span-1 col-start-2 grid-span-2 text-xl justify-end">
                                

                                    

                                     <h1 className="text-2xl font-semibold">Custom solution</h1><br/>

                                     <p>

                                    We have our own platform and custom data solutions that we adapt to different client needs.
This means you get a tailored software solution for a fraction of the cost you’d expect from a digital agency.
We speak the construction language, so it’s easy for you to explain your needs, we’ll quickly understand your processes and deliver a digital solution that solves your specific problem.

                                    <br/>
                                    <br/>

                                    Contact to book a free consultation. 


                                    

                                     </p>


                                    

                                 
                                 
                              
                           

                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


    


                    </div>

                </div>


            </section>

        </>
    )


}