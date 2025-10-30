import { prisma } from "@/lib/utils/db";



const org =
  (await prisma.organization.findFirst({ where: { name: 'DEPROM' } })) ??
  (await prisma.organization.create({ data: { name: 'DEPROM' } }));

await prisma.user.updateMany({
  where: {
    id: {
      in: [
        'kp_27aa26503a744b7abbbb6f785a197ab2',        
      ],
    },
  },
  data: { organizationId: org.id },
});