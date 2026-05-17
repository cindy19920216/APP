import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchPrices } from "@/lib/price-fetcher";

export async function GET() {
  const assets = await prisma.asset.findMany({
    select: { ticker: true, type: true },
  });

  const uniqueMap = new Map<string, { ticker: string; type: string }>();
  for (const a of assets) uniqueMap.set(a.ticker, a);

  const prices = await fetchPrices(Array.from(uniqueMap.values()));
  return NextResponse.json(prices);
}
