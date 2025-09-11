"use client";


//All this created around 04:35

import {useFormStatus} from "react-dom";
import {Button} from "@/componentsFrontend/ui/button";
import {cn} from "@/lib/utils";
import {Loader2} from "lucide-react";
import React from "react";

interface iAppProps {

    text : string;
    className ?: string
    variant?:
        | "link"
        | "default"
        | "destructive"
        | "outline"
        | "secondary"
        | "ghost"
        | null
        | undefined;


}



export function SubmitButton({text, className, variant}: iAppProps){

    const {pending} = useFormStatus()

    return <>
        {pending ? (
            <Button
                disabled
                className={cn("w-fit", className)}
                variant={variant}
            >  {/* disabled means user can't submit again if pending*/}
                <Loader2 className="mr-2 size-4 animate-spin"/>
            </Button>
        ): (
            <Button
                className={cn("w-fit", className)}
                variant={variant}
                type="submit"
            >
                {text}
            </Button>
        )}
    </>;



}