import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  PrismaClient,
  UserStatus,
  ProjectStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'buildpro_ims',
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
      description: 'Full system administrator',
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Project Manager' },
    update: {},
    create: {
      name: 'Project Manager',
      description: 'Manages project delivery and project teams',
      isSystem: true,
    },
  });

  const engineerRole = await prisma.role.upsert({
    where: { name: 'Site Engineer' },
    update: {},
    create: {
      name: 'Site Engineer',
      description: 'Handles site engineering activities',
      isSystem: true,
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: { name: 'Accountant' },
    update: {},
    create: {
      name: 'Accountant',
      description: 'Handles cost, budget, finance, invoices, and payments',
      isSystem: true,
    },
  });

  const modules = [
    'dashboard',
    'companies',
    'users',
    'projects',
    'wbs',
    'tasks',
    'milestones',
    'schedules',
    'daily_reports',
    'documents',
    'rfis',
    'submittals',
    'approvals',
    'quality',
    'safety',
    'procurement',
    'inventory',
    'cost',
    'finance',
    'reports',
    'notifications',
    'audit_logs',
    'settings',
  ];

const actions = [
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'export',
  'assign',
];

  for (const moduleName of modules) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: {
          module_action: {
            module: moduleName,
            action,
          },
        },
        update: {},
        create: {
          module: moduleName,
          action,
          description: `${action} permission for ${moduleName}`,
        },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }
  }
const dashboardRead = await prisma.permission.upsert({
  where: {
    module_action: {
      module: 'dashboard',
      action: 'read',
    },
  },
  update: {},
  create: {
    module: 'dashboard',
    action: 'read',
    description: 'Read dashboard',
  },
});

for (const role of [adminRole, managerRole, engineerRole, accountantRole]) {
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: role.id,
        permissionId: dashboardRead.id,
      },
    },
    update: {},
    create: {
      roleId: role.id,
      permissionId: dashboardRead.id,
    },
  });
}
  const admin = await prisma.user.upsert({
    where: { email: 'admin@buildpro.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@buildpro.com',
      passwordHash,
      phone: '+251900000000',
      jobTitle: 'Enterprise Administrator',
      status: UserStatus.ACTIVE,
    },
  });

  const engineer = await prisma.user.upsert({
    where: { email: 'engineer@buildpro.com' },
    update: {},
    create: {
      name: 'Abel Tesfaye',
      email: 'engineer@buildpro.com',
      passwordHash,
      phone: '+251911111111',
      jobTitle: 'Senior Site Engineer',
      status: UserStatus.ACTIVE,
    },
  });

  const planner = await prisma.user.upsert({
    where: { email: 'planner@buildpro.com' },
    update: {},
    create: {
      name: 'Mekdes Alemu',
      email: 'planner@buildpro.com',
      passwordHash,
      phone: '+251933333333',
      jobTitle: 'Planning Engineer',
      status: UserStatus.ACTIVE,
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@buildpro.com' },
    update: {},
    create: {
      name: 'Samuel Bekele',
      email: 'accountant@buildpro.com',
      passwordHash,
      phone: '+251944444444',
      jobTitle: 'Project Accountant',
      status: UserStatus.ACTIVE,
    },
  });

  const company = await prisma.company.create({
    data: {
      name: 'BuildPro Construction Group',
      legalName: 'BuildPro International Construction PLC',
      email: 'info@buildpro.com',
      phone: '+251-11-555-1000',
      address: 'Addis Ababa, Ethiopia',
      taxNumber: 'TIN-100200300',
      currency: 'USD',
      timezone: 'Africa/Addis_Ababa',
      language: 'en',
      isActive: true,
    },
  });

  await prisma.companyUser.createMany({
    data: [
      {
        companyId: company.id,
        userId: admin.id,
        roleId: adminRole.id,
      },
      {
        companyId: company.id,
        userId: engineer.id,
        roleId: engineerRole.id,
      },
      {
        companyId: company.id,
        userId: planner.id,
        roleId: managerRole.id,
      },
      {
        companyId: company.id,
        userId: accountant.id,
        roleId: accountantRole.id,
      },
    ],
    skipDuplicates: true,
  });

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      code: 'BP-SMART-001',
      name: 'Smart City Development Project',
      description:
        'Mixed-use smart city project including roads, buildings, utilities, and digital infrastructure.',
      clientName: 'Government Infrastructure Agency',
      location: 'Addis Ababa, Ethiopia',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2028-12-31'),
      budget: 250000000,
      currency: 'USD',
      status: ProjectStatus.ACTIVE,
    },
  });

  await prisma.projectUser.createMany({
    data: [
      {
        projectId: project.id,
        userId: admin.id,
        roleId: adminRole.id,
      },
      {
        projectId: project.id,
        userId: engineer.id,
        roleId: engineerRole.id,
      },
      {
        projectId: project.id,
        userId: planner.id,
        roleId: managerRole.id,
      },
      {
        projectId: project.id,
        userId: accountant.id,
        roleId: accountantRole.id,
      },
    ],
    skipDuplicates: true,
  });
/*
|--------------------------------------------------------------------------
| WBS + TASKS + DEPENDENCIES
|--------------------------------------------------------------------------
*/

const wbsSitePrep = await prisma.wbsItem.create({
  data: {
    projectId: project.id,
    code: '1.0',
    name: 'Site Preparation',
    description: 'Mobilization, clearing, excavation, and temporary works.',
    sortOrder: 1,
  },
});

