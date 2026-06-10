import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SubmittalsController } from './submittals.controller';
import { SubmittalsService } from './submittals.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [SubmittalsController],
  providers: [SubmittalsService],
})
export class SubmittalsModule {}