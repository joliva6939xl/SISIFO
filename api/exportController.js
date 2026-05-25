const db = require('./db');
const ExcelJS = require('exceljs');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

exports.descargarReporte = async (req, res) => {
  const { operador, fechaInicio, fechaFin } = req.body;
  try {
    let query = `SELECT id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, operador, centro_trabajo, turno, TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha FROM reportes_monitoreo WHERE 1=1`;
    const params = [];
    
    if (operador) {
      params.push(operador);
      query += ` AND operador = $${params.length}`;
    }
    if (fechaInicio && fechaFin) {
      params.push(fechaInicio, fechaFin);
      query += ` AND DATE(creado_el) BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    
    query += ` ORDER BY id_incidencia DESC, id ASC`;
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).send('No se encontraron registros para los filtros aplicados.');
    }

    const zip = new AdmZip();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte de Incidencias');

    // Estilos Institucionales
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
      { header: 'ATENDIDO POR', key: 'atendido', width: 20 }
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } }; 
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let currentId = null;
    let startRow = 0;
    
    const columnsToMerge = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K']; 

    result.rows.forEach((row, index) => {
      const rowIndex = index + 2; 
      
      const roperFormat = (row.roper && row.roper.trim() !== '') ? row.roper : 'SIN DATOS';
      const atendidoFormat = (row.atendido && row.atendido.trim() !== '') ? row.atendido : 'N/A';

      const newRow = sheet.addRow({
        id_incidencia: row.id_incidencia,
        fecha: row.fecha,
        centro: row.centro_trabajo,
        turno: row.turno,
        operador: row.operador,
        camara: row.camara,
        zona: row.zona,
        roper: roperFormat,
        etapa: row.etapa,
        asunto: row.asunto,
        atendido: atendidoFormat
      });

      newRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      newRow.getCell('J').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      // LÓGICA DE COMBINACIÓN (MERGE)
      if (row.id_incidencia !== currentId) {
        if (currentId !== null && rowIndex - 1 > startRow) {
          columnsToMerge.forEach(col => {
            sheet.mergeCells(`${col}${startRow}:${col}${rowIndex - 1}`);
          });
        }
        currentId = row.id_incidencia;
        startRow = rowIndex;
      } else {
         if(atendidoFormat !== 'N/A') {
            sheet.getCell(`K${startRow}`).value = atendidoFormat;
         }
      }
      
      // EXTRACCIÓN CORRECTA DE FOTOS PARA EL ZIP
      if (row.foto_video) {
        let rutas = [];
        try {
          let cleanStr = row.foto_video;
          if (typeof cleanStr === 'string') {
              cleanStr = cleanStr.replace(/\\"/g, '"');
              if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
                 cleanStr = cleanStr.slice(1, -1);
              }
              if (cleanStr.startsWith('[')) {
                  rutas = JSON.parse(cleanStr);
              } else {
                  rutas = [cleanStr];
              }
          } else {
             rutas = cleanStr; 
          }

          const folderName = `Incidencia_${row.id_incidencia}`;
          if (Array.isArray(rutas)) {
              rutas.forEach((rutaStr) => {
                // Aquí está la solución: extraemos solo el nombre (ej: captura.png) y lo pegamos a api/uploads/
                const fileName = path.basename(rutaStr); 
                const physicalPath = path.join(__dirname, 'uploads', fileName); 
                
                if (fs.existsSync(physicalPath)) {
                  zip.addLocalFile(physicalPath, folderName);
                }
              });
          }
        } catch (e) {
            console.error(`Omitiendo fotos para ID ${row.id_incidencia}:`, e.message);
        }
      }
    });

    const finalRow = result.rows.length + 1;
    if (currentId !== null && finalRow > startRow) {
      columnsToMerge.forEach(col => {
        sheet.mergeCells(`${col}${startRow}:${col}${finalRow}`);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    zip.addFile(`Reporte_Consolidado_${Date.now()}.xlsx`, buffer);
    
    const zipBuffer = zip.toBuffer();
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="SISIFO_Export_${Date.now()}.zip"`);
    res.send(zipBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al generar el empaquetado.');
  }
};