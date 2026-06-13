const axios = require('axios');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const exportController = require('./exportController');
const http = require('http');
const { Server } = require('socket.io');
// NUEVAS LIBRERÍAS DE SEGURIDAD
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1500mb' }));
app.use(express.urlencoded({ limit: '1500mb', extended: true }));

const verificarLicencia = async () => { return true; };

app.use(async (req, res, next) => {
  if (req.path === '/api/login') {
    const activo = await verificarLicencia();
    if (!activo) return res.status(403).json({ error: "SISTEMA BLOQUEADO." });
  }
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CREAR USUARIO (CALL CENTER)
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

// NUEVO: GENERAR QR PARA USUARIO (CONFIGURACIÓN INICIAL)
app.post('/api/otp/setup', async (req, res) => {
  const { usuario } = req.body;
  try {
    const secret = speakeasy.generateSecret({ name: `SISIFO:${usuario}` });
    await db.query('UPDATE usuarios SET otp_secret = $1 WHERE usuario = $2', [secret.base32, usuario]);
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      res.json({ qr: data_url, secret: secret.base32 });
    });
  } catch (err) { res.status(500).send('Error configurando OTP.'); }
});

// LOGIN MODIFICADO (USA TOKEN EN VEZ DE DNI)
app.post('/api/login', async (req, res) => {
  const { usuario, token } = req.body;
  try {
    const result = await db.query('SELECT usuario, cargo, estado, motivo_estado, otp_secret FROM usuarios WHERE usuario = $1', [usuario]);
    if (result.rows.length === 0) return res.status(401).send('Usuario no encontrado.');

    const user = result.rows[0];
    if (user.estado === 'BLOQUEADO') return res.status(403).send(`ACCESO DENEGADO. Motivo: ${user.motivo_estado}`);
    if (!user.otp_secret) return res.status(400).send('Usuario no configurado. Contacte a Call Center.');

    const verified = speakeasy.totp.verify({
      secret: user.otp_secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      res.json({ success: true, usuario: user.usuario, cargo: user.cargo });
    } else {
      res.status(401).send('Código incorrecto o expirado.');
    }
  } catch (err) { res.status(500).send('Error en el servidor al autenticar.'); }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await db.query('SELECT id, nombre, apellido, usuario, cargo, estado, motivo_estado FROM usuarios ORDER BY cargo ASC, nombre ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send('Error al obtener la lista de usuarios.'); }
});

app.put('/api/usuarios/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado, motivo } = req.body;
  try {
    await db.query('UPDATE usuarios SET estado = $1, motivo_estado = $2 WHERE id = $3', [estado, motivo, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send('Error al actualizar estado.'); }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send('Error al eliminar usuario.'); }
});

app.get('/api/reportes_globales', async (req, res) => {
  try {
    const result = await db.query(`SELECT id, id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, turno, operador, centro_trabajo, TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha FROM reportes_monitoreo ORDER BY creado_el DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).send('Error al leer el almacén global.'); }
});

app.get('/api/reportes/:operador', async (req, res) => {
  try {
    const result = await db.query(`SELECT id, id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, turno, TO_CHAR(creado_el, 'DD/MM/YYYY HH24:MI') as fecha FROM reportes_monitoreo WHERE operador = $1 ORDER BY creado_el DESC`, [req.params.operador]);
    res.json(result.rows);
  } catch (err) { res.status(500).send('Error al leer almacén del operador.'); }
});

app.post('/api/exportar', exportController.descargarReporte);

app.post('/api/salas', async (req, res) => {
  const { nombre_sala, creado_por, tipo } = req.body;
  if (!nombre_sala || !creado_por) return res.status(400).send('Faltan datos de la sala.');
  const tipoSala = tipo || 'GLOBAL';
  try {
    const salaExistente = await db.query("SELECT * FROM chats_salas WHERE nombre_sala = $1", [nombre_sala.toUpperCase()]);
    if (salaExistente.rows.length > 0) return res.json({ success: true, sala: salaExistente.rows[0] });

    const result = await db.query(
      "INSERT INTO chats_salas (nombre_sala, tipo, creado_por) VALUES ($1, $2, $3) RETURNING *",
      [nombre_sala.toUpperCase(), tipoSala, creado_por]
    );
    res.json({ success: true, sala: result.rows[0] });
  } catch (err) { res.status(500).send('Error interno al crear sala.'); }
});

app.get('/api/salas', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM chats_salas ORDER BY id_sala ASC");
    res.json(result.rows);
  } catch (err) { res.status(500).send('Error al obtener las salas.'); }
});

app.put('/api/salas/:id', async (req, res) => {
  try {
    await db.query("UPDATE chats_salas SET nombre_sala = $1 WHERE id_sala = $2", [req.body.nombre_sala.toUpperCase(), req.params.id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/salas/vincular', async (req, res) => {
  res.json({ success: true, mensaje: `Usuario vinculado` });
});

app.delete('/api/salas/:id', async (req, res) => {
  try {
    try { await db.query("DELETE FROM chats_mensajes WHERE id_sala = $1", [req.params.id]); } catch (e) { }
    await db.query("DELETE FROM chats_salas WHERE id_sala = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send('Error interno en la BD.'); }
});

app.get('/api/salas/:id_sala/mensajes', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM chats_mensajes WHERE id_sala = $1 ORDER BY id_mensaje ASC", [req.params.id_sala]);
    res.json(result.rows);
  } catch (err) { res.json([]); }
});

app.delete('/api/mensajes/:id', async (req, res) => {
  try {
    if (req.body.es_privado) {
      await db.query("DELETE FROM chats_mensajes WHERE id_mensaje = $1", [req.params.id]);
    } else {
      await db.query("UPDATE chats_mensajes SET contenido = $1 WHERE id_mensaje = $2", [`MENSAJE BORRADO POR: ${req.body.usuario}`, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).send('Error'); }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] }, maxHttpBufferSize: 1e8 });

app.post('/api/reportes', upload.array('archivos', 10), async (req, res) => {
  const { id_incidencia, etapa, camara, zona, roper, asunto, atendido, operador, centro_trabajo, turno } = req.body;
  const rutas_archivos = req.files && req.files.length > 0 ? JSON.stringify(req.files.map(file => `/uploads/${file.filename}`)) : null;
  
  try {
    const result = await db.query(
      'INSERT INTO reportes_monitoreo (id_incidencia, etapa, camara, zona, roper, asunto, atendido, foto_video, operador, centro_trabajo, turno) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [id_incidencia, etapa, camara, zona, roper, asunto, atendido, rutas_archivos, operador, centro_trabajo, turno]
    );

    if (etapa && etapa.toUpperCase() === 'FINALIZADO') {
      try {
         const salaReportes = await db.query("SELECT id_sala FROM chats_salas WHERE nombre_sala = 'REPORTE DE LLAMADAS :C' LIMIT 1");
         if (salaReportes.rows.length > 0) {
             const idSalaDestino = salaReportes.rows[0].id_sala;
             const mensajeBot = `USUARIO ${operador.toUpperCase()} GENERO INCIDENCIA #${id_incidencia}`;
             const msgInsertado = await db.query(
                "INSERT INTO chats_mensajes (id_sala, remitente, contenido) VALUES ($1, $2, $3) RETURNING *",
                [idSalaDestino, 'BOT_SISIFO', mensajeBot]
             );
             io.emit('nuevo_mensaje', msgInsertado.rows[0]);
         }
      } catch(errBot) { console.error("Error al disparar bot de incidencia:", errBot); }
    }

    res.json(result.rows[0]);
  } catch (err) { res.status(500).send('Error al guardar reporte.'); }
});

require('./sockets')(io);

app.use(express.static(path.join(__dirname, 'dist')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SISTEMA SISIFO] Servidor Centralizado corriendo en el puerto ${PORT}`);
});