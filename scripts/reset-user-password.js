const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = String(process.argv[2] || "").trim().toLowerCase();
  const password = String(process.argv[3] || "");

  if (!username || !password) {
    throw new Error("Usage: node scripts/reset-user-password.js <username> <password>");
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error("User nahi mila.");

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { username },
    data: { password: hashedPassword },
  });

  const verified = await bcrypt.compare(password, hashedPassword);
  console.log(JSON.stringify({ success: verified, username, fullName: user.fullName }));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
