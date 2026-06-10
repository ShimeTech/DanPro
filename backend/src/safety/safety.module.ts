import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [SafetyController],
  providers: [SafetyService],
})
export class SafetyModule {}