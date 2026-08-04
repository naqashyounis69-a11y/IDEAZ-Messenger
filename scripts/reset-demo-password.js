const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { username: 'demo', password: 'demo123' },
    { username: 'demo2', password: 'demo123' },
  ];

  for (const entry of updates) {
    const hashedPassword = await bcrypt.hash(entry.password, 12);
    await prisma.user.update({
      where: { username: entry.username },
      data: { password: hashedPassword },
    });
    console.log(`updated ${entry.username}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
