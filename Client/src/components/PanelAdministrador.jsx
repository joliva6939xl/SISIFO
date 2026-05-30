import { useState, useEffect, useCallback } from 'react';
import { 
  obtenerUsuariosLista, registrarUsuario, eliminarUsuario, actualizarEstadoUsuario, 
  crearSala, obtenerSalas, borrarSala, vincularUsuarioASala 
} from '../api/api';
import { 
  UserPlus, Trash2, Search, AlertTriangle, CheckCircle, Lock, Unlock, 
  MessageSquarePlus, Users, MessageSquare 
} from 'lucide-react';

const PanelAdministrador = ({ usuarioLogueado }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  
  // ESTADOS PARA SALAS
  const [salas, setSalas] = useState([]);
  const [nuevaSala, setNuevaSala] = useState('');
  const [mensajeSalaExito, setMensajeSalaExito] = useState('');

  // ESTADOS PARA MENÚ CONTEXTUAL (CLIC DERECHO)
  const [menuContextual, setMenuContextual] = useState({ visible: false, x: 0, y: 0, usuario: null });

  const [nuevoUser, setNuevoUser] = useState({ nombre: '', apellido: '', dni: '', cargo: 'OPERADOR' });
  const [modalBloqueo, setModalBloqueo] = useState({ visible: false, idUsuario: null, motivo: '', nombreStr: '' });

  const cargarDatos = useCallback(async () => {
    try {
      const respUsuarios = await obtenerUsuariosLista();
      setUsuarios(respUsuarios.data);

      const respSalas = await obtenerSalas();
      setSalas(respSalas.data);
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    }
  }, []);

  // EFECTO 1: Carga de Base de Datos
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, [cargarDatos]);

  // EFECTO 2: Cierre del Menú Contextual (Clic Izquierdo en pantalla)
  useEffect(() => {
    const handleClickFuera = () => {
      setMenuContextual(prev => prev.visible ? { ...prev, visible: false } : prev);
    };
    document.addEventListener('click', handleClickFuera);
    return () => document.removeEventListener('click', handleClickFuera);
  }, []);

  // --- LOGICA DE USUARIOS ---
  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    try {
      const resp = await registrarUsuario(nuevoUser);
      if (resp.data.success) {
        setMensajeExito(`Usuario Creado. ID: ${resp.data.usuario}`);
        setNuevoUser({ nombre: '', apellido: '', dni: '', cargo: 'OPERADOR' });
        cargarDatos();
        setTimeout(() => setMensajeExito(''), 6000);
      }
    } catch (error) {
      alert(error.response?.data || 'Error al crear usuario.');
    }
  };

  const handleEliminarUsuario = async (id, nombre) => {
    if (window.confirm(`¿Eliminar permanentemente a ${nombre}?`)) {
      try { await eliminarUsuario(id); cargarDatos(); } catch (error) { console.error(error); alert('Error.'); }
    }
  };

  const abrirModalBloqueo = (usuario) => {
    if (usuario.estado === 'BLOQUEADO') {
      if (window.confirm(`¿Desbloquear a ${usuario.nombre}?`)) ejecutarCambioEstado(usuario.id, 'ACTIVO', '');
    } else {
      setModalBloqueo({ visible: true, idUsuario: usuario.id, motivo: '', nombreStr: `${usuario.nombre} ${usuario.apellido}` });
    }
  };

  const confirmarBloqueo = () => {
    if (!modalBloqueo.motivo.trim()) return alert('Debe ingresar un motivo.');
    ejecutarCambioEstado(modalBloqueo.idUsuario, 'BLOQUEADO', modalBloqueo.motivo);
  };

  const ejecutarCambioEstado = async (id, nuevoEstado, motivo) => {
    try {
      await actualizarEstadoUsuario(id, { estado: nuevoEstado, motivo });
      setModalBloqueo({ visible: false, idUsuario: null, motivo: '', nombreStr: '' });
      cargarDatos();
    } catch (error) { console.error(error); alert('Error al cambiar estado.'); }
  };

  // --- LOGICA DE SALAS ---
  const handleCrearSala = async (e) => {
    e.preventDefault();
    if (!nuevaSala.trim()) return;
    try {
      const resp = await crearSala({ nombre_sala: nuevaSala, creado_por: usuarioLogueado || 'CALL CENTER' });
      if (resp.data.success) {
        setMensajeSalaExito(`Grupo "${nuevaSala.toUpperCase()}" activado.`);
        setNuevaSala('');
        cargarDatos();
        setTimeout(() => setMensajeSalaExito(''), 5000);
      }
    } catch (error) { console.error(error); alert('Error al crear el grupo.'); }
  };

  const handleEliminarSala = async (id, nombre) => {
    if (window.confirm(`ATENCIÓN: ¿Borrar la sala "${nombre}" y todos sus mensajes?`)) {
      try {
        await borrarSala(id);
        cargarDatos();
      } catch (error) { console.error(error); alert('Error al borrar la sala.'); }
    }
  };

  // --- LÓGICA DEL MENÚ CONTEXTUAL (CLIC DERECHO) ---
  const handleClicDerecho = (e, usuario) => {
    e.preventDefault(); 
    setMenuContextual({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      usuario: usuario
    });
  };

  const handleVincularASala = async (id_sala, nombre_sala) => {
    try {
      await vincularUsuarioASala({ 
        usuario: menuContextual.usuario.usuario, 
        id_sala: id_sala 
      });
      alert(`Usuario @${menuContextual.usuario.usuario} vinculado exitosamente a ${nombre_sala}`);
      setMenuContextual(prev => ({ ...prev, visible: false }));
    } catch (error) {
      console.error(error);
      alert('Error al vincular el usuario.');
    }
  };

  const filtrados = usuarios.filter((u) =>
    (u.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.apellido || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.usuario || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', position: 'relative' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <AlertTriangle size={24} color="#dc3545" />
        <h3 style={{ margin: 0, color: '#333' }}>PANEL DE CONTROL - CALL CENTER</h3>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* COLUMNA IZQUIERDA: CREACIÓN */}
        <div style={{ flex: '1', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* MÓDULO 1: CREAR PERSONAL */}
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#0056b3', display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={18} /> Crear Nuevo Personal</h4>
            {mensajeExito && <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '13px' }}><CheckCircle size={16} /> {mensajeExito}</div>}
            
            <form onSubmit={handleCrearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="Nombre" value={nuevoUser.nombre} onChange={(e) => setNuevoUser({ ...nuevoUser, nombre: e.target.value.toUpperCase() })} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                <input type="text" placeholder="Apellido" value={nuevoUser.apellido} onChange={(e) => setNuevoUser({ ...nuevoUser, apellido: e.target.value.toUpperCase() })} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="password" placeholder="DNI (Contraseña)" value={nuevoUser.dni} onChange={(e) => setNuevoUser({ ...nuevoUser, dni: e.target.value })} maxLength={8} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                <select value={nuevoUser.cargo} onChange={(e) => setNuevoUser({ ...nuevoUser, cargo: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="OPERADOR">OPERADOR</option><option value="ANALISTA">ANALISTA</option><option value="ADMINISTRADOR">ADMINISTRADOR</option>
                </select>
              </div>
              <button type="submit" style={{ background: '#28a745', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>REGISTRAR USUARIO</button>
            </form>
          </div>

          {/* MÓDULO 2: GESTOR DE SALAS DE CHAT */}
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#17a2b8', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquarePlus size={18} /> Gestión de Salas Tácticas</h4>
            
            {/* AQUÍ ESTÁ EL MENSAJE DE ÉXITO DE LA SALA RENDERIZADO */}
            {mensajeSalaExito && (
              <div style={{ background: '#d1ecf1', color: '#0c5460', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle size={16} /> {mensajeSalaExito}
              </div>
            )}

            <form onSubmit={handleCrearSala} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" placeholder="Ej: GRUPO DELTA" value={nuevaSala} onChange={(e) => setNuevaSala(e.target.value.toUpperCase())} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
              <button type="submit" style={{ background: '#17a2b8', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>CREAR</button>
            </form>

            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
              {salas.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', padding: '10px' }}>No hay salas creadas.</p>
              ) : (
                salas.map(sala => (
                  <div key={sala.id_sala} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={14} color="#0056b3"/> <b>{sala.nombre_sala}</b>
                    </div>
                    <button onClick={() => handleEliminarSala(sala.id_sala, sala.nombre_sala)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Borrar Sala">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))
              )}
            </div>
            <p style={{ fontSize: '11px', color: '#6c757d', marginTop: '10px', textAlign: 'center' }}>Haga clic derecho en los operadores de la tabla para agregarlos a las salas.</p>
          </div>

        </div>

        {/* COLUMNA DERECHA: DIRECTORIO INTERACTIVO */}
        <div style={{ flex: '2', minWidth: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0, color: '#333' }}>Directorio Interactivo (Clic Derecho)</h4>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '9px', color: '#888' }} />
              <input type="text" placeholder="Buscar personal..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '8px 8px 8px 30px', borderRadius: '20px', border: '1px solid #ccc', width: '250px' }} />
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ background: '#f4f4f4' }}>
                <tr>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>USUARIO (ID)</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>NOMBRE COMPLETO</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>CARGO</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>ESTADO</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr 
                    key={u.id} 
                    style={{ borderBottom: '1px solid #eee', cursor: 'context-menu', transition: 'background 0.2s' }}
                    onContextMenu={(e) => handleClicDerecho(e, u)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    title="Clic Derecho para Opciones de Grupo"
                  >
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{u.usuario}</td>
                    <td style={{ padding: '10px' }}>{u.nombre} {u.apellido}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ background: '#eaf4ff', color: '#0056b3', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{u.cargo}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {u.estado === 'BLOQUEADO' ? (
                        <span style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '11px', display: 'flex', flexDirection: 'column' }}>BLOQUEADO<span style={{ color: '#666', fontSize: '10px', fontWeight: 'normal' }}>{u.motivo_estado}</span></span>
                      ) : (
                        <span style={{ color: '#28a745', fontWeight: 'bold', fontSize: '11px' }}>ACTIVO</span>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button onClick={() => abrirModalBloqueo(u)} title={u.estado === 'BLOQUEADO' ? 'Desbloquear Acceso' : 'Bloquear Acceso'} style={{ background: u.estado === 'BLOQUEADO' ? '#28a745' : '#ffc107', color: u.estado === 'BLOQUEADO' ? 'white' : '#333', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                        {u.estado === 'BLOQUEADO' ? <Unlock size={16} /> : <Lock size={16} />}
                      </button>
                      <button onClick={() => handleEliminarUsuario(u.id, `${u.nombre} ${u.apellido}`)} title="Eliminar Permanente" style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MENÚ CONTEXTUAL (CLIC DERECHO FLOTANTE) */}
      {menuContextual.visible && menuContextual.usuario && (
        <div style={{ position: 'absolute', top: menuContextual.y - 120, left: menuContextual.x - 300, background: 'white', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '220px', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ background: '#0056b3', color: 'white', padding: '10px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={14}/> Vincular @{menuContextual.usuario.usuario}
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {salas.length === 0 ? (
              <div style={{ padding: '15px', textAlign: 'center', color: '#888', fontSize: '12px' }}>Primero cree un Grupo.</div>
            ) : (
              salas.map(sala => (
                <button 
                  key={sala.id_sala} 
                  onClick={() => handleVincularASala(sala.id_sala, sala.nombre_sala)}
                  style={{ width: '100%', padding: '10px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #eee', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MessageSquare size={14} color="#28a745" /> {sala.nombre_sala}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL DE BLOQUEO */}
      {modalBloqueo.visible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '8px', width: '350px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
            <h4 style={{ marginTop: 0, color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px' }}><Lock size={20} /> Bloquear Acceso</h4>
            <p style={{ fontSize: '13px', color: '#555' }}>Indique el motivo de bloqueo para <b>{modalBloqueo.nombreStr}</b>.</p>
            <input type="text" placeholder="Ej: Fin de contrato, Falta grave..." value={modalBloqueo.motivo} onChange={(e) => setModalBloqueo({ ...modalBloqueo, motivo: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px' }} autoFocus />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalBloqueo({ ...modalBloqueo, visible: false })} style={{ padding: '8px 15px', border: 'none', background: '#eee', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarBloqueo} style={{ padding: '8px 15px', border: 'none', background: '#dc3545', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Aplicar Bloqueo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelAdministrador;