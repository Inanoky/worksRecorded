"use client"


import {ThemeToggle} from "@/app/components/dashboard/ThemeToggle";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/componentsFrontend/ui/dropdown-menu";
import {Button} from "@/componentsFrontend/ui/button";
import {CircleUser} from "lucide-react";
import {LogoutLink} from "@kinde-oss/kinde-auth-nextjs/components";

export default function SidebarHeader(){

    return (

        <header className="flex h-14 items-center gap-4 border-b bg-muted/40
                px-4 lg:h-[60px] lg:px-6">

            <div className="ml-auto flex items-center gap-x-5">
                <ThemeToggle/>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                            <CircleUser className="h-5 w-5"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <LogoutLink>Log out</LogoutLink>

                        </DropdownMenuItem>

                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}