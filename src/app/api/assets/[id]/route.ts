import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const asset = await prisma.asset.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      ticker: body.ticker?.toUpperCase(),
      quantity: body.quantity,
      avgPrice: body.avgPrice,
      currency: body.currency,
    },
    include: { member: true },
  });
  return NextResponse.json(asset);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.asset.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
