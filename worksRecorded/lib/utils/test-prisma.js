const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Try to fetch one worker (returns first, or null if none)
  const worker = await prisma.workers.findFirst();
  console.log('Worker:', worker);

  // Try to count workers
  const count = await prisma.workers.count();
  console.log('Workers count:', count);
}

main()
  .catch(e => {
    console.error('❌ Prisma error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());