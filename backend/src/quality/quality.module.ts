import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [QualityController],
  providers: [QualityService],
})
export class QualityModule {}