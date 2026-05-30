const db = require('./db');
const ExcelJS = require('exceljs');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// FUNCIÓN DE SEGURIDAD: Transforma cualquier vacío en "SIN DATOS"
const checkData = (val) => {
  if (!val) return 'SIN DATOS';
  const str = String(val).trim();
  if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 'SIN DATOS';
  return str;
};

exports.descargarReporte = async (req, res) => {
  const { ids, generadoPor } = req.body;
  
  try {
    if (!ids || ids.length === 0) {
      return res.status(400).send('No se enviaron incidencias.');
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    
    // CONSULTA ESTRICTA: Solo las incidencias que el frontend pide
    let query = `
      SELECT id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, 
             operador, centro_trabajo, turno, TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha 
      FROM reportes_monitoreo 
      WHERE id_incidencia IN (${placeholders})
      ORDER BY id_incidencia DESC, id ASC
    `;
    
    const result = await db.query(query, ids);
    
    if (result.rows.length === 0) {
      return res.status(404).send('No hay registros.');
    }

    const zip = new AdmZip();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte de Incidencias');

    sheet.columns = [
      { header: 'ID / CASO', key: 'id_incidencia', width: 12 },
      { header: 'FECHA Y HORA', key: 'fecha', width: 18 },
      { header: 'CENTRO', key: 'centro', width: 15 },
      { header: 'TURNO', key: 'turno', width: 12 },
      { header: 'OPERADOR', key: 'operador', width: 15 },
      { header: 'CÁMARA', key: 'camara', width: 12 },
      { header: 'ZONA / UBICACIÓN', key: 'zona', width: 25 },
      { header: 'GRUPO / ROPER', key: 'roper', width: 20 },
      { header: 'ETAPA', key: 'etapa', width: 15 },
      { header: 'DESCRIPCIÓN / ASUNTO', key: 'asunto', width: 50 },
      { header: 'ATENDIDO POR', key: 'atendido', width: 20 },
      { header: 'GENERADO POR', key: 'generado', width: 20 }
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } }; 
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let currentId = null;
    let startRow = 0;
    const columnsToMerge = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'L']; 

    result.rows.forEach((row, index) => {
      const rowIndex = index + 2; 
      
      // APLICAMOS EL FILTRO "SIN DATOS" A TODAS LAS COLUMNAS CLAVE
      const roperFormat = checkData(row.roper);
      const atendidoFormat = checkData(row.atendido);
      const centroFormat = checkData(row.centro_trabajo);
      const turnoFormat = checkData(row.turno);
      const operadorFormat = checkData(row.operador);

      const newRow = sheet.addRow({
        id_incidencia: row.id_incidencia,
        fecha: row.fecha,
        centro: centroFormat,
        turno: turnoFormat,
        operador: operadorFormat,
        camara: row.camara,
        zona: row.zona,
        roper: roperFormat,
        etapa: row.etapa,
        asunto: row.asunto,
        atendido: atendidoFormat,
        generado: checkData(generadoPor)
      });

      newRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      newRow.getCell('J').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      if (row.id_incidencia !== currentId) {
        if (currentId !== null && rowIndex - 1 > startRow) {
          columnsToMerge.forEach(col => {
            sheet.mergeCells(`${col}${startRow}:${col}${rowIndex - 1}`);
          });
        }
        currentId = row.id_incidencia;
        startRow = rowIndex;
      } else {
         if(atendidoFormat !== 'SIN DATOS') {
            sheet.getCell(`K${startRow}`).value = atendidoFormat;
         }
      }
      
      if (row.foto_video) {
        let rutas = [];
        try {
          let cleanStr = row.foto_video;
          if (typeof cleanStr === 'string') {
              cleanStr = cleanStr.replace(/\\"/g, '"');
              if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) { cleanStr = cleanStr.slice(1, -1); }
              if (cleanStr.startsWith('[')) { rutas = JSON.parse(cleanStr); } else { rutas = [cleanStr]; }
          } else { rutas = cleanStr; }

          const folderName = `Incidencia_${row.id_incidencia}`;
          if (Array.isArray(rutas)) {
              rutas.forEach((rutaStr) => {
                const fileName = path.basename(rutaStr); 
                const physicalPath = path.join(__dirname, 'uploads', fileName); 
                if (fs.existsSync(physicalPath)) { zip.addLocalFile(physicalPath, folderName); }
              });
          }
        } catch (e) { console.error(`Error fotos ID ${row.id_incidencia}:`, e.message); }
      }
    });

    const finalRow = result.rows.length + 1;
    if (currentId !== null && finalRow > startRow) {
      columnsToMerge.forEach(col => { sheet.mergeCells(`${col}${startRow}:${col}${finalRow}`); });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    zip.addFile(`Reporte_Consolidado_${Date.now()}.xlsx`, buffer);
    const zipBuffer = zip.toBuffer();
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="SISIFO_Export_${Date.now()}.zip"`);
    res.send(zipBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error.');
  }
};