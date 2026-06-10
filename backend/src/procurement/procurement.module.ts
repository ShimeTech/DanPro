import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
})
export class ProcurementModule {}