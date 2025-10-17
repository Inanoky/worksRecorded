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
                        font-medium leading-none">Analytics
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
                                 Worker uses whatsapp to chat with BUVCONSULT AI, to clock in/out of work. Before clocking back in AI ask to describe what was achieved during day. Information structurized and stored in database automatically.

                                   
                                
    </p>


                    </div>



                     <div className="grid grid-cols-3  gap-15 relative items-center w-full py-12 mx-auto mt-12">
                   
                               


                               <p className=" flex flex-col text-xl justify-start">
                                
                                <span className="text-2xl font-semibold">Why?</span>
                                
                                  <br/><br/>
                               Get every work hour accounted for. 
                                 
                                
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