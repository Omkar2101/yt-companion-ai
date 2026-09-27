import { PrismaClient } from "@prisma/client";

// Initialize a single instance of PrismaClient for our app
const prisma = new PrismaClient();

export default prisma;