const wbsStructures = await prisma.wbsItem.create({
  data: {
    projectId: project.id,
    code: '2.0',
    name: 'Structural Works',
    description: 'Foundation, concrete, steel reinforcement, and superstructure.',
    sortOrder: 2,
  },
});

const wbsRoads = await prisma.wbsItem.create({
  data: {
    projectId: project.id,
    code: '3.0',
    name: 'Road and Infrastructure Works',
    description: 'Internal roads, drainage, utilities, and smart city infrastructure.',
    sortOrder: 3,
  },
});

const taskExcavation = await prisma.task.create({
  data: {
    projectId: project.id,
    wbsItemId: wbsSitePrep.id,
    code: 'T-001',
    name: 'Site clearing and excavation',
    description: 'Clear site and complete bulk excavation for Block A.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    plannedStart: new Date('2026-01-05'),
    plannedEnd: new Date('2026-01-25'),
    durationDays: 20,
    progress: 65,
    assignedToId: engineer.id,
  },
});

const taskFoundation = await prisma.task.create({
  data: {
    projectId: project.id,
    wbsItemId: wbsStructures.id,
    code: 'T-002',
    name: 'Foundation concrete works',
    description: 'Rebar fixing, formwork, concrete casting, and curing.',
    status: 'NOT_STARTED',
    priority: 'CRITICAL',
    plannedStart: new Date('2026-01-26'),
    plannedEnd: new Date('2026-02-20'),
    durationDays: 25,
    progress: 0,
    assignedToId: engineer.id,
  },
});

const taskRoadworks = await prisma.task.create({
  data: {
    projectId: project.id,
    wbsItemId: wbsRoads.id,
    code: 'T-003',
    name: 'Internal road subbase preparation',
    description: 'Prepare subgrade and subbase for internal access roads.',
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    plannedStart: new Date('2026-02-10'),
    plannedEnd: new Date('2026-03-05'),
    durationDays: 24,
    progress: 0,
    assignedToId: planner.id,
  },
});

await prisma.taskDependency.create({
  data: {
    predecessorId: taskExcavation.id,
    successorId: taskFoundation.id,
    type: 'FINISH_TO_START',
    lagDays: 0,
  },
});

await prisma.taskDependency.create({
  data: {
    predecessorId: taskExcavation.id,
    successorId: taskRoadworks.id,
    type: 'FINISH_TO_START',
    lagDays: 5,
  },
});

/*
|--------------------------------------------------------------------------
| MILESTONES
|--------------------------------------------------------------------------
*/

await prisma.milestone.createMany({
  data: [
    {
      projectId: project.id,
      code: 'MS-001',
      name: 'Site Mobilization Completed',
      description: 'All site facilities and temporary works established.',
      plannedDate: new Date('2026-01-15'),
      status: 'PLANNED',
    },
    {
      projectId: project.id,
      code: 'MS-002',
      name: 'Foundation Works Completed',
      description: 'Foundation package completed and approved.',
      plannedDate: new Date('2026-02-28'),
      status: 'PLANNED',
    },
    {
      projectId: project.id,
      code: 'MS-003',
      name: 'Road Subbase Completed',
      description: 'Internal road subbase works completed.',
      plannedDate: new Date('2026-03-10'),
      status: 'PLANNED',
    },
  ],
});

/*
|--------------------------------------------------------------------------
| SCHEDULE BASELINE
|--------------------------------------------------------------------------
*/

const baseline = await prisma.scheduleBaseline.create({
  data: {
    projectId: project.id,
    name: 'Initial Approved Baseline',
    description: 'Initial project schedule baseline for smart city project.',
    version: 'BL-001',
    status: 'APPROVED',
    approvedAt: new Date(),
    approvedBy: admin.id,
  },
});

await prisma.scheduleBaselineItem.createMany({
  data: [
    {
      baselineId: baseline.id,
      taskId: taskExcavation.id,
      plannedStart: new Date('2026-01-05'),
      plannedEnd: new Date('2026-01-25'),
      durationDays: 20,
    },
    {
      baselineId: baseline.id,
      taskId: taskFoundation.id,
      plannedStart: new Date('2026-01-26'),
      plannedEnd: new Date('2026-02-20'),
      durationDays: 25,
    },
    {
      baselineId: baseline.id,
      taskId: taskRoadworks.id,
      plannedStart: new Date('2026-02-10'),
      plannedEnd: new Date('2026-03-05'),
      durationDays: 24,
    },
  ],
});
/*
|--------------------------------------------------------------------------
| DAILY REPORTS
|--------------------------------------------------------------------------
*/

await prisma.dailyReport.createMany({
  data: [
    {
      projectId: project.id,
      reportDate: new Date('2026-01-06'),
      weather: 'Sunny',
      manpowerCount: 85,
      equipmentUsed: '2 excavators, 4 dump trucks, 1 grader',
      workCompleted: 'Site clearing and temporary access road preparation.',
      materialReceived: 'Diesel fuel and safety barricades.',
      sitePhotos: [
        '/uploads/reports/site-clearing-01.jpg',
        '/uploads/reports/access-road-01.jpg',
      ],
      issues: 'Minor delay due to equipment mobilization.',
      delays: 'Excavator arrived 3 hours late.',
      remarks: 'Work progressing as planned.',
      preparedById: engineer.id,
    },
    {
      projectId: project.id,
      reportDate: new Date('2026-01-07'),
      weather: 'Partly cloudy',
      manpowerCount: 112,
      equipmentUsed: '3 excavators, 5 dump trucks, 1 roller',
      workCompleted: 'Bulk excavation continued at Block A.',
      materialReceived: 'Reinforcement steel delivered to laydown area.',
      sitePhotos: ['/uploads/reports/excavation-01.jpg'],
      issues: 'Traffic congestion at material delivery gate.',
      delays: null,
      remarks: 'Additional flagmen assigned for logistics control.',
      preparedById: engineer.id,
    },
  ],
  skipDuplicates: true,
});

