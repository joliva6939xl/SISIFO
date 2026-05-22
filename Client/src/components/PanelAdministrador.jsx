import { useState, useEffect } from 'react';
import { Trash2, Lock, Unlock } from 'lucide-react'; // ✅ FIX 1-5: Eliminados los íconos no usados (UserPlus, Shield, CheckCircle, AlertTriangle, Users)
import { obtenerUsuariosLista, eliminarUsuario, actualizarEstadoUsuario } from '../api/api';

function PanelAdministrador() { // ✅ FIX 6: Eliminado el parámetro 'usuarioLogueado' que no se usaba
  const [formData, setFormData] = useState({ nombre: '', apellido: '', dni: '', cargo: 'OPERADOR' });
  const [mensaje, setMensaje] = useState(null); // se usa en el JSX más abajo ✅
  const [cargando, setCargando] = useState(false); // se usa en el JSX más abajo ✅
  const [listaUsuarios, setListaUsuarios] = useState([]);

  const cargarUsuarios = async () => {
    try {
      console.log("Intentando cargar usuarios...");
      const res = await obtenerUsuariosLista();
      console.log("Usuarios recibidos:", res.data);
      setListaUsuarios(res.data || []);
    } catch {
      // ✅ FIX 10: Eliminada la variable 'error' no usada en el catch
      setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los usuarios.' });
    }
  };

  // ✅ FIX 9: Movemos cargarUsuarios fuera del efecto usando useCallback pattern
  useEffect(() => {
    let activo = true;
    const fetchUsuarios = async () => {
      try {
        const res = await obtenerUsuariosLista();
        if (activo) {
          setListaUsuarios(res.data || []);
        }
      } catch {
        if (activo) {
          setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los usuarios.' });
        }
      }
    };
    fetchUsuarios();
    return () => { activo = false; };
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);
    try {
      const response = await fetch('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setMensaje({ tipo: 'exito', texto: '¡Usuario creado correctamente!' });
        setFormData({ nombre: '', apellido: '', dni: '', cargo: 'OPERADOR' });
        await cargarUsuarios();
      } else {
        setMensaje({ tipo: 'error', texto: await response.text() });
      }
    } catch {
      // ✅ FIX general: sin variable 'error' no usada
      setMensaje({ tipo: 'error', texto: 'Error de conexión.' });
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Eliminar a ${nombre}?`)) {
      try {
        await eliminarUsuario(id);
        await cargarUsuarios();
      } catch {
        // ✅ FIX 11: Eliminada la variable 'error' no usada
        alert("Error al eliminar");
      }
    }
  };

  const handleBloquear = async (id, nombre, estadoActual) => {
    const nuevoEstado = estadoActual === 'BLOQUEADO' ? 'ACTIVO' : 'BLOQUEADO';
    const motivo = window.prompt(`Motivo para ${nuevoEstado}:`);
    if (motivo !== null) {
      try {
        await actualizarEstadoUsuario(id, { estado: nuevoEstado, motivo });
        await cargarUsuarios();
      } catch {
        // ✅ FIX: Eliminada la variable 'error' no usada
        alert("Error al actualizar estado");
      }
    }
  };

  return (
    <div style={{ fontFamily: 'Arial', maxWidth: '1000px', margin: '20px auto', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>

      {/* ✅ FIX 7-8: 'mensaje' y 'cargando' ahora se usan en el JSX */}
      {mensaje && (
        <div style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: '6px',
          background: mensaje.tipo === 'exito' ? '#d4edda' : '#f8d7da',
          color: mensaje.tipo === 'exito' ? '#155724' : '#721c24',
          border: `1px solid ${mensaje.tipo === 'exito' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* FORMULARIO */}
      <div style={{ flex: '1 1 300px', background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h3>Crear Usuario</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Nombre" style={{ padding: '8px' }} />
          <input name="apellido" value={formData.apellido} onChange={handleChange} required placeholder="Apellido" style={{ padding: '8px' }} />
          <input name="dni" value={formData.dni} onChange={handleChange} required maxLength="8" placeholder="DNI" style={{ padding: '8px' }} />
          <select name="cargo" value={formData.cargo} onChange={handleChange} style={{ padding: '8px' }}>
            <option value="OPERADOR">OPERADOR</option>
            <option value="ANALISTA">ANALISTA</option>
            <option value="ADMINISTRADOR">ADMINISTRADOR</option>
          </select>
          <button onClick={handleSubmit} disabled={cargando} style={{ padding: '8px', cursor: cargando ? 'not-allowed' : 'pointer' }}>
            {cargando ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div style={{ flex: '2 1 500px', background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h3>Personal Registrado ({listaUsuarios.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th>Usuario</th><th>Nombre</th><th>Cargo</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {listaUsuarios.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td>@{u.usuario}</td>
                <td>{u.nombre} {u.apellido}</td>
                <td>{u.cargo}</td>
                <td>
                  <button onClick={() => handleBloquear(u.id, u.usuario, u.estado)}>
                    {u.estado === 'BLOQUEADO' ? <Unlock size={14} /> : <Lock size={14} />}
                  </button>
                  <button onClick={() => handleEliminar(u.id, u.usuario)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PanelAdministrador;