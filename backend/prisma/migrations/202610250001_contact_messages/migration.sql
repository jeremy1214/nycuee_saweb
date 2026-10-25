CREATE TYPE "ContactCategory" AS ENUM ('association', 'activities', 'teams', 'resources', 'website', 'other');

CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "category" "ContactCategory" NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactMessage_createdAt_id_idx" ON "ContactMessage"("createdAt", "id");
CREATE INDEX "ContactMessage_readAt_createdAt_id_idx" ON "ContactMessage"("readAt", "createdAt", "id");

CREATE TABLE "ContactSubmissionAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContactSubmissionAttempt_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "ContactSubmissionAttempt_expiresAt_idx" ON "ContactSubmissionAttempt"("expiresAt");