/*
|--------------------------------------------------------------------------
| DOCUMENTS + DOCUMENT VERSIONS
|--------------------------------------------------------------------------
*/

const foundationDrawing = await prisma.document.create({
  data: {
    projectId: project.id,
    code: 'BP-SC-STR-DRW-0001',
    title: 'Foundation Layout Drawing',
    type: 'DRAWING',
    discipline: 'Structural',
    originator: 'BuildPro Design Team',
    zone: 'Zone A',
    level: 'Basement',
    status: 'PUBLISHED',
    currentRevision: 'C01',
    description: 'Approved foundation layout drawing for Block A.',
  },
});

const methodStatement = await prisma.document.create({
  data: {
    projectId: project.id,
    code: 'BP-SC-CIV-MS-0001',
    title: 'Excavation Method Statement',
    type: 'METHOD_STATEMENT',
    discipline: 'Civil',
    originator: 'BuildPro Construction Team',
    zone: 'Site Wide',
    level: 'Ground',
    status: 'SHARED',
    currentRevision: 'P02',
    description: 'Method statement for bulk excavation and haulage works.',
  },
});

await prisma.documentVersion.createMany({
  data: [
    {
      documentId: foundationDrawing.id,
      revision: 'P01',
      status: 'SHARED',
      fileName: 'foundation-layout-P01.pdf',
      filePath: 'uploads/documents/foundation-layout-P01.pdf',
      fileSize: 2400000,
      mimeType: 'application/pdf',
      uploadedById: admin.id,
      notes: 'Preliminary issue for review.',
    },
    {
      documentId: foundationDrawing.id,
      revision: 'C01',
      status: 'PUBLISHED',
      fileName: 'foundation-layout-C01.pdf',
      filePath: 'uploads/documents/foundation-layout-C01.pdf',
      fileSize: 2600000,
      mimeType: 'application/pdf',
      uploadedById: admin.id,
      notes: 'Approved for construction.',
    },
    {
      documentId: methodStatement.id,
      revision: 'P02',
      status: 'SHARED',
      fileName: 'excavation-method-statement-P02.pdf',
      filePath: 'uploads/documents/excavation-method-statement-P02.pdf',
      fileSize: 1800000,
      mimeType: 'application/pdf',
      uploadedById: engineer.id,
      notes: 'Updated after safety review.',
    },
  ],
  skipDuplicates: true,
});

/*
|--------------------------------------------------------------------------
| RFIs
|--------------------------------------------------------------------------
*/

const rfiFoundationDepth = await prisma.rfi.create({
  data: {
    projectId: project.id,
    code: 'RFI-001',
    title: 'Clarification on Foundation Excavation Depth',
    question:
      'Please confirm whether the foundation excavation depth should follow drawing C01 or geotechnical report recommendation.',
    response:
      'Proceed according to drawing C01. Any local soft spots shall be inspected and approved by the engineer.',
    status: 'ANSWERED',
    priority: 'HIGH',
    createdById: engineer.id,
    assignedToId: admin.id,
    dueDate: new Date('2026-01-12'),
    answeredAt: new Date('2026-01-10'),
  },
});

const rfiDrainageRoute = await prisma.rfi.create({
  data: {
    projectId: project.id,
    code: 'RFI-002',
    title: 'Stormwater Drainage Route Conflict',
    question:
      'The proposed stormwater line conflicts with temporary access road alignment. Please advise revised route.',
    status: 'OPEN',
    priority: 'URGENT',
    createdById: engineer.id,
    assignedToId: planner.id,
    dueDate: new Date('2026-01-18'),
  },
});

/*
|--------------------------------------------------------------------------
| SUBMITTALS
|--------------------------------------------------------------------------
*/

const concreteMixSubmittal = await prisma.submittal.create({
  data: {
    projectId: project.id,
    code: 'SUB-001',
    title: 'Concrete Mix Design C30/37',
    description:
      'Concrete mix design submission for foundation and retaining wall works.',
    status: 'UNDER_REVIEW',
    revision: 'A',
    submittedAt: new Date('2026-01-08'),
    dueDate: new Date('2026-01-15'),
    createdById: engineer.id,
    reviewerId: admin.id,
    documentId: methodStatement.id,
  },
});

const rebarSubmittal = await prisma.submittal.create({
  data: {
    projectId: project.id,
    code: 'SUB-002',
    title: 'Reinforcement Steel Mill Certificates',
    description:
      'Submission of mill certificates and supplier test reports for reinforcement steel.',
    status: 'APPROVED_WITH_COMMENTS',
    revision: 'A',
    submittedAt: new Date('2026-01-09'),
    dueDate: new Date('2026-01-14'),
    closedAt: new Date('2026-01-13'),
    createdById: engineer.id,
    reviewerId: admin.id,
    documentId: foundationDrawing.id,
  },
});

