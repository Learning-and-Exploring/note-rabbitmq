-- CreateEnum
CREATE TYPE "AuthRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "auths"
ADD COLUMN "role" "AuthRole" NOT NULL DEFAULT 'USER';
