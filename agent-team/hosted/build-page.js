// Menanamkan src/dashboard.html ke modul JS agar halaman dilayani fungsi (bukan berkas statis publik).
import fs from "node:fs";
const html = fs.readFileSync(new URL("../src/dashboard.html", import.meta.url), "utf8");
fs.mkdirSync(new URL("./netlify/lib/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./netlify/lib/page.mjs", import.meta.url), `export default ${JSON.stringify(html)};\n`);
console.log("page.mjs ditulis,", html.length, "karakter");
