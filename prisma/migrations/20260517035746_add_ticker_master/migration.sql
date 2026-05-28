-- CreateTable
CREATE TABLE "TickerMaster" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "market" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "TickerMaster_ticker_key" ON "TickerMaster"("ticker");
