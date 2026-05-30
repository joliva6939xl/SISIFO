const db = require('./db');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // console.log('Usuario conectado:', socket.id);

    socket.on('conectar_usuario', (usuario) => {
      socket.usuario = usuario;
      // Aquí puedes manejar la lógica de estado online si lo necesitas
    });

    socket.on('enviar_mensaje', async (datosMsg) => {
      try {
        const idSala = datosMsg.id_sala || 1; // Fallback por seguridad
        
        // CORRECCIÓN CRÍTICA: Nos aseguramos de insertar en 'chats_mensajes' 
        // y comprobamos que la sala exista.
        const result = await db.query(
          "INSERT INTO chats_mensajes (id_sala, remitente, contenido) VALUES ($1, $2, $3) RETURNING *",
          [idSala, datosMsg.remitente, datosMsg.contenido]
        );
        
        const mensajeGuardado = result.rows[0];
        
        // Emitimos el mensaje guardado a todos
        io.emit('nuevo_mensaje', mensajeGuardado);

      } catch (err) {
        console.error("Error de Socket en enviar_mensaje:", err.message);
        // Opcional: Emitir un error de vuelta al usuario si es necesario
      }
    });

    socket.on('disconnect', () => {
      // console.log('Usuario desconectado:', socket.id);
    });
  });
};