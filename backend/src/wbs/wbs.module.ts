import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { WbsController } from './wbs.controller';
import { WbsService } from './wbs.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [WbsController],
  providers: [WbsService],
})
export class WbsModule {}