/*
|--------------------------------------------------------------------------
| APPROVALS
|--------------------------------------------------------------------------
*/

await prisma.approval.createMany({
  data: [
    {
      projectId: project.id,
      userId: admin.id,
      status: 'APPROVED',
      module: 'rfis',
      entityName: 'Rfi',
      entityId: rfiFoundationDepth.id,
      comments: 'Response approved and issued to site team.',
      approvedAt: new Date('2026-01-10'),
      rfiId: rfiFoundationDepth.id,
    },
    {
      projectId: project.id,
      userId: planner.id,
      status: 'PENDING',
      module: 'rfis',
      entityName: 'Rfi',
      entityId: rfiDrainageRoute.id,
      comments: 'Pending planner review for revised drainage route.',
      rfiId: rfiDrainageRoute.id,
    },
    {
      projectId: project.id,
      userId: admin.id,
      status: 'PENDING',
      module: 'submittals',
      entityName: 'Submittal',
      entityId: concreteMixSubmittal.id,
      comments: 'Technical review in progress.',
      submittalId: concreteMixSubmittal.id,
    },
    {
      projectId: project.id,
      userId: admin.id,
      status: 'APPROVED',
      module: 'submittals',
      entityName: 'Submittal',
      entityId: rebarSubmittal.id,
      comments: 'Approved with comments. Contractor to comply with notes.',
      approvedAt: new Date('2026-01-13'),
      submittalId: rebarSubmittal.id,
    },
  ],
});

/*
|--------------------------------------------------------------------------
| QUALITY CHECKLISTS + INSPECTIONS + NCR
|--------------------------------------------------------------------------
*/

const concreteChecklist = await prisma.qualityChecklist.create({
  data: {
    projectId: project.id,
    code: 'QC-001',
    title: 'Concrete Works Inspection Checklist',
    description:
      'Checklist for formwork, reinforcement, embedded items, pouring, curing, and concrete test records.',
    items: [
      {
        item: 'Formwork checked and approved',
        required: true,
      },
      {
        item: 'Reinforcement size, spacing, and cover verified',
        required: true,
      },
      {
        item: 'Embedded items and sleeves installed',
        required: true,
      },
      {
        item: 'Concrete slump test completed',
        required: true,
      },
      {
        item: 'Concrete cubes taken and labeled',
        required: true,
      },
    ],
  },
});

const roadChecklist = await prisma.qualityChecklist.create({
  data: {
    projectId: project.id,
    code: 'QC-002',
    title: 'Road Subbase Inspection Checklist',
    description:
      'Checklist for road formation, compaction, level checks, and material approval.',
    items: [
      {
        item: 'Subgrade level checked',
        required: true,
      },
      {
        item: 'Approved subbase material used',
        required: true,
      },
      {
        item: 'Compaction test completed',
        required: true,
      },
      {
        item: 'Drainage alignment verified',
        required: true,
      },
    ],
  },
});

await prisma.inspection.createMany({
  data: [
    {
      projectId: project.id,
      checklistId: concreteChecklist.id,
      code: 'INSP-001',
      title: 'Foundation Rebar Inspection',
      location: 'Block A - Foundation Zone',
      inspectionDate: new Date('2026-01-20'),
      status: 'PASSED',
      result:
        'Rebar spacing, cover blocks, and embedded items checked. Approved for concrete pouring.',
      createdById: engineer.id,
      inspectorId: admin.id,
    },
    {
      projectId: project.id,
      checklistId: roadChecklist.id,
      code: 'INSP-002',
      title: 'Internal Road Subgrade Inspection',
      location: 'Road Segment R1',
      inspectionDate: new Date('2026-02-12'),
      status: 'PLANNED',
      result: null,
      createdById: planner.id,
      inspectorId: engineer.id,
    },
    {
      projectId: project.id,
      checklistId: concreteChecklist.id,
      code: 'INSP-003',
      title: 'Retaining Wall Concrete Inspection',
      location: 'Zone B - Retaining Wall',
      inspectionDate: new Date('2026-02-18'),
      status: 'FAILED',
      result:
        'Honeycomb observed on vertical face. NCR raised for repair method statement.',
      createdById: engineer.id,
      inspectorId: admin.id,
    },
  ],
  skipDuplicates: true,
});

await prisma.ncrReport.createMany({
  data: [
    {
      projectId: project.id,
      code: 'NCR-001',
      title: 'Honeycomb on Retaining Wall Concrete',
      description:
        'Honeycomb observed on Zone B retaining wall after formwork removal. Contractor to submit repair method statement.',
      status: 'OPEN',
      correctiveAction:
        'Remove loose concrete, clean surface, apply approved repair mortar, and reinspect before backfilling.',
      dueDate: new Date('2026-02-25'),
      createdById: admin.id,
      assignedToId: engineer.id,
    },
    {
      projectId: project.id,
      code: 'NCR-002',
      title: 'Unapproved Material Storage',
      description:
        'Reinforcement steel stored directly on ground without timber supports or proper covering.',
      status: 'UNDER_REVIEW',
      correctiveAction:
        'Provide timber supports, cover reinforcement steel, and segregate inspected material.',
      dueDate: new Date('2026-01-18'),
      createdById: engineer.id,
      assignedToId: planner.id,
    },
  ],
  skipDuplicates: true,
});

