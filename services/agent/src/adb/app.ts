// ============================================================
// ADB App Management
// ============================================================
// Launch apps and detect the current foreground application.
// ============================================================

import { adb } from './device.js';

/**
 * Launch an app by its package name.
 * Uses `monkey` to trigger the app's launcher activity.
 */
export async function launchApp(
  deviceId: string,
  packageName: string
): Promise<void> {
  await adb(
    [
      'shell',
      'monkey',
      '-p',
      packageName,
      '-c',
      'android.intent.category.LAUNCHER',
      '1',
    ],
    deviceId
  );
}

/**
 * Get the currently focused app's package name.
 * Parses the output of `dumpsys activity activities` to find
 * the top activity in the focused stack.
 */
export async function getCurrentApp(
  deviceId: string
): Promise<string> {
  try {
    const output = await adb(
      ['shell', 'dumpsys', 'activity', 'activities'],
      deviceId
    );

    // Look for "mResumedActivity" or "topResumedActivity" line
    // Format: mResumedActivity=ActivityRecord{... com.package.name/.ActivityName ...}
    const resumedMatch = output.match(
      /(?:mResumedActivity|topResumedActivity).*?(\w+(?:\.\w+)+)\//
    );
    if (resumedMatch) {
      return resumedMatch[1];
    }

    // Fallback: look for "ResumedActivity" in the stack
    const stackMatch = output.match(
      /ResumedActivity.*?(\w+(?:\.\w+)+)\//
    );
    if (stackMatch) {
      return stackMatch[1];
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Common app package names for convenience.
 */
export const COMMON_APPS: Record<string, string> = {
  youtube: 'com.google.android.youtube',
  chrome: 'com.android.chrome',
  calculator: 'com.google.android.calculator',
  settings: 'com.android.settings',
  camera: 'com.android.camera',
  phone: 'com.android.dialer',
  messages: 'com.google.android.apps.messaging',
  gmail: 'com.google.android.gm',
  maps: 'com.google.android.apps.maps',
  photos: 'com.google.android.apps.photos',
  playstore: 'com.android.vending',
  clock: 'com.google.android.deskclock',
  contacts: 'com.google.android.contacts',
  files: 'com.google.android.documentsui',
};
