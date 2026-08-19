// ============================================================
// ADB Device Management
// ============================================================
// Handles device detection, connection status, and device info
// retrieval through ADB commands.
// ============================================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DeviceInfo } from '@conai/shared';

const execFileAsync = promisify(execFile);

const ADB = 'adb';

/**
 * Run an ADB command and return stdout.
 * If a deviceId is provided, the command targets that specific device.
 */
async function adb(
  args: string[],
  deviceId?: string
): Promise<string> {
  const fullArgs = deviceId ? ['-s', deviceId, ...args] : args;
  const { stdout } = await execFileAsync(ADB, fullArgs, {
    timeout: 10_000,
    encoding: 'utf-8',
  });
  return stdout.trim();
}

/**
 * List connected ADB devices.
 * Returns an array of device IDs (serial numbers).
 */
export async function getConnectedDevices(): Promise<string[]> {
  const output = await adb(['devices']);
  const lines = output.split('\n').slice(1); // Skip header "List of devices attached"
  const devices: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [id, status] = trimmed.split(/\s+/);
    if (id && status === 'device') {
      devices.push(id);
    }
  }

  return devices;
}

/**
 * Get a device property via `adb shell getprop`.
 */
async function getprop(
  deviceId: string,
  prop: string
): Promise<string> {
  return adb(['shell', 'getprop', prop], deviceId);
}

/**
 * Get the screen resolution of the device.
 * Parses output of `adb shell wm size` which returns "Physical size: WxH".
 */
async function getScreenSize(
  deviceId: string
): Promise<{ width: number; height: number }> {
  const output = await adb(['shell', 'wm', 'size'], deviceId);
  // Output format: "Physical size: 1080x2340" (may have override line too)
  const match = output.match(/(\d+)x(\d+)/);
  if (!match) {
    throw new Error(`Failed to parse screen size from: ${output}`);
  }
  return {
    width: parseInt(match[1], 10),
    height: parseInt(match[2], 10),
  };
}

/**
 * Get detailed information about a connected device.
 */
export async function getDeviceInfo(
  deviceId: string
): Promise<DeviceInfo> {
  const [model, androidVersion, screen] = await Promise.all([
    getprop(deviceId, 'ro.product.model'),
    getprop(deviceId, 'ro.build.version.release'),
    getScreenSize(deviceId),
  ]);

  return {
    id: deviceId,
    model: model || 'Unknown',
    androidVersion: androidVersion || 'Unknown',
    screenWidth: screen.width,
    screenHeight: screen.height,
    connected: true,
  };
}

/**
 * Check if a specific device (or any device) is connected.
 */
export async function isDeviceConnected(
  deviceId?: string
): Promise<boolean> {
  try {
    const devices = await getConnectedDevices();
    if (deviceId) {
      return devices.includes(deviceId);
    }
    return devices.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the first connected device, or a specific one.
 * If ADB_DEVICE_ID is "auto", returns the first device found.
 */
export async function resolveDevice(
  configuredId: string
): Promise<string | null> {
  const devices = await getConnectedDevices();

  if (devices.length === 0) return null;

  if (configuredId === 'auto') {
    return devices[0];
  }

  return devices.includes(configuredId) ? configuredId : null;
}

// Re-export the adb helper for other modules
export { adb };
