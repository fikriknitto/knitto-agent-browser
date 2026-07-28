import { Router } from "express";
import type { AgentRegistryService } from "../../agents/agent-registry.service.js";
import { MissionPlanController } from "./mission-plan-controller.js";

export function createMissionRoutes(bridgeRegistry: AgentRegistryService): Router {
  const router = Router();
  const controller = new MissionPlanController(bridgeRegistry);

  router.post("/missions/plan", (req, res) => void controller.plan(req, res));

  return router;
}
