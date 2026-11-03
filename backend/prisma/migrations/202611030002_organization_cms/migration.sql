CREATE TABLE "EesaOverview" (
 "id" TEXT PRIMARY KEY, "version" INTEGER NOT NULL DEFAULT 1,
 "publishedRevisionId" TEXT, "workingRevisionId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "EesaOverviewRevision" (
 "id" TEXT PRIMARY KEY, "resourceId" TEXT NOT NULL REFERENCES "EesaOverview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "number" INTEGER NOT NULL, "status" "ActivityRevisionStatus" NOT NULL DEFAULT 'DRAFT', "content" JSONB NOT NULL,
 "rejectionNote" TEXT, "submittedAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "EesaOverviewRevision_resourceId_number_key" ON "EesaOverviewRevision"("resourceId", "number");
CREATE UNIQUE INDEX "EesaOverviewRevision_resourceId_id_key" ON "EesaOverviewRevision"("resourceId", "id");
CREATE INDEX "EesaOverviewRevision_status_updatedAt_idx" ON "EesaOverviewRevision"("status", "updatedAt");
ALTER TABLE "EesaOverview" ADD CONSTRAINT "EesaOverview_id_publishedRevisionId_fkey" FOREIGN KEY ("id", "publishedRevisionId") REFERENCES "EesaOverviewRevision"("resourceId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "EesaOverview" ADD CONSTRAINT "EesaOverview_id_workingRevisionId_fkey" FOREIGN KEY ("id", "workingRevisionId") REFERENCES "EesaOverviewRevision"("resourceId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE TABLE "EesaOverviewMediaReference" (
 "revisionId" TEXT NOT NULL REFERENCES "EesaOverviewRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "path" TEXT NOT NULL, "mediaId" TEXT NOT NULL REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 PRIMARY KEY ("revisionId", "path")
);
CREATE INDEX "EesaOverviewMediaReference_mediaId_idx" ON "EesaOverviewMediaReference"("mediaId");

CREATE TABLE "Department" (
 "id" TEXT PRIMARY KEY, "version" INTEGER NOT NULL DEFAULT 1,
 "publishedRevisionId" TEXT, "workingRevisionId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "DepartmentRevision" (
 "id" TEXT PRIMARY KEY, "resourceId" TEXT NOT NULL REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "number" INTEGER NOT NULL, "status" "ActivityRevisionStatus" NOT NULL DEFAULT 'DRAFT', "content" JSONB NOT NULL,
 "rejectionNote" TEXT, "submittedAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "DepartmentRevision_resourceId_number_key" ON "DepartmentRevision"("resourceId", "number");
CREATE UNIQUE INDEX "DepartmentRevision_resourceId_id_key" ON "DepartmentRevision"("resourceId", "id");
CREATE INDEX "DepartmentRevision_status_updatedAt_idx" ON "DepartmentRevision"("status", "updatedAt");
ALTER TABLE "Department" ADD CONSTRAINT "Department_id_publishedRevisionId_fkey" FOREIGN KEY ("id", "publishedRevisionId") REFERENCES "DepartmentRevision"("resourceId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Department" ADD CONSTRAINT "Department_id_workingRevisionId_fkey" FOREIGN KEY ("id", "workingRevisionId") REFERENCES "DepartmentRevision"("resourceId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE TABLE "DepartmentMediaReference" (
 "revisionId" TEXT NOT NULL REFERENCES "DepartmentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "path" TEXT NOT NULL, "mediaId" TEXT NOT NULL REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 PRIMARY KEY ("revisionId", "path")
);
CREATE INDEX "DepartmentMediaReference_mediaId_idx" ON "DepartmentMediaReference"("mediaId");

CREATE TABLE "DepartmentGrant" (
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "departmentId" TEXT NOT NULL REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("userId", "departmentId")
);
CREATE INDEX "DepartmentGrant_departmentId_idx" ON "DepartmentGrant"("departmentId");

CREATE TABLE "Team" (
 "id" TEXT PRIMARY KEY, "version" INTEGER NOT NULL DEFAULT 1,
 "publishedRevisionId" TEXT, "workingRevisionId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "TeamRevision" (
 "id" TEXT PRIMARY KEY, "resourceId" TEXT NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "number" INTEGER NOT NULL, "status" "ActivityRevisionStatus" NOT NULL DEFAULT 'DRAFT', "content" JSONB NOT NULL,
 "rejectionNote" TEXT, "submittedAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "TeamRevision_resourceId_number_key" ON "TeamRevision"("resourceId", "number");
CREATE UNIQUE INDEX "TeamRevision_resourceId_id_key" ON "TeamRevision"("resourceId", "id");
CREATE INDEX "TeamRevision_status_updatedAt_idx" ON "TeamRevision"("status", "updatedAt");
ALTER TABLE "Team" ADD CONSTRAINT "Team_id_publishedRevisionId_fkey" FOREIGN KEY ("id", "publishedRevisionId") REFERENCES "TeamRevision"("resourceId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Team" ADD CONSTRAINT "Team_id_workingRevisionId_fkey" FOREIGN KEY ("id", "workingRevisionId") REFERENCES "TeamRevision"("resourceId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE TABLE "TeamMediaReference" (
 "revisionId" TEXT NOT NULL REFERENCES "TeamRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "path" TEXT NOT NULL, "mediaId" TEXT NOT NULL REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 PRIMARY KEY ("revisionId", "path")
);
CREATE INDEX "TeamMediaReference_mediaId_idx" ON "TeamMediaReference"("mediaId");

CREATE TABLE "TeamGrant" (
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "teamId" TEXT NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("userId", "teamId")
);
CREATE INDEX "TeamGrant_teamId_idx" ON "TeamGrant"("teamId");

ALTER TABLE "Media" ADD COLUMN "overviewId" TEXT REFERENCES "EesaOverview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Media" ADD COLUMN "departmentId" TEXT REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Media" ADD COLUMN "teamId" TEXT REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Media" DROP CONSTRAINT "Media_scope";
ALTER TABLE "Media" ADD CONSTRAINT "Media_scope" CHECK (num_nonnulls("activityId", "categoryId", "overviewId", "departmentId", "teamId") = 1);
ALTER TABLE "EesaOverview" ADD CONSTRAINT "EesaOverview_version_positive" CHECK ("version" > 0);
ALTER TABLE "EesaOverviewRevision" ADD CONSTRAINT "EesaOverviewRevision_number_positive" CHECK ("number" > 0);
ALTER TABLE "Department" ADD CONSTRAINT "Department_version_positive" CHECK ("version" > 0);
ALTER TABLE "DepartmentRevision" ADD CONSTRAINT "DepartmentRevision_number_positive" CHECK ("number" > 0);
ALTER TABLE "Team" ADD CONSTRAINT "Team_version_positive" CHECK ("version" > 0);
ALTER TABLE "TeamRevision" ADD CONSTRAINT "TeamRevision_number_positive" CHECK ("number" > 0);
