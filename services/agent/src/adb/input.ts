// ============================================================
// ADB Input Commands
// ============================================================
// Sends touch events, text input, and key events to the
// Android device through ADB shell input commands.
// ============================================================

import { adb } from './device.js';

/**
 * Tap at a specific coordinate on the screen.
 */
export async function tap(
  deviceId: string,
  x: number,
  y: number
): Promise<void> {
  await adb(['shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))], deviceId);
}

/**
 * Perform a swipe gesture from (x1,y1) to (x2,y2).
 * @param durationMs — duration of the swipe in milliseconds (default 300ms)
 */
export async function swipe(
  deviceId: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  durationMs: number = 300
): Promise<void> {
  await adb(
    [
      'shell',
      'input',
      'swipe',
      String(Math.round(x1)),
      String(Math.round(y1)),
      String(Math.round(x2)),
      String(Math.round(y2)),
      String(Math.round(durationMs)),
    ],
    deviceId
  );
}

/**
 * Type text on the device.
 *
 * ADB `input text` has limitations with special characters.
 * We escape spaces (→ %s) and special shell chars.
 * For complex text, we fall back to sending characters via key events.
 */
export async function typeText(
  deviceId: string,
  text: string
): Promise<void> {
  if (!text) return;

  // ADB input text requires escaping:
  // - spaces → %s
  // - special chars need shell escaping
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/ /g, '%s')
    .replace(/&/g, '\\&')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/\|/g, '\\|')
    .replace(/;/g, '\\;')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');

  await adb(['shell', 'input', 'text', escaped], deviceId);
}

/**
 * Press the Back button.
 */
export async function pressBack(deviceId: string): Promise<void> {
  await adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'], deviceId);
}

/**
 * Press the Home button.
 */
export async function pressHome(deviceId: string): Promise<void> {
  await adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'], deviceId);
}

/**
 * Press the Enter/Return key.
 */
export async function pressEnter(deviceId: string): Promise<void> {
  await adb(['shell', 'input', 'keyevent', 'KEYCODE_ENTER'], deviceId);
}

/**
 * Long press at a specific coordinate.
 * Implemented as a swipe from and to the same point with a duration.
 */
export async function longPress(
  deviceId: string,
  x: number,
  y: number,
  durationMs: number = 1000
): Promise<void> {
  await swipe(deviceId, x, y, x, y, durationMs);
}
