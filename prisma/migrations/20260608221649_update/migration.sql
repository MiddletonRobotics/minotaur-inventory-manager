-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCheckout" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "quantityCheckedOut" INTEGER NOT NULL,
    "note" TEXT,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutById" INTEGER NOT NULL,
    "lastModifiedAt" TIMESTAMP(3) NOT NULL,
    "lastModifiedById" INTEGER,

    CONSTRAINT "ProjectCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE INDEX "ProjectCheckout_projectId_idx" ON "ProjectCheckout"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCheckout_partId_idx" ON "ProjectCheckout"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCheckout_projectId_partId_key" ON "ProjectCheckout"("projectId", "partId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckout" ADD CONSTRAINT "ProjectCheckout_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckout" ADD CONSTRAINT "ProjectCheckout_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckout" ADD CONSTRAINT "ProjectCheckout_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckout" ADD CONSTRAINT "ProjectCheckout_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
