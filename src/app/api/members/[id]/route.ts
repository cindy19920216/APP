import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const member = await prisma.familyMember.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      role: body.role ?? null,
      color: body.color,
    },
  });
  return NextResponse.json(member);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.familyMember.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
