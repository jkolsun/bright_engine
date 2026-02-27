-- AlterTable
ALTER TABLE "leads" ADD COLUMN "last_contacted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "leads_last_contacted_at_idx" ON "leads"("last_contacted_at");
