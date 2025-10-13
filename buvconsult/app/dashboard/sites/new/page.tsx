"use client";

export const runtime = "nodejs";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {useActionState} from "react";
import {CreateSiteAction} from "@/server/actions/shared-actions";
import {useForm} from "@conform-to/react";
import {parseWithZod} from "@conform-to/zod";
import {siteSchema} from "@/lib/utils/zodSchemas";
import {SubmitButton} from "@/components/dashboard/SubmitButtons";



export default function NewSiteRoute(){

    const [lastResult, action] = useActionState(CreateSiteAction, undefined)
    const [form,fields] = useForm({
        lastResult,
        onValidate({formData}){
            return parseWithZod(formData, {
                schema: siteSchema})
        },
        shouldValidate:'onBlur',
        shouldRevalidate: 'onInput'

    })


    return(
        <div className="flex flex-col flex-1 items-center justify-center">
            <Card className="max-w-[450px]">
              <CardHeader>
                    <CardTitle>New Project</CardTitle>
                    <CardDescription>Enter project information</CardDescription>
              </CardHeader>
              <form id={form.id} onSubmit={form.onSubmit} action={action}>
                  <CardContent>
                  <div className="flex flex-col gap-y-6">
                      <div className="grid gap-2">
                          <Label>Project name</Label>
                          <Input
                              name={fields.name.name}
                              key={fields.name.key}
                              defaultValue={fields.name.initialValue}
                              placeholder="Project name"/>
                          <p className="text-red-500 text-small">{fields.name.errors}</p>
                      </div>
                      <div className="grid gap-2">
                          <Label>Project address</Label>
                          <Input
                              name={fields.subdirectory.name}
                              key={fields.subdirectory.key}
                              defaultValue={fields.subdirectory.initialValue}
                              placeholder="Adress"/>
                          <p className="text-red-500 text-small"> {fields.subdirectory.errors}</p>

                      </div>
                      <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea
                              name={fields.description.name}
                              key={fields.description.key}
                              defaultValue={fields.description.initialValue}
                              placeholder="Small Description for your site"/>
                          <p className="text-red-500 text-sm">{fields.description.errors}</p>

                      </div>
                  </div>
              </CardContent>
                <CardFooter>
                    <SubmitButton text="Create Project"/>
                </CardFooter>

              </form>
            </Card>


        </div>
    )
}