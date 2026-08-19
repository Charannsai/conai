// ============================================================
// ADB Screenshot Capture
// ============================================================
// Captures the Android device screen via `adb exec-out screencap -p`
// and returns the raw PNG data as a Buffer or base64 string.
// ============================================================

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const ADB = 'adb';

/**
 * Capture a screenshot from the device as a raw PNG Buffer.
 * Uses `adb exec-out screencap -p` to stream the image directly
 * without creating a temp file on the device.
 */
export async function captureScreenshot(
  deviceId: string
): Promise<Buffer> {
  const args = ['-s', deviceId, 'exec-out', 'screencap', '-p'];

  const { stdout } = await execFileAsync(ADB, args, {
    encoding: 'buffer' as BufferEncoding,
    maxBuffer: 20 * 1024 * 1024, // 20MB max — phone screenshots can be large
    timeout: 15_000,
  });

  if (!stdout || stdout.length === 0) {
    throw new Error('Screenshot capture returned empty data');
  }

  // Verify it's a PNG (magic bytes: 89 50 4E 47)
  if (
    stdout[0] !== 0x89 ||
    stdout[1] !== 0x50 ||
    stdout[2] !== 0x4e ||
    stdout[3] !== 0x47
  ) {
    throw new Error('Screenshot data does not appear to be a valid PNG');
  }

  return stdout;
}

/**
 * Capture a screenshot and return it as a base64-encoded PNG string.
 * This is the format needed for:
 *   - Groq vision API (data URL)
 *   - WebSocket transmission to the dashboard
 */
export async function captureScreenshotBase64(
  deviceId: string
): Promise<string> {
  const buffer = await captureScreenshot(deviceId);
  return buffer.toString('base64');
}
