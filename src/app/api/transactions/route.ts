import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const assetId = searchParams.get("assetId");

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(memberId ? { memberId: parseInt(memberId) } : {}),
      ...(assetId ? { assetId: parseInt(assetId) } : {}),
    },
    include: { member: true, asset: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await prisma.$transaction(async (db: any) => {
    const transaction = await db.transaction.create({
      data: {
        memberId: body.memberId,
        assetId: body.assetId,
        type: body.type,
        quantity: body.quantity,
        price: body.price,
        fee: body.fee ?? 0,
        date: new Date(body.date),
        memo: body.memo ?? null,
      },
      include: { asset: true },
    });

    const asset = await db.asset.findUnique({ where: { id: body.assetId } });
    if (!asset) return transaction;

    if (body.type === "BUY") {
      const totalCost = asset.avgPrice * asset.quantity + body.price * body.quantity;
      const newQty = asset.quantity + body.quantity;
      await db.asset.update({
        where: { id: body.assetId },
        data: {
          quantity: newQty,
          avgPrice: newQty > 0 ? totalCost / newQty : 0,
        },
      });
    } else if (body.type === "SELL") {
      const newQty = Math.max(0, asset.quantity - body.quantity);
      await db.asset.update({
        where: { id: body.assetId },
        data: { quantity: newQty },
      });
    }

    return transaction;
  });

  return NextResponse.json(result, { status: 201 });
}
