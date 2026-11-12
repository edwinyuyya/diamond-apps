import { CANONICAL } from '../lib/site-url';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/keranjang', '/checkout', '/pembayaran/', '/pesanan'] }],
    sitemap: `${CANONICAL}/sitemap.xml`,
    host: CANONICAL,
  };
}
