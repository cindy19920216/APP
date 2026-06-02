import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchPrices } from "@/lib/price-fetcher";
import { AssetType } from "@/lib/types";

export async function GET() {
  const members = await prisma.familyMember.findMany({
    include: { assets: true },
    orderBy: { createdAt: "asc" },
  });

  const allAssets = members.flatMap((m) => m.assets);
  const uniqueMap = new Map<string, { ticker: string; type: string }>();
  for (const a of allAssets) uniqueMap.set(a.ticker, { ticker: a.ticker, type: a.type });
  const prices = await fetchPrices(Array.from(uniqueMap.values()));

  const memberStats = members.map((m) => {
    let totalValue = 0;
    let totalCost = 0;

    const assets = m.assets.map((a) => {
      const currentPrice = prices[a.ticker] ?? a.avgPrice;
      const currentValue = currentPrice * a.quantity;
      const cost = a.avgPrice * a.quantity;
      const profitLoss = currentValue - cost;
      const profitLossPct = cost > 0 ? (profitLoss / cost) * 100 : 0;

      totalValue += currentValue;
      totalCost += cost;

      return {
        ...a,
        type: a.type as AssetType,
        memberName: m.name,
        currentPrice,
        currentValue,
        cost,
        profitLoss,
        profitLossPct,
      };
    });

    return {
      ...m,
      assets,
      totalValue,
      totalCost,
      profitLoss: totalValue - totalCost,
      profitLossPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    };
  });

  const totalValue = memberStats.reduce((s, m) => s + m.totalValue, 0);
  const totalCost = memberStats.reduce((s, m) => s + m.totalCost, 0);

  return NextResponse.json({
    summary: {
      totalValue,
      totalCost,
      profitLoss: totalValue - totalCost,
      profitLossPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      memberCount: members.length,
      assetCount: allAssets.length,
    },
    members: memberStats,
    prices,
  });
}
