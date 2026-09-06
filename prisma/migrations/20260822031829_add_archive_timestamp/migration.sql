-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "ProjectCheckout" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int;
