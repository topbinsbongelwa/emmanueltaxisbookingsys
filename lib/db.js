import { PrismaClient } from "@prisma/client";
const g = globalThis;
export const prisma = g.p || (g.p = new PrismaClient());
