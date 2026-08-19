import { EventEmitter } from 'events';
import { analyzeScreenAndDecideAction } from '../../ai/groq.js';
import type { AgentSession } from '../../agent/state.js';
import { FreeFireSkill, type AppSkill } from '../skills/FreeFireSkill.js';

export class StrategicAgent extends EventEmitter {
    private isPlanning = false;
    private currentSkill: AppSkill | null = null;

    constructor(
        private session: AgentSession,
        private visionModel: string
    ) {
        super();
    }

    async evaluateGameState(gameState: any, screenshotBase64: string): Promise<string | null> {
        if (this.isPlanning) return null;
        this.isPlanning = true;

        if (gameState.app === "com.dts.freefireth" && !(this.currentSkill instanceof FreeFireSkill)) {
            this.currentSkill = new FreeFireSkill();
            console.log("[Agent] Loaded Free Fire Skill");
        }

        this.emit('thinking', 'Evaluating high-level strategy...');

        try {
            // In a full implementation, we'd pass the explicit gameState JSON to Groq as context
            const goalWithState = `${this.session.state.goal}\n\nCurrent Game State:\n${JSON.stringify(gameState, null, 2)}`;
            
            // If the AppSkill can determine the strategy deterministically (e.g. Health < 20%), use that
            if (this.currentSkill) {
                const hardcodedStrategy = this.currentSkill.evaluateState(gameState);
                if (hardcodedStrategy !== "EXPLORE") {
                    this.emit('strategy_changed', hardcodedStrategy);
                    return hardcodedStrategy;
                }
            }

            // Otherwise, fall back to Groq Strategic AI
            const response = await analyzeScreenAndDecideAction({
                screenshotBase64,
                goal: goalWithState,
                currentApp: gameState.app || 'Unknown',
                previousActions: this.session.getRecentActionsSummary(),
                currentStep: this.session.state.currentStep,
                maxSteps: this.session.state.maxSteps,
                model: this.visionModel,
            });

            // Map standard actions to Strategies based on AppSkill
            let strategy = "EXPLORE";
            const allowedStrategies = this.currentSkill?.getStrategies() || ["ENGAGE", "ROTATE"];

            if (response.action === "tap" && response.thinking.toLowerCase().includes("enemy") && allowedStrategies.includes("ENGAGE")) {
                strategy = "ENGAGE";
            } else if (response.action === "swipe" && allowedStrategies.includes("ROTATE")) {
                strategy = "ROTATE";
            }

            this.emit('strategy_changed', strategy);
            return strategy;
        } catch (error) {
            console.error("Strategic evaluation failed", error);
            return null;
        } finally {
            this.isPlanning = false;
        }
    }
}
