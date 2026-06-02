import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const tickers = await prisma.tickerMaster.findMany({
    where: q
      ? {
          OR: [
            { ticker: { contains: q } },
            { name: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ type: "asc" }, { ticker: "asc" }],
    take: 200,
  });

  return NextResponse.json(tickers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const ticker = await prisma.tickerMaster.create({
    data: {
      ticker: body.ticker.toUpperCase(),
      name: body.name,
      type: body.type,
      currency: body.currency,
      market: body.market ?? null,
    },
  });
  return NextResponse.json(ticker, { status: 201 });
}
