
//05:38
import {Card, CardDescription, CardFooter, CardHeader, CardTitle} from "@/componentsFrontend/ui/card";
import {Button} from "@/componentsFrontend/ui/button";
import Link from "next/link";
import {SubmitButton} from "@/app/components/dashboard/SubmitButtons";
import {DeletePost} from "@/app/actions/actions";

export default async function DeleteForm({params}:
{params: Promise<{siteId:string, articleId:string}>
}){

    const {siteId, articleId} = await params


    return (
        <div className="flex flex-1 items-center justify-center">
            <Card className="min-w-xl">
                <CardHeader>
                    <CardTitle>Are you absolutely sure?</CardTitle>
                    <CardDescription>This action cannot be undone. This will delete
                        this article and remove all data from our sever</CardDescription>

                </CardHeader>
                <CardFooter className="w-full flex justify-between">
                    <Button variant="secondary" asChild>
                        <Link href={`/dashboard/sites/${siteId}`}>Cancel</Link>
                        </Button>
                    <form action={DeletePost}>

                        <input type="hidden" name="articleId" value={articleId}/>
                        <input type="hidden" name="siteId" value={siteId}/>
                        <SubmitButton variant="destructive" text="Delete Article"/>
                    </form>


                </CardFooter>

            </Card>

        </div>

    )


}