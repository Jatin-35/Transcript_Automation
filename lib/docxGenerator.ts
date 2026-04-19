import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import fs from "fs";
import path from "path";
import type { Speaker } from "./soniox";

export async function generateDocx(
  filename: string,
  speakers: Speaker[],
  language: string,
  outputDir: string
): Promise<string> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: filename.replace(/\.[^/.]+$/, ""),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Language: ${language.toUpperCase()}`,
          italics: true,
          color: "666666",
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  for (const segment of speakers) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: segment.speaker + ": ",
            bold: true,
            color: "1a56db",
            size: 22,
          }),
          new TextRun({
            text: segment.text,
            size: 22,
          }),
        ],
        spacing: { before: 120, after: 120 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputName = filename.replace(/\.mp3$/i, ".docx");
  const outputPath = path.join(outputDir, outputName);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}
