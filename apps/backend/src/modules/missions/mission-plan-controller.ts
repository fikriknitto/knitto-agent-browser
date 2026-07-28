import type { Request, Response } from "express";
import { z } from "zod";
import type { AgentRegistryService } from "../../agents/agent-registry.service.js";
import { createLogger } from "../../core/logging.js";
import { planMissionTodos } from "./mission-plan.service.js";
import { missionPlanRequestSchema } from "./mission-plan-schemas.js";

const logger = createLogger("mission-plan");

export class MissionPlanController {
  constructor(private readonly bridgeRegistry: AgentRegistryService) {}

  async plan(req: Request, res: Response): Promise<void> {
    try {
      const body = missionPlanRequestSchema.parse(req.body);
      logger.info(
        `Plan request bridge=${body.bridgeId} model=${body.model} platform=${body.platform ?? "browser"}`
      );
      const result = await planMissionTodos(this.bridgeRegistry, body);
      logger.info(`Plan ok items=${result.items.length}`);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to plan mission";
      if (error instanceof z.ZodError) {
        logger.warn(`Plan invalid request: ${error.errors[0]?.message ?? "validation"}`);
        res.status(400).json({
          error: error.errors[0]?.message ?? "Invalid request",
        });
        return;
      }
      logger.error(`Plan failed: ${message}`);
      res.status(500).json({
        error: message,
      });
    }
  }
}
