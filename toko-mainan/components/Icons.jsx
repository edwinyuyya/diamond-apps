const I = ({ d, size = 22, fill = 'none', sw = 1.8, children, ...r }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...r}>
    {d ? <path d={d} /> : children}
  </svg>
);
export const IcSearch = (p) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></I>;
export const IcHeart = ({ filled, ...p }) => <I {...p} fill={filled ? 'currentColor' : 'none'} d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />;
export const IcCart = (p) => <I {...p}><path d="M2.5 3.5h2.6l2.3 11.2h11l2.1-8H6.2" /><circle cx="9" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></I>;
export const IcLeft = (p) => <I {...p} d="m15 5-7 7 7 7" />;
export const IcRight = (p) => <I {...p} d="m9 5 7 7-7 7" />;
export const IcDown = (p) => <I {...p} d="m6 9 6 6 6-6" />;
export const IcUp = (p) => <I {...p} d="m6 15 6-6 6 6" />;
export const IcMenu = (p) => <I {...p} d="M3 6h18M3 12h18M3 18h18" />;
export const IcClose = (p) => <I {...p} d="M6 6l12 12M18 6 6 18" />;
export const IcPlus = (p) => <I {...p} d="M12 5v14M5 12h14" />;
export const IcMinus = (p) => <I {...p} d="M5 12h14" />;
export const IcTruck = (p) => <I {...p}><path d="M1.5 5.5h12v10h-12zM13.5 9h4.5l3 3.5v3h-7.5" /><circle cx="6" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></I>;
export const IcReturn = (p) => <I {...p} d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />;
export const IcStore = (p) => <I {...p}><path d="M3 9.5 4.5 4h15L21 9.5M3 9.5h18M3 9.5c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5M5 12v8h14v-8" /></I>;
export const IcBox = (p) => <I {...p}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></I>;
export const IcHelp = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8M12 17.2v.1" /></I>;
export const IcCake = (p) => <I {...p}><path d="M4 21h16v-7H4zM4 17c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M8 14v-3M12 14v-3M16 14v-3M8 8v-.5M12 8v-.5M16 8v-.5" /></I>;
export const IcCheck = (p) => <I {...p} d="m5 12.5 4.5 4.5L19 7.5" />;
export const IcIg = (p) => <I {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></I>;
export const IcTiktok = (p) => <I {...p} d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.4 4.4 5 4.6" />;
export const IcWa = (p) => <I {...p}><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1-.4-2.3-1.7-2.7-2.7l.8-1-1-2z" /></I>;
