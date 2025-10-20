//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import HeroImage from '@/public/hero.png'
import { NavigationMenuDemo } from "@/components/landing/NavigationBar"
import SiteDiary1 from '@/public/frontend/pages/SiteDiary/SiteDiary1.png'
import SiteDiary2 from '@/public/frontend/pages/SiteDiary/SiteDiary2.png'
import WhatsappScreen from '@/public/frontend/pages/SiteDiary/WhatsappScreen.png'


export default function Page(){

    return (

        <>


            <section className=" p-5 relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">


                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">Construciton site records
                        </h1>
                   

                 

                        </div>

                    <div className="grid grid-cols-3 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   

                          <div className="relative col-span-2 "> 
                  
                                    <Image
                                        src={SiteDiary2}
                                        alt="Site diary"
                                        priority
                                        className="relative w-fullrelative object-cover w-full border rounded-lg shadow-2xl 
                                        shadow-black/40 lg:rounded-2xl"
                                    />
                                    
                                    <Image
                                        src={WhatsappScreen}
                                        alt="WhatsApp"
                                        priority
                                        width={280}
                                        height={560}
                                        className="absolute bottom-4 right-4 rounded-xl shadow-xl border z-10 w-[23.3%] aspect-[1/2.1679]  "
                                    />


                                    </div>

                               <p className=" text-xl justify-end">

                                     <span className="text-2xl font-semibold">How do we do that</span>
                                 
                                 
                                 <br/><br/>
                                  Just send a voice message to BUVCONSULT WhatsApp describing what happened today.
                                  Our AI will transform your words into a structured site diary record.
                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                               <div className="space-y-4 flex flex-col text-xl justify-start">
                                
                                <span className="text-2xl font-semibold">What is your benefit</span>
                                
                                  <br/><br/>
                                <p> Everything that happens on site during the project is stored and easily accessible.</p>
                                 <p>Claim? You have <span className="text-primary font-bold"> proof to defend.</span></p>
                                 <p>Loss? You have <span className="text-primary font-bold"> proof to recover.</span> </p>
                                 <p>Estimation? You know exactly how much time you’ve spent.</p>
                                 <p>Your project recorded.</p>





                                 
                                
    </div>

                                <Image src={SiteDiary1}
                                alt="Hero Image"
                                priority
                                className=" col-span-2 relative object-cover w-full border rounded-lg shadow-2xl shadow-black/40 lg:rounded-2xl"></Image>


</div>

                   

                </div>


            </section>

        </>
    )


}



                        
