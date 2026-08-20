// ============================================================
// Game Detector
// ============================================================
// Detects if the current foreground app is a game (OpenGL/
// SurfaceView) or a standard Android app with native widgets.
// ============================================================

import { adb } from './device.js';

/**
 * Known game package prefixes/names.
 * This list is checked first for instant detection.
 */
const KNOWN_GAME_PACKAGES: string[] = [
  'com.dts.freefireth',
  'com.dts.freefiremax',
  'com.tencent.ig',              // PUBG Mobile
  'com.activision.callofduty',   // COD Mobile
  'com.supercell.clashofclans',
  'com.supercell.clashroyale',
  'com.kiloo.subwaysurf',
  'com.halfbrick.fruitninjafree',
  'com.king.candycrushsaga',
  'com.mojang.minecraftpe',      // Minecraft
  'com.riotgames.league.wildrift',
  'com.garena.game.codm',
  'com.mobile.legends',
];

/**
 * Check if the current app is a game.
 * Uses a conservative approach: only known game packages.
 * The SurfaceView heuristic is too unreliable (Twitter, YouTube,
 * video editors all use SurfaceView for media playback).
 */
export async function isGameApp(
  deviceId: string,
  currentPackage: string
): Promise<boolean> {
  return KNOWN_GAME_PACKAGES.some(pkg => currentPackage.startsWith(pkg));
}
