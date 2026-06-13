const db = require('./db');

// Memoria del servidor para saber quién está conectado (Verde/Gris)
const usuariosConectados = {};

module.exports = (io) => {
  io.on('connection', (socket) => {
    
    // 1. Cuando un usuario entra, lo guardamos y avisamos a todos
    socket.on('conectar_usuario', (usuario) => {
      socket.usuario = usuario;
      usuariosConectados[usuario] = { estado: 'VERDE', socketId: socket.id };
      io.emit('usuarios_actualizados', usuariosConectados);
    });

    // 2. Chat normal
    socket.on('enviar_mensaje', async (datosMsg) => {
      try {
        const idSala = datosMsg.id_sala || 1; 
        const result = await db.query(
          "INSERT INTO chats_mensajes (id_sala, remitente, contenido) VALUES ($1, $2, $3) RETURNING *",
          [idSala, datosMsg.remitente, datosMsg.contenido]
        );
        const mensajeGuardado = result.rows[0];
        io.emit('nuevo_mensaje', mensajeGuardado);
      } catch (err) {
        console.error("Error de Socket en enviar_mensaje:", err.message);
      }
    });

    // 3. Cuando alguien crea un chat privado nuevo, obliga a los demás a actualizar su lista
    socket.on('nueva_sala_creada', () => {
        io.emit('sala_actualizada');
    });

    // 4. EL ESLABÓN PERDIDO: Cuando alguien borra un mensaje, avisa a todas las pantallas para que desaparezca
    socket.on('sala_modificada_global', () => {
        io.emit('sala_modificada_global');
    });

    // 5. Cuando un usuario cierra la pestaña, lo pasamos a Gris (desconectado)
    socket.on('disconnect', () => {
      if (socket.usuario) {
        delete usuariosConectados[socket.usuario];
        io.emit('usuarios_actualizados', usuariosConectados);
      }
    });
  });
};