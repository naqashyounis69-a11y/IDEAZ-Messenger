const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const [password, pin] = await Promise.all([
    bcrypt.hash("6927", 12),
    bcrypt.hash("6927", 12),
  ]);

  const result = await prisma.$transaction(async (database) => {
    const removed = await database.user.deleteMany({
      where: {
        OR: [
          { username: { equals: "ideaz", mode: "insensitive" } },
          { username: { equals: "amina", mode: "insensitive" } },
        ],
      },
    });

    const created = await database.user.create({
      data: {
        username: "ideaz",
        fullName: "IDEAZ",
        password,
        pin,
        about: "Hey! I am using IDEAZ Messenger",
      },
      select: { id: true, username: true, fullName: true },
    });

    return { removed: removed.count, created };
  });

  const users = await prisma.user.findMany({
    select: { username: true, fullName: true },
    orderBy: { username: "asc" },
  });

  console.log(JSON.stringify({ ...result, users }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
