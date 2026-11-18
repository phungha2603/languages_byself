import "reflect-metadata";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import * as express from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const expressApp = app.getHttpAdapter().getInstance();

  // Registered directly on the raw Express instance, immediately, before
  // Nest binds any controller routes: real files (audio clips, the mobile
  // web build's JS/CSS/images) always take priority over any route,
  // including SpaFallbackController's catch-all below. Deliberately not
  // @nestjs/serve-static — its middleware attaches from an onModuleInit
  // hook, which runs *after* controllers are bound, too late to win this
  // race against the catch-all.
  expressApp.use("/audio", express.static(join(process.cwd(), "storage", "audio")));
  expressApp.use(express.static(join(process.cwd(), "public")));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Every controller gets the "api" prefix except SpaFallbackController's
  // catch-all route (registered with no path of its own, see
  // spa-fallback.module.ts) — that one needs to stay reachable at the bare
  // path it's meant to catch, and it must be the last module imported in
  // AppModule so every other controller's routes are tried before it.
  app.setGlobalPrefix("api", { exclude: [{ path: "*", method: RequestMethod.ALL }] });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}/api`);
}

bootstrap();
