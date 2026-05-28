import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const ticker = await prisma.tickerMaster.update({
    where: { id: parseInt(id) },
    data: {
      ticker: body.ticker.toUpperCase(),
      name: body.name,
      type: body.type,
      currency: body.currency,
      market: body.market ?? null,
    },
  });
  return NextResponse.json(ticker);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.tickerMaster.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
