/*
  Warnings:

  - You are about to drop the column `location` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `vendor` on the `Item` table. All the data in the column will be lost.
  - Added the required column `vendorId` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "location",
DROP COLUMN "vendor",
ADD COLUMN     "locationId" INTEGER,
ADD COLUMN     "vendorId" INTEGER NOT NULL,
ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "ProjectCheckout" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "StorageLocation" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parentId" INTEGER,
ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- DropEnum
DROP TYPE "Vendor";

-- CreateTable
CREATE TABLE "Vendor" (
    "id" INTEGER NOT NULL DEFAULT floor(random() * 90000000 + 10000000)::int,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" INTEGER NOT NULL DEFAULT floor(random() * 90000000 + 10000000)::int,
    "itemId" INTEGER NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" TEXT,
    "adjustedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_itemId_idx" ON "InventoryAdjustment"("itemId");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_adjustedById_idx" ON "InventoryAdjustment"("adjustedById");

-- CreateIndex
CREATE INDEX "Item_vendorId_idx" ON "Item"("vendorId");

-- CreateIndex
CREATE INDEX "Item_locationId_idx" ON "Item"("locationId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
