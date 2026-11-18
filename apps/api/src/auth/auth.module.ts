import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthGuardsModule } from "./auth-guards.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule, AuthGuardsModule],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
