// ============================================================
// ADB UI Tree Dumper & Parser
// ============================================================
// Dumps the Android UI hierarchy via `uiautomator dump` and
// parses it into a structured list of interactive elements
// with exact coordinates.
// ============================================================

import { adb } from './device.js';

export interface UIElement {
  id: number;
  text: string;
  contentDesc: string;
  className: string;
  resourceId: string;
  packageName: string;
  clickable: boolean;
  focusable: boolean;
  focused: boolean;
  scrollable: boolean;
  longClickable: boolean;
  enabled: boolean;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  centerX: number;
  centerY: number;
}

/**
 * Dump the Android UI hierarchy and return the raw XML string.
 */
async function dumpUIXml(deviceId: string): Promise<string> {
  // Dump to a file on the device, then read it
  await adb(['shell', 'uiautomator', 'dump', '/sdcard/ui_dump.xml'], deviceId);
  const xml = await adb(['shell', 'cat', '/sdcard/ui_dump.xml'], deviceId);
  // Cleanup
  adb(['shell', 'rm', '/sdcard/ui_dump.xml'], deviceId).catch(() => {});
  return xml;
}

/**
 * Parse bounds string "[left,top][right,bottom]" into numbers.
 */
function parseBounds(boundsStr: string): { left: number; top: number; right: number; bottom: number } | null {
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  return {
    left: parseInt(match[1], 10),
    top: parseInt(match[2], 10),
    right: parseInt(match[3], 10),
    bottom: parseInt(match[4], 10),
  };
}

/**
 * Extract all UI nodes from the XML using regex-based parsing.
 * We avoid heavyweight XML parsers — the uiautomator output is
 * flat enough to parse with regex reliably.
 */
function parseNodes(xml: string): UIElement[] {
  const elements: UIElement[] = [];
  let id = 1;

  // Match all <node ... /> and <node ...> tags
  const nodeRegex = /<node\s+([^>]+?)\/?\s*>/g;
  let match: RegExpExecArray | null;

  while ((match = nodeRegex.exec(xml)) !== null) {
    const attrs = match[1];

    const getText = (name: string): string => {
      const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`));
      return attrMatch ? attrMatch[1] : '';
    };

    const getBool = (name: string): boolean => {
      return getText(name) === 'true';
    };

    const boundsStr = getText('bounds');
    const bounds = parseBounds(boundsStr);
    if (!bounds) continue;

    const clickable = getBool('clickable');
    const focusable = getBool('focusable');
    const scrollable = getBool('scrollable');
    const longClickable = getBool('long-clickable');
    const enabled = getBool('enabled');
    const focused = getBool('focused');
    const text = getText('text');
    const contentDesc = getText('content-desc');
    const className = getText('class');
    const resourceId = getText('resource-id');
    const packageName = getText('package');

    // Only include elements that are interactive or have meaningful text
    const isInteractive = clickable || focusable || scrollable || longClickable;
    const hasContent = text.length > 0 || contentDesc.length > 0;

    if (!isInteractive && !hasContent) continue;
    if (!enabled) continue;

    // Skip very small elements (likely decorative)
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    if (width < 5 || height < 5) continue;

    elements.push({
      id: id++,
      text,
      contentDesc,
      className: className.replace('android.widget.', '').replace('android.view.', ''),
      resourceId: resourceId.replace(/^.*:id\//, ''), // Shorten "com.app:id/btn" → "btn"
      packageName,
      clickable,
      focusable,
      focused,
      scrollable,
      longClickable,
      enabled,
      bounds,
      centerX: Math.round((bounds.left + bounds.right) / 2),
      centerY: Math.round((bounds.top + bounds.bottom) / 2),
    });
  }

  return elements;
}

/**
 * Format UI elements into a human-readable numbered list for the LLM.
 */
export function formatUITreeForLLM(elements: UIElement[]): string {
  if (elements.length === 0) {
    return '(No interactive UI elements found on screen)';
  }

  const lines: string[] = [];
  for (const el of elements) {
    const parts: string[] = [];

    // Label: prefer text, then content-desc, then resource-id
    const label = el.text || el.contentDesc || el.resourceId || '(unlabeled)';
    parts.push(`[${el.id}]`);
    parts.push(`"${label}"`);
    parts.push(`(${el.className})`);

    // Interaction flags
    const flags: string[] = [];
    if (el.clickable) flags.push('clickable');
    if (el.longClickable) flags.push('long-clickable');
    if (el.scrollable) flags.push('scrollable');
    if (el.focused) flags.push('focused');
    if (flags.length > 0) parts.push(flags.join(', '));

    // Center coordinate
    parts.push(`— center: (${el.centerX}, ${el.centerY})`);

    lines.push(parts.join(' '));
  }

  return lines.join('\n');
}

/**
 * Main entry point: Dump UI tree and return parsed elements.
 */
export async function getUITree(deviceId: string): Promise<{
  elements: UIElement[];
  formattedText: string;
  hasInteractiveElements: boolean;
}> {
  try {
    const xml = await dumpUIXml(deviceId);
    const elements = parseNodes(xml);
    const formattedText = formatUITreeForLLM(elements);
    const hasInteractiveElements = elements.some(e => e.clickable || e.focusable);

    return { elements, formattedText, hasInteractiveElements };
  } catch (error: any) {
    console.error('[UITree] Failed to dump UI tree:', error.message);
    return {
      elements: [],
      formattedText: '(Failed to read UI tree)',
      hasInteractiveElements: false,
    };
  }
}
