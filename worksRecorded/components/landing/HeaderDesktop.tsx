"use client";
  
import * as React from "react"
import Link from "next/link"


import { ThemeToggle } from "@/components/dashboard/ThemeToggle"
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components"
import { Button } from "@/components/ui/button"
import { NavigationMenuDesktop } from "@/components/landing/NavigationMenuDesktop"
import LanguageSwitcher from "../ui/LanguageSwitcher"
import { useTranslations } from "next-intl"



  export default function HeaderDesktop() {



    
    const t = useTranslations("AuthButtons")
return (    
  
  <>
  
  {/* This is parent container for the navigation  */}
                        <div className="relative z-50 grid grid-cols-4 p-5">
            
                            
                                {/* Element 1 */}
                                <div className="">
                                    <Link href="/" className="flex flex-row items-center">
                                   
                                        <h4 className="text-3xl">
                                            Works<span className="text-green-600">Recorded</span>
                                        </h4>
                                    </Link>
                                </div>
                                {/* Element 2 */}
                                <div className="flex col-span-2 col-start-2 justify-center items-center">
                                    
                                    <NavigationMenuDesktop />
                                </div>
                                {/* Element 3 */}
                                <div className="flex justify-end items-center gap-2">
                                    <LanguageSwitcher/>
                                    <ThemeToggle />
                                    <LoginLink>
                                        <Button variant="secondary">
                                            {t("signIn")}
                                        </Button>
                                    </LoginLink>
                                    <RegisterLink>
                                        <Button>
                                            {t("signUp")}
                                        </Button>
                                    </RegisterLink>
                                </div>
                        
                        </div>

                        </>

    )}