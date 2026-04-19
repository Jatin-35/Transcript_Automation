import { AzureOpenAI } from "openai";

const HINDI_ENGLISH_LANGS = new Set(["hi", "en", "hinglish"]);

function getClient() {
  return new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.OPENAI_API_VERSION || "2024-12-01-preview",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini",
  });
}

export function needsTranslation(language: string): boolean {
  const lang = language.toLowerCase().split("-")[0];
  return !HINDI_ENGLISH_LANGS.has(lang);
}

// Split long text into chunks under token limit
function chunkText(text: string, maxChars = 12000): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).length > maxChars && current) {
      chunks.push(current.trim());
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function translateToHindiEnglish(
  text: string,
  sourceLanguage: string
): Promise<string> {
  const client = getClient();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
  const chunks = chunkText(text);

  const results: string[] = [];

  for (const chunk of chunks) {
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: "system",
          content: `You are a transcription translator. The input is a speaker-diarized transcript in ${sourceLanguage}.
Translate it to a natural Hindi-English mix (Hinglish where appropriate).
Preserve speaker labels exactly (e.g., "Speaker 1:", "Speaker 2:").
Output only the translated transcript, no extra commentary.`,
        },
        { role: "user", content: chunk },
      ],
      temperature: 0.3,
      max_tokens: 16000,
    });

    results.push(response.choices[0]?.message?.content || chunk);
  }

  return results.join("\n");
}
