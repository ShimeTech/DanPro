import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}