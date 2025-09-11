// 06:23

import {FileIcon, PlusCircle} from "lucide-react";
import {Button} from "@/componentsFrontend/ui/button";
import Link from "next/link";
import React from "react";


interface iAppProps {

    title: string
    description : string
    buttonText: string
    href: string

}

export function EmptyState({buttonText,description,href,title}:iAppProps){

    return (

        <div className="flex flex-col items-center justify-center rounded-md border
            border-dashed p-8 text-center animate-in fade-in-50">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
                <FileIcon className="size-10 text-primary"/>
            </div>
            <h2 className="mt-6 text-xl font-semibold">{title}</h2>
            <p className="mb-8 mt-2 text-center test-small leading-tight text-muted-foreground max-w-sm mx-auto">
                {description}
            </p>
            <Button asChild>
                <Link href={href}>
                    <PlusCircle className="mr-2 size-4"/>
                    {buttonText}
                </Link>

            </Button>


        </div>


    )

}