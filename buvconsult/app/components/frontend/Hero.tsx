//10:11 - Landing page

import Link from "next/link";
import Image from "next/image";
import Logo from '@/public/buvconsultLogo.svg'
import {ThemeToggle} from "@/app/components/dashboard/ThemeToggle";
import {LoginLink, RegisterLink} from "@kinde-oss/kinde-auth-nextjs/components";
import {Button} from "@/componentsFrontend/ui/button";
import HeroImage from '@/public/hero.png'

export function Hero(){

    return (

        <>
        <div className="relative flex flex-col w-full py-5 mx-auto md:flex-row
        md:items-cetner md:justify-between">

            <div className="flex flex-row items-center justify-between text-sm lg:justify-start">

                <Link href="/" className="flex items-center gap-2">

                    <Image src={Logo} className="size-10" alt="Logo"/>

                    <h4 className ="text-3xl ">
                        Buv<span className="text-primary">consult</span>
                    </h4>
                </Link>

                <div className="md:hidden">
                    <ThemeToggle/>

                </div>




            </div>

            <nav className="hidden md:flex md:justify-end md:space-x-4">
                <ThemeToggle/>
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

            </nav>

        </div>

            <section className="relative flex items-center justify-center">

                <div className="relative items-center w-full py-12 lg:py-20">

                    <div className="text-center">

                        <span className="text-sm text-primary font-medium tracking-tight bg-primary/10 px-4
                        py-2 rounded-full">Construction Project management solution </span>

                        <h1 className="mt-8 text-4x sm:text-6xl md:text-7xl lg:text-8xl
                        font-medium leading-none">IT solutions for Construction Industry <span className="block text-primary">Talk to your project </span>
                        </h1>
                        <p className="max-w-xl mx-auto mt-4 text-base font-light lg:text-lg
                        text-muted-foreground tracking-tighter">
                            Construction is notorious for poor site records and scattered data, making it hard to say how much things will actually cost. Poorly analyzed construction data will result in over bidding (losing bid) or under bidding (losing money) for the next project. Accurate records are costly and require a lot of tedious manual input from overworked site managers.

Our Solution
                        </p>

                        <div className="flex items-center gap-x-5 w-full justify-center mt-5">
                            <LoginLink>

                                <Button variant="secondary">Sign in</Button>


                            </LoginLink>
                            <RegisterLink>

                                <Button>Try for free</Button>
                            </RegisterLink>

                        </div>


                        </div>

                    <div className="relative items-center w-full py-12 mx-auto mt-12">
                        <svg
                            className="absolute -mt-24 blur-3xl"
                            fill="none"
                            viewBox="0 0 400 400"
                            height="100%"
                            width="100%"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <g clipPath="url(#clip0_10_20)">
                                <g filter="url(#filter0_f_10_20)">
                                    <path
                                        d="M128.6 0H0V322.2L106.2 134.75L128.6 0Z"
                                        fill="#03FFE0"
                                    ></path>
                                    <path
                                        d="M0 322.2V400H240H320L106.2 134.75L0 322.2Z"
                                        fill="#7C87F8"
                                    ></path>
                                    <path
                                        d="M320 400H400V78.75L106.2 134.75L320 400Z"
                                        fill="#4C65E4"
                                    ></path>
                                    <path
                                        d="M400 0H128.6L106.2 134.75L400 78.75V0Z"
                                        fill="#043AFF"
                                    ></path>
                                </g>
                            </g>
                            <defs>
                                <filter
                                    colorInterpolationFilters="sRGB"
                                    filterUnits="userSpaceOnUse"
                                    height="720.666"
                                    id="filter0_f_10_20"
                                    width="720.666"
                                    x="-160.333"
                                    y="-160.333"
                                >
                                    <feFlood
                                        floodOpacity="0"
                                        result="BackgroundImageFix"
                                    ></feFlood>
                                    <feBlend
                                        in="SourceGraphic"
                                        in2="BackgroundImageFix"
                                        mode="normal"
                                        result="shape"
                                    ></feBlend>
                                    <feGaussianBlur
                                        result="effect1_foregroundBlur_10_20"
                                        stdDeviation="80.1666"
                                    ></feGaussianBlur>
                                </filter>
                            </defs>
                        </svg>

                        <Image src={HeroImage}
                               alt="Hero Image"
                               priority
                               className="relative object-cover w-full border rounded-lg shadow-2xl lg:rounded-2xl"></Image>


                    </div>

                </div>


            </section>

        </>
    )


}