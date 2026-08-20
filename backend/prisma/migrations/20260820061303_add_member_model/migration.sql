-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "memberCode" TEXT,
ADD COLUMN     "memberId" INTEGER,
ADD COLUMN     "memberName" TEXT,
ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Member" (
    "id" SERIAL NOT NULL,
    "memberCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberCode_key" ON "Member"("memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "Member_phone_key" ON "Member"("phone");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
