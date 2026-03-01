-- AlterTable
ALTER TABLE "auths"
ADD COLUMN "email_verification_otp_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "email_verification_otp_sent_at" TIMESTAMP(3);
