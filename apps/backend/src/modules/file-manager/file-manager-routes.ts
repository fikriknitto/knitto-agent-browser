import { Router } from "express";
import multer from "multer";
import { FileManagerController } from "./file-manager-controller.js";
import { loadStorageEnv } from "../../config/storage-env.js";

/**
 * Debug-only local disk browser (`storage/`).
 * Product FE media library uses API Data `/agent/media*` (MinIO).
 * Keep routes for ops/debug; do not wire new product UI here.
 */
export function createFileManagerRoutes(): Router {
  const router = Router();
  const controller = new FileManagerController();
  const env = loadStorageEnv();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.STORAGE_MAX_UPLOAD_BYTES,
      files: 20,
    },
  });

  router.get("/file-manager/entries", (req, res) => void controller.listEntries(req, res));
  router.get("/file-manager/files/content", (req, res) => void controller.getFileContent(req, res));
  router.get("/file-manager/files/serve", (req, res) => void controller.serveFile(req, res));
  router.post(
    "/file-manager/upload",
    upload.array("files"),
    (req, res) => void controller.upload(req, res)
  );
  router.post("/file-manager/folders", (req, res) => void controller.createFolder(req, res));
  router.patch("/file-manager/entries", (req, res) => void controller.renameEntry(req, res));
  router.delete("/file-manager/entries", (req, res) => void controller.deleteEntry(req, res));

  return router;
}
