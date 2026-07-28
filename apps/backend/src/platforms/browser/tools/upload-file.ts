import { existsSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { defineTool, ToolError } from "../../mcp-kit/core/index.js";
import { resolveLocator } from "../driver/locators.js";
import { getPage } from "../driver/session.js";
import config from "../config.js";
import { uploadFileInputSchema, uploadFileOutputShape } from "../schema.js";

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "msi",
  "dll",
  "ps1",
  "com",
  "scr",
]);

function assertSafeUploadPath(filePath: string): string {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new ToolError(`File not found: ${absolutePath}`);
  }

  const stats = statSync(absolutePath);
  if (!stats.isFile()) {
    throw new ToolError(`Path is not a file: ${absolutePath}`);
  }

  if (stats.size > config.uploadMaxBytes) {
    throw new ToolError(
      `File exceeds max upload size (${config.uploadMaxBytes} bytes): ${absolutePath}`
    );
  }

  const ext = extname(absolutePath).slice(1).toLowerCase();
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    throw new ToolError(`Blocked file extension ".${ext}"`);
  }

  return absolutePath;
}

export const automation_upload_file = defineTool({
  name: "browser_upload_file",
  description:
    "Upload a file to an HTML file input using a semantic locator. Use absolute filePath from Attached files in the prompt. Do not use browser_fill for file inputs.",
  inputSchema: uploadFileInputSchema,
  outputSchema: uploadFileOutputShape,
  handler: async (args) => {
    try {
      const absolutePath = assertSafeUploadPath(args.filePath);
      const page = await getPage();
      const handle = await resolveLocator(page, args.locator);

      const isFileInput = await handle.evaluate((el) => {
        return el instanceof HTMLInputElement && el.type === "file";
      });

      if (!isFileInput) {
        throw new ToolError(
          "Target element is not an input[type=file]. Use browser_get_page_snapshot to find a file input (inputType=file)."
        );
      }

      await handle.setInputFiles(absolutePath);

      return {
        success: true,
        locator: args.locator,
        filePath: absolutePath,
        fileName: basename(absolutePath),
      };
    } catch (error) {
      if (error instanceof ToolError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new ToolError(`Failed to upload file: ${msg}`);
    }
  },
});
