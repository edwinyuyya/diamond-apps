// Netlify Scheduled Function: tiap jam menit ke-2 → posting draf yang disetujui & sudah waktunya
export default async () => {
  const res = await fetch(`${process.env.URL}/api/cron/publish`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  console.log('publish', res.status, await res.text());
};
export const config = { schedule: '2 * * * *' };