/*
|--------------------------------------------------------------------------
| SAFETY INCIDENTS + RISK ASSESSMENTS + TOOLBOX TALKS + SAFETY INSPECTIONS
|--------------------------------------------------------------------------
*/

await prisma.safetyIncident.createMany({
  data: [
    {
      projectId: project.id,
      code: 'SI-001',
      title: 'Minor Hand Injury',
      description:
        'Worker sustained minor hand injury while handling reinforcement steel.',
      severity: 'LOW',
      status: 'CLOSED',
      incidentDate: new Date('2026-01-09'),
      location: 'Steel Fixing Yard',
      reporterId: engineer.id,
      correctiveAction:
        'Refresher toolbox talk conducted. Gloves inspection added to daily PPE checklist.',
      closedAt: new Date('2026-01-10'),
    },
    {
      projectId: project.id,
      code: 'SI-002',
      title: 'Near Miss - Reversing Dump Truck',
      description:
        'Near miss reported during reversing operation of dump truck near excavation edge.',
      severity: 'HIGH',
      status: 'INVESTIGATING',
      incidentDate: new Date('2026-01-14'),
      location: 'Block A Excavation Area',
      reporterId: admin.id,
      correctiveAction:
        'Assign banksman for all reversing equipment and install additional warning signs.',
      closedAt: null,
    },
  ],
  skipDuplicates: true,
});

await prisma.riskAssessment.createMany({
  data: [
    {
      projectId: project.id,
      code: 'RA-001',
      activity: 'Bulk Excavation Works',
      hazards:
        'Excavation collapse, plant movement, falling into excavation, underground utilities.',
      risks:
        'Serious injury, equipment damage, service disruption, project delay.',
      controls:
        'Provide excavation permit, edge protection, safe access, daily inspection, utility scanning, and banksman control.',
      riskLevel: 'HIGH',
      reviewDate: new Date('2026-01-30'),
    },
    {
      projectId: project.id,
      code: 'RA-002',
      activity: 'Concrete Pouring Works',
      hazards:
        'Concrete burns, pump hose movement, working at height, manual handling.',
      risks:
        'Skin injury, struck-by incidents, falls, sprains and strains.',
      controls:
        'Use PPE, secure pump lines, provide safe platform, assign competent supervisor, conduct pre-pour briefing.',
      riskLevel: 'MEDIUM',
      reviewDate: new Date('2026-02-10'),
    },
    {
      projectId: project.id,
      code: 'RA-003',
      activity: 'Road Subbase Compaction',
      hazards:
        'Moving roller, dust exposure, noise, poor visibility.',
      risks:
        'Crush injury, respiratory issues, hearing damage, collision.',
      controls:
        'Traffic management plan, water spraying, hearing protection, reflective PPE, exclusion zones.',
      riskLevel: 'MEDIUM',
      reviewDate: new Date('2026-02-28'),
    },
  ],
  skipDuplicates: true,
});

await prisma.toolboxTalk.createMany({
  data: [
    {
      projectId: project.id,
      topic: 'Excavation Safety and Edge Protection',
      talkDate: new Date('2026-01-06'),
      attendees: [
        {
          name: 'Site excavation team',
          count: 42,
        },
      ],
      leaderId: engineer.id,
      remarks:
        'Workers briefed on access ladders, edge protection, and exclusion zones.',
    },
    {
      projectId: project.id,
      topic: 'PPE Compliance and Manual Handling',
      talkDate: new Date('2026-01-10'),
      attendees: [
        {
          name: 'Concrete and rebar teams',
          count: 58,
        },
      ],
      leaderId: admin.id,
      remarks:
        'Special emphasis given to gloves, helmets, reflective vests, and safe lifting.',
    },
  ],
});

await prisma.safetyInspection.createMany({
  data: [
    {
      projectId: project.id,
      code: 'HSI-001',
      inspectionDate: new Date('2026-01-08'),
      findings:
        'PPE compliance generally good. Two workers observed without safety glasses.',
      actions:
        'Safety glasses issued immediately. Supervisor instructed to monitor PPE at entry point.',
      inspectorId: admin.id,
    },
    {
      projectId: project.id,
      code: 'HSI-002',
      inspectionDate: new Date('2026-01-15'),
      findings:
        'Excavation edge protection incomplete near north side of Block A.',
      actions:
        'Area barricaded and corrective action assigned to site team before work continuation.',
      inspectorId: engineer.id,
    },
  ],
  skipDuplicates: true,
});

/*
|--------------------------------------------------------------------------
| PROCUREMENT + INVENTORY
|--------------------------------------------------------------------------
*/

const supplierSteel = await prisma.supplier.create({
  data: {
    companyId: company.id,
    name: 'Ethio Steel Manufacturing PLC',
    email: 'sales@ethiosteel.com',
    phone: '+251911222333',
    address: 'Dukem Industrial Zone, Ethiopia',
    taxNumber: 'TIN-STL-001',
    isActive: true,
  },
});

const supplierConcrete = await prisma.supplier.create({
  data: {
    companyId: company.id,
    name: 'Addis Ready Mix Concrete',
    email: 'orders@addisreadymix.com',
    phone: '+251922333444',
    address: 'Akaki Kality, Addis Ababa',
    taxNumber: 'TIN-CON-002',
    isActive: true,
  },
});

