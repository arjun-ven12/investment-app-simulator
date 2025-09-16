-- CreateTable
CREATE TABLE "News" (
    "news_id" SERIAL NOT NULL,
    "image_url" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "caption" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("news_id")
);
