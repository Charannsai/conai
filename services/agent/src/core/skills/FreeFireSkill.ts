export interface AppSkill {
    packageName: string;
    getStrategies(): string[];
    evaluateState(gameState: any): string;
}

export class FreeFireSkill implements AppSkill {
    packageName = "com.dts.freefireth";

    private readonly STRATEGIES = [
        "LAND",
        "LOOT",
        "MOVE",
        "ENGAGE",
        "RETREAT",
        "HEAL",
        "ROTATE",
        "SURVIVE",
        "FINISH"
    ];

    getStrategies(): string[] {
        return this.STRATEGIES;
    }

    evaluateState(gameState: any): string {
        // Here we can place logic that overrides or supplements the LLM's decision
        // For example, if health is below 20%, force HEAL or RETREAT
        if (gameState.player && gameState.player.health < 20) {
            return "HEAL";
        }

        // If an enemy is present and we are healthy, ENGAGE
        if (gameState.enemies && gameState.enemies.length > 0) {
            return "ENGAGE";
        }

        return "EXPLORE";
    }
}
