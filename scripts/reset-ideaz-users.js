const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const [password, pin] = await Promise.all([
    bcrypt.hash("6927", 12),
    bcrypt.hash("6927", 12),
  ]);

  const result = await prisma.$transaction(async (database) => {
    const targets = await database.user.findMany({
      where: {
        OR: [
          { username: { equals: "ideaz", mode: "insensitive" } },
          { username: { equals: "amina", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    const targetIds = targets.map((user) => user.id);
    const ownedGroups = await database.group.findMany({
      where: { creatorId: { in: targetIds } },
      select: { id: true },
    });
    const groupIds = ownedGroups.map((group) => group.id);
    const ownedStatuses = await database.status.findMany({
      where: { authorId: { in: targetIds } },
      select: { id: true },
    });
    const statusIds = ownedStatuses.map((status) => status.id);

    await database.message.deleteMany({ where: { OR: [{ senderId: { in: targetIds } }, { receiverId: { in: targetIds } }] } });
    await database.statusView.deleteMany({ where: { OR: [{ viewerId: { in: targetIds } }, { statusId: { in: statusIds } }] } });
    await database.status.deleteMany({ where: { id: { in: statusIds } } });
    await database.groupMessage.deleteMany({ where: { OR: [{ senderId: { in: targetIds } }, { groupId: { in: groupIds } }] } });
    await database.groupMember.deleteMany({ where: { OR: [{ userId: { in: targetIds } }, { groupId: { in: groupIds } }] } });
    await database.group.deleteMany({ where: { id: { in: groupIds } } });

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
