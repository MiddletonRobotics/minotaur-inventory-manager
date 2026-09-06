-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "ProjectCheckout" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" INTEGER NOT NULL DEFAULT floor(random() * 90000000 + 10000000)::int,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageLocation_name_key" ON "StorageLocation"("name");
