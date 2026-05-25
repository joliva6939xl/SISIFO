import { useState, useEffect, useCallback } from 'react';
import {
  obtenerUsuariosLista,
  registrarUsuario,
  eliminarUsuario,
  actualizarEstadoUsuario
} from '../api/api';

import {
  UserPlus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock
} from 'lucide-react';

const PanelAdministrador = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  const [nuevoUser, setNuevoUser] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    cargo: 'OPERADOR'
  });

  const [mensajeExito, setMensajeExito] = useState('');

  const [modalBloqueo, setModalBloqueo] = useState({
    visible: false,
    idUsuario: null,
    motivo: '',
    nombreStr: ''
  });

  // CORRECCIÓN: useCallback evita warning de hooks
  const cargarUsuarios = useCallback(async () => {
    try {
      const resp = await obtenerUsuariosLista();
      setUsuarios(resp.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  }, []);

 useEffect(() => {
  const iniciarCarga = async () => {
    await cargarUsuarios();
  };

  iniciarCarga();
}, [cargarUsuarios]);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();

    try {
      const resp = await registrarUsuario(nuevoUser);

      if (resp.data.success) {
        setMensajeExito(
          `Usuario Creado. El ID es ${resp.data.usuario} - Clave: ${nuevoUser.dni}`
        );

        setNuevoUser({
          nombre: '',
          apellido: '',
          dni: '',
          cargo: 'OPERADOR'
        });

        cargarUsuarios();

        setTimeout(() => setMensajeExito(''), 6000);
      }
    } catch (error) {
      alert(error.response?.data || 'Error al crear usuario.');
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (
      window.confirm(
        `¿Está seguro que desea ELIMINAR PERMANENTEMENTE a ${nombre}?`
      )
    ) {
      try {
        await eliminarUsuario(id);
        cargarUsuarios();
      } catch (error) {
        console.error(error);
        alert('Error al eliminar.');
      }
    }
  };

  const abrirModalBloqueo = (usuario) => {
    if (usuario.estado === 'BLOQUEADO') {
      if (
        window.confirm(
          `¿Desbloquear a ${usuario.nombre} ${usuario.apellido}?`
        )
      ) {
        ejecutarCambioEstado(usuario.id, 'ACTIVO', '');
      }
    } else {
      setModalBloqueo({
        visible: true,
        idUsuario: usuario.id,
        motivo: '',
        nombreStr: `${usuario.nombre} ${usuario.apellido}`
      });
    }
  };

  const confirmarBloqueo = () => {
    if (!modalBloqueo.motivo.trim()) {
      return alert('Debe ingresar un motivo.');
    }

    ejecutarCambioEstado(
      modalBloqueo.idUsuario,
      'BLOQUEADO',
      modalBloqueo.motivo
    );
  };

  const ejecutarCambioEstado = async (id, nuevoEstado, motivo) => {
    try {
      await actualizarEstadoUsuario(id, {
        estado: nuevoEstado,
        motivo
      });

      setModalBloqueo({
        visible: false,
        idUsuario: null,
        motivo: '',
        nombreStr: ''
      });

      cargarUsuarios();
    } catch (error) {
      console.error(error);
      alert('Error al cambiar estado.');
    }
  };

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.usuario.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div
      style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          borderBottom: '2px solid #eee',
          paddingBottom: '10px'
        }}
      >
        <AlertTriangle size={24} color="#dc3545" />
        <h3 style={{ margin: 0, color: '#333' }}>
          PANEL DE CONTROL - CALL CENTER
        </h3>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '30px',
          flexWrap: 'wrap'
        }}
      >
        {/* SECCIÓN CREAR */}
        <div
          style={{
            flex: '1',
            minWidth: '300px',
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}
        >
          <h4
            style={{
              marginTop: 0,
              marginBottom: '15px',
              color: '#0056b3',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <UserPlus size={18} />
            Crear Nuevo Personal
          </h4>

          {mensajeExito && (
            <div
              style={{
                background: '#d4edda',
                color: '#155724',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '15px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <CheckCircle size={16} />
              {mensajeExito}
            </div>
          )}

          <form
            onSubmit={handleCrearUsuario}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <input
              type="text"
              placeholder="Nombre"
              value={nuevoUser.nombre}
              onChange={(e) =>
                setNuevoUser({
                  ...nuevoUser,
                  nombre: e.target.value.toUpperCase()
                })
              }
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
            />

            <input
              type="text"
              placeholder="Apellido"
              value={nuevoUser.apellido}
              onChange={(e) =>
                setNuevoUser({
                  ...nuevoUser,
                  apellido: e.target.value.toUpperCase()
                })
              }
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
            />

            <input
              type="password"
              placeholder="DNI (Contraseña)"
              value={nuevoUser.dni}
              onChange={(e) =>
                setNuevoUser({
                  ...nuevoUser,
                  dni: e.target.value
                })
              }
              maxLength={8}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
            />

            <select
              value={nuevoUser.cargo}
              onChange={(e) =>
                setNuevoUser({
                  ...nuevoUser,
                  cargo: e.target.value
                })
              }
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value="OPERADOR">OPERADOR</option>
              <option value="ANALISTA">ANALISTA</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
            </select>

            <button
              type="submit"
              style={{
                background: '#28a745',
                color: 'white',
                padding: '10px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginTop: '5px'
              }}
            >
              REGISTRAR USUARIO
            </button>
          </form>
        </div>

        {/* SECCIÓN LISTA */}
        <div style={{ flex: '2', minWidth: '400px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}
          >
            <h4 style={{ margin: 0, color: '#333' }}>
              Directorio Activo
            </h4>

            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '9px',
                  color: '#888'
                }}
              />

              <input
                type="text"
                placeholder="Buscar personal..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  padding: '8px 8px 8px 30px',
                  borderRadius: '20px',
                  border: '1px solid #ccc',
                  width: '250px'
                }}
              />
            </div>
          </div>

          <div
            style={{
              overflowX: 'auto',
              border: '1px solid #eee',
              borderRadius: '8px'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                textAlign: 'left'
              }}
            >
              <thead style={{ background: '#f4f4f4' }}>
                <tr>
                  <th
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #ddd'
                    }}
                  >
                    USUARIO (ID)
                  </th>

                  <th
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #ddd'
                    }}
                  >
                    NOMBRE COMPLETO
                  </th>

                  <th
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #ddd'
                    }}
                  >
                    CARGO
                  </th>

                  <th
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #ddd'
                    }}
                  >
                    ESTADO
                  </th>

                  <th
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #ddd',
                      textAlign: 'center'
                    }}
                  >
                    ACCIONES
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((u) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid #eee' }}
                  >
                    <td
                      style={{
                        padding: '10px',
                        fontWeight: 'bold'
                      }}
                    >
                      {u.usuario}
                    </td>

                    <td style={{ padding: '10px' }}>
                      {u.nombre} {u.apellido}
                    </td>

                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          background: '#eaf4ff',
                          color: '#0056b3',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      >
                        {u.cargo}
                      </span>
                    </td>

                    <td style={{ padding: '10px' }}>
                      {u.estado === 'BLOQUEADO' ? (
                        <span
                          style={{
                            color: '#dc3545',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          BLOQUEADO

                          <span
                            style={{
                              color: '#666',
                              fontSize: '10px',
                              fontWeight: 'normal'
                            }}
                          >
                            {u.motivo_estado}
                          </span>
                        </span>
                      ) : (
                        <span
                          style={{
                            color: '#28a745',
                            fontWeight: 'bold',
                            fontSize: '11px'
                          }}
                        >
                          ACTIVO
                        </span>
                      )}
                    </td>

                    <td
                      style={{
                        padding: '10px',
                        textAlign: 'center',
                        display: 'flex',
                        gap: '5px',
                        justifyContent: 'center'
                      }}
                    >
                      <button
                        onClick={() => abrirModalBloqueo(u)}
                        title={
                          u.estado === 'BLOQUEADO'
                            ? 'Desbloquear Acceso'
                            : 'Bloquear Acceso'
                        }
                        style={{
                          background:
                            u.estado === 'BLOQUEADO'
                              ? '#28a745'
                              : '#ffc107',
                          color:
                            u.estado === 'BLOQUEADO'
                              ? 'white'
                              : '#333',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex'
                        }}
                      >
                        {u.estado === 'BLOQUEADO' ? (
                          <Unlock size={16} />
                        ) : (
                          <Lock size={16} />
                        )}
                      </button>

                      <button
                        onClick={() =>
                          handleEliminar(
                            u.id,
                            `${u.nombre} ${u.apellido}`
                          )
                        }
                        title="Eliminar Permanente"
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#888'
                      }}
                    >
                      No se encontró personal.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE BLOQUEO */}
      {modalBloqueo.visible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '25px',
              borderRadius: '8px',
              width: '350px',
              boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
            }}
          >
            <h4
              style={{
                marginTop: 0,
                color: '#dc3545',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Lock size={20} />
              Bloquear Acceso
            </h4>

            <p
              style={{
                fontSize: '13px',
                color: '#555'
              }}
            >
              Indique el motivo de bloqueo para{' '}
              <b>{modalBloqueo.nombreStr}</b>.
            </p>

            <input
              type="text"
              placeholder="Ej: Fin de contrato, Falta grave..."
              value={modalBloqueo.motivo}
              onChange={(e) =>
                setModalBloqueo({
                  ...modalBloqueo,
                  motivo: e.target.value.toUpperCase()
                })
              }
              style={{
                width: '100%',
                padding: '8px',
                boxSizing: 'border-box',
                marginBottom: '15px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
              autoFocus
            />

            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end'
              }}
            >
              <button
                onClick={() =>
                  setModalBloqueo({
                    ...modalBloqueo,
                    visible: false
                  })
                }
                style={{
                  padding: '8px 15px',
                  border: 'none',
                  background: '#eee',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                onClick={confirmarBloqueo}
                style={{
                  padding: '8px 15px',
                  border: 'none',
                  background: '#dc3545',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Aplicar Bloqueo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelAdministrador;