const axios = require('axios');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const exportController = require('./exportController');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

app.use(cors());
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// --- SISTEMA DE SEGURIDAD (KILL SWITCH) ---
const verificarLicencia = async () => {
  // DESACTIVADO TEMPORALMENTE PARA PRUEBAS Y EMPAQUETADO
  return true;
};

// protege al loggin
app.use(async (req, res, next) => {
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

// LOGIN
app.post('/api/login', async (req, res) => {
  const { usuario, dni } = req.body;
  try {
    const result = await db.query('SELECT usuario, cargo, estado, motivo_estado FROM usuarios WHERE usuario = $1 AND dni = $2', [usuario, dni]);
    if (result.rows.length > 0) {
      const user = result.rows[0];

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

// --- RUTA DE BORRADO DE MENSAJES (Soporta Auditoría) ---
app.delete('/api/mensajes/:id', async (req, res) => {
  const { id } = req.params;
  const { usuario, es_privado } = req.body; // Usuario que borra y tipo de sala
  
  try {
    if (es_privado) {
      // Borrado silencioso para privado
      await db.query("DELETE FROM chats_mensajes WHERE id_mensaje = $1", [id]);
    } else {
      // Auditoría: El mensaje no se borra, se marca como eliminado y se actualiza el contenido
      await db.query(
        "UPDATE chats_mensajes SET contenido = $1, eliminado_por = $2 WHERE id_mensaje = $3",
        [`MENSAJE BORRADO POR: ${usuario}`, usuario, id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// OBTENER USUARIOS
app.get('/api/usuarios', async (req, res) => {
  try {
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


// ==========================================
// RUTAS PARA GESTIÓN DE SALAS DE CHAT
// ==========================================
app.post('/api/salas', async (req, res) => {
  const { nombre_sala, creado_por, tipo } = req.body;
  if (!nombre_sala || !creado_por) return res.status(400).send('Faltan datos de la sala.');
  const tipoSala = tipo || 'GLOBAL';
  
  try {
    // 1. Verificamos primero si la sala ya existe (Elimina el uso de ON CONFLICT)
    const salaExistente = await db.query(
      "SELECT * FROM chats_salas WHERE nombre_sala = $1", 
      [nombre_sala.toUpperCase()]
    );

    if (salaExistente.rows.length > 0) {
      // Si existe, devolvemos la sala existente y no insertamos nada
      return res.json({ success: true, sala: salaExistente.rows[0] });
    }

    // 2. Si no existe, creamos la sala nueva
    const result = await db.query(
      "INSERT INTO chats_salas (nombre_sala, tipo, creado_por) VALUES ($1, $2, $3) RETURNING *",
      [nombre_sala.toUpperCase(), tipoSala, creado_por]
    );
    res.json({ success: true, sala: result.rows[0] });

  } catch (err) {
    console.error("Error al crear sala:", err);
    res.status(500).send('Error interno al crear sala.');
  }
});

app.get('/api/salas', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM chats_salas ORDER BY id_sala ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener salas:", err);
    res.status(500).send('Error al obtener las salas.');
  }
});

app.put('/api/salas/:id', async (req, res) => {
  const { nombre_sala } = req.body;
  try {
    await db.query("UPDATE chats_salas SET nombre_sala = $1 WHERE id_sala = $2", [nombre_sala.toUpperCase(), req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error al editar sala:", err);
    res.status(500).send(err.message);
  }
});

app.post('/api/salas/vincular', async (req, res) => {
  const { usuario, id_sala } = req.body;
  try {
    res.json({ success: true, mensaje: `Usuario ${usuario} vinculado a la sala ${id_sala}` });
  } catch (err) {
    console.error("Error al vincular:", err);
    res.status(500).send('Error al vincular usuario a la sala.');
  }
});

app.delete('/api/salas/:id', async (req, res) => {
  const idSala = req.params.id;
  try {
    try {
      await db.query("DELETE FROM chats_mensajes WHERE id_sala = $1", [idSala]);
    } catch (errorIgnorado) {
      console.log(`[Auditoría] Limpieza de mensajes omitida para sala ${idSala}.`);
    }
    await db.query("DELETE FROM chats_salas WHERE id_sala = $1", [idSala]);
    res.json({ success: true });
  } catch (err) {
    console.error("ERROR GRAVE AL BORRAR SALA:", err.message);
    res.status(500).send('Error interno en la BD.');
  }
});

// OBTENER HISTORIAL DE UNA SALA (Persistencia)
app.get('/api/salas/:id_sala/mensajes', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM chats_mensajes WHERE id_sala = $1 ORDER BY id_mensaje ASC",
      [req.params.id_sala]
    );
    res.json(result.rows);
  } catch (err) {
    console.log("No se pudo obtener el historial. Es posible que la tabla de mensajes aún no exista.");
    res.json([]);
  }
});

// ==========================================
// INICIALIZACIÓN DEL SERVIDOR + WEBSOCKETS
// ==========================================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // Permite transmitir base64 grandes en el websocket
});

require('./sockets')(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SISTEMA SISIFO] Servidor Centralizado corriendo en el puerto ${PORT}`);
  console.log(`[SISTEMA SISIFO] Motor de WebSockets (Chat) ACTIVADO`);
});