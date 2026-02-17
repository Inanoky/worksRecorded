   import { MembersTable } from "@/components/settings/MembersTable"; 
   import { requireUser } from "@/lib/utils/requireUser";
   import { orgCheck } from "@/server/actions/shared-actions";
   import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";
   import { getUserData } from "@/server/actions/settings-actions";
    
    
    export default async function SettingsSiteRoute({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {


    const { siteId } = await params
      const user = await requireUser();
      const siteCheck = await orgCheck(user.id, siteId);
      
        const orgId = await getOrganizationIdByUserId(user.id)
        const userData = await getUserData(orgId)

return (

        <MembersTable pageSize={5} data={userData} exportFileName="Members" userid={user.id} orgId={orgId}  />

)

}
    
    
