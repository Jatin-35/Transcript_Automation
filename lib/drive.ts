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

const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac", ".wma", ".opus", ".mp4", ".webm"];

function isAudioFile(f: DriveFile): boolean {
  return (
    AUDIO_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)) ||
    f.mimeType?.startsWith("audio/") ||
    f.mimeType === "video/mp4" ||
    f.mimeType === "video/webm"
  );
}

async function listFolderContents(folderId: string, apiKey: string): Promise<{ files: DriveFile[]; subfolderIds: string[] }> {
  const files: DriveFile[] = [];
  const subfolderIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      q: `'${folderId}' in parents and trashed=false`,
      key: apiKey,
      fields: "nextPageToken,files(id,name,mimeType,size)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    };
    if (pageToken) params.pageToken = pageToken;

    const url = new URL("https://www.googleapis.com/drive/v3/files");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await axios.get(url.toString());
    const fetched: DriveFile[] = res.data.files || [];

    for (const f of fetched) {
      if (f.mimeType === "application/vnd.google-apps.folder") {
        subfolderIds.push(f.id);
      } else {
        files.push(f);
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return { files, subfolderIds };
}

export async function listMp3Files(folderId: string): Promise<DriveFile[]> {
  const apiKey = getApiKey();
  const allAudioFiles: DriveFile[] = [];

  // BFS through folder tree
  const queue: string[] = [folderId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const { files, subfolderIds } = await listFolderContents(currentId, apiKey);
    const audioFiles = files.filter(isAudioFile);
    allAudioFiles.push(...audioFiles);
    queue.push(...subfolderIds);
    if (subfolderIds.length > 0) {
      console.log(`Found ${subfolderIds.length} subfolders in ${currentId}, queuing...`);
    }
  }

  console.log(`Total audio files found (recursive): ${allAudioFiles.length}`);
  return allAudioFiles;
}

export async function downloadFile(fileId: string, destPath: string): Promise<void> {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Use public direct download URL — works for files shared "Anyone with link"
  // confirm=t bypasses Google's virus scan warning for large files
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&authuser=0`;

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 300000,
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    maxRedirects: 5,
  });

  // Check if Google returned an error page instead of the file
  const contentType = response.headers["content-type"] || "";
  if (contentType.includes("text/html")) {
    throw new Error(`Google Drive requires authentication or the file is not publicly shared (fileId: ${fileId})`);
  }

  const writer = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
    response.data.on("error", reject);
  });
}
