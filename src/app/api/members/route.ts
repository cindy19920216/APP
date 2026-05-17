import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const members = await prisma.familyMember.findMany({
    include: { assets: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const body = await req.json();
  const member = await prisma.familyMember.create({
    data: {
      name: body.name,
      role: body.role ?? null,
      color: body.color ?? "#6366f1",
    },
  });
  return NextResponse.json(member, { status: 201 });
}
