import {getKindeServerSession} from "@kinde-oss/kinde-auth-nextjs/server";

import {NextResponse} from "next/server";
import {prisma} from "@/lib/utils/db";

export async function GET(){

    const {getUser} = getKindeServerSession()
    const user = await getUser()

    if(!user || user === null || !user.id){
        throw new Error("Something went wrong")
    }


    let dbUser = await prisma.user.findUnique({
        where: {
            id: user.id,
        }
    });

    if(!dbUser){
        dbUser = await prisma.user.create({
            data: {
                id: user.id,
                firstName: user.given_name ?? "",
                lastName: user.family_name?? "",
                email: user.email ?? "",
                profileImage:
                    user.picture ?? `https://avatar.vercel.sh/rauchg${user.given_name}`,
            }

        })
    }

    return NextResponse.redirect(process.env.NODE_ENV === "production"
     ? "https://buvconsult.com/dashboard"
    : "http://localhost:3000/dashboard",

    )
}