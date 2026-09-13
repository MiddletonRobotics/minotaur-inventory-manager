-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('PART_CREATED', 'PART_DELETED', 'PROJECT_CREATED', 'PROJECT_ARCHIVED', 'CATEGORY_CREATED', 'CATEGORY_DELETED', 'SUBCATEGORY_CREATED', 'SUBCATEGORY_DELETED');

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

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
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL DEFAULT floor(random() * 90000000 + 10000000)::int,
    "action" "AuditAction" NOT NULL,
    "entityId" INTEGER,
    "entityName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "performedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_performedById_idx" ON "AuditLog"("performedById");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