const materialRebar = await prisma.material.create({
  data: {
    companyId: company.id,
    code: 'MAT-001',
    name: 'Reinforcement Steel Bar 16mm',
    unit: 'Ton',
    description: 'High-yield reinforcement steel bar for structural works.',
    minStock: 20,
  },
});

const materialCement = await prisma.material.create({
  data: {
    companyId: company.id,
    code: 'MAT-002',
    name: 'Portland Cement OPC',
    unit: 'Bag',
    description: 'Ordinary Portland cement for concrete and masonry works.',
    minStock: 500,
  },
});

const materialAggregate = await prisma.material.create({
  data: {
    companyId: company.id,
    code: 'MAT-003',
    name: 'Crushed Aggregate 20mm',
    unit: 'm3',
    description: 'Crushed stone aggregate for concrete production.',
    minStock: 300,
  },
});

const purchaseRequest = await prisma.purchaseRequest.create({
  data: {
    projectId: project.id,
    code: 'PR-001',
    description:
      'Purchase request for reinforcement steel and concrete materials for foundation works.',
    status: 'APPROVED',
    requestedById: engineer.id,
    requestedDate: new Date('2026-01-08'),
  },
});

await prisma.purchaseRequestItem.createMany({
  data: [
    {
      purchaseRequestId: purchaseRequest.id,
      materialId: materialRebar.id,
      description: '16mm reinforcement steel bar for foundation works',
      quantity: 75,
      unit: 'Ton',
    },
    {
      purchaseRequestId: purchaseRequest.id,
      materialId: materialCement.id,
      description: 'OPC cement for concrete production',
      quantity: 1200,
      unit: 'Bag',
    },
    {
      purchaseRequestId: purchaseRequest.id,
      materialId: materialAggregate.id,
      description: '20mm aggregate for concrete batching',
      quantity: 450,
      unit: 'm3',
    },
  ],
});

const purchaseOrderSteel = await prisma.purchaseOrder.create({
  data: {
    projectId: project.id,
    supplierId: supplierSteel.id,
    code: 'PO-001',
    description: 'Purchase order for reinforcement steel bars.',
    status: 'ORDERED',
    orderDate: new Date('2026-01-10'),
    totalAmount: 127500,
    createdById: admin.id,
  },
});

await prisma.purchaseOrderItem.create({
  data: {
    purchaseOrderId: purchaseOrderSteel.id,
    materialId: materialRebar.id,
    description: '16mm reinforcement steel bar',
    quantity: 75,
    unit: 'Ton',
    unitPrice: 1700,
    totalPrice: 127500,
  },
});

const purchaseOrderConcrete = await prisma.purchaseOrder.create({
  data: {
    projectId: project.id,
    supplierId: supplierConcrete.id,
    code: 'PO-002',
    description: 'Purchase order for concrete production materials.',
    status: 'RECEIVED',
    orderDate: new Date('2026-01-12'),
    totalAmount: 68000,
    createdById: admin.id,
  },
});

await prisma.purchaseOrderItem.createMany({
  data: [
    {
      purchaseOrderId: purchaseOrderConcrete.id,
      materialId: materialCement.id,
      description: 'OPC cement bags',
      quantity: 1200,
      unit: 'Bag',
      unitPrice: 8,
      totalPrice: 9600,
    },
    {
      purchaseOrderId: purchaseOrderConcrete.id,
      materialId: materialAggregate.id,
      description: '20mm crushed aggregate',
      quantity: 450,
      unit: 'm3',
      unitPrice: 129.78,
      totalPrice: 58400,
    },
  ],
});

/*
|--------------------------------------------------------------------------
| INVENTORY TRANSACTIONS
|--------------------------------------------------------------------------
*/

await prisma.inventoryTransaction.createMany({
  data: [
    {
      projectId: project.id,
      materialId: materialRebar.id,
      type: 'RECEIVE',
      quantity: 40,
      unit: 'Ton',
      reference: 'GRN-001',
      notes: 'First batch of reinforcement steel received from supplier.',
      performedById: admin.id,
    },
    {
      projectId: project.id,
      materialId: materialRebar.id,
      type: 'ISSUE',
      quantity: 12,
      unit: 'Ton',
      reference: 'MIN-001',
      notes: 'Issued to Block A foundation steel fixing team.',
      performedById: engineer.id,
    },
    {
      projectId: project.id,
      materialId: materialCement.id,
      type: 'RECEIVE',
      quantity: 1200,
      unit: 'Bag',
      reference: 'GRN-002',
      notes: 'Cement delivered and stored in temporary warehouse.',
      performedById: admin.id,
    },
    {
      projectId: project.id,
      materialId: materialCement.id,
      type: 'ISSUE',
      quantity: 350,
      unit: 'Bag',
      reference: 'MIN-002',
      notes: 'Issued for foundation concrete production.',
      performedById: engineer.id,
    },
    {
      projectId: project.id,
      materialId: materialAggregate.id,
      type: 'RECEIVE',
      quantity: 450,
      unit: 'm3',
      reference: 'GRN-003',
      notes: 'Aggregate stock received at batching area.',
      performedById: admin.id,
    },
    {
      projectId: project.id,
      materialId: materialAggregate.id,
      type: 'ADJUSTMENT',
      quantity: -15,
      unit: 'm3',
      reference: 'ADJ-001',
      notes: 'Stock correction after physical measurement.',
      performedById: admin.id,
    },
  ],
});
/*
|--------------------------------------------------------------------------
| COST + BUDGET + FINANCE
|--------------------------------------------------------------------------
*/

