//This starts from 04:59:57 - edit functionality.

import {prisma} from "@/app/utils/db";
import {notFound} from "next/navigation";
import {Button} from "@/componentsFrontend/ui/button";
import {ArrowLeft} from "lucide-react";
import Link from "next/link";
import {EditArticleForm} from "@/app/components/dashboard/forms/EditArticleForm";

async function getData(postId:string){

    const data = await prisma.post.findUnique({

        where: {

            id: postId,
        },
        select: {
            image:true,
            title:true,
            smallDescription:true,
            slug: true,
            articleContent: true,
            id: true
        }

    })

    if(!data){
        return notFound()
    }

    return data;
}


export default async function EditRoute({params}:
    {params: Promise<{articleId: string , siteId:string }>

    }){

    const {articleId, siteId} = await params

    const data = await getData(articleId);

    return (
        <div>
            <div className="flex items-center">
                <Button size="icon" variant="outline" asChild className="mr-3">
                    <Link href={`/dashboard/sites/${siteId}`}>
                        <ArrowLeft className="size-4"/>
                    </Link>
                </Button>
                <h1 className="text-2xl font-semibold">Edit Article</h1>

            </div>
            <EditArticleForm data={data} siteId={siteId}/>
        </div>
    )
}