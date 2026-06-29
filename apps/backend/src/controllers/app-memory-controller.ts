import type { Request, Response } from "express";
import { z } from "zod";
import {
  AppMemoryConflictError,
  AppMemoryNotFoundError,
  createAppMemory,
  getAppMemory,
  listAppMemorySummaries,
  removeAppMemory,
  updateAppMemory,
} from "../services/app-memory-service.js";
import {
  appIdParamSchema,
  createAppMemoryBodySchema,
  updateAppMemoryBodySchema,
} from "../validators/app-memory-schemas.js";

export class AppMemoryController {
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const appMemories = listAppMemorySummaries();
      res.json({ appMemories });
    } catch (error) {
      this.handleError(res, error, "Failed to load app memories");
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    try {
      const appId = appIdParamSchema.parse(req.params.appId);
      const appMemory = getAppMemory(appId);
      res.json({ appMemory });
    } catch (error) {
      this.handleError(res, error, "Failed to load app memory");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const body = createAppMemoryBodySchema.parse(req.body);
      const appMemory = createAppMemory(body);
      res.status(201).json({ appMemory });
    } catch (error) {
      this.handleError(res, error, "Failed to create app memory");
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const appId = appIdParamSchema.parse(req.params.appId);
      const body = updateAppMemoryBodySchema.parse(req.body);
      const appMemory = updateAppMemory(appId, body);
      res.json({ appMemory });
    } catch (error) {
      this.handleError(res, error, "Failed to update app memory");
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const appId = appIdParamSchema.parse(req.params.appId);
      removeAppMemory(appId);
      res.json({ ok: true });
    } catch (error) {
      this.handleError(res, error, "Failed to delete app memory");
    }
  }

  private handleError(res: Response, error: unknown, fallback: string): void {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.flatten().fieldErrors });
      return;
    }
    if (error instanceof AppMemoryNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof AppMemoryConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : fallback;
    res.status(500).json({ error: message });
  }
}
