// Netlify Scheduled Function: Minggu 08.00 WIB (01.00 UTC) → siapkan draf minggu depan
export default async () => {
  const res = await fetch(`${process.env.URL}/api/cron/weekly`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  console.log('weekly', res.status, await res.text());
};
export const config = { schedule: '0 1 * * 0' };
