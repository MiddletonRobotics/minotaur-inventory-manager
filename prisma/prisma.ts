import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/extension";

const pool: PrismaPg = new PrismaPg({ connectionString: "" });
const prisma: PrismaClient = new PrismaClient({ adapter: pool })

const globalForPrisma = global as unknown as { prisma: typeof prisma }

if (process.env.NODE_ENV != "production") globalForPrisma.prisma = prisma

export default prisma;