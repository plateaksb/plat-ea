-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "note" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'CASH';
