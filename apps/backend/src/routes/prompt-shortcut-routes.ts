import { Router } from "express";
import type { BridgeRegistryService } from "../services/bridge-registry.service.js";
import { PromptShortcutController } from "../controllers/prompt-shortcut-controller.js";

export function createPromptShortcutRoutes(bridgeRegistry: BridgeRegistryService): Router {
  const router = Router();
  const controller = new PromptShortcutController(bridgeRegistry);

  router.get("/prompt-shortcuts", (req, res) => void controller.list(req, res));
  router.post("/prompt-shortcuts/generate", (req, res) => void controller.generate(req, res));
  router.get("/prompt-shortcuts/:id", (req, res) => void controller.get(req, res));
  router.post("/prompt-shortcuts", (req, res) => void controller.create(req, res));
  router.put("/prompt-shortcuts/:id", (req, res) => void controller.update(req, res));
  router.delete("/prompt-shortcuts/:id", (req, res) => void controller.remove(req, res));

  return router;
}
