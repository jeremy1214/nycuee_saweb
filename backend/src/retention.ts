import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Policy must be explicitly supplied by the data owner; there is no automatic deletion schedule.
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Use retention [--apply]. Default is inventory only.');
const days = (name: string) => {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < 30) throw new Error(`Set ${name} to an approved retention period of at least 30 days.`);
  return value;
};
const contactDays = days('CONTACT_RETENTION_DAYS');
const auditDays = days('AUDIT_RETENTION_DAYS');
const cutoff = (value: number) => new Date(Date.now() - value * 86400000);
const db = new PrismaClient();
async function main() {
  const apply = args.includes('--apply');
  const result = await db.$transaction(async tx => {
    const contactWhere = { createdAt: { lt: cutoff(contactDays) }, readAt: { not: null } };
    const auditWhere = { createdAt: { lt: cutoff(auditDays) } };
    const contacts = await tx.contactMessage.count({ where: contactWhere });
    const audits = await tx.auditEntry.count({ where: auditWhere });
    if (apply) {
      await tx.contactMessage.deleteMany({ where: contactWhere });
      await tx.auditEntry.deleteMany({ where: auditWhere });
      await tx.auditEntry.create({ data: { action: 'operations.retention', entityType: 'Retention', entityId: 'policy', details: { contacts, audits, contactDays, auditDays } } });
    }
    return { apply, contacts, audits, unreadPreserved: true };
  }, { isolationLevel: 'Serializable' });
  console.log(JSON.stringify(result));
}
main().catch(() => { console.error('Retention operation failed; inspect policy and database access privately.'); process.exitCode = 1; }).finally(() => db.$disconnect());
