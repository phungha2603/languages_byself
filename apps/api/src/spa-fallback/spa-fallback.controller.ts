import { existsSync } from "node:fs";
import { join } from "node:path";
import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

const INDEX_HTML = join(process.cwd(), "public", "index.html");

/**
 * Catches every GET that no real controller or static file (see main.ts —
 * both are wired before Nest's routing takes over) answered. Excluded from
 * the global "api" prefix (see main.ts) so it sits at the bare `*` path —
 * meaning it also matches unknown /api/* paths, which is why it checks for
 * that case explicitly and returns a plain JSON 404 instead of HTML.
 *
 * Must stay the LAST entry in AppModule's `imports` so every other
 * controller's routes are registered — and therefore tried — first.
 */
@Controller()
export class SpaFallbackController {
  @Get("*")
  serve(@Req() req: Request, @Res() res: Response) {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ statusCode: 404, message: "Not Found" });
      return;
    }
    if (!existsSync(INDEX_HTML)) {
      res.status(404).send("Not Found — no web build is present at ./public.");
      return;
    }
    res.sendFile(INDEX_HTML);
  }
}
