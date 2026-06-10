import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}