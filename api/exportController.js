const ExcelJS = require('exceljs');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

exports.descargarReporte = async (req, res) => {
    const { incidencias } = req.body;

    try {
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
            { header: 'ASUNTO (ETAPA)', key: 'asunto', width: 50 },
            { header: 'ATENDIDO', key: 'atendido', width: 20 },
            { header: 'GRUPO / UNIDAD OPERATIVA', key: 'grupo', width: 25 }
            // COLUMNA EVIDENCIA ELIMINADA
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        let numeroIncidencia = 1;

        incidencias.forEach((item) => {
            const paquete = item.paquete || [];
            const idIncidencia = item.id;
            const orden = ['INICIO', 'DESARROLLO', 'FINALIZADO'];
            const paqueteOrdenado = [...paquete].sort((a, b) => orden.indexOf(a.etapa) - orden.indexOf(b.etapa));

            paqueteOrdenado.forEach((inc) => {
                let grupo = inc.atendido || "";
                const atendidoLower = grupo.toLowerCase();
                
                if (atendidoLower.includes('motorizado') || atendidoLower.includes('alfa')) {
                    grupo = 'GRUPO ALFA';
                } else if (atendidoLower.includes('delta') || atendidoLower.includes('grupo de intervenciones rapidas')) {
                    grupo = `DELTA ${inc.zona ? inc.zona.toUpperCase() : ''}`;
                }

                const nuevaFila = worksheet.addRow({
                    nro: numeroIncidencia,
                    id: idIncidencia,
                    operador: inc.operador,
                    turno: inc.turno,
                    zona: inc.zona,
                    hora: inc.fecha ? inc.fecha.split(' ')[1] : '',
                    camara: inc.camara,
                    asunto: `[${inc.etapa}] - ${inc.asunto}`,
                    atendido: inc.atendido,
                    grupo: grupo
                });

                nuevaFila.eachCell((cell, colNumber) => {
                    cell.alignment = { 
                        vertical: 'middle', 
                        horizontal: colNumber === 8 ? 'left' : 'center',
                        wrapText: true 
                    };
                });
            });
            numeroIncidencia++;
        });

        const excelBuffer = await workbook.xlsx.writeBuffer();
        const zip = new AdmZip();
        
        // Agregar Excel al ZIP
        zip.addFile("Reporte_Incidencias.xlsx", Buffer.from(excelBuffer));

        // LAS CARPETAS CON FOTOS SE MANTIENEN INTACTAS
        incidencias.forEach((item) => {
            const paquete = item.paquete || [];
            const idIncidencia = item.id;

            paquete.forEach((inc) => {
                if (inc.foto_video && inc.foto_video !== 'null' && inc.foto_video !== '[]') {
                    try {
                        let fotos = [];
                        if (typeof inc.foto_video === 'string' && inc.foto_video.startsWith('[')) {
                            fotos = JSON.parse(inc.foto_video);
                        } else {
                            fotos = [inc.foto_video];
                        }

                        fotos.forEach((foto, i) => {
                            const nombreArchivo = foto.replace('/uploads/', '');
                            const pathToImage = path.join(__dirname, 'uploads', nombreArchivo);
                            
                            if (fs.existsSync(pathToImage)) {
                                const imageBuffer = fs.readFileSync(pathToImage);
                                const ext = path.extname(nombreArchivo) || '.png';
                                zip.addFile(`Evidencias/${idIncidencia}/${inc.etapa}_foto_${i + 1}${ext}`, imageBuffer);
                            }
                        });
                    } catch (e) {
                        console.log(`Error procesando foto ID ${idIncidencia}:`, e);
                    }
                }
            });
        });

        const zipBuffer = zip.toBuffer();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Incidencias_SISIFO.zip');
        res.setHeader('Content-Length', zipBuffer.length);
        res.send(zipBuffer);

    } catch (err) {
        console.error("Error al exportar:", err);
        res.status(500).send("Error interno");
    }
};