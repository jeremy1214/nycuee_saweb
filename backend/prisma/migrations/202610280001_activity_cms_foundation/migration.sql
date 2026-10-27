-- CreateEnum
CREATE TYPE "ActivityRevisionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ActivityCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "featuredActivityId" TEXT,

    CONSTRAINT "ActivityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedRevisionId" TEXT,
    "workingRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityRevision" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "ActivityRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" DATE,
    "endDate" DATE,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "location" TEXT,
    "links" JSONB NOT NULL DEFAULT '[]',
    "detail" JSONB,
    "album" JSONB,
    "rejectionNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityCategory_label_key" ON "ActivityCategory"("label");

-- CreateIndex
CREATE INDEX "ActivityRevision_categoryId_date_idx" ON "ActivityRevision"("categoryId", "date");

-- CreateIndex
CREATE INDEX "ActivityRevision_status_updatedAt_idx" ON "ActivityRevision"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRevision_activityId_number_key" ON "ActivityRevision"("activityId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRevision_activityId_id_key" ON "ActivityRevision"("activityId", "id");

-- AddForeignKey
ALTER TABLE "ActivityCategory" ADD CONSTRAINT "ActivityCategory_featuredActivityId_fkey" FOREIGN KEY ("featuredActivityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_id_publishedRevisionId_fkey" FOREIGN KEY ("id", "publishedRevisionId") REFERENCES "ActivityRevision"("activityId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_id_workingRevisionId_fkey" FOREIGN KEY ("id", "workingRevisionId") REFERENCES "ActivityRevision"("activityId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ActivityRevision" ADD CONSTRAINT "ActivityRevision_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRevision" ADD CONSTRAINT "ActivityRevision_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ActivityCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Defense in depth for date intervals and the JSONB container shapes.
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_version_positive" CHECK ("version" > 0);
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_distinct_revisions" CHECK ("publishedRevisionId" IS NULL OR "workingRevisionId" IS NULL OR "publishedRevisionId" <> "workingRevisionId");
ALTER TABLE "ActivityRevision" ADD CONSTRAINT "ActivityRevision_number_positive" CHECK ("number" > 0);
ALTER TABLE "ActivityRevision" ADD CONSTRAINT "ActivityRevision_date_range" CHECK ("endDate" IS NULL OR ("date" IS NOT NULL AND "endDate" >= "date"));
ALTER TABLE "ActivityRevision" ADD CONSTRAINT "ActivityRevision_links_array" CHECK (jsonb_typeof("links") = 'array');
ALTER TABLE "ActivityRevision" ADD CONSTRAINT "ActivityRevision_detail_object" CHECK ("detail" IS NULL OR jsonb_typeof("detail") = 'object');
ALTER TABLE "ActivityRevision" ADD CONSTRAINT "ActivityRevision_album_object" CHECK ("album" IS NULL OR (jsonb_typeof("album") = 'object' AND "detail" IS NOT NULL));
