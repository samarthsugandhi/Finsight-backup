import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const WHISPER_CLI = "/opt/homebrew/bin/whisper-cli";
const AFCONVERT = "/usr/bin/afconvert";

function getModelPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "models/whisper/ggml-base.bin"),
    path.resolve(process.cwd(), "backend/models/whisper/ggml-base.bin"),
    path.resolve(__dirname, "../../models/whisper/ggml-base.bin"),
  ];
  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c;
  }
  return candidates[0];
}

export async function transcribeAudioBuffer(buffer: Buffer, originalExt: string = "webm"): Promise<string> {
  const modelPath = getModelPath();
  if (!fsSync.existsSync(modelPath)) {
    throw new Error(`Whisper GGML model file not found at ${modelPath}`);
  }

  const tmpDir = os.tmpdir();
  const baseId = `whisper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputPath = path.join(tmpDir, `${baseId}.${originalExt}`);
  const wavPath = path.join(tmpDir, `${baseId}.wav`);

  try {
    await fs.writeFile(inputPath, buffer);

    // Convert to 16kHz mono 16-bit PCM WAV using native macOS afconvert
    await execFileAsync(AFCONVERT, ["-f", "WAVE", "-d", "LEI16@16000", "-c", "1", inputPath, wavPath]);

    // Transcribe with local whisper.cpp on Apple M4
    const { stdout } = await execFileAsync(WHISPER_CLI, [
      "-m", modelPath,
      "-f", wavPath,
      "--no-timestamps",
      "-l", "en",
      "-t", "4",
      "--no-prints",
    ]);

    // Clean transcript output
    const cleaned = stdout
      .replace(/\[_BEG_\]|\[_END_\]/g, "")
      .replace(/whisper_print_timings[\s\S]*$/, "")
      .trim();

    return cleaned;
  } finally {
    // Always clean up temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(wavPath).catch(() => {});
  }
}
