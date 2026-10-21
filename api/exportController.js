const db = require('./db');
const ExcelJS = require('exceljs');
const path = require('path');

const checkData = (val) => {
  if (!val) return 'SIN DATOS';
  const str = String(val).trim();
  if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 'SIN DATOS';
  return str;
};

// Parseo robusto de foto_video -> array de rutas "/uploads/xxx.png"
const parsearRutas = (fotoVideo) => {
  if (!fotoVideo) return [];
  try {
    let cleanStr = String(fotoVideo).replace(/\\"/g, '"');
    if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) cleanStr = cleanStr.slice(1, -1);
    let rutas = [];
    if (cleanStr.startsWith('[')) rutas = JSON.parse(cleanStr);
    else rutas = [cleanStr];
    return Array.isArray(rutas) ? rutas.filter(Boolean) : [];
  } catch (e) {
    console.error('Error parseando foto_video:', e.message);
    return [];
  }
};

const escapeHtml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const extDe = (ruta) => {
  const m = String(ruta).match(/\.(\w{3,4})$/);
  return m ? m[1] : 'png';
};

// ============================================================
// PÁGINA DE GALERÍA LOCAL (ver/descargar por etapa)
// ============================================================
exports.galeria = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT etapa, camara, zona, roper, operador, turno, centro_trabajo, foto_video,
              TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha
       FROM reportes_monitoreo
       WHERE id_incidencia = $1
       ORDER BY id ASC`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('<h2 style="font-family:Arial">Caso no encontrado.</h2>');
    }

    const etapas = ['INICIO', 'DESARROLLO', 'FINALIZADO'];
    const porEtapa = { INICIO: [], DESARROLLO: [], FINALIZADO: [] };
    let meta = null;
    result.rows.forEach((r) => {
      const et = String(r.etapa || '').toUpperCase();
      if (porEtapa[et]) porEtapa[et] = porEtapa[et].concat(parsearRutas(r.foto_video));
      if (!meta) meta = r;
    });

    const colorEtapa = { INICIO: '#007bff', DESARROLLO: '#ffc107', FINALIZADO: '#28a745' };

    const bloqueEtapa = (et) => {
      const fotos = porEtapa[et] || [];
      const color = colorEtapa[et];
      const celdas = fotos.length
        ? fotos.map((ruta, i) => {
            const nombre = `Incidencia_${escapeHtml(id)}_${et}_${i + 1}.${extDe(ruta)}`;
            const href = escapeHtml(ruta);
            return `
              <div class="foto-card">
                <img src="${href}" alt="Evidencia ${et} ${i + 1}" loading="lazy" />
                <div class="foto-meta">Foto ${i + 1}</div>
                <div class="foto-btns">
                  <a class="btn btn-ver" href="${href}" target="_blank" rel="noopener">Ver</a>
                  <a class="btn btn-dl" href="${href}" download="${nombre}">Descargar</a>
                </div>
              </div>`;
          }).join('')
        : `<div class="vacio">Sin evidencia registrada en esta etapa.</div>`;

      return `
        <section class="etapa" id="${et}" style="scroll-margin-top:20px">
          <div class="etapa-head" style="border-left:6px solid ${color}">
            <span class="etapa-dot" style="background:${color}"></span>
            ${et}
            <span class="etapa-count">${fotos.length} foto(s)</span>
          </div>
          <div class="grid">${celdas}</div>
        </section>`;
    };

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evidencias · Caso #${escapeHtml(id)}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; background:#f5f7fa; color:#333; padding:20px; }
  .topbar { background:linear-gradient(135deg,#0056b3,#003d82); color:#fff; padding:18px 24px; border-radius:10px 10px 0 0; }
  .topbar h1 { font-size:20px; letter-spacing:.5px; }
  .topbar .sub { font-size:13px; opacity:.9; margin-top:6px; display:flex; gap:18px; flex-wrap:wrap; }
  .topbar .sub b { color:#ffc107; }
  .wrap { background:#fff; border-radius:0 0 10px 10px; padding:24px; box-shadow:0 4px 18px rgba(0,0,0,.08); }
  .etapa { margin-bottom:28px; }
  .etapa-head { font-weight:800; font-size:15px; padding:8px 14px; background:#f8f9fa; border-radius:6px; display:flex; align-items:center; gap:10px; letter-spacing:1px; }
  .etapa-dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
  .etapa-count { margin-left:auto; font-size:11px; color:#666; font-weight:600; background:#e9ecef; padding:2px 8px; border-radius:10px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; margin-top:14px; }
  .foto-card { border:1px solid #e3e6ea; border-radius:8px; overflow:hidden; background:#fff; display:flex; flex-direction:column; transition:transform .15s, box-shadow .15s; }
  .foto-card:hover { transform:translateY(-3px); box-shadow:0 6px 16px rgba(0,0,0,.12); }
  .foto-card img { width:100%; height:170px; object-fit:cover; background:#000; }
  .foto-meta { font-size:11px; color:#888; padding:6px 10px 0; font-weight:600; }
  .foto-btns { display:flex; gap:8px; padding:10px; }
  .btn { flex:1; text-align:center; padding:8px 0; border-radius:6px; font-size:12px; font-weight:700; text-decoration:none; cursor:pointer; transition:filter .15s; }
  .btn:hover { filter:brightness(.92); }
  .btn-ver { background:#0056b3; color:#fff; }
  .btn-dl { background:#28a745; color:#fff; }
  .vacio { color:#999; font-style:italic; padding:14px; background:#f8f9fa; border-radius:6px; }
  footer { text-align:center; color:#999; font-size:11px; margin-top:18px; }
</style></head>
<body>
  <div class="topbar">
    <h1>📷 INFORME DE EVIDENCIAS · CASO #${escapeHtml(id)}</h1>
    <div class="sub">
      <span>Operador: <b>${escapeHtml(checkData(meta.operador))}</b></span>
      <span>Turno: <b>${escapeHtml(checkData(meta.turno))}</b></span>
      <span>Zona: <b>${escapeHtml(checkData(meta.zona))}</b></span>
      <span>Cámara: <b>${escapeHtml(checkData(meta.camara))}</b></span>
      <span>Roper: <b>${escapeHtml(checkData(meta.roper))}</b></span>
      <span>Fecha: <b>${escapeHtml(checkData(meta.fecha))}</b></span>
    </div>
  </div>
  <div class="wrap">
    ${bloqueEtapa('INICIO')}
    ${bloqueEtapa('DESARROLLO')}
    ${bloqueEtapa('FINALIZADO')}
    <footer>Generado por SISIFO · Central de Monitoreo</footer>
  </div>
</body></html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Error en galeria:', err);
    res.status(500).send('Error al cargar la galería.');
  }
};

// ============================================================
// EXCEL (con CATEGORÍA e INCIDENCIA agregadas)
// ============================================================
exports.descargarReporte = async (req, res) => {
  const { ids, generadoPor } = req.body;

  try {
    if (!ids || ids.length === 0) {
      return res.status(400).send('No se enviaron incidencias.');
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    
    // ✅ NUEVO: Agregamos categoria e incidencia al SELECT
    const query = `
      SELECT id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video,
             operador, centro_trabajo, turno, TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha,
             categoria, incidencia
      FROM reportes_monitoreo
      WHERE id_incidencia IN (${placeholders})
      ORDER BY id_incidencia DESC, id ASC
    `;
    const result = await db.query(query, ids);
    if (result.rows.length === 0) return res.status(404).send('No hay registros.');

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte de Incidencias');

    // ✅ NUEVO: Columnas actualizadas con CATEGORÍA e INCIDENCIA
    sheet.columns = [
      { header: 'ID / CASO', key: 'id_incidencia', width: 12 },
      { header: 'FECHA Y HORA', key: 'fecha', width: 18 },
      { header: 'CENTRO', key: 'centro', width: 15 },
      { header: 'TURNO', key: 'turno', width: 12 },
      { header: 'OPERADOR', key: 'operador', width: 15 },
      { header: 'CÁMARA', key: 'camara', width: 20 },
      { header: 'ZONA / UBICACIÓN', key: 'zona', width: 25 },
      { header: 'CATEGORÍA', key: 'categoria', width: 25 },       // <-- NUEVA
      { header: 'INCIDENCIA', key: 'incidencia', width: 40 },     // <-- NUEVA
      { header: 'GRUPO / ROPER', key: 'roper', width: 20 },
      { header: 'ETAPA', key: 'etapa', width: 16 },
      { header: 'DESCRIPCIÓN / ASUNTO', key: 'asunto', width: 50 },
      { header: 'ATENDIDO POR', key: 'atendido', width: 25 },
      { header: 'GENERADO POR', key: 'generado', width: 20 },
      { header: 'EVIDENCIA (CLIC PARA VER)', key: 'evidencia', width: 30 }
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let currentId = null;
    let startRow = 0;
    
    // ✅ NUEVO: 'K' (ETAPA) y 'L' (ASUNTO) NO se fusionan porque cambian por fila.
    // Las nuevas columnas 'H' (CATEGORÍA) e 'I' (INCIDENCIA) SÍ se fusionan.
    const columnsToMerge = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'M', 'N', 'O'];

    result.rows.forEach((row, index) => {
      const rowIndex = index + 2;
      const etapaTxt = String(row.etapa || '').toUpperCase();

      const newRow = sheet.addRow({
        id_incidencia: row.id_incidencia,
        fecha: row.fecha,
        centro: checkData(row.centro_trabajo),
        turno: checkData(row.turno),
        operador: checkData(row.operador),
        camara: row.camara,
        zona: row.zona,
        categoria: checkData(row.categoria),       // <-- NUEVO
        incidencia: checkData(row.incidencia),     // <-- NUEVO
        roper: checkData(row.roper),
        etapa: row.etapa,
        asunto: row.asunto,
        atendido: checkData(row.atendido),
        generado: checkData(generadoPor)
      });

      newRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      // ✅ AJUSTE: 'L' es ahora la columna de ASUNTO (antes era 'J')
      newRow.getCell('L').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      // ✅ AJUSTE: 'O' es ahora la columna de EVIDENCIA (antes era 'M')
      const celdaO = newRow.getCell('O');
      
      if (etapaTxt === 'INICIO') {
        const tieneFotos = result.rows.some(r => 
          r.id_incidencia === row.id_incidencia && parsearRutas(r.foto_video).length > 0
        );
        
        if (tieneFotos) {
          celdaO.value = {
            text: '📷 VER FOTOS',
            hyperlink: `${baseUrl}/galeria/${row.id_incidencia}`
          };
          celdaO.font = { color: { argb: 'FF0563C1' }, underline: {}, bold: true };
        } else {
          celdaO.value = 'SIN DATOS';
        }
      } else {
        celdaO.value = '—';
      }
      celdaO.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      if (row.id_incidencia !== currentId) {
        if (currentId !== null && rowIndex - 1 > startRow) {
          columnsToMerge.forEach(col => sheet.mergeCells(`${col}${startRow}:${col}${rowIndex - 1}`));
        }
        currentId = row.id_incidencia;
        startRow = rowIndex;
      } else {
        // ✅ AJUSTE: 'M' es ahora la columna de ATENDIDO POR (antes era 'K')
        const at = checkData(row.atendido);
        if (at !== 'SIN DATOS') sheet.getCell(`M${startRow}`).value = at;
      }
    });

    const finalRow = result.rows.length + 1;
    if (currentId !== null && finalRow > startRow) {
      columnsToMerge.forEach(col => sheet.mergeCells(`${col}${startRow}:${col}${finalRow}`));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="SISIFO_Reporte_${Date.now()}.xlsx"`);
    res.send(buffer);

  } catch (err) {
    console.error('Error en descargarReporte:', err);
    res.status(500).send('Error interno al generar el reporte.');
  }
};