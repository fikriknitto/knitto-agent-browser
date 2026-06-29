import { Router } from "express";
import { AppMemoryController } from "../controllers/app-memory-controller.js";

export function createAppMemoryRoutes(): Router {
  const router = Router();
  const controller = new AppMemoryController();

  router.get("/app-memory", (req, res) => void controller.list(req, res));
  router.get("/app-memory/:appId", (req, res) => void controller.get(req, res));
  router.post("/app-memory", (req, res) => void controller.create(req, res));
  router.put("/app-memory/:appId", (req, res) => void controller.update(req, res));
  router.delete("/app-memory/:appId", (req, res) => void controller.remove(req, res));

  return router;
}
