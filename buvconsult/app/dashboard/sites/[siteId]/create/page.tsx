"use client"


import {Button} from "@/components/ui/button";
import Link from "next/link";
import {ArrowLeft, Atom} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import React, {ReactNode, useActionState, useState} from "react";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import Image from "next/image"
import {UploadDropzone} from "@/app/utils/UploadthingsComponents";
import {toast} from "sonner";
import {JSONContent} from "novel";
import TailwindEditor from "@/app/components/dashboard/EditorWrapper";
import {CreatePostAction} from "@/app/actions/actions";
import {useForm} from "@conform-to/react";
import {parseWithZod} from "@conform-to/zod";
import {PostSchema} from "@/app/utils/zodSchemas";
import slugify from "react-slugify";
import {SubmitButton} from "@/app/components/dashboard/SubmitButtons";
import {use} from "react"

//empty

export default function ArticleCreationRoute({params}:
{params: Promise<{siteId:string}>
}){

    const {siteId} = use(params)
    const [imageUrl, setImageUrl] = useState<undefined | string > (undefined)
    const [value, setValue] = useState<JSONContent | undefined >(undefined)
    const [slug, setSlugValue] = useState<undefined|string>(undefined)
    const [title, setTitle] = useState<undefined|string>(undefined)
    const [lastResult, action] = useActionState(CreatePostAction, undefined) //this is action to mutate article to database. 4:13 - youtube
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

    return (
        <>
    <div className="flex items-center">
        <Button size ="icon" variant="outline" className="mr-3" asChild>
            <Link href={`/dashboard/sites/${siteId}`}>

                <ArrowLeft className="size-4"/>

            </Link>
        </Button>
        <h1 className="text-xl font-semibold">Create Article</h1>

    </div>

            <Card className="max-w-screen-xl">
                <CardHeader>
                    <CardTitle>
                        Article Details
                    </CardTitle>
                    <CardDescription>
                        Lipsum whatever bla bla this is ok project
                    </CardDescription>
               </CardHeader>
                <CardContent>
                    <form className = "flex flex-col gap-6"
                          id={form.id}
                          onSubmit={form.onSubmit}
                          action={action}>  {/*this is a form submission*/}

                        <input
                            type="hidden"
                            name="siteId"
                            value={siteId}
                        />

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
                                defaultValue={fields.smallDescription.initialValue}
                                placeholder="Small description for your blog..."
                                className="h-32"/>
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
                                width = {200}
                                height = {400}
                                />

                            ):(


                                <UploadDropzone onClientUploadComplete={(res) => {
                                setImageUrl(res[0].url)
                                    toast.success('Image has been uploaded')
                                }}
                                endpoint="imageUploader"
                                onUploadError={() => {
                                    toast.error('Something went wrong')
                                }}

                                />

                            ) }

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
                        <TailwindEditor onChange={setValue} initialValue={value}/> {/*Here we have a setter which sets value of value to the text inside Tailwind editor*/}
                        <p className="text-red-500 text-sm">
                            {fields.articleContent.errors}
                        </p>


                    </div>
                        <SubmitButton text={"Create Article"} />

                    </form>
                </CardContent >

            </Card>

    </>)}
