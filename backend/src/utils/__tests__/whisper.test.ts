import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { transcribeAudioBuffer } from "@/services/whisper.service";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

describe("FinAI Local Whisper.cpp Speech-to-Text Test Suite", () => {
  it("transcribes synthesized test speech locally without cloud dependencies", async () => {
    // Generate a quick local synthetic test speech file using macOS 'say'
    const aiffPath = "/tmp/test_whisper_unit.aiff";
    await execFileAsync("/usr/bin/say", ["-o", aiffPath, "Add 200 rupees for coffee"]);

    const buffer = await fs.readFile(aiffPath);
    const transcript = await transcribeAudioBuffer(buffer, "aiff");

    assert.ok(transcript.length > 0, "Transcript should not be empty");
    assert.match(transcript.toLowerCase(), /coffee/i, "Transcript should recognize the spoken word 'coffee'");

    await fs.unlink(aiffPath).catch(() => {});
  });
});

