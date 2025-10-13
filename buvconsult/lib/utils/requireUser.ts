
//validation code for authentication 04:03:32
import {getKindeServerSession} from "@kinde-oss/kinde-auth-nextjs/server";
import {redirect} from "next/navigation";

export const requireUser = async() => {

    const {getUser} = getKindeServerSession()
    const user = await getUser()


    if (!user ) {
        return redirect("/api/auth/login");
    }

    return user

}