-- CreateEnum
CREATE TYPE "ItemFieldType" AS ENUM ('TEXT', 'INTEGER', 'DECIMAL', 'SELECT');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PART_FIELD_UPDATED';

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "nameTemplate" TEXT,
ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "InventoryAdjustment" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "ProjectCheckout" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "StorageLocation" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- CreateTable
CREATE TABLE "ItemFieldDefinition" (
    "id" INTEGER NOT NULL DEFAULT floor(random() * 90000000 + 10000000)::int,
    "categoryId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "ItemFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemFieldValue" (
    "id" INTEGER NOT NULL DEFAULT floor(random() * 90000000 + 10000000)::int,
    "itemId" INTEGER NOT NULL,
    "fieldDefinitionId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ItemFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemFieldDefinition_categoryId_sortOrder_idx" ON "ItemFieldDefinition"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ItemFieldDefinition_categoryId_key_key" ON "ItemFieldDefinition"("categoryId", "key");

-- CreateIndex
CREATE INDEX "ItemFieldValue_itemId_idx" ON "ItemFieldValue"("itemId");

-- CreateIndex
CREATE INDEX "ItemFieldValue_fieldDefinitionId_idx" ON "ItemFieldValue"("fieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemFieldValue_itemId_fieldDefinitionId_key" ON "ItemFieldValue"("itemId", "fieldDefinitionId");

-- AddForeignKey
ALTER TABLE "ItemFieldDefinition" ADD CONSTRAINT "ItemFieldDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "ItemFieldDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
