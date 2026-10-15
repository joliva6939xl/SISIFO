const db = require('./db');

// Mapa de reparación: carácter corrupto -> carácter correcto
const MAPA = {
  '\u201A': 'é',
  '\u00A2': 'ó',
  '\u00A4': 'ñ',
  '\u00A1': 'í',
  '\u00A3': 'ú',
  '\u00A0': 'á',
  '\u00B5': 'Á',
  '\u00D6': 'Í',
  '\u00E0': 'Ó',
  '\u0161': 'Ü',
  '\u00B1': 'Ñ',
  '\u0082': 'É'
};

const reparar = (s) => (s ? s.split('').map((ch) => MAPA[ch] || ch).join('') : s);

(async () => {
  try {
    const res = await db.query('SELECT id, nombre, categoria, grupo FROM personal_campo');
    let cambios = 0;
    for (const r of res.rows) {
      const n = reparar(r.nombre);
      const c = reparar(r.categoria);
      const g = reparar(r.grupo);
      if (n !== r.nombre || c !== r.categoria || g !== r.grupo) {
        await db.query('UPDATE personal_campo SET nombre=$1, categoria=$2, grupo=$3 WHERE id=$4', [n, c, g, r.id]);
        console.log(`FIX id=${r.id}: "${r.nombre}" -> "${n}"`);
        cambios++;
      }
    }
    console.log(`LISTO. ${cambios} registros reparados.`);
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();