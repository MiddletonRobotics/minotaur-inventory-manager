-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STANDARD', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "type" "Role" NOT NULL DEFAULT 'STANDARD',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "pwdHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firstName_key" ON "User"("firstName");

-- CreateIndex
CREATE UNIQUE INDEX "User_lastName_key" ON "User"("lastName");
