import type { Request, Response } from "express";
import { createReadStream, statSync } from "node:fs";
import { sanitizeJobId } from "../../core/job-context.js";
import { resolveAgentVideoFile } from "./agent-videos.js";

export class AgentVideoController {
  serve(req: Request, res: Response): void {
    const jobId = typeof req.params.jobId === "string" ? req.params.jobId : "";
    const filename = typeof req.params.filename === "string" ? req.params.filename : "";

    if (!jobId || !filename) {
      res.status(400).json({ error: "jobId and filename are required" });
      return;
    }

    const filePath = resolveAgentVideoFile(sanitizeJobId(jobId), filename);
    if (!filePath) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    let fileSize: number;
    try {
      fileSize = statSync(filePath).size;
    } catch {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
        res.end();
        return;
      }

      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start > end ||
        start >= fileSize
      ) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
        res.end();
        return;
      }

      const safeEnd = Math.min(end, fileSize - 1);
      const chunkSize = safeEnd - start + 1;

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${safeEnd}/${fileSize}`);
      res.setHeader("Content-Length", String(chunkSize));
      createReadStream(filePath, { start, end: safeEnd }).pipe(res);
      return;
    }

    res.setHeader("Content-Length", String(fileSize));
    createReadStream(filePath).pipe(res);
  }
}
