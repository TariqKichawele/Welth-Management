/*
  Warnings:

  - You are about to drop the column `reccurringInterval` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "reccurringInterval",
ADD COLUMN     "recurringInterval" "RecurringInterval";
