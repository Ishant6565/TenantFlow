import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding multi-tenant test data...');

  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  // 1. Create Users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@acme.com' },
    update: {},
    create: {
      email: 'alice@acme.com',
      name: 'Alice Johnson',
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@acme.com' },
    update: {},
    create: {
      email: 'bob@acme.com',
      name: 'Bob Miller',
      passwordHash,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@acme.com' },
    update: {},
    create: {
      email: 'charlie@acme.com',
      name: 'Charlie Smith',
      passwordHash,
    },
  });

  const stark = await prisma.user.upsert({
    where: { email: 'tony@stark.com' },
    update: {},
    create: {
      email: 'tony@stark.com',
      name: 'Tony Stark',
      passwordHash,
    },
  });

  // 2. Create Organizations
  const acmeOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const starkOrg = await prisma.organization.upsert({
    where: { slug: 'stark-labs' },
    update: {},
    create: {
      name: 'Stark Labs',
      slug: 'stark-labs',
      plan: 'FREE',
      subscriptionStatus: 'ACTIVE',
    },
  });

  // 3. Create Memberships with RBAC
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: alice.id, organizationId: acmeOrg.id } },
    update: {},
    create: { userId: alice.id, organizationId: acmeOrg.id, role: 'OWNER' },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: bob.id, organizationId: acmeOrg.id } },
    update: {},
    create: { userId: bob.id, organizationId: acmeOrg.id, role: 'ADMIN' },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: charlie.id, organizationId: acmeOrg.id } },
    update: {},
    create: { userId: charlie.id, organizationId: acmeOrg.id, role: 'MEMBER' },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: stark.id, organizationId: starkOrg.id } },
    update: {},
    create: { userId: stark.id, organizationId: starkOrg.id, role: 'OWNER' },
  });

  // 4. Create Sample Projects
  await prisma.tenantProject.deleteMany({});
  await prisma.tenantProject.createMany({
    data: [
      {
        name: 'Project Apollo (Acme Internal)',
        description: 'Next-gen enterprise microservice orchestrator',
        organizationId: acmeOrg.id,
        createdById: alice.id,
      },
      {
        name: 'Billing Gateway v2',
        description: 'PCI-DSS compliant idempotent payment gateway integration',
        organizationId: acmeOrg.id,
        createdById: bob.id,
      },
      {
        name: 'Arc Reactor Core',
        description: 'Clean energy plasma confinement telemetry (Stark Labs)',
        organizationId: starkOrg.id,
        createdById: stark.id,
      },
    ],
  });

  // 5. Create Sample Audit Logs
  await prisma.auditLog.deleteMany({});
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: acmeOrg.id,
        actorId: alice.id,
        actorEmail: alice.email,
        action: 'ORG_CREATED',
        resourceType: 'ORGANIZATION',
        metadata: JSON.stringify({ name: 'Acme Corporation', slug: 'acme-corp' }),
        ipAddress: '192.168.1.10',
      },
      {
        organizationId: acmeOrg.id,
        actorId: alice.id,
        actorEmail: alice.email,
        action: 'MEMBER_INVITED',
        resourceType: 'INVITATION',
        metadata: JSON.stringify({ email: 'bob@acme.com', role: 'ADMIN' }),
        ipAddress: '192.168.1.10',
      },
      {
        organizationId: acmeOrg.id,
        actorId: alice.id,
        actorEmail: alice.email,
        action: 'PLAN_UPGRADED',
        resourceType: 'SUBSCRIPTION',
        metadata: JSON.stringify({ newPlan: 'PRO', amount: 29 }),
        ipAddress: '192.168.1.10',
      },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('Demo Credentials:');
  console.log('  - Alice (Acme Owner): alice@acme.com / Demo1234!');
  console.log('  - Bob (Acme Admin): bob@acme.com / Demo1234!');
  console.log('  - Charlie (Acme Member): charlie@acme.com / Demo1234!');
  console.log('  - Tony (Stark Owner): tony@stark.com / Demo1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
