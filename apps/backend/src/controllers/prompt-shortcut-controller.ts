import type { Request, Response } from "express";
import { z } from "zod";
import type { BridgeRegistryService } from "../services/bridge-registry.service.js";
import { generatePromptShortcutTemplate } from "../services/prompt-shortcut-generate.service.js";
import {
  PromptShortcutConflictError,
  PromptShortcutNotFoundError,
  createPromptShortcut,
  deletePromptShortcut,
  getPromptShortcut,
  listPromptShortcuts,
  updatePromptShortcut,
} from "../services/prompt-shortcut-service.js";
import {
  createPromptShortcutBodySchema,
  generatePromptShortcutBodySchema,
  promptShortcutIdSchema,
  updatePromptShortcutBodySchema,
} from "../validators/prompt-shortcut-schemas.js";

export class PromptShortcutController {
  constructor(private readonly bridgeRegistry: BridgeRegistryService) {}

  async list(_req: Request, res: Response): Promise<void> {
    try {
      const promptShortcuts = await listPromptShortcuts();
      res.json({ promptShortcuts });
    } catch (error) {
      this.handleError(res, error, "Failed to load prompt shortcuts");
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    try {
      const id = promptShortcutIdSchema.parse(req.params.id);
      const promptShortcut = await getPromptShortcut(id);
      res.json({ promptShortcut });
    } catch (error) {
      this.handleError(res, error, "Failed to load prompt shortcut");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const body = createPromptShortcutBodySchema.parse(req.body);
      const promptShortcut = await createPromptShortcut(body);
      res.status(201).json({ promptShortcut });
    } catch (error) {
      this.handleError(res, error, "Failed to create prompt shortcut");
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = promptShortcutIdSchema.parse(req.params.id);
      const body = updatePromptShortcutBodySchema.parse(req.body);
      const promptShortcut = await updatePromptShortcut(id, body);
      res.json({ promptShortcut });
    } catch (error) {
      this.handleError(res, error, "Failed to update prompt shortcut");
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = promptShortcutIdSchema.parse(req.params.id);
      await deletePromptShortcut(id);
      res.json({ ok: true });
    } catch (error) {
      this.handleError(res, error, "Failed to delete prompt shortcut");
    }
  }

  async generate(req: Request, res: Response): Promise<void> {
    try {
      const body = generatePromptShortcutBodySchema.parse(req.body);
      const result = await generatePromptShortcutTemplate(this.bridgeRegistry, body);
      res.json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to generate prompt shortcut");
    }
  }

  private handleError(res: Response, error: unknown, fallback: string): void {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message ?? "Invalid request" });
      return;
    }
    if (error instanceof PromptShortcutNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof PromptShortcutConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : fallback,
    });
  }
}
