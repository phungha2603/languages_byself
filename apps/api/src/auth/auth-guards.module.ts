import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RequireSelfGuard } from "./require-self.guard";

/**
 * Just the JWT verification plumbing, with no dependency on UsersModule —
 * every user-scoped feature module imports this (not AuthModule itself) to
 * avoid a UsersModule <-> AuthModule import cycle.
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
      signOptions: { expiresIn: "30d" },
    }),
  ],
  providers: [JwtAuthGuard, RequireSelfGuard],
  exports: [JwtAuthGuard, RequireSelfGuard, JwtModule],
})
export class AuthGuardsModule {}
