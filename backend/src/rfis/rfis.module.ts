import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RfisController } from './rfis.controller';
import { RfisService } from './rfis.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [RfisController],
  providers: [RfisService],
})
export class RfisModule {}