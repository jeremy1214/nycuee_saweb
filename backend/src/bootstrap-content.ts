import 'dotenv/config';
import { importSiteLegacy } from './site-legacy';
import { PrismaClient } from '@prisma/client';
import { importLegacyContent, readLegacyContent } from './legacy-import';
import { importOrganizations } from './import-organization';
import { readOrganizationLegacy } from './organization-legacy';

async function main() {
  const db = new PrismaClient();
  try {
    console.log('Initializing missing site content:', await importSiteLegacy(db, false, true));
    const [activities, categories, overviews, departments, teams] = await Promise.all([
      db.activity.count(), db.activityCategory.count(), db.eesaOverview.count(),
      db.department.count(), db.team.count(),
    ]);

    if (activities === 0 && categories === 0) {
      const dataset = readLegacyContent(process.env.LEGACY_CONTENT_DIR ?? '../frontend/src/content/activities');
      console.log('Importing initial activity content:', await importLegacyContent(db, dataset));
    }
    if (overviews === 0 && departments === 0 && teams === 0) {
      console.log('Importing initial organization content:', await importOrganizations(db, readOrganizationLegacy()));
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error('Initial content import failed:', error);
  process.exitCode = 1;
});
