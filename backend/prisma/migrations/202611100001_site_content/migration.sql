CREATE TABLE "SiteContent" (
 "id" TEXT PRIMARY KEY CHECK ("id" IN ('home', 'resources', 'settings')),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
 "publishedRevisionId" TEXT, "workingRevisionId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "SiteContentRevision" (
 "id" TEXT PRIMARY KEY,
 "resourceId" TEXT NOT NULL REFERENCES "SiteContent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "number" INTEGER NOT NULL CHECK ("number" > 0), "status" "ActivityRevisionStatus" NOT NULL DEFAULT 'DRAFT',
 "content" JSONB NOT NULL, "rejectionNote" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "SiteContentRevision_resourceId_number_key" ON "SiteContentRevision"("resourceId", "number");
CREATE UNIQUE INDEX "SiteContentRevision_resourceId_id_key" ON "SiteContentRevision"("resourceId", "id");
ALTER TABLE "SiteContent" ADD CONSTRAINT "SiteContent_id_publishedRevisionId_fkey" FOREIGN KEY ("id", "publishedRevisionId") REFERENCES "SiteContentRevision"("resourceId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "SiteContent" ADD CONSTRAINT "SiteContent_id_workingRevisionId_fkey" FOREIGN KEY ("id", "workingRevisionId") REFERENCES "SiteContentRevision"("resourceId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Media" ADD COLUMN "siteContentId" TEXT REFERENCES "SiteContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Media" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "Media" DROP CONSTRAINT "Media_scope";
ALTER TABLE "Media" ADD CONSTRAINT "Media_scope" CHECK (num_nonnulls("activityId", "categoryId", "overviewId", "departmentId", "teamId", "siteContentId") = 1);
CREATE TABLE "SiteContentMediaReference" (
 "revisionId" TEXT NOT NULL REFERENCES "SiteContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "mediaId" TEXT NOT NULL REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "path" TEXT NOT NULL, PRIMARY KEY ("revisionId", "path")
);
CREATE INDEX "SiteContentMediaReference_mediaId_idx" ON "SiteContentMediaReference"("mediaId");
