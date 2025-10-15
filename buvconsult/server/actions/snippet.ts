import { prisma } from "@/lib/utils/db";



const org =
  (await prisma.organization.findFirst({ where: { name: 'TEST' } })) ??
  (await prisma.organization.create({ data: { name: 'TEST' } }));

await prisma.user.updateMany({
  where: {
    id: {
      in: [
        'kp_67bafdb52fb24db089337e013f18bae7',        
      ],
    },
  },
  data: { organizationId: org.id },
});