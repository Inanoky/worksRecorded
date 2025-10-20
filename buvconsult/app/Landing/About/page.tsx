//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png"
import { NavigationMenuDemo } from "@/components/landing/NavigationBar";
import Selfie from '@/public/frontend/pages/About/Selfie.jpg'


export default function Page(){

    return (

        <>


            <section className=" p-5 relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">


                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">About
                        </h1>
                   

                 

                        </div>

                    <div className="grid grid-cols-4 gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   

                    


    
                               <p className="space-y-6 col-span-3 col-start-1 grid-span-2 text-xl justify-end">
                                

                                    

                        
                                     
                                     <br/>

                                 

                                        <p>
                                    Construction industry is notorious worldwide for being delyed and overbudget. Why? In Buvconsult we 
                                    beleive answer is in the data. Lack of record keeping and overloaded managment makes it hard for industry
                                    to learn from their mistakes. 
                                            </p>
                                             <p>
                                    Why not sovled before? Because of the intricate indsutry details such as lower bid wins, lack of priority on
                                    data, lack of reliable tehnologie to collecte and structurize data, lack of data science skills to extract
                                    meaningfull insights. 
                                            </p>
                                             <p>
                                    We are Latvian digital SAAS platform aimed to solve abovementioned issues
                                    We aim to provide quality data collection analytics cheaply for the ones we believe it needs the most - small 
                                    and medium trade contractors. 
                                    </p>
                                    
                                    <br/>
                                 
                                    
                                    <p>
                                       Vjaceslavs Gromatovics
                                     
                                    </p>
                                        

                                        <p>  Buvconsult team   </p>
                                  
                                    <p>From construction professionals for construction professionals</p>


                                   <br/>
                                    

                                 


                                    



                                    

                                 
                                 
                              
                           

                                   
                                
    </p>

                <div  className="flex justify-center">
                                                <Image src={Selfie}
                                                alt="Hero Image"
                                                priority
                                                height = "200"
                                                width = "350"
                                               ></Image>
                
</div>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                

    


                    </div>

                </div>


            </section>

        </>
    )


}