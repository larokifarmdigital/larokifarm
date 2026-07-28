import { getAccessToken, downloadSharedFile } from './graph.js';
import { parseInventoryXlsx } from './excel.js';
import { enrichRows, type InventoryItem, type NotFound } from './enrich.js';
import { putKv } from './kv.js';

const KV_KEY = 'inventory:current';

interface SnapshotMeta {
  updatedAt: string;
  itemsCount: number;
  notFoundCount: number;
  skippedMuerto: number;
  skippedInvalidCn: number;
  totalDataRows: number;
  durationMs: number;
}

interface Snapshot {
  meta: SnapshotMeta;
  items: InventoryItem[];
  notFound: NotFound[];
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const t0 = Date.now();

  console.log('[1/4] Getting Azure access token…');
  const token = await getAccessToken({
    tenantId: requireEnv('AZURE_TENANT_ID'),
    clientId: requireEnv('AZURE_CLIENT_ID'),
    clientSecret: requireEnv('AZURE_CLIENT_SECRET'),
  });

  console.log('[2/4] Downloading Excel from SharePoint…');
  const buf = await downloadSharedFile(requireEnv('SHAREPOINT_SHARE_URL'), token);
  console.log(`      → ${(buf.byteLength / 1024 / 1024).toFixed(2)} MB`);

  console.log('[3/4] Parsing Excel…');
  const parsed = parseInventoryXlsx(buf);
  console.log(
    `      → totalRows=${parsed.totalDataRows} muerto=${parsed.skippedMuerto} invalidCn=${parsed.skippedInvalidCn} candidates=${parsed.rows.length}`,
  );

  if (dryRun) {
    console.log('\n=== DRY RUN — sample of first 5 candidates ===');
    console.log(
      JSON.stringify(
        parsed.rows.slice(0, 5).map((r) => ({
          cn: r.cn,
          descripcion: r.descripcion,
          clasificacion: r.clasificacion,
          stockLaroki: r.stockLaroki,
          stockFarmaciasConso: r.stockFarmaciasConso,
        })),
        null,
        2,
      ),
    );
    console.log(`\nDone in ${Date.now() - t0}ms. No CIMA calls, no KV write.`);
    return;
  }

  console.log(`[4/4] Enriching ${parsed.rows.length} rows against CIMA…`);
  const enriched = await enrichRows(parsed.rows, (done, total) => {
    if (done % 500 === 0 || done === total) {
      console.log(`      → ${done}/${total} (${((done / total) * 100).toFixed(1)}%)`);
    }
  });

  const snapshot: Snapshot = {
    meta: {
      updatedAt: new Date().toISOString(),
      itemsCount: enriched.items.length,
      notFoundCount: enriched.notFound.length,
      skippedMuerto: parsed.skippedMuerto,
      skippedInvalidCn: parsed.skippedInvalidCn,
      totalDataRows: parsed.totalDataRows,
      durationMs: Date.now() - t0,
    },
    items: enriched.items,
    notFound: enriched.notFound,
  };

  console.log('[5/5] Writing snapshot to Cloudflare KV…');
  await putKv(
    {
      accountId: requireEnv('CF_ACCOUNT_ID'),
      namespaceId: requireEnv('CF_KV_NAMESPACE_ID'),
      apiToken: requireEnv('CF_API_TOKEN'),
    },
    KV_KEY,
    JSON.stringify(snapshot),
  );

  console.log(
    `\n✅ Sync ok in ${snapshot.meta.durationMs}ms: items=${snapshot.meta.itemsCount} notFound=${snapshot.meta.notFoundCount}`,
  );
}

main().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
