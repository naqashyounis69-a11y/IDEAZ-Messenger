const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, fullName: true, password: true, pin: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(JSON.stringify(users, null, 2));

  for (const user of users) {
    const passwordMatches = await bcrypt.compare('demo123', user.password);
    console.log(user.username, 'passwordMatches', passwordMatches);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
