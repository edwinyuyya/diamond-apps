// Rekening & WhatsApp tujuan. Bisa ditimpa lewat environment variable di Vercel.
export const BANK = {
  name: process.env.BANK_NAME || 'BCA',
  account: process.env.BANK_ACCOUNT || '3270427498',
  holder: process.env.BANK_HOLDER || 'Chandra Intania Magdalena',
};
export const WA = process.env.WA_NUMBER || '6285181820668';
