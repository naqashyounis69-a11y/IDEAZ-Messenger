const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash("demo123", 12);
    const pin = await bcrypt.hash("1234", 12);

    const user = await prisma.user.update({
        where: {
            username: "demo"
        },
        data: {
            password,
            pin
        }
    });

    console.log("✅ Demo User Updated");
    console.log("Username: demo");
    console.log("Password: demo123");
    console.log("PIN: 1234");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });