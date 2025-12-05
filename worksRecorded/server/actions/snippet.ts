import { prisma } from "@/lib/utils/db";



const org =
  (await prisma.organization.findFirst({ where: { name: 'locmele.renate@gmail.com' } })) ??
  (await prisma.organization.create({ data: { name: 'locmele.renate@gmail.com' } }));

await prisma.user.updateMany({
  where: {
    id: {
      in: [
        'kp_37f8c3081c6849c2bebaa351dc4983c1',        
      ],
    },
  },
  data: { organizationId: org.id },
});