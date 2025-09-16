-- AlterTable
ALTER TABLE "public"."News" ADD COLUMN     "categoryId" INTEGER;

-- CreateTable
CREATE TABLE "public"."NewsCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "NewsCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsCategory_name_key" ON "public"."NewsCategory"("name");

-- AddForeignKey
ALTER TABLE "public"."News" ADD CONSTRAINT "News_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."NewsCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
