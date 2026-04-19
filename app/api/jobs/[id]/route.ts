import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { recordings: { orderBy: { filename: "asc" } } },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Reset all FAILED recordings to PENDING so worker retries them
  const { count } = await prisma.recording.updateMany({
    where: { jobId: id, status: "FAILED" },
    data: { status: "PENDING", errorMessage: null },
  });
  await prisma.job.update({
    where: { id },
    data: { status: "PROCESSING" },
  });
  return NextResponse.json({ retried: count });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
