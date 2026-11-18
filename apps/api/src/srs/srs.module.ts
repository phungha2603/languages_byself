import { Module } from "@nestjs/common";
import { SrsService } from "./srs.service";
import { SrsController } from "./srs.controller";
import { AuthGuardsModule } from "../auth/auth-guards.module";

@Module({
  imports: [AuthGuardsModule],
  providers: [SrsService],
  controllers: [SrsController],
})
export class SrsModule {}
