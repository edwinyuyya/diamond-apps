// Kredit developer di bagian paling bawah website
const NEXORA_PHONE = '08131888116';
const NEXORA_WA = 'https://wa.me/628131888116?text=' + encodeURIComponent('Halo Nexora, saya tertarik dibuatkan website');

export default function NexoraCredit() {
  return (
    <a className="nexora" href={NEXORA_WA} target="_blank" rel="noreferrer" aria-label={`Developed by Nexora, hubungi ${NEXORA_PHONE}`}>
      <small>Developed by</small>
      <svg viewBox="0 0 270 52" height="34" role="img" aria-label="Nexora">
        <rect x="8" y="4" width="38" height="9" rx="3" fill="#d9cdf7" />
        <rect x="4" y="18" width="42" height="9" rx="3" fill="#a98bf0" />
        <rect x="0" y="32" width="46" height="9" rx="3" fill="#7c4dff" />
        <text x="58" y="34" fontFamily="Outfit, Arial, sans-serif" fontWeight="700" fontSize="34" letterSpacing="3" fill="currentColor">NEXORA</text>
        <text x="59" y="48" fontFamily="Outfit, Arial, sans-serif" fontWeight="700" fontSize="7.4" letterSpacing="1.1" fill="currentColor">ENGINEERING THE FUTURE OF BUSINESS</text>
      </svg>
      <span className="nexora-phone">📞 {NEXORA_PHONE}</span>
    </a>
  );
}
