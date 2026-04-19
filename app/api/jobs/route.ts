import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractFolderId, listMp3Files } from "@/lib/drive";

export async function GET() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { recordings: true } },
    },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const { name, driveUrl, googleApiKey } = await req.json();

  if (!name || !driveUrl) {
    return NextResponse.json(
      { error: "name and driveUrl are required" },
      { status: 400 }
    );
  }

  const folderId = extractFolderId(driveUrl);
  if (!folderId) {
    return NextResponse.json(
      { error: "Could not extract folder ID from Drive URL" },
      { status: 400 }
    );
  }

  if (googleApiKey) process.env.GOOGLE_API_KEY = googleApiKey;

  let files: Awaited<ReturnType<typeof listMp3Files>> = [];
  try {
    files = await listMp3Files(folderId);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to list files from Google Drive. Make sure the folder is public and your Google API key is valid.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }

  if (files.length === 0) {
    return NextResponse.json(
      {
        error:
          "No audio files found in this Drive folder. Make sure: (1) the folder is shared as 'Anyone with the link', (2) it contains audio files (.mp3, .m4a, .wav, .ogg, .aac, etc.)",
      },
      { status: 400 }
    );
  }

  const job = await prisma.job.create({
    data: {
      name,
      driveFolderId: folderId,
      totalFiles: files.length,
      status: "PENDING",
      recordings: {
        create: files.map((f) => ({
          filename: f.name,
          driveFileId: f.id,
          status: "PENDING",
        })),
      },
    },
    include: { recordings: true },
  });

  return NextResponse.json(job, { status: 201 });
}
