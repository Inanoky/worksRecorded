import { prisma } from "@/lib/utils/db";



const org =
  (await prisma.organization.findFirst({ where: { name: 'DEPROM' } })) ??
  (await prisma.organization.create({ data: { name: 'DEPROM' } }));

await prisma.user.updateMany({
  where: {
    id: {
      in: [
        'kp_bcf47b7ff02248e1bc215bc5f7238a75',        
      ],
    },
  },
  data: { organizationId: org.id },
});