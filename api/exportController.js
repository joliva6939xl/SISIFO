const ExcelJS = require('exceljs');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

exports.descargarReporte = async (req, res) => {
    const incidencias = req.body.incidencias; // Recibimos los datos filtrados del frontend
    
    res.attachment('Reporte_Incidencias_SISIFO.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Detalle Incidencias');

    worksheet.columns = [
        { header: 'Nº', key: 'nro', width: 5 },
        { header: 'ID INCIDENCIA', key: 'id', width: 15 },
        { header: 'OPERADOR', key: 'operador', width: 15 },
        { header: 'TURNO', key: 'turno', width: 10 },
        { header: 'ZONA', key: 'zona', width: 10 },
        { header: 'HORA', key: 'hora', width: 10 },
        { header: 'CAMARA', key: 'camara', width: 10 },
        { header: 'ASUNTO', key: 'asunto', width: 40 },
        { header: 'ATENDIDO', key: 'atendido', width: 20 },
        { header: 'GRUPO / UNIDAD OPERATIVA', key: 'grupo', width: 25 },
        { header: 'EVIDENCIA GRAFICA', key: 'evidencia', width: 20 }
    ];

    incidencias.forEach((inc, index) => {
        let grupo = inc.atendido || "";
        const atendidoLower = grupo.toLowerCase();
        
        // Lógica Inteligente
        if (atendidoLower.includes('motorizado') || atendidoLower.includes('alfa')) {
            grupo = 'GRUPO ALFA';
        } else if (atendidoLower.includes('delta') || atendidoLower.includes('grupo de intervenciones rapidas')) {
            grupo = `DELTA ${inc.zona.toUpperCase()}`;
        }

        worksheet.addRow({
            nro: index + 1,
            id: inc.id,
            operador: inc.operador,
            turno: inc.turno,
            zona: inc.zona,
            hora: inc.hora,
            camara: inc.camara,
            asunto: inc.asunto,
            atendido: inc.atendido,
            grupo: grupo,
            evidencia: { text: 'VER EVIDENCIA', hyperlink: `Evidencias/${inc.id}_foto.png` }
        });

        // Agregar imagen al ZIP
        const pathToImage = path.join(__dirname, 'uploads', inc.nombreArchivoImagen); // Asegúrate que esta ruta sea la correcta
        if (fs.existsSync(pathToImage)) {
            archive.file(pathToImage, { name: `Evidencias/${inc.id}_foto.png` });
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    archive.append(buffer, { name: 'Reporte_Incidencias.xlsx' });
    archive.finalize();
};