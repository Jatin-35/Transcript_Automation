import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { downloadFile } from "../lib/drive";
import { transcribeFile } from "../lib/soniox";
import { needsTranslation, translateToHindiEnglish } from "../lib/translate";
import { generateDocx } from "../lib/docxGenerator";

const prisma = new PrismaClient({ log: ["error"] });
const CONCURRENCY = 5;
const TEMP_DIR = process.env.TEMP_DIR || "./temp";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "./outputs";

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 5000
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`Attempt ${i + 1} failed:`, err instanceof Error ? err.message : err);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

async function processRecording(recordingId: string) {
  const rec = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: { job: true },
  });
  if (!rec) return;

  const jobOutputDir = path.join(OUTPUT_DIR, rec.jobId);
  const tempFile = path.join(TEMP_DIR, rec.jobId, rec.filename);

  try {
    // Step 1: Download
    await prisma.recording.update({ where: { id: recordingId }, data: { status: "DOWNLOADING" } });
    await withRetry(() => downloadFile(rec.driveFileId, tempFile));

    // Step 2: Transcribe
    await prisma.recording.update({ where: { id: recordingId }, data: { status: "TRANSCRIBING" } });
    const result = await withRetry(() => transcribeFile(tempFile), 2, 10000);

    let finalSpeakers = result.speakers;
    let finalText = result.rawText;
    const detectedLang = result.language;

    // Step 3: Translate if needed
    if (needsTranslation(detectedLang) && finalText.trim()) {
      await prisma.recording.update({
        where: { id: recordingId },
        data: { status: "TRANSLATING", languageDetected: detectedLang },
      });

      const translated = await withRetry(() => translateToHindiEnglish(finalText, detectedLang));
      finalText = translated;

      finalSpeakers = translated
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0) {
            return { speaker: line.slice(0, colonIdx).trim(), text: line.slice(colonIdx + 1).trim() };
          }
          return { speaker: "Speaker 1", text: line.trim() };
        });
    }

    // Step 4: Generate .docx
    await prisma.recording.update({ where: { id: recordingId }, data: { status: "GENERATING_DOCX" } });
    const docxPath = await generateDocx(rec.filename, finalSpeakers, detectedLang, jobOutputDir);

    // Step 5: Mark complete
    await prisma.recording.update({
      where: { id: recordingId },
      data: { status: "COMPLETED", languageDetected: detectedLang, transcriptText: finalText, docxPath },
    });

    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    console.log(`✅ Done: ${rec.filename} [${detectedLang}]`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed: ${rec.filename} — ${msg}`);
    await prisma.recording.update({
      where: { id: recordingId },
      data: { status: "FAILED", errorMessage: msg.slice(0, 500) },
    });
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
    }
  }
}

async function updateJobProgress(jobId: string) {
  const completed = await prisma.recording.count({ where: { jobId, status: "COMPLETED" } });
  const failed = await prisma.recording.count({ where: { jobId, status: "FAILED" } });
  const remaining = await prisma.recording.count({
    where: { jobId, status: { in: ["PENDING", "DOWNLOADING", "TRANSCRIBING", "TRANSLATING", "GENERATING_DOCX"] } },
  });

  if (remaining === 0) {
    const jobStatus = completed === 0 ? "FAILED" : "COMPLETED";
    await prisma.job.update({
      where: { id: jobId },
      data: { status: jobStatus, processedFiles: completed, failedFiles: failed },
    });
    console.log(`🏁 Job ${jobId} ${jobStatus}: ${completed} completed, ${failed} failed`);
  } else {
    await prisma.job.update({
      where: { id: jobId },
      data: { processedFiles: completed, failedFiles: failed },
    });
  }
}

async function runWorker() {
  console.log("🎙️  TranscriptAI Worker started");

  // Ensure temp and output dirs exist
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  while (true) {
    const pendingJobs = await prisma.job.findMany({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
    });

    for (const job of pendingJobs) {
      if (job.status === "PENDING") {
        await prisma.job.update({ where: { id: job.id }, data: { status: "PROCESSING" } });
      }

      // Process recordings in batches of CONCURRENCY
      const pendingRecs = await prisma.recording.findMany({
        where: { jobId: job.id, status: "PENDING" },
        take: CONCURRENCY,
      });

      if (pendingRecs.length > 0) {
        console.log(`⚙️  Job "${job.name}": processing ${pendingRecs.length} files`);
        await Promise.allSettled(pendingRecs.map((r) => processRecording(r.id)));
        await updateJobProgress(job.id);
      } else {
        // No pending — check if all done
        await updateJobProgress(job.id);
      }
    }

    await new Promise((r) => setTimeout(r, 5000));
  }
}

runWorker().catch(console.error);
