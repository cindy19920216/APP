import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");

  const assets = await prisma.asset.findMany({
    where: memberId ? { memberId: parseInt(memberId) } : undefined,
    include: { member: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const body = await req.json();
  const asset = await prisma.asset.create({
    data: {
      memberId: body.memberId,
      type: body.type,
      ticker: body.ticker.toUpperCase(),
      name: body.name,
      quantity: body.quantity ?? 0,
      avgPrice: body.avgPrice ?? 0,
      currency: body.currency ?? "KRW",
    },
    include: { member: true },
  });
  return NextResponse.json(asset, { status: 201 });
}