await prisma.boqItem.createMany({
  data: [
    {
      projectId: project.id,
      code: 'BOQ-001',
      description: 'Bulk excavation and disposal',
      unit: 'm3',
      quantity: 18500,
      unitRate: 12.5,
      totalAmount: 231250,
    },
    {
      projectId: project.id,
      code: 'BOQ-002',
      description: 'Reinforced concrete foundation works',
      unit: 'm3',
      quantity: 4200,
      unitRate: 145,
      totalAmount: 609000,
    },
    {
      projectId: project.id,
      code: 'BOQ-003',
      description: 'Internal asphalt road works',
      unit: 'm2',
      quantity: 28000,
      unitRate: 38,
      totalAmount: 1064000,
    },
  ],
  skipDuplicates: true,
});

await prisma.budget.createMany({
  data: [
    {
      projectId: project.id,
      code: 'BUD-001',
      title: 'Site Preparation Budget',
      description: 'Budget allocation for mobilization, clearing, excavation, and temporary works.',
      amount: 500000,
      status: 'APPROVED',
    },
    {
      projectId: project.id,
      code: 'BUD-002',
      title: 'Structural Works Budget',
      description: 'Budget allocation for concrete, reinforcement, formwork, and structural works.',
      amount: 3500000,
      status: 'APPROVED',
    },
    {
      projectId: project.id,
      code: 'BUD-003',
      title: 'Road and Infrastructure Budget',
      description: 'Budget allocation for internal roads, drainage, utilities, and smart infrastructure.',
      amount: 6200000,
      status: 'DRAFT',
    },
  ],
  skipDuplicates: true,
});

await prisma.expense.createMany({
  data: [
    {
      projectId: project.id,
      code: 'EXP-001',
      description: 'Excavator rental for bulk excavation works',
      type: 'EQUIPMENT',
      amount: 18500,
      expenseDate: new Date('2026-01-08'),
      reference: 'EQ-RNT-001',
      paidTo: 'Heavy Equipment Rental PLC',
    },
    {
      projectId: project.id,
      code: 'EXP-002',
      description: 'Labor payment for site preparation crew',
      type: 'LABOR',
      amount: 9200,
      expenseDate: new Date('2026-01-12'),
      reference: 'LAB-JAN-W2',
      paidTo: 'Site Workforce Payroll',
    },
    {
      projectId: project.id,
      code: 'EXP-003',
      description: 'Reinforcement steel delivery transport',
      type: 'MATERIAL',
      amount: 6400,
      expenseDate: new Date('2026-01-14'),
      reference: 'TRN-STL-001',
      paidTo: 'Logistics Transport Service',
    },
  ],
  skipDuplicates: true,
});

await prisma.variation.createMany({
  data: [
    {
      projectId: project.id,
      code: 'VAR-001',
      title: 'Additional Retaining Wall Works',
      description:
        'Additional retaining wall required due to revised geotechnical recommendation.',
      amount: 145000,
      status: 'SUBMITTED',
      submittedAt: new Date('2026-01-18'),
      approvedAt: null,
    },
    {
      projectId: project.id,
      code: 'VAR-002',
      title: 'Temporary Drainage Diversion',
      description:
        'Temporary stormwater drainage diversion required to maintain access road operations.',
      amount: 58000,
      status: 'APPROVED',
      submittedAt: new Date('2026-01-11'),
      approvedAt: new Date('2026-01-15'),
    },
  ],
  skipDuplicates: true,
});

/*
|--------------------------------------------------------------------------
| INVOICES
|--------------------------------------------------------------------------
*/

const invoiceAdvance = await prisma.invoice.create({
  data: {
    projectId: project.id,
    code: 'INV-001',
    title: 'Advance Payment Invoice',
    description:
      'Advance payment invoice for project mobilization and initial works.',
    invoiceDate: new Date('2026-01-05'),
    dueDate: new Date('2026-01-20'),
    subtotal: 500000,
    taxAmount: 75000,
    retentionAmount: 0,
    advanceDeduction: 0,
    totalAmount: 575000,
    status: 'PAID',
  },
});

const invoiceProgress = await prisma.invoice.create({
  data: {
    projectId: project.id,
    code: 'INV-002',
    title: 'Progress Payment Certificate No. 1',
    description:
      'Progress invoice for excavation, mobilization, and site preparation works.',
    invoiceDate: new Date('2026-01-25'),
    dueDate: new Date('2026-02-10'),
    subtotal: 260000,
    taxAmount: 39000,
    retentionAmount: 13000,
    advanceDeduction: 25000,
    totalAmount: 261000,
    status: 'SENT',
  },
});

const invoiceRetention = await prisma.invoice.create({
  data: {
    projectId: project.id,
    code: 'INV-003',
    title: 'Retention Release Invoice',
    description:
      'Partial retention release for completed site preparation package.',
    invoiceDate: new Date('2026-02-15'),
    dueDate: new Date('2026-03-01'),
    subtotal: 75000,
    taxAmount: 11250,
    retentionAmount: 0,
    advanceDeduction: 0,
    totalAmount: 86250,
    status: 'DRAFT',
  },
});

/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
*/

