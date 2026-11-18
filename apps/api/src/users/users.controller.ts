import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequireSelfGuard } from "../auth/require-self.guard";
import type { AuthenticatedUserPayload } from "../auth/auth.service";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Manual/dev profile creation — the Google Sign-In flow (POST /auth/google)
   * is the primary path, but this still issues a session token so the rest
   * of the authenticated API works the same way regardless of how the
   * account was created.
   */
  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto.email, dto.displayName, dto.targetBand, dto.startingStageId);
    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email } satisfies AuthenticatedUserPayload);
    return { accessToken, user };
  }

  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Get(":userId")
  findOne(@Param("userId") userId: string) {
    return this.usersService.findById(userId);
  }
}
