// Ejecuta un adaptador con los 30 productos de la prueba y guarda resultados/<web>.json.
// Uso: node ejecutar.mjs <web>   (ej. node ejecutar.mjs farmaciabarata)
import fs from 'node:fs';

const web = process.argv[2];
if (!web) throw new Error('Indica la web: node ejecutar.mjs <web>');

const m = await import(new URL(`./sites/${web}.mjs`, import.meta.url));
const productos = JSON.parse(fs.readFileSync(new URL('./productos.json', import.meta.url), 'utf8'));
const out = [];
for (const p of productos) {
  const r = await m.buscar(p);
  out.push({ cn: p.cn, nombre: p.nombre, tipo: p.tipo, ...r });
  console.log(p.cn, r.estado, r.precio ?? '-', '|', r.nombreFicha ?? '', '|', r.nota ?? '');
}
fs.writeFileSync(new URL(`./resultados/${web}.json`, import.meta.url), JSON.stringify(out, null, 1));
const c = {};
for (const r of out) c[r.estado] = (c[r.estado] ?? 0) + 1;
console.log(c);
