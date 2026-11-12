// Bahasa pengunjung di sisi server (dari cookie `lang`)
import 'server-only';
import { cookies } from 'next/headers';
import { LANG_COOKIE, normLang } from './i18n';

export const getLang = () => normLang(cookies().get(LANG_COOKIE)?.value);