await prisma.payment.createMany({
  data: [
    {
      projectId: project.id,
      invoiceId: invoiceAdvance.id,
      code: 'PAY-001',
      type: 'ADVANCE',
      status: 'COMPLETED',
      amount: 575000,
      paymentDate: new Date('2026-01-12'),
      reference: 'BANK-TRX-ADV-001',
      paidBy: 'Government Infrastructure Agency',
      paidTo: 'BuildPro Construction Group',
      notes: 'Advance payment received for mobilization.',
    },
    {
      projectId: project.id,
      invoiceId: invoiceProgress.id,
      code: 'PAY-002',
      type: 'PROGRESS',
      status: 'PENDING',
      amount: 261000,
      paymentDate: null,
      reference: 'PPC-001',
      paidBy: 'Government Infrastructure Agency',
      paidTo: 'BuildPro Construction Group',
      notes: 'Awaiting client payment approval.',
    },
    {
      projectId: project.id,
      invoiceId: invoiceRetention.id,
      code: 'PAY-003',
      type: 'RETENTION',
      status: 'PENDING',
      amount: 86250,
      paymentDate: null,
      reference: 'RET-REL-001',
      paidBy: 'Government Infrastructure Agency',
      paidTo: 'BuildPro Construction Group',
      notes: 'Retention release pending certification.',
    },
  ],
  skipDuplicates: true,
});


 /*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

await prisma.notification.createMany({
  data: [
    {
      userId: admin.id,
      projectId: project.id,
      type: 'INFO',
      title: 'Welcome to BuildPro IMS',
      message:
        'Enterprise construction mock data has been created successfully.',
      isRead: false,
    },
    {
      userId: admin.id,
      projectId: project.id,
      type: 'APPROVAL',
      title: 'Submittal Review Required',
      message:
        'Concrete Mix Design C30/37 is waiting for technical review.',
      isRead: false,
    },
    {
      userId: planner.id,
      projectId: project.id,
      type: 'DEADLINE',
      title: 'RFI Response Due',
      message:
        'RFI-002 Stormwater Drainage Route Conflict is due for response.',
      isRead: false,
    },
    {
      userId: engineer.id,
      projectId: project.id,
      type: 'WARNING',
      title: 'Open NCR Assigned',
      message:
        'NCR-001 Honeycomb on Retaining Wall Concrete requires corrective action.',
      isRead: false,
    },
    {
      userId: accountant.id,
      projectId: project.id,
      type: 'SUCCESS',
      title: 'Advance Payment Completed',
      message:
        'Advance payment PAY-001 has been completed successfully.',
      isRead: true,
      readAt: new Date(),
    },
  ],
  skipDuplicates: true,
});

/*
|--------------------------------------------------------------------------
| AUDIT LOGS
|--------------------------------------------------------------------------
*/

await prisma.auditLog.createMany({
  data: [
    {
      userId: admin.id,
      projectId: project.id,
      action: 'CREATE',
      module: 'seed',
      entityName: 'DatabaseSeed',
      entityId: 'initial-seed',
      description:
        'Initial enterprise construction mock data inserted for BuildPro IMS.',
      newData: {
        seed: true,
        project: project.code,
        company: company.name,
      },
    },
    {
      userId: admin.id,
      projectId: project.id,
      action: 'CREATE',
      module: 'projects',
      entityName: 'Project',
      entityId: String(project.id),
      description: `Created project ${project.code} - ${project.name}`,
      newData: {
        code: project.code,
        name: project.name,
        status: project.status,
      },
    },
    {
      userId: engineer.id,
      projectId: project.id,
      action: 'CREATE',
      module: 'rfis',
      entityName: 'Rfi',
      entityId: 'RFI-001',
      description:
        'Created RFI for foundation excavation depth clarification.',
    },
    {
      userId: admin.id,
      projectId: project.id,
      action: 'APPROVE',
      module: 'submittals',
      entityName: 'Submittal',
      entityId: 'SUB-002',
      description:
        'Approved reinforcement steel mill certificate submittal with comments.',
    },
    {
      userId: admin.id,
      projectId: project.id,
      action: 'CREATE',
      module: 'quality',
      entityName: 'NcrReport',
      entityId: 'NCR-001',
      description:
        'Created NCR for honeycomb observed on retaining wall concrete.',
    },
    {
      userId: engineer.id,
      projectId: project.id,
      action: 'CREATE',
      module: 'safety',
      entityName: 'SafetyIncident',
      entityId: 'SI-002',
      description:
        'Reported near miss involving reversing dump truck near excavation edge.',
    },
    {
      userId: admin.id,
      projectId: project.id,
      action: 'CREATE',
      module: 'procurement',
      entityName: 'PurchaseOrder',
      entityId: 'PO-001',
      description:
        'Created purchase order for reinforcement steel bars.',
    },
    {
      userId: accountant.id,
      projectId: project.id,
      action: 'CREATE',
      module: 'finance',
      entityName: 'Invoice',
      entityId: 'INV-001',
      description:
        'Created advance payment invoice for mobilization.',
    },
    {
      userId: accountant.id,
      projectId: project.id,
      action: 'UPDATE',
      module: 'finance',
      entityName: 'Payment',
      entityId: 'PAY-001',
      description:
        'Marked advance payment as completed.',
    },
  ],
  skipDuplicates: true,
});
  console.log('✅ Seed completed successfully.');
  console.log('Login email: admin@buildpro.com');
  console.log('Login password: admin123');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });