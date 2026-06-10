import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}