
import * as React from "react"
import Link from "next/link"


import { ThemeToggle } from "@/components/dashboard/ThemeToggle"
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components"
import { Button } from "@/components/ui/button"
import { NavigationMenuMobile } from "./NavigationMenuMobile"





  export default function HeaderMobile() {


    return (    
  
  <>
  
  {/* This is parent container for the navigation  */}
                        <div className="relative z-50 grid grid-cols-2 justify-between p-5">
            
                            
                                {/* Element 1 */}
                                <div className="">
                                    <Link href="/" className="flex flex-row items-center">
                                   
                                        <h4 className="text-3xl">
                                            Buv<span className="text-primary">consult</span>
                                        </h4>
                                    </Link>
                                </div>
                                {/* Element 2 */}
                                <div className="flex col-span-2 col-start-2 justify-end items-center">
                                    
                                    <NavigationMenuMobile />
                                </div>
                                {/* Element 3 */}
                               
                        </div>

                        </>

    )}