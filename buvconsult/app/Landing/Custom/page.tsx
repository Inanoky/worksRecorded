//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png"
import { NavigationMenuDemo } from "@/components/landing/NavigationMenuDesktop";
import Development from "@/public/frontend/pages/CustomSolutions/Development.png"
import Site from "@/public/frontend/pages/CustomSolutions/Site.jpeg"


export default function Page(){

    return (

        <>

 

            <section className=" p-5 relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">


                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">Custom digital solutions 
                        </h1>
                   

                 

                        </div>

                    <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   

                        <Image src={Site}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>

                               <p className=" text-xl justify-end">

                                     <span className="text-2xl font-semibold">How do we do that</span>
                                 
                                 
                                 <br/><br/>
                          We speak <span className="text-primary font-bold">construction language.</span> We dive deep into the details of your processes
and suggest how we can extract valuable data and the benefits you can gain from it. Once a custom system
is designed, it will yield long-term benefits for you.
<br />
<br />
<p>
  Contact us by email with the process you want to digitalize and automate, and we will offer you an effective solution.
</p>


                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                               <p className=" flex flex-col text-xl justify-start">
                                
                                <span className="text-2xl font-semibold">What is your benefit</span>
                                
                                  <br/><br/>
                               Construction is a one of the last undigitalized frontiers. Be on top and get benefit from
                               rapidly evolvoing AI world transformation. Improve margins. Improve bids. Improve processes. Be on top.
                               From construction professionals to construction professionals. 
                                 
                                
    </p>

    
                        <Image src={Development}
                               alt="Hero Image"
                               priority
                               className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>



                    </div>

                </div>


            </section>

        </>
    )


}