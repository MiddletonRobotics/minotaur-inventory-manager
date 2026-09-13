-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'VENDOR_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'VENDOR_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'VENDOR_REACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'LOCATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LOCATION_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'LOCATION_REACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_REACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_PROMOTED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_DEMOTED';

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

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
