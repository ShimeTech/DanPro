import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CostController } from './cost.controller';
import { CostService } from './cost.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CostController],
  providers: [CostService],
})
export class CostModule {}