import axios from "axios";
import fs from "fs";
import path from "path";

export function extractFolderId(driveUrl: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = driveUrl.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is not set");
  return key;
}

export async function listMp3Files(folderId: string): Promise<DriveFile[]> {
  const apiKey = getApiKey();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      q: `'${folderId}' in parents and trashed=false`,
      key: apiKey,
      fields: "nextPageToken,files(id,name,mimeType,size)",
      pageSize: "1000",
    };
    if (pageToken) params.pageToken = pageToken;

    const url = new URL("https://www.googleapis.com/drive/v3/files");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await axios.get(url.toString());
    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return files.filter(
    (f) =>
      f.name.toLowerCase().endsWith(".mp3") ||
      f.mimeType.includes("audio/mpeg") ||
      f.mimeType.includes("audio/mp3") ||
      f.mimeType.includes("audio/")
  );
}

export async function downloadFile(fileId: string, destPath: string): Promise<void> {
  const apiKey = getApiKey();
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 300000, // 5 min timeout for large files
  });

  const writer = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
    response.data.on("error", reject);
  });
}
