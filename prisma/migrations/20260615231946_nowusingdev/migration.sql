-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Category_id_seq";

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Item_id_seq";

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Project_id_seq";

-- AlterTable
ALTER TABLE "ProjectCheckout" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "ProjectCheckout_id_seq";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT floor(random() * 90000000 + 10000000)::int,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "User_id_seq";
