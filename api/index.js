const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    // Agregamos un random extra por si suben 5 fotos en el mismo segundo exacto
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. RUTA POST ACTUALIZADA: AHORA RECIBE UN ARREGLO DE 'archivos' (HASTA 10 FOTOS POR ETAPA)
app.post('/api/reportes', upload.array('archivos', 10), async (req, res) => {
  const { id_incidencia, etapa, camara, zona, asunto, atendido, operador, centro_trabajo } = req.body;
  
  // Convertimos las rutas de los archivos en un formato JSON para guardarlo en la columna TEXT
  const rutas_archivos = req.files && req.files.length > 0 
    ? JSON.stringify(req.files.map(file => `/uploads/${file.filename}`)) 
    : null;

  try {
    const result = await db.query(
      'INSERT INTO reportes_monitoreo (id_incidencia, etapa, camara, zona, asunto, atendido, foto_video, operador, centro_trabajo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [id_incidencia, etapa, camara, zona, asunto, atendido, rutas_archivos, operador, centro_trabajo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en el servidor al guardar');
  }
});

app.get('/api/reportes/:operador', async (req, res) => {
  const { operador } = req.params;
  try {
    const result = await db.query(
      `SELECT id, id_incidencia, etapa, camara, zona, asunto, atendido, foto_video, 
       TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha, creado_el 
       FROM reportes_monitoreo 
       WHERE operador = $1 
       ORDER BY creado_el DESC`,
      [operador]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en el servidor al leer');
  }
});

const PORT = 3000;
db.query('SELECT NOW()', (err, res) => {
  if (!err) console.log('✅ Conexión a PostgreSQL exitosa. Hora:', res.rows[0].now);
});

app.listen(PORT, () => {
  console.log(`Servidor SISIFO corriendo en el puerto ${PORT}`);
});