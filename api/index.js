const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/api/usuarios', async (req, res) => {
  const { nombre, apellido, dni } = req.body;
  if (!nombre || !apellido || !dni) return res.status(400).send('Todos los campos son obligatorios.');
  
  const inicialNombre = nombre.charAt(0).toLowerCase();
  const apellidoMinuscula = apellido.toLowerCase().replace(/\s/g, '');
  const usuarioGenerado = inicialNombre + apellidoMinuscula;

  try {
    const result = await db.query(
      'INSERT INTO usuarios (nombre, apellido, usuario, dni) VALUES ($1, $2, $3, $4) RETURNING usuario',
      [nombre, apellido, usuarioGenerado, dni]
    );
    res.json({ success: true, usuario: result.rows[0].usuario });
  } catch (err) {
    if (err.code === '23505') { 
      res.status(400).send('Este operador ya se encuentra registrado.');
    } else {
      res.status(500).send('Error en el servidor al registrar.');
    }
  }
});

// =======================================================
// ACTUALIZADO: LOGIN AHORA DEVUELVE EL CARGO (ROL)
// =======================================================
app.post('/api/login', async (req, res) => {
  const { usuario, dni } = req.body;
  try {
    // Agregamos "cargo" en el SELECT
    const result = await db.query('SELECT usuario, cargo FROM usuarios WHERE usuario = $1 AND dni = $2', [usuario, dni]);
    
    if (result.rows.length > 0) {
      // Devolvemos el usuario y su cargo correspondiente
      res.json({ 
        success: true, 
        usuario: result.rows[0].usuario,
        cargo: result.rows[0].cargo 
      });
    } else {
      res.status(401).send('Acceso denegado. Usuario o DNI incorrectos.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en el servidor al autenticar.');
  }
});

// =======================================================
// NUEVA RUTA: TRAER LISTA DE USUARIOS (Para el Analista)
// =======================================================
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await db.query('SELECT id, nombre, apellido, usuario, cargo FROM usuarios ORDER BY cargo ASC, nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener la lista de usuarios.');
  }
});

// --- RUTA POST: GUARDAR REPORTE ---
app.post('/api/reportes', upload.array('archivos', 10), async (req, res) => {
  const { id_incidencia, etapa, camara, zona, roper, asunto, atendido, operador, centro_trabajo, turno } = req.body;
  const rutas_archivos = req.files && req.files.length > 0 ? JSON.stringify(req.files.map(file => `/uploads/${file.filename}`)) : null;

  try {
    const result = await db.query(
      'INSERT INTO reportes_monitoreo (id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, operador, centro_trabajo, turno) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [id_incidencia, etapa, camara, zona, roper, asunto, atendido, rutas_archivos, operador, centro_trabajo, turno]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al guardar reporte.');
  }
});

// =======================================================
// NUEVA RUTA GLOBAL: TRAE TODOS LOS REPORTES DE TODOS (Para el Analista)
// =======================================================
app.get('/api/reportes_globales', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, turno, operador, centro_trabajo,
       TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha 
       FROM reportes_monitoreo 
       ORDER BY creado_el DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al leer el almacén global.');
  }
});

// --- RUTA GET: TRAE SOLO LOS REPORTES DE UN OPERADOR (Se mantiene para consistencia) ---
app.get('/api/reportes/:operador', async (req, res) => {
  const { operador } = req.params;
  try {
    const result = await db.query(
      `SELECT id, id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, turno, TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha FROM reportes_monitoreo WHERE operador = $1 ORDER BY creado_el DESC`,
      [operador]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al leer almacén del operador.');
  }
});

const PORT = 3000;
app.listen(PORT, () => { console.log(`Servidor SISIFO corriendo en el puerto ${PORT}`); });