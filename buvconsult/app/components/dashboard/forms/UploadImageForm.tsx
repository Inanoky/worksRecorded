//06:01:50. I think this is client use component

"use client"

import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import React, {useState} from "react";
import Image from "next/image"
import {UploadDropzone} from "@/app/utils/UploadthingsComponents";
import {SubmitButton} from "@/app/components/dashboard/SubmitButtons";
import {toast} from "sonner";
import {UpdateImage} from "@/app/actions/actions";

//this is how we get params. Check 06:13
interface iAppProps{
    siteId: string;


}



export function UploadImageForm({siteId}:iAppProps){

    const [imageUrl, setImageUrl] = useState<undefined | string>(undefined)



    return(

        <Card>
            <CardHeader>
                <CardTitle>
                    Image
                </CardTitle>
                <CardDescription>
                    This is the imagee of your site you can change it here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/*this below is again default state/vs not defaul state, need to use*/}
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt="Uploaded Image"
                        width={200}
                        height={200}
                        className="size-[200px] object-cover rounded-lg"

                                        />
                ) : (
                    <UploadDropzone endpoint="imageUploader" onClientUploadComplete=
                        {(res)=>{
                            setImageUrl(res[0].url)
                            toast.success("Image has been uploaded")



                        }}
                        onUploadError={() => {
                            toast.error("Something went wrong")
                        } }
                    />
                )}

            </CardContent>
            <CardFooter>
                <form action={UpdateImage}>
                    <input type="hidden" name="siteId" value={siteId}/>
                    <input type="hidden" name="imageUrl" value={imageUrl}/>
                    <SubmitButton text="Change image"/>

                </form>

            </CardFooter>
        </Card>
    )

}