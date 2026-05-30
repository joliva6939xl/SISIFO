import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { MessageSquare, Send, Paperclip, X, Edit3, Check, UserPlus, Hash, Pin, Download, User, Trash2 } from 'lucide-react';
import { obtenerUsuariosLista, crearSala } from '../api/api';

export default function ChatPanel({ usuarioLogueado }) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [historial, setHistorial] = useState([]);
  
  const [usuariosBD, setUsuariosBD] = useState([]); 
  const [usuariosOnline, setUsuariosOnline] = useState({}); 
  
  const [archivosAdjuntos, setArchivosAdjuntos] = useState([]); 
  const [visorMultimedia, setVisorMultimedia] = useState(null); 
  
  const [salas, setSalas] = useState([]);
  const [salaActiva, setSalaActiva] = useState(null);
  const [editandoSalaId, setEditandoSalaId] = useState(null);
  const [nuevoNombreSala, setNuevoNombreSala] = useState('');
  const [mensajesFijados, setMensajesFijados] = useState({}); 
  const [menuContextual, setMenuContextual] = useState({ visible: false, x: 0, y: 0, usuario: null });

  const socketRef = useRef(null);
  const finalChatRef = useRef(null);

  const urlBase = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;

  // FUNCIÓN PROTEGIDA PARA RE-CARGAR SALAS
  const obtenerSalasBD = useCallback(async () => {
    try {
      const res = await fetch(`${urlBase}/api/salas`);
      const data = await res.json();
      setSalas(data);
      setSalaActiva(prev => (!prev && data.length > 0 ? data[0] : prev));
    } catch (err) { console.error("Error salas:", err); }
  }, [urlBase]);

  // EFECTOS PRINCIPALES
  useEffect(() => {
    let montado = true; 

    const inicializar = async () => {
      try {
        const res = await fetch(`${urlBase}/api/salas`);
        const data = await res.json();
        if (montado) {
          setSalas(data);
          setSalaActiva(prev => (!prev && data.length > 0 ? data[0] : prev));
        }

        const respDirectorio = await obtenerUsuariosLista();
        if (montado && respDirectorio.data) {
          setUsuariosBD(respDirectorio.data);
        }
      } catch (err) {
        console.error("Error de inicialización:", err);
      }
    };
    
    inicializar();

    socketRef.current = io(urlBase);
    socketRef.current.emit('conectar_usuario', usuarioLogueado);

    socketRef.current.on('nuevo_mensaje', (msg) => {
      if (montado && msg.remitente !== usuarioLogueado) {
        setHistorial((prev) => [...prev, msg]);
        setTimeout(() => finalChatRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    socketRef.current.on('usuarios_actualizados', (lista) => {
      if (montado) setUsuariosOnline(lista);
    });

    socketRef.current.on('sala_actualizada', () => { 
      if (montado) obtenerSalasBD(); 
    });

    // Escucha el evento global para refrescar el historial al borrar mensajes
    socketRef.current.on('sala_modificada_global', async () => {
      if (montado && salaActiva) {
        try {
          const res = await fetch(`${urlBase}/api/salas/${salaActiva.id_sala}/mensajes`);
          if (res.ok) {
            const datos = await res.json();
            setHistorial(datos);
          }
        } catch (err) { console.error("Error al recargar historial:", err); }
      }
    });

    return () => {
      montado = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [usuarioLogueado, urlBase, obtenerSalasBD, salaActiva]);

  // EFECTO: Cargar historial al cambiar de sala
  useEffect(() => {
    let montado = true;

    const cargarHistorialLocal = async () => {
      if (!salaActiva) return;
      try {
        const res = await fetch(`${urlBase}/api/salas/${salaActiva.id_sala}/mensajes`);
        if (res.ok && montado) {
          const datos = await res.json();
          setHistorial(datos);
          setTimeout(() => finalChatRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
        }
      } catch (err) { 
        console.error("Error historial:", err); 
      }
    };
    
    cargarHistorialLocal();

    return () => { montado = false; };
  }, [salaActiva, urlBase]);

  // EFECTO: Cierre de menús al hacer clic fuera
  useEffect(() => {
    const handleClickFuera = () => setMenuContextual(prev => prev.visible ? { ...prev, visible: false } : prev);
    document.addEventListener('click', handleClickFuera);
    return () => document.removeEventListener('click', handleClickFuera);
  }, []);

  // LÓGICA DE BORRADO DE MENSAJES (Puntos 3 y 4)
  const borrarMensaje = async (msg) => {
    const esPrivado = salaActiva.nombre_sala.startsWith('PRIV_');
    try {
      await fetch(`${urlBase}/api/mensajes/${msg.id_mensaje}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioLogueado, es_privado: esPrivado })
      });
      socketRef.current.emit('sala_modificada_global');
      
      // Actualización Local Inmediata para UI Fluida
      if (esPrivado) {
        setHistorial(prev => prev.filter(m => m.id_mensaje !== msg.id_mensaje));
      } else {
        setHistorial(prev => prev.map(m => m.id_mensaje === msg.id_mensaje ? { ...m, contenido: `MENSAJE BORRADO POR: ${usuarioLogueado}` } : m));
      }

    } catch (err) { console.error("Error borrando mensaje:", err); }
  };


  if (salas.length === 0) return null;

  // LÓGICA MULTIMEDIA Y NOMBRES DE ARCHIVO
  const procesarArchivos = (archivos) => {
    Array.from(archivos).forEach(file => {
      if (file.type.startsWith('video') && file.size > 150 * 1024 * 1024) {
        alert(`El video ${file.name} excede el límite de 150MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setArchivosAdjuntos(prev => [...prev, { base64: e.target.result, tipo: file.type, nombre: file.name || 'Documento' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        files.push(items[i].getAsFile());
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      procesarArchivos(files);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar(e);
    }
  };

  const enviar = (e) => {
    if (e.preventDefault) e.preventDefault();
    if (!mensaje.trim() && archivosAdjuntos.length === 0) return;

    let contenidoCompleto = mensaje.trim();
    
    // Adjuntamos el nombre del archivo en la etiqueta
    archivosAdjuntos.forEach(adj => {
      contenidoCompleto += ` [FILE:${adj.tipo}|${adj.nombre}]${adj.base64}[/FILE] `;
    });

    const idSalaActual = salaActiva?.id_sala || 1;
    const nuevoMsg = {
      remitente: usuarioLogueado,
      contenido: contenidoCompleto.trim(),
      id_sala: idSalaActual,
      es_sistema: false
    };

    socketRef.current.emit('enviar_mensaje', nuevoMsg);
    
    setHistorial(prev => [...prev, nuevoMsg]);
    setTimeout(() => finalChatRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    setMensaje('');
    setArchivosAdjuntos([]);
  };

  const guardarNombreSala = async (id_sala) => {
    if (!nuevoNombreSala.trim()) return;
    try {
      await fetch(`${urlBase}/api/salas/${id_sala}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_sala: nuevoNombreSala })
      });
      setEditandoSalaId(null);
      socketRef.current.emit('sala_modificada_global');
      obtenerSalasBD();
    } catch (err) { console.error(err); }
  };

  const handleClicDerecho = (e, usuarioObj) => {
    e.preventDefault();
    if(usuarioObj.usuario === usuarioLogueado) return;
    setMenuContextual({ visible: true, x: e.clientX, y: e.clientY, usuario: usuarioObj });
  };

  const asignarAGrupoActivo = async () => {
    if (!menuContextual.usuario || !salaActiva) return;
    try {
      await fetch(`${urlBase}/api/salas/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: menuContextual.usuario.usuario, id_sala: salaActiva.id_sala })
      });
      alert(`@${menuContextual.usuario.usuario} añadido a ${salaActiva.nombre_sala}`);
    } catch (err) { console.error(err); }
  };

  const crearChatPrivado = async () => {
    if (!menuContextual.usuario) return;
    const destinatario = menuContextual.usuario.usuario;
    const nombres = [usuarioLogueado, destinatario].sort();
    const nombrePrivado = `PRIV_${nombres[0]}_${nombres[1]}`;

    try {
      const resp = await crearSala({ nombre_sala: nombrePrivado, creado_por: usuarioLogueado, tipo: 'PRIVADO' });
      const resSalas = await fetch(`${urlBase}/api/salas`);
      const dataSalas = await resSalas.json();
      setSalas(dataSalas);

      const salaNueva = dataSalas.find(s => s.nombre_sala === nombrePrivado);
      if(salaNueva) {
        setSalaActiva(salaNueva);
      } else if (resp.data && resp.data.sala) {
         setSalaActiva(resp.data.sala);
      }
    } catch (err) { console.error("Error creando privado", err); }
  };

  const fijarMensajeGrupo = (msg) => {
    setMensajesFijados(prev => ({ ...prev, [salaActiva.id_sala]: msg }));
  };

  // PARSEO FINAL (CON SOPORTE PARA AUDITORÍA Y NOMBRES DE ARCHIVO)
  const parsearContenido = (msg) => {
    const textoOriginal = msg.contenido;

    // Validación de Auditoría de Borrado
    if (textoOriginal.startsWith('MENSAJE BORRADO POR:')) {
      return <i style={{ color: '#888', fontSize: '12px' }}>{textoOriginal}</i>;
    }

    const fileRegex = /\[FILE:(.*?)\|(.*?)\](.*?)\[\/FILE\]/g;
    let textoLimpio = textoOriginal.replace(fileRegex, '').trim();
    
    const adjuntosExtraidos = [];
    let match;
    while ((match = fileRegex.exec(textoOriginal)) !== null) {
      adjuntosExtraidos.push({ tipo: match[1], nombre: match[2], base64: match[3] });
    }

    // Soporte retroactivo para archivos sin nombre en el tag (versiones anteriores)
    const oldFileRegex = /\[FILE:([^|]*?)\](.*?)\[\/FILE\]/g;
    textoLimpio = textoLimpio.replace(oldFileRegex, '').trim();
    while ((match = oldFileRegex.exec(textoOriginal)) !== null) {
      if(!match[1].includes('|')) {
         adjuntosExtraidos.push({ tipo: match[1], nombre: 'Documento_Adjunto', base64: match[2] });
      }
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const partesTexto = textoLimpio.split(urlRegex);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {textoLimpio && (
          <span style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
            {partesTexto.map((part, i) => 
              urlRegex.test(part) ? (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#3390ec', textDecoration: 'underline' }}>{part}</a>
              ) : part
            )}
          </span>
        )}
        
        {adjuntosExtraidos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
            {adjuntosExtraidos.map((f, i) => {
              if (f.tipo.startsWith('image')) {
                return <img key={i} src={f.base64} alt="evidencia" onClick={() => setVisorMultimedia(f.base64)} style={{ height: '150px', width: 'auto', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', border: '1px solid rgba(0,0,0,0.1)' }} />;
              } else if (f.tipo.startsWith('video')) {
                return <video key={i} src={f.base64} controls style={{ height: '150px', borderRadius: '6px', backgroundColor: '#000' }} />;
              } else {
                return <a key={i} href={f.base64} download={f.nombre} style={{ padding: '8px', background: '#f4f4f5', borderRadius: '6px', color: '#3390ec', fontWeight: 'bold', fontSize: '12px', textDecoration: 'none', border: '1px solid #ddd' }}>📁 {f.nombre}</a>;
              }
            })}
          </div>
        )}
        
        {/* BOTÓN ELIMINAR (Solo visible para el creador del mensaje) */}
        {msg.remitente === usuarioLogueado && msg.id_mensaje && (
          <button onClick={() => borrarMensaje(msg)} style={{ marginTop: '8px', color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-end', fontSize: '11px' }}>
            <Trash2 size={12} /> Eliminar
          </button>
        )}
      </div>
    );
  };

  const mensajesSalaActual = historial.filter(m => !m.id_sala || String(m.id_sala) === String(salaActiva?.id_sala));
  
  const salasTacticas = salas.filter(s => !s.nombre_sala.startsWith('PRIV_'));
  const salasPrivadas = salas.filter(s => s.nombre_sala.startsWith('PRIV_') && s.nombre_sala.includes(usuarioLogueado));

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} style={{ position: 'fixed', bottom: '30px', right: '30px', background: '#3390ec', color: 'white', border: 'none', borderRadius: '50%', width: '60px', height: '60px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(51, 144, 236, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
        <MessageSquare size={28} />
      </button>
    );
  }

  return (
    <>
      {visorMultimedia && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '15px' }}>
            <a href={visorMultimedia} download="Evidencia_Central.png" style={{ color: 'white', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }} title="Descargar"><Download size={24}/></a>
            <button onClick={() => setVisorMultimedia(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '10px', borderRadius: '50%', display: 'flex' }}><X size={24} /></button>
          </div>
          <img src={visorMultimedia} alt="Vista ampliada" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />
        </div>
      )}

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '950px', height: '85vh', maxHeight: '900px', zIndex: 9999, display: 'flex', background: '#ffffff', borderRadius: '12px', border: '1px solid #ddd', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
        
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e0e0e0', background: '#ffffff' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={20} color="#888" />
            <input type="text" placeholder="Buscar..." style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', background: '#f4f4f5', padding: '8px 12px', borderRadius: '20px' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '10px 15px', fontSize: '12px', fontWeight: 'bold', color: '#888', marginTop: '10px' }}>SALAS TÁCTICAS</div>
            {salasTacticas.map(s => (
              <div key={s.id_sala} onClick={() => setSalaActiva(s)} style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: salaActiva?.id_sala === s.id_sala ? '#3390ec' : 'transparent', color: salaActiva?.id_sala === s.id_sala ? 'white' : '#333' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: salaActiva?.id_sala === s.id_sala ? 'rgba(255,255,255,0.2)' : '#e4ebf1', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  <Hash size={20} color={salaActiva?.id_sala === s.id_sala ? 'white' : '#3390ec'} />
                </div>
                <div style={{ fontWeight: '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre_sala}</div>
              </div>
            ))}

            {salasPrivadas.length > 0 && <div style={{ padding: '10px 15px', fontSize: '12px', fontWeight: 'bold', color: '#888', marginTop: '10px' }}>MENSAJES DIRECTOS</div>}
            {salasPrivadas.map(s => {
              const nombreLimpio = s.nombre_sala.replace(`PRIV_`, '').split('_').find(n => n !== usuarioLogueado);
              return (
                <div key={s.id_sala} onClick={() => setSalaActiva(s)} style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: salaActiva?.id_sala === s.id_sala ? '#3390ec' : 'transparent', color: salaActiva?.id_sala === s.id_sala ? 'white' : '#333' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: salaActiva?.id_sala === s.id_sala ? 'rgba(255,255,255,0.2)' : '#28a745', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, color: 'white' }}>
                    <User size={20} />
                  </div>
                  <div style={{ fontWeight: '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{nombreLimpio}</div>
                </div>
              );
            })}

            <div style={{ padding: '10px 15px', fontSize: '12px', fontWeight: 'bold', color: '#888', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>DIRECTORIO (Clic Derecho)</div>
            {usuariosBD.map(u => {
              const isOnline = usuariosOnline[u.usuario];
              const colorEstado = isOnline ? (isOnline.estado === 'VERDE' ? '#28a745' : '#ff9800') : '#ccc';
              return (
                <div key={u.usuario} onContextMenu={(e) => handleClicDerecho(e, u)} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'context-menu', transition: 'background 0.2s' }}>
                  <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: colorEstado, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                    {u.usuario.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: '500', fontSize: '13px', color: '#333' }}>@{u.usuario}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {menuContextual.visible && (
            <div style={{ position: 'fixed', top: menuContextual.y, left: menuContextual.x, background: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 5px 20px rgba(0,0,0,0.2)', zIndex: 100000, padding: '5px', width: '220px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', padding: '5px', borderBottom: '1px solid #eee', marginBottom: '5px' }}>Opciones para @{menuContextual.usuario?.usuario}</div>
              <button onClick={crearChatPrivado} style={{ width: '100%', textAlign: 'left', background: 'transparent', color: '#333', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={16}/> Iniciar Chat Privado</button>
              <button onClick={asignarAGrupoActivo} style={{ width: '100%', textAlign: 'left', background: 'transparent', color: '#333', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={16}/> Agregar a Sala Actual</button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#93a8b9' }}>
          
          <div style={{ height: '60px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }}>
              {editandoSalaId === salaActiva?.id_sala ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <input type="text" value={nuevoNombreSala} onChange={e => setNuevoNombreSala(e.target.value)} style={{ padding: '6px 12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #3390ec', width: '100%', outline: 'none' }} autoFocus />
                  <button onClick={() => guardarNombreSala(salaActiva.id_sala)} style={{ background: '#3390ec', border: 'none', color: 'white', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><Check size={18}/></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '16px', color: '#333' }}>
                    {salaActiva?.nombre_sala.replace(`PRIV_${usuarioLogueado}_`, '@').replace(`PRIV_`, '@').replace(`_${usuarioLogueado}`, '')}
                  </b>
                  {!salaActiva?.nombre_sala.startsWith('PRIV_') && (
                    <button onClick={() => { setEditandoSalaId(salaActiva.id_sala); setNuevoNombreSala(salaActiva.nombre_sala); }} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }} title="Editar Nombre"><Edit3 size={16}/></button>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setAbierto(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}><X size={24} /></button>
          </div>

          {mensajesFijados[salaActiva?.id_sala] && (
            <div style={{ background: '#ffffff', margin: '10px 20px 0 20px', borderRadius: '6px', borderLeft: '3px solid #3390ec', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', zIndex: 5 }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ color: '#3390ec', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Pin size={12} /> Fijado por {mensajesFijados[salaActiva.id_sala].remitente}
                </span>
                <span style={{ color: '#333', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mensajesFijados[salaActiva.id_sala].contenido.replace(/\[FILE:.*?\](.*?)\[\/FILE\]/g, '📎 Adjunto')}</span>
              </div>
              <button onClick={() => setMensajesFijados(prev => ({ ...prev, [salaActiva.id_sala]: null }))} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}><X size={16}/></button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mensajesSalaActual.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '20px' }}>El historial de esta conversación está vacío.</div>}
            
            {mensajesSalaActual.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.remitente === usuarioLogueado ? 'flex-end' : 'flex-start' }} onDoubleClick={() => fijarMensajeGrupo(msg)}>
                <div style={{ maxWidth: '80%', background: msg.remitente === usuarioLogueado ? '#effdde' : '#ffffff', color: '#000', padding: '10px 14px', borderRadius: msg.remitente === usuarioLogueado ? '12px 12px 0px 12px' : '12px 12px 12px 0px', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  {msg.remitente !== usuarioLogueado && <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#3390ec', marginBottom: '6px' }}>{msg.remitente}</div>}
                  {parsearContenido(msg)}
                </div>
              </div>
            ))}
            <div ref={finalChatRef} />
          </div>

          {archivosAdjuntos.length > 0 && (
            <div style={{ padding: '15px 20px', background: '#f4f4f5', display: 'flex', gap: '10px', overflowX: 'auto', borderTop: '1px solid #ddd' }}>
              {archivosAdjuntos.map((arch, idx) => (
                <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
                  {arch.tipo.startsWith('image') ? (
                    <img src={arch.base64} alt="previa" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#ddd', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' }}>📄</div>
                  )}
                  <button onClick={() => setArchivosAdjuntos(prev => prev.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px' }}>X</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#ffffff', padding: '10px 20px', display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
            <input type="file" id="chatUpload" hidden multiple onChange={(e) => procesarArchivos(e.target.files)} />
            <button type="button" onClick={() => document.getElementById('chatUpload').click()} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '5px', marginBottom: '5px' }}>
              <Paperclip size={24} />
            </button>
            
            <textarea 
              placeholder="Escribe un mensaje... (Shift + Enter para nueva línea)" 
              value={mensaje} 
              onChange={e => setMensaje(e.target.value)} 
              onKeyDown={handleKeyDown}
              onPaste={handlePaste} 
              style={{ flex: 1, padding: '12px', border: 'none', outline: 'none', fontSize: '15px', background: 'transparent', color: '#333', resize: 'none', minHeight: '24px', maxHeight: '120px', overflowY: 'auto', fontFamily: 'inherit' }} 
              rows={mensaje.split('\n').length > 1 ? Math.min(mensaje.split('\n').length, 5) : 1}
            />
            
            <button onClick={enviar} style={{ background: 'transparent', border: 'none', color: '#3390ec', cursor: 'pointer', padding: '5px', marginBottom: '5px' }}>
              <Send size={26} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}