import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      recordings: {
        where: { status: "COMPLETED", docxPath: { not: null } },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const passThrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.pipe(passThrough);

  for (const rec of job.recordings) {
    if (rec.docxPath && fs.existsSync(rec.docxPath)) {
      archive.file(rec.docxPath, { name: path.basename(rec.docxPath) });
    }
  }

  await archive.finalize();

  const chunks: Buffer[] = [];
  for await (const chunk of passThrough) {
    chunks.push(chunk as Buffer);
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${job.name}-transcripts.zip"`,
    },
  });
}
