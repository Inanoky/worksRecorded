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
                    <div className="flex justify-end items-center">
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

                                     Cost of the services is determined by amount of data 
                                     required to collect, analyze and structurize. 

                                     </p>

                                     <br/>

                                     <ul>
                                        <li>   Cost is 150 EUR/month per 1 project up to 1M project</li><br/>
                                        <li>   Cost is 250 EUR/month per 1 project up to 5M project</li><br/>
                                        <li>   Cost is 350 EUR/month per 1 project up to 10M project</li><br/>
                                        <br/>
                                        <li>   For larger projects please contact sales</li>
                                     </ul>
                                  

                                 
                                 
                                 <br/><br/>
                           

                                   
                                
    </p>


    
                               <p className="col-span-1 col-start-2 grid-span-2 text-xl justify-end">
                                

                                    

                                     <h1 className="text-2xl font-semibold">Custom solution</h1><br/>

                                     <p>

                                    We have our own platform and custom data solution which we are re-using for different client needs.
                                    For you this means that you will get a custom software solution for a fraction of a Cost
                                    you would expect from digital agency. We do speak construction, so it will be easy for you to 
                                    explain your need, we will quickly get a grasp of your processes and offer a digital solution solving
                                    your particular problem. 

                                    <br/>
                                    <br/>

                                    Contact to book a free consultation. 


                                    

                                     </p>


                                    

                                 
                                 
                              
                           

                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                               <p className=" flex flex-col text-xl justify-start">
                                
                                <span className="text-2xl font-semibold">Why?</span>
                                
                                  <br/><br/>
                               Get clear understanding where and how to improve. <br/>  Get an accurate bids for future projects. 
                                 
                                
    </p>

    


                    </div>

                </div>


            </section>

        </>
    )


}