import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { ProjectsModule } from './projects/projects.module';
import { RolesModule } from './roles/roles.module';
import { AuditModule } from './audit/audit.module';
import { WbsModule } from './wbs/wbs.module';
import { TasksModule } from './tasks/tasks.module';
import { MilestonesModule } from './milestones/milestones.module';
import { SchedulesModule } from './schedules/schedules.module';
import { DailyReportsModule } from './daily-reports/daily-reports.module';
import { DocumentsModule } from './documents/documents.module';
import { RfisModule } from './rfis/rfis.module';
import { SubmittalsModule } from './submittals/submittals.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { QualityModule } from './quality/quality.module';
import { SafetyModule } from './safety/safety.module';
import { ProcurementModule } from './procurement/procurement.module';
import { InventoryModule } from './inventory/inventory.module';
import { CostModule } from './cost/cost.module';
import { FinanceModule } from './finance/finance.module';
import { ProfileModule } from './profile/profile.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    ProjectsModule,
    RolesModule,
    AuditModule,
    WbsModule,
    TasksModule,
    MilestonesModule,
    SchedulesModule,
    DailyReportsModule,
    DocumentsModule,
    RfisModule,
    SubmittalsModule,
    ApprovalsModule,
    NotificationsModule,
    QualityModule,
    SafetyModule,
    ContactModule,
    ProcurementModule,
    InventoryModule,
    CostModule,
    FinanceModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}