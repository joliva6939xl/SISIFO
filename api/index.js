const axios = require('axios');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const app = express();
const exportController = require('./exportController');

app.use(cors());
app.use(express.json());
// --- SISTEMA DE SEGURIDAD (KILL SWITCH) ---
const verificarLicencia = async () => {
    // DESACTIVADO TEMPORALMENTE PARA PRUEBAS Y EMPAQUETADO
    return true; 
    
    /* CÓDIGO ORIGINAL (Comentado por ahora)
    try {
        const urlRaw = "AQUI_IBA_TU_URL_RAW";
        // Aumenté el timeout a 8000 (8 segundos) por si es problema de red lenta
        const response = await axios.get(urlRaw, { timeout: 8000 });
        return response.data.activo;
    } catch (error) {
        console.error("No se pudo conectar a GitHub, bloqueando por seguridad.");
        return false;
    }
    */
};

// protege al loggin
app.use(async (req, res, next) => {
    // Solo verificamos si intentan loguearse
    if (req.path === '/api/login') {
        const activo = await verificarLicencia();
        if (!activo) {
            return res.status(403).json({ error: "SISTEMA BLOQUEADO. Contacte al desarrollador." });
        }
    }
    next();
});
// ------------------------------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CREAR USUARIO
app.post('/api/usuarios', async (req, res) => {
  const { nombre, apellido, dni, cargo } = req.body;
  if (!nombre || !apellido || !dni) return res.status(400).send('Todos los campos son obligatorios.');
  const inicialNombre = nombre.charAt(0).toLowerCase();
  const apellidoMinuscula = apellido.toLowerCase().replace(/\s/g, '');
  const usuarioGenerado = inicialNombre + apellidoMinuscula;
  const rolDefinitivo = cargo || 'OPERADOR';

  try {
    const result = await db.query(
      'INSERT INTO usuarios (nombre, apellido, usuario, dni, cargo, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING usuario',
      [nombre, apellido, usuarioGenerado, dni, rolDefinitivo, 'ACTIVO']
    );
    res.json({ success: true, usuario: result.rows[0].usuario });
  } catch (err) {
    if (err.code === '23505') res.status(400).send('Este operador ya se encuentra registrado.');
    else res.status(500).send('Error en el servidor al registrar.');
  }
});

// LOGIN (ACTUALIZADO CON BLOQUEO)
app.post('/api/login', async (req, res) => {
  const { usuario, dni } = req.body;
  try {
    const result = await db.query('SELECT usuario, cargo, estado, motivo_estado FROM usuarios WHERE usuario = $1 AND dni = $2', [usuario, dni]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Verificamos si está bloqueado
      if (user.estado === 'BLOQUEADO') {
        return res.status(403).send(`ACCESO DENEGADO (BLOQUEADO). Motivo: ${user.motivo_estado}`);
      }

      res.json({ success: true, usuario: user.usuario, cargo: user.cargo });
    } else {
      res.status(401).send('Acceso denegado. Usuario o DNI incorrectos.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en el servidor al autenticar.');
  }
});

// CORRIGE ESTA RUTA EN TU API/INDEX.JS
app.get('/api/usuarios', async (req, res) => {
  try {
    // AGREGAMOS 'estado' y 'motivo_estado' A LA CONSULTA
    const result = await db.query('SELECT id, nombre, apellido, usuario, cargo, estado, motivo_estado FROM usuarios ORDER BY cargo ASC, nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener la lista de usuarios.');
  }
});

// BLOQUEAR / DESBLOQUEAR USUARIO
app.put('/api/usuarios/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado, motivo } = req.body;
  try {
    await db.query('UPDATE usuarios SET estado = $1, motivo_estado = $2 WHERE id = $3', [estado, motivo, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar estado.');
  }
});

// ELIMINAR USUARIO
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar usuario.');
  }
});

// GUARDAR REPORTE
app.post('/api/reportes', upload.array('archivos', 10), async (req, res) => {
  const { id_incidencia, etapa, camara, zona, roper, asunto, atendido, operador, centro_trabajo, turno } = req.body;
  const rutas_archivos = req.files && req.files.length > 0 ? JSON.stringify(req.files.map(file => `/uploads/${file.filename}`)) : null;
  try {
    const result = await db.query(
      'INSERT INTO reportes_monitoreo (id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, operador, centro_trabajo, turno) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [id_incidencia, etapa, camara, zona, roper, asunto, atendido, rutas_archivos, operador, centro_trabajo, turno]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send('Error al guardar reporte.'); }
});

// REPORTES GLOBALES
app.get('/api/reportes_globales', async (req, res) => {
  try {
    const result = await db.query(`SELECT id, id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, turno, operador, centro_trabajo, TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha FROM reportes_monitoreo ORDER BY creado_el DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).send('Error al leer el almacén global.'); }
});

// REPORTES POR OPERADOR
app.get('/api/reportes/:operador', async (req, res) => {
  const { operador } = req.params;
  try {
    const result = await db.query(`SELECT id, id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, turno, TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha FROM reportes_monitoreo WHERE operador = $1 ORDER BY creado_el DESC`, [operador]);
    res.json(result.rows);
  } catch (err) { res.status(500).send('Error al leer almacén del operador.'); }
});

app.post('/api/exportar', exportController.descargarReporte);

const PORT = 3000;
app.listen(PORT, () => { console.log(`Servidor SISIFO corriendo en el puerto ${PORT}`); });