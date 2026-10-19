import { useState, useEffect, useCallback } from 'react';
import { 
  obtenerUsuariosLista, registrarUsuario, eliminarUsuario, actualizarEstadoUsuario, actualizarCargoUsuario
} from '../api/api';
import { 
  UserPlus, Trash2, Search, AlertTriangle, CheckCircle, Lock, Unlock, Edit
} from 'lucide-react';
import './PanelAdministrador.css';

// eslint-disable-next-line no-unused-vars
const PanelAdministrador = ({ usuarioLogueado }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [nuevoUser, setNuevoUser] = useState({ nombre: '', apellido: '', dni: '', cargo: 'OPERADOR' });
  const [modalBloqueo, setModalBloqueo] = useState({ visible: false, idUsuario: null, motivo: '', nombreStr: '' });
  
  // ✅ Estado para el modal de cambio de cargo
  const [modalCargo, setModalCargo] = useState({ visible: false, idUsuario: null, nombreStr: '', cargoActual: 'OPERADOR' });

  const cargarDatos = useCallback(async () => {
    try {
      const respUsuarios = await obtenerUsuariosLista();
      setUsuarios(respUsuarios.data);
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      try { 
        await eliminarUsuario(id); 
        cargarDatos(); 
      } catch (error) { 
        console.error(error); 
        alert('Error al eliminar.'); 
      }
    }
  };

  const abrirModalBloqueo = (usuario) => {
    if (usuario.estado === 'BLOQUEADO') {
      if (window.confirm(`¿Desbloquear a ${usuario.nombre}?`)) {
        ejecutarCambioEstado(usuario.id, 'ACTIVO', '');
      }
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
    } catch (error) { 
      console.error(error); 
      alert('Error al cambiar estado.'); 
    }
  };

  // ✅ Funciones para el modal de cambio de cargo
  const abrirModalCargo = (usuario) => {
    setModalCargo({ visible: true, idUsuario: usuario.id, nombreStr: `${usuario.nombre} ${usuario.apellido}`, cargoActual: usuario.cargo });
  };

  const confirmarCargo = async () => {
    try {
      await actualizarCargoUsuario(modalCargo.idUsuario, { cargo: modalCargo.cargoActual });
      setModalCargo({ visible: false, idUsuario: null, nombreStr: '', cargoActual: 'OPERADOR' });
      cargarDatos();
    } catch (error) {
      console.error(error);
      alert('Error al cambiar el cargo.');
    }
  };

  const filtrados = usuarios.filter((u) =>
    (u.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.apellido || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.usuario || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="panel-admin-container">
      <div className="panel-header">
        <AlertTriangle size={24} color="#dc3545" />
        <h2>PANEL DE CONTROL - CALL CENTER</h2>
      </div>

      <div className="panel-section">
        <h3 className="section-title"><UserPlus size={18} /> Crear Nuevo Personal</h3>
        <div className="form-card">
          {mensajeExito && (
            <div className="success-message"><CheckCircle size={16} /> {mensajeExito}</div>
          )}
          <form onSubmit={handleCrearUsuario}>
            <div className="form-row">
              <div className="form-group">
                <input type="text" placeholder="Nombre" value={nuevoUser.nombre} onChange={(e) => setNuevoUser({ ...nuevoUser, nombre: e.target.value.toUpperCase() })} className="form-input" required />
              </div>
              <div className="form-group">
                <input type="text" placeholder="Apellido" value={nuevoUser.apellido} onChange={(e) => setNuevoUser({ ...nuevoUser, apellido: e.target.value.toUpperCase() })} className="form-input" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <input type="password" placeholder="DNI (Contraseña)" value={nuevoUser.dni} onChange={(e) => setNuevoUser({ ...nuevoUser, dni: e.target.value })} maxLength={8} className="form-input" required />
              </div>
              <div className="form-group">
                <select value={nuevoUser.cargo} onChange={(e) => setNuevoUser({ ...nuevoUser, cargo: e.target.value })} className="form-select">
                  <option value="OPERADOR">OPERADOR</option>
                  <option value="ANALISTA">ANALISTA</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-submit">REGISTRAR USUARIO</button>
          </form>
        </div>
      </div>

      <div className="panel-section">
        <div className="directorio-card">
          <div className="directorio-header">
            <h3>Directorio de Personal</h3>
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Buscar por nombre, apellido o usuario..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="search-input" />
            </div>
          </div>

          <div className="directorio-table-wrapper">
            {/* [MOVIDO] El mensaje vacío sale de la tabla y pasa a ser un <div> hermano.
                Así flex/height funcionan de verdad y el card NUNCA se achica al filtrar. */}
            {filtrados.length === 0 ? (
              <div className="empty-state">No se encontraron resultados.</div>
            ) : (
              <table className="directorio-table">
                <thead>
                  <tr>
                    <th>USUARIO (ID)</th>
                    <th>NOMBRE COMPLETO</th>
                    <th>CARGO</th>
                    <th>ESTADO</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 'bold', color: '#0056b3' }}>{u.usuario}</td>
                      <td>{u.nombre} {u.apellido}</td>
                      <td><span className={`cargo-badge cargo-${u.cargo.toLowerCase()}`}>{u.cargo}</span></td>
                      <td>
                        {u.estado === 'BLOQUEADO' ? (
                          <span className="estado-bloqueado">BLOQUEADO<div className="estado-motivo">{u.motivo_estado}</div></span>
                        ) : (
                          <span className="estado-activo">ACTIVO</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {/* ✅ NUEVO BOTÓN: Editar Cargo */}
                          <button onClick={() => abrirModalCargo(u)} title="Cambiar Cargo" className="btn-action btn-editar">
                            <Edit size={14} /> Cargo
                          </button>
                          <button onClick={() => abrirModalBloqueo(u)} title={u.estado === 'BLOQUEADO' ? 'Desbloquear Acceso' : 'Bloquear Acceso'} className={`btn-action ${u.estado === 'BLOQUEADO' ? 'btn-desbloquear' : 'btn-bloquear'}`}>
                            {u.estado === 'BLOQUEADO' ? <Unlock size={14} /> : <Lock size={14} />}
                            {u.estado === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear'}
                          </button>
                          <button onClick={() => handleEliminarUsuario(u.id, `${u.nombre} ${u.apellido}`)} title="Eliminar Permanente" className="btn-action btn-eliminar">
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CAMBIO DE CARGO */}
      {modalCargo.visible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4 style={{ color: '#17a2b8', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Edit size={20} /> Cambiar Cargo
            </h4>
            <p>Seleccione el nuevo cargo para <b>{modalCargo.nombreStr}</b>.</p>
            <select 
              value={modalCargo.cargoActual} 
              onChange={(e) => setModalCargo({ ...modalCargo, cargoActual: e.target.value })} 
              className="modal-input"
              style={{ marginBottom: '20px', cursor: 'pointer' }}
            >
              <option value="OPERADOR">OPERADOR</option>
              <option value="ANALISTA">ANALISTA</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
            </select>
            <div className="modal-buttons">
              <button onClick={() => setModalCargo({ ...modalCargo, visible: false })} className="btn-cancel">Cancelar</button>
              <button onClick={confirmarCargo} className="btn-confirm" style={{ background: '#17a2b8' }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BLOQUEO */}
      {modalBloqueo.visible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4><Lock size={20} /> Bloquear Acceso</h4>
            <p>Indique el motivo de bloqueo para <b>{modalBloqueo.nombreStr}</b>.</p>
            <input type="text" placeholder="Ej: Fin de contrato, Falta grave..." value={modalBloqueo.motivo} onChange={(e) => setModalBloqueo({ ...modalBloqueo, motivo: e.target.value.toUpperCase() })} className="modal-input" autoFocus />
            <div className="modal-buttons">
              <button onClick={() => setModalBloqueo({ ...modalBloqueo, visible: false })} className="btn-cancel">Cancelar</button>
              <button onClick={confirmarBloqueo} className="btn-confirm">Aplicar Bloqueo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelAdministrador;