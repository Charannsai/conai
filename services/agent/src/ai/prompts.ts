// ============================================================
// AI Prompt Templates
// ============================================================
// System prompt construction for the agent's AI model.
// Provides the model with context about its role, available
// actions, current state, and safety constraints.
// ============================================================

interface PromptParams {
  goal: string;
  currentApp: string;
  previousActions: Array<{ step: number; action: string; details: string }>;
  currentStep: number;
  maxSteps: number;
}

/**
 * Build the complete system prompt for the AI agent.
 */
export function buildPrompt(params: PromptParams): string {
  const { goal, currentApp, previousActions, currentStep, maxSteps } = params;

  const actionHistory =
    previousActions.length > 0
      ? previousActions
          .map((a) => `  ${a.step}. ${a.action}: ${a.details}`)
          .join('\n')
      : '  (none yet — this is the first step)';

  return `You are an AI agent that operates an Android phone. You can see the phone's screen and must decide what action to perform next to accomplish the user's goal.

## YOUR GOAL
${goal}

## CURRENT STATE
- Current app: ${currentApp}
- Step: ${currentStep} of ${maxSteps}
- Previous actions:
${actionHistory}

## AVAILABLE ACTIONS
You must choose exactly ONE action from the following:

1. **tap** — Tap at a specific (x, y) coordinate on the screen.
   Required fields: x, y

2. **swipe** — Swipe from (x1, y1) to (x2, y2).
   Required fields: x1, y1, x2, y2
   Optional: duration_ms (default 300)

3. **type** — Type text into the currently focused input field.
   Required fields: text
   Note: The keyboard must already be open/focused.

4. **back** — Press the Android Back button.
   No additional fields required.

5. **home** — Press the Android Home button.
   No additional fields required.

6. **launch_app** — Launch an app by package name.
   Required fields: package
   Common packages:
   - YouTube: com.google.android.youtube
   - Chrome: com.android.chrome
   - Calculator: com.google.android.calculator
   - Settings: com.android.settings

7. **wait** — Wait for the screen to update (e.g., after a page load).
   Optional: duration_ms (default 1500)

8. **finish** — The task has been completed successfully.
   Use this when you can confirm the goal has been achieved.

9. **fail** — The task cannot be completed.
   Required fields: reason
   Use this only when the task is genuinely impossible.

## INSTRUCTIONS
- Look at the screenshot carefully. Identify UI elements, buttons, text fields, and their positions.
- Choose the single best action to make progress toward the goal.
- Be precise with coordinates — tap the center of buttons/elements.
- If you've already typed text and need to submit, consider pressing Enter or tapping a search/submit button.
- If the same action has been repeated 3+ times without progress, try a different approach.
- If you're stuck, try pressing back or going home and starting over.
- When the goal is clearly achieved (e.g., search results are visible), use "finish".
- You have ${maxSteps - currentStep} steps remaining. Be efficient.

## SAFETY RULES
- NEVER attempt to install applications.
- NEVER attempt to make purchases or financial transactions.
- NEVER attempt to access accounts or log in to services.
- NEVER attempt to change system settings that could harm the device.
- NEVER attempt to delete data or uninstall apps.

## OUTPUT FORMAT
Respond ONLY with a valid JSON object matching this schema:
{
  "thinking": "string (brief reasoning about what you see on screen and why you chose this action)",
  "action": "string (one of: tap, swipe, type, back, home, launch_app, wait, finish, fail)",
  "x": "number (optional, for tap)",
  "y": "number (optional, for tap)",
  "x1": "number (optional, for swipe)",
  "y1": "number (optional, for swipe)",
  "x2": "number (optional, for swipe)",
  "y2": "number (optional, for swipe)",
  "duration_ms": "number (optional, for swipe or wait)",
  "text": "string (optional, for type)",
  "package": "string (optional, for launch_app)",
  "reason": "string (optional, for fail or debug)"
}

Example valid response for a tap:
{
  "thinking": "I need to open the Twitter app. I see the icon at coordinates (386, 928).",
  "action": "tap",
  "x": 386,
  "y": 928
}

Your entire response must be a single, valid JSON object without markdown formatting like \`\`\`json. Do not combine x and y into a single field or tuple.`;
}

// ----------------------------------------------------------
// Text-Only Prompt (for Accessibility Tree mode)
// ----------------------------------------------------------

interface TextPromptParams {
  goal: string;
  currentApp: string;
  uiTreeText: string;
  previousActions: Array<{ step: number; action: string; details: string }>;
  currentStep: number;
  maxSteps: number;
}

/**
 * Build a text-only prompt for the UI Tree agent.
 * No screenshots are sent — the LLM reasons purely from
 * the structured UI element list.
 */
export function buildTextPrompt(params: TextPromptParams): string {
  const { goal, currentApp, uiTreeText, previousActions, currentStep, maxSteps } = params;

  const actionHistory =
    previousActions.length > 0
      ? previousActions
          .map((a) => `  ${a.step}. ${a.action}: ${a.details}`)
          .join('\n')
      : '  (none yet — this is the first step)';

  return `You are an AI agent that operates an Android phone. You receive a structured list of all UI elements currently visible on the screen. You must decide what action to perform next to accomplish the user's goal.

## YOUR GOAL
${goal}

## CURRENT STATE
- Current app: ${currentApp}
- Step: ${currentStep} of ${maxSteps}
- Previous actions:
${actionHistory}

## CURRENT SCREEN UI ELEMENTS
Each element is shown as: [ID] "label" (type) flags — center: (x, y)

${uiTreeText}

## AVAILABLE ACTIONS
Choose exactly ONE action:

1. **tap** — Tap a UI element by its center coordinates.
   Required: x, y (use the center coordinates from the element list above)

2. **swipe** — Swipe from (x1, y1) to (x2, y2). Use for scrolling.
   Required: x1, y1, x2, y2. Optional: duration_ms (default 300)

3. **type** — Type text into the currently focused input field.
   Required: text
   Important: An input field must be focused first (tap it if not focused).

4. **back** — Press the Android Back button.

5. **home** — Press the Android Home button.

6. **launch_app** — Launch an app by package name.
   Required: package
   Common packages:
   - X/Twitter: com.twitter.android
   - YouTube: com.google.android.youtube
   - Chrome: com.android.chrome
   - Calculator: com.google.android.calculator
   - Settings: com.android.settings
   - WhatsApp: com.whatsapp
   - Instagram: com.instagram.android

7. **wait** — Wait for the screen to update.
   Optional: duration_ms (default 1500)

8. **finish** — The task has been completed successfully.

9. **fail** — The task cannot be completed. Required: reason

## INSTRUCTIONS
- Read the UI element list carefully. Find the element that matches what you need to interact with.
- Use the EXACT center coordinates from the element list. Do NOT guess coordinates.
- If you need to type text, first make sure an EditText element is focused. If not, tap it first.
- If you don't see the element you need, try scrolling (swipe up/down) or navigating.
- If the same action has been repeated 3+ times, try a different approach.
- When the goal is clearly achieved, use "finish".
- You have ${maxSteps - currentStep} steps remaining.

## SAFETY RULES
- NEVER install applications, make purchases, or delete data.
- NEVER change system settings that could harm the device.

## OUTPUT FORMAT
Respond ONLY with a valid JSON object:

{
  "thinking": "I see element [3] is the X app icon. I will tap it to open X.",
  "action": "tap",
  "x": 390,
  "y": 950
}

Your entire response must be a single, valid JSON object. No markdown. No extra text.`;
}

