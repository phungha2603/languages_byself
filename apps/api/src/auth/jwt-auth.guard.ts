import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { AuthenticatedUserPayload } from "./auth.service";

/** Verifies the Bearer JWT issued by POST /auth/google and attaches `req.user`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUserPayload }>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthenticatedUserPayload>(authHeader.slice(7));
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
    return true;
  }
}
