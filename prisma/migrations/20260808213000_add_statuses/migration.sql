CREATE TABLE "Status" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "text" TEXT,
  "media" TEXT,
  "mediaType" TEXT,
  "color" TEXT NOT NULL DEFAULT '#4f46e5',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StatusView" (
  "id" TEXT NOT NULL,
  "statusId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StatusView_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Status_authorId_idx" ON "Status"("authorId");
CREATE INDEX "Status_expiresAt_idx" ON "Status"("expiresAt");
CREATE INDEX "StatusView_viewerId_idx" ON "StatusView"("viewerId");
CREATE UNIQUE INDEX "StatusView_statusId_viewerId_key" ON "StatusView"("statusId", "viewerId");
ALTER TABLE "Status" ADD CONSTRAINT "Status_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatusView" ADD CONSTRAINT "StatusView_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatusView" ADD CONSTRAINT "StatusView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
