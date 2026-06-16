const BASE = process.argv[2] ?? 'https://pc-cafe-manager.vercel.app';

async function main() {
  console.log('Testing', BASE);

  const healthRes = await fetch(`${BASE}/api/health`);
  const health = await healthRes.json();
  console.log('HEALTH', healthRes.status, JSON.stringify(health, null, 2));
  if (!healthRes.ok || !health.sheetsConfigured) {
    process.exit(1);
  }

  const getRes = await fetch(`${BASE}/api/data`);
  const data = await getRes.json();
  console.log('GET status', getRes.status, 'employees', data.employees?.length ?? 0);

  const marker = `vercel-test-${Date.now()}`;
  const next = {
    ...data,
    appSettings: {
      ...data.appSettings,
      store: {
        ...data.appSettings?.store,
        name: marker,
      },
    },
  };
  delete next.syncToken;

  const putRes = await fetch(`${BASE}/api/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  });
  const putBody = await putRes.json();
  console.log('PUT status', putRes.status, putBody);

  const verifyRes = await fetch(`${BASE}/api/data`);
  const verify = await verifyRes.json();
  const savedName = verify.appSettings?.store?.name;
  console.log('VERIFY store.name =', savedName);
  console.log(savedName === marker ? 'SAVE TEST PASSED' : 'SAVE TEST FAILED');
  process.exit(savedName === marker ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
