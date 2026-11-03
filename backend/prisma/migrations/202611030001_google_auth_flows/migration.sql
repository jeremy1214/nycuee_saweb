CREATE TABLE "GoogleAuthFlow" (
  "stateHash" VARCHAR(64) PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nonceHash" VARCHAR(64) NOT NULL,
  "verifier" TEXT NOT NULL,
  "linkUserId" TEXT,
  "userVersion" INTEGER,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "GoogleAuthFlow_sessionId_idx" ON "GoogleAuthFlow"("sessionId");
CREATE INDEX "GoogleAuthFlow_expiresAt_idx" ON "GoogleAuthFlow"("expiresAt");
