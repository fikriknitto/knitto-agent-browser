import { Router } from "express";
import type { AgentRegistryService } from "../agents/agent-registry.service.js";
import { createAgentScreenshotRoutes } from "./evidence/agent-screenshot-routes.js";
import { createAgentVideoRoutes } from "./evidence/agent-video-routes.js";
import { createAppMemoryRoutes } from "./app-memory/app-memory-routes.js";
import { createBridgeRoutes } from "./bridge/bridge-routes.js";
import { createConfigRoutes } from "./config/config-routes.js";
import { createFileManagerRoutes } from "./file-manager/file-manager-routes.js";
import { createHealthRoutes } from "./health/health-routes.js";
import { createPromptShortcutRoutes } from "./prompt-shortcut/prompt-shortcut-routes.js";
import { createMissionRoutes } from "./missions/mission-plan-routes.js";
import { createMobileDeviceRoutes } from "./mobile-device/mobile-device-routes.js";
import { createMobileAppMemoryRoutes } from "./app-memory/mobile-app-memory-routes.js";

export function createApiRoutes(bridgeRegistry: AgentRegistryService): Router {
  const router = Router();

  router.use(createHealthRoutes());
  router.use(createBridgeRoutes(() => bridgeRegistry.getAll()));
  router.use(createPromptShortcutRoutes(bridgeRegistry));
  router.use(createMissionRoutes(bridgeRegistry));
  router.use(createAppMemoryRoutes());
  router.use(createMobileAppMemoryRoutes());
  router.use(createMobileDeviceRoutes());
  router.use(createConfigRoutes());
  router.use(createFileManagerRoutes());
  router.use(createAgentScreenshotRoutes());
  router.use(createAgentVideoRoutes());

  return router;
}
