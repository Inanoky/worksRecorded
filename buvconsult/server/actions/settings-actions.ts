"use server"

import { prisma } from "@/lib/utils/db";



export async function getUserData(orgId){


   const users = await prisma.user.findMany({

        where: {organizationId : orgId},
        select: {
            id: true,
            email : true,
            firstName : true,
            lastName : true,
            phone : true,
            role : true,

        }
    })

    return  users


}

export async function editUserData( id, data){


    await prisma.user.update({

        where: {id },
        data
        
    })

    return  "Success"


}