BEGIN;

ALTER TABLE "ContactMessage"
    ALTER COLUMN "name" DROP NOT NULL,
    ALTER COLUMN "email" DROP NOT NULL,
    ALTER COLUMN "subject" TYPE TEXT,
    ALTER COLUMN "message" TYPE TEXT;

CREATE TABLE "ContactMessageImage" (
    "messageId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    CONSTRAINT "ContactMessageImage_pkey" PRIMARY KEY ("messageId"),
    CONSTRAINT "ContactMessageImage_messageId_fkey" FOREIGN KEY ("messageId")
        REFERENCES "ContactMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMIT;
