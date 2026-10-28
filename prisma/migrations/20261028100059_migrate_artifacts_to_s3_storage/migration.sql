/*
  Warnings:

  - You are about to drop the column `content` on the `artifacts` table. All the data in the column will be lost.
  - Added the required column `content_size` to the `artifacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3_bucket` to the `artifacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3_key` to the `artifacts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "artifacts" DROP COLUMN "content",
ADD COLUMN     "content_size" INTEGER NOT NULL,
ADD COLUMN     "content_type" TEXT NOT NULL DEFAULT 'text/plain',
ADD COLUMN     "s3_bucket" TEXT NOT NULL,
ADD COLUMN     "s3_key" TEXT NOT NULL;
