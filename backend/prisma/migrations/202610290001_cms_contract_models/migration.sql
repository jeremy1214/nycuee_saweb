-- CreateEnum
CREATE TYPE "PasswordTokenPurpose" AS ENUM ('ACTIVATE', 'RESET');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ActivityCategory" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "GoogleIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "purpose" "PasswordTokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryGrant" (
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryGrant_pkey" PRIMARY KEY ("userId","categoryId")
);

-- CreateTable
CREATE TABLE "ActivityGrant" (
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityGrant_pkey" PRIMARY KEY ("userId","activityId")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'PRIVATE',
    "uploadedById" TEXT,
    "activityId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaReference" (
    "revisionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,

    CONSTRAINT "MediaReference_pkey" PRIMARY KEY ("revisionId","path")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleIdentity_userId_key" ON "GoogleIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleIdentity_subject_key" ON "GoogleIdentity"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_tokenHash_key" ON "PasswordToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordToken_userId_purpose_idx" ON "PasswordToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "PasswordToken_expiresAt_idx" ON "PasswordToken"("expiresAt");

-- CreateIndex
CREATE INDEX "CategoryGrant_categoryId_idx" ON "CategoryGrant"("categoryId");

-- CreateIndex
CREATE INDEX "ActivityGrant_activityId_idx" ON "ActivityGrant"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- CreateIndex
CREATE INDEX "Media_uploadedById_createdAt_idx" ON "Media"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "Media_sha256_idx" ON "Media"("sha256");

-- CreateIndex
CREATE INDEX "MediaReference_mediaId_idx" ON "MediaReference"("mediaId");

-- CreateIndex
CREATE INDEX "AuditEntry_entityType_entityId_createdAt_idx" ON "AuditEntry"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEntry_actorId_createdAt_idx" ON "AuditEntry"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "GoogleIdentity" ADD CONSTRAINT "GoogleIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryGrant" ADD CONSTRAINT "CategoryGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryGrant" ADD CONSTRAINT "CategoryGrant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ActivityCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityGrant" ADD CONSTRAINT "ActivityGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityGrant" ADD CONSTRAINT "ActivityGrant_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ActivityCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaReference" ADD CONSTRAINT "MediaReference_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ActivityRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaReference" ADD CONSTRAINT "MediaReference_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "User" ADD CONSTRAINT "User_version_positive" CHECK ("version" > 0);
ALTER TABLE "ActivityCategory" ADD CONSTRAINT "ActivityCategory_order_version" CHECK ("order" >= 0 AND "version" > 0);
ALTER TABLE "Media" ADD CONSTRAINT "Media_dimensions_size" CHECK ("width" > 0 AND "height" > 0 AND "byteSize" > 0 AND "byteSize" <= 10485760);
ALTER TABLE "Media" ADD CONSTRAINT "Media_mime_type" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE "Media" ADD CONSTRAINT "Media_sha256" CHECK ("sha256" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Media" ADD CONSTRAINT "Media_scope" CHECK (num_nonnulls("activityId", "categoryId") = 1);
ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_hash" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_expiry" CHECK ("expiresAt" > "createdAt");
