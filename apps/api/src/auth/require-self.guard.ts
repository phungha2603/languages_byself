import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUserPayload } from "./auth.service";

/**
 * Must run after JwtAuthGuard. Rejects the request if the route's `:userId`
 * param or `?userId=` query string refers to someone other than the
 * authenticated caller — i.e. you can only read or write your own data.
 *
 * Deliberately does NOT fall back to a generic `:id` param: on routes like
 * `/exercises/:id/attempts`, `:id` names the *exercise*, not the user, and
 * comparing it against the caller's id would reject every legitimate request.
 */
@Injectable()
export class RequireSelfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUserPayload }>();
    const requestedUserId = request.params.userId ?? (request.query.userId as string | undefined);

    if (requestedUserId && requestedUserId !== request.user?.sub) {
      throw new ForbiddenException("You can only access your own data.");
    }
    return true;
  }
}
