import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client } from "google-auth-library";
import { UsersService } from "../users/users.service";

export interface AuthenticatedUserPayload {
  sub: string;
  email: string;
}

/**
 * Verifies Google ID tokens and issues our own session JWTs. ID-token
 * verification needs no client secret — only the OAuth Client ID(s) the
 * token's `aud` claim must match, configured via GOOGLE_CLIENT_IDS.
 */
@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  private getAllowedClientIds(): string[] {
    const raw = process.env.GOOGLE_CLIENT_IDS ?? "";
    const ids = raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      throw new UnauthorizedException(
        "GOOGLE_CLIENT_IDS is not configured on the server — Google Sign-In cannot be verified yet.",
      );
    }
    return ids;
  }

  async loginWithGoogle(idToken: string, startingStageId?: string) {
    const audience = this.getAllowedClientIds();
    const ticket = await this.googleClient.verifyIdToken({ idToken, audience }).catch(() => {
      throw new UnauthorizedException("Invalid Google ID token.");
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException("Google ID token is missing required claims.");
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException("Google account email is not verified.");
    }

    const user = await this.usersService.findOrCreateByGoogle(
      { googleId: payload.sub, email: payload.email, displayName: payload.name ?? payload.email },
      startingStageId,
    );

    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email } satisfies AuthenticatedUserPayload);
    return { accessToken, user };
  }
}
