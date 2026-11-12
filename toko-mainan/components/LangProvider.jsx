'use client';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LANG_COOKIE, t as tr, tHtml } from '../lib/i18n';

// Bahasa aktif (id/en) untuk komponen client. Nilai awal dari cookie, dibaca server di layout.
const Ctx = createContext({ lang: 'id', t: (k, v) => tr('id', k, v), html: (k, v) => ({ __html: tHtml('id', k, v) }), setLang: () => {} });

export function LangProvider({ lang, children }) {
  const router = useRouter();
  const setLang = useCallback((l) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    router.refresh();
  }, [router]);
  const value = useMemo(() => ({ lang, t: (k, v) => tr(lang, k, v), html: (k, v) => ({ __html: tHtml(lang, k, v) }), setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

// Tombol ganti bahasa "ID | EN"
export function LangSwitch({ className = '' }) {
  const { lang, setLang } = useLang();
  return (
    <span className={`lang-switch ${className}`} role="group" aria-label="Language / Bahasa">
      {['id', 'en'].map((l) => (
        <button key={l} type="button" className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => lang !== l && setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}
