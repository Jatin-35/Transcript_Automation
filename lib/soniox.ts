import { SonioxNodeClient } from "@soniox/node";
import fs from "fs";

const client = new SonioxNodeClient({
  api_key: process.env.SONIOX_API_KEY || "",
});

export interface Speaker {
  speaker: string;
  text: string;
}

export interface TranscriptionResult {
  speakers: Speaker[];
  language: string;
  rawText: string;
}

export async function transcribeFile(
  filePath: string
): Promise<TranscriptionResult> {
  const audioData = fs.readFileSync(filePath);
  const filename = filePath.split(/[\\/]/).pop() || "audio.mp3";

  const transcription = await client.stt.transcribe({
    model: "stt-async-v4",
    file: audioData,
    filename,
    enable_speaker_diarization: true,
    enable_language_identification: true,
    language_hints: [
      "hi", "en", "ta", "te", "kn", "ml", "mr", "gu", "pa", "bn",
      "or", "ur", "as",
    ],
    wait: true,
    wait_options: {
      timeout_ms: 3600000, // 1 hour max wait for long recordings
      interval_ms: 5000,
    },
    cleanup: ["file"],
  });

  const transcript = await transcription.getTranscript();
  const segments = transcript ? transcript.segments({ group_by: ["speaker"] }) : [];

  const speakers: Speaker[] = [];
  let detectedLanguage = "en";

  if (segments.length > 0) {
    for (const seg of segments) {
      if (seg.language && seg.language !== detectedLanguage) {
        detectedLanguage = seg.language;
      }
      const spkLabel = seg.speaker ? `Speaker ${seg.speaker}` : "Speaker 1";
      if (seg.text.trim()) {
        speakers.push({ speaker: spkLabel, text: seg.text.trim() });
      }
    }
  } else if (transcript?.text) {
    speakers.push({ speaker: "Speaker 1", text: transcript.text });
  }

  // Fallback language from tokens
  if (detectedLanguage === "en" && transcript?.tokens) {
    const langToken = transcript.tokens.find((t) => t.language);
    if (langToken?.language) detectedLanguage = langToken.language;
  }

  const rawText = speakers.map((s) => `${s.speaker}: ${s.text}`).join("\n");

  return { speakers, language: detectedLanguage, rawText };
}
