// This starts from 05:12:45
"use client"



import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/componentsFrontend/ui/card";
import {Label} from "@/componentsFrontend/ui/label";
import {Input} from "@/componentsFrontend/ui/input";
import {Button} from "@/componentsFrontend/ui/button";
import {Atom} from "lucide-react";
import {Textarea} from "@/componentsFrontend/ui/textarea";
import Image from "next/image";
import {UploadDropzone} from "@/app/utils/UploadthingsComponents";
import {toast} from "sonner";
import TailwindEditor from "@/app/components/dashboard/EditorWrapper";
import {SubmitButton} from "@/app/components/dashboard/SubmitButtons";
import React, {useActionState, useState} from "react";
import {JSONContent} from "novel";
import {CreatePostAction, EditPostActions} from "@/app/actions/actions";
import {useForm} from "@conform-to/react";
import {parseWithZod} from "@conform-to/zod";
import {PostSchema} from "@/app/utils/zodSchemas";
import slugify from "react-slugify";

interface iAppProps{  //this is on 5:21, not clear

    data: {
        slug: string;
        title: string;
        smallDescription: string
        articleContent: any
        id: string
        image: string
    };
    siteId:string; //here somehow param got delivered. 05:33
    }






export function EditArticleForm({data, siteId}:iAppProps){



    const [imageUrl, setImageUrl] = useState<undefined | string > (data.image) //so here data is passed as default value 5:21
    const [value, setValue] = useState<JSONContent | undefined >(data.articleContent)
    const [slug, setSlugValue] = useState<undefined|string>(data.slug)
    const [title, setTitle] = useState<undefined|string>(data.title)


    const [lastResult, action] = useActionState(EditPostActions, undefined) //this is action to mutate article to database. 4:13 - youtube
    const [form, fields] = useForm({
        lastResult,

        onValidate({formData}){
            return parseWithZod(formData, {schema: PostSchema})
        },
        shouldValidate : `onBlur`,
        shouldRevalidate: "onInput",
    })

     function handleSlugGeneration(){

        const titleInput = title;

        if(titleInput?.length === 0 || titleInput === undefined ) {  //This validtion of input interesting
            return toast.error("Please create a title first") //do not forget to install this toast.
        }
        setSlugValue(slugify(title))

        return toast.success("Slug has been created")

    }






    return(

         <Card className="mt-5">
                <CardHeader>
                    <CardTitle>
                        Article Details
                    </CardTitle>
                    <CardDescription>
                        Lipsum whatever bla bla this is ok project
                    </CardDescription>
               </CardHeader>
                <CardContent>
                    <form className="flex flex-col gap-6"
                          id={form.id}
                          onSubmit={form.onSubmit}
                          action={action}>  {/*this is a form submission*/}
                        <input type="hidden" name="articleId" value={data.id}/>
                        <input type="hidden" name="siteId" value={siteId}/> {/*5:33*/}

                        <div className="grid gap-2">

                            <Label>Title</Label>
                            <Input  //*all this inside <Input> is connection to conform I think
                                key={fields.title.key}

                                name={fields.title.name}
                                defaultValue={fields.title.initialValue}
                                placeholder="Next js blogging application"
                                onChange={(e) => setTitle(e.target.value)}
                                value={title}
                            />
                            <p className="text-red-500 text-sm">{fields.title.errors}</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Slug</Label>
                            <Input
                                key={fields.slug.key}
                                name={fields.slug.name}
                                defaultValue={fields.slug.initialValue}
                                placeholder="Article Slug"
                                onChange={(e) => setSlugValue(e.target.value)}
                                value={slug}

                            />
                            <p className="text-red-500 text-sm">{fields.slug.errors}</p>
                            <Button onClick={handleSlugGeneration} className="w-fit" variant="secondary" type="button">
                                <Atom className="size-4 mr-2"/> Generate Slug
                            </Button>
                        </div>

                        <div className="grid gap-2">

                            <Label>Small Description</Label>
                            <Textarea
                                key={fields.smallDescription.key}
                                name={fields.smallDescription.name}
                                defaultValue={data.smallDescription}
                                placeholder="Small description for your blog..."
                                className="h-32"
                            />
                            <p className="text-red-500 text-sm">{fields.smallDescription.errors}</p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Cover Image</Label>
                            <input
                                type="hidden"
                                name={fields.coverImage.name}
                                key={fields.coverImage.key}
                                defaultValue={fields.coverImage.initialValue}
                                value={imageUrl}
                            />

                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
                                    alt="Uploaded Image"
                                    className="object-cover w-[200px] h-[200px] rounded-lg"
                                    width={200}
                                    height={400}
                                />

                            ) : (


                                <UploadDropzone onClientUploadComplete={(res) => {
                                    setImageUrl(res[0].url)
                                    toast.success('Image has been uploaded')
                                }}
                                                endpoint="imageUploader"
                                                onUploadError={() => {
                                                    toast.error('Something went wrong')
                                                }}

                                />

                            )}

                            <p className="text-red-500 text-sm">{fields.coverImage.errors}</p>

                        </div>

                        <div className="grid gap-2">
                            <Label> Article Content </Label>
                            <input type="hidden"
                                   name={fields.articleContent.name}
                                   key={fields.articleContent.key}
                                   defaultValue={fields.articleContent.initialValue}
                                   value={JSON.stringify(value)} //here some weird sheaningas, i guess we stringify first, pass through zod? then json again before uploading to database.
                            />
                            <TailwindEditor onChange={setValue}
                                            initialValue={value}/> {/*Here we have a setter which sets value of value to the text inside Tailwind editor*/}
                            <p className="text-red-500 text-sm">
                                {fields.articleContent.errors}
                            </p>


                        </div>
                        <SubmitButton text={"Edit Article"}/>

                    </form>
                </CardContent>

         </Card>


    )


}

