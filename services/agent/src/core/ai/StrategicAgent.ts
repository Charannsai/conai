import { EventEmitter } from 'events';
import { analyzeScreenAndDecideAction } from '../../ai/groq.js';
import type { AgentSession } from '../../agent/state.js';

export class StrategicAgent extends EventEmitter {
    private isPlanning = false;

    constructor(
        private session: AgentSession,
        private visionModel: string
    ) {
        super();
    }

    async evaluateGameState(gameState: any, screenshotBase64: string): Promise<string | null> {
        if (this.isPlanning) return null;
        this.isPlanning = true;

        this.emit('thinking', 'Evaluating high-level strategy...');

        try {
            // In a full implementation, we'd pass the explicit gameState JSON to Groq as context
            const goalWithState = `${this.session.state.goal}\n\nCurrent Game State:\n${JSON.stringify(gameState, null, 2)}`;
            
            const response = await analyzeScreenAndDecideAction({
                screenshotBase64,
                goal: goalWithState,
                currentApp: gameState.app || 'Unknown',
                previousActions: this.session.getRecentActionsSummary(),
                currentStep: this.session.state.currentStep,
                maxSteps: this.session.state.maxSteps,
                model: this.visionModel,
            });

            // For Free Fire, we might map standard actions to Strategies
            // Example mapping:
            let strategy = "EXPLORE";
            if (response.action === "tap" && response.thinking.toLowerCase().includes("enemy")) {
                strategy = "ENGAGE";
            } else if (response.action === "swipe") {
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
