import { useState } from 'react';
import { LogOut } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import FormularioReporte from './components/FormularioReporte';
import Almacen from './components/Almacen';
import PanelAdministrador from './components/PanelAdministrador';

function App() {
  const [sesionActiva, setSesionActiva] = useState(() => localStorage.getItem('sisifo_user') !== null);
  const [usuarioGenerado, setUsuarioGenerado] = useState(() => localStorage.getItem('sisifo_user') || '');
  const [cargoUsuario, setCargoUsuario] = useState(() => localStorage.getItem('sisifo_cargo') || '');
  
  const [vistaActual, setVistaActual] = useState(() => {
    const cargo = localStorage.getItem('sisifo_cargo');
    if (cargo === 'ADMINISTRADOR') return 'ADMINISTRADOR';
    if (cargo === 'ANALISTA') return 'ALMACEN';
    return 'FORMULARIO';
  });
  
  const [datosSesion, setDatosSesion] = useState({ centro: 'BASE CENTRAL', turno: 'MAÑANA' });

  const handleLoginSuccess = (usuario, cargo, centro, turno) => {
    const cargoReal = cargo ? cargo.trim().toUpperCase() : 'OPERADOR';
    localStorage.setItem('sisifo_user', usuario);
    localStorage.setItem('sisifo_cargo', cargoReal);
    setUsuarioGenerado(usuario);
    setCargoUsuario(cargoReal);
    setDatosSesion({ centro, turno });

    if (cargoReal === 'ADMINISTRADOR') setVistaActual('ADMINISTRADOR');
    else if (cargoReal === 'ANALISTA') setVistaActual('ALMACEN');
    else setVistaActual('FORMULARIO');

    setSesionActiva(true);
  };

  // ✅ MODIFICADO: Ahora es async y avisa al backend antes de limpiar
  const handleLogout = async () => {
    if (window.confirm("¿Cerrar sesión?")) {
      const usuario = localStorage.getItem('sisifo_user');
      
      try {
        // Determina la URL base correctamente (localhost o IP)
        const apiBaseUrl = window.location.origin.includes('localhost') 
          ? 'http://localhost:3000' 
          : `http://${window.location.hostname}:3000`;

        await fetch(`${apiBaseUrl}/api/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario })
        });
      } catch (error) {
        console.error('No se pudo registrar el logout en el servidor:', error);
      }

      localStorage.removeItem('sisifo_user');
      localStorage.removeItem('sisifo_cargo');
      localStorage.removeItem('sisifo_roper');
      setSesionActiva(false);
      window.location.reload();
    }
  };

  if (!sesionActiva) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const esAdmin = cargoUsuario === 'ADMINISTRADOR';
  const esAnalista = cargoUsuario === 'ANALISTA';
  const esOperador = !esAdmin && !esAnalista;

  return (
    <div style={{ padding: '20px', maxWidth: '850px', margin: 'auto', fontFamily: 'Arial' }}>
      {/* HEADER GLOBAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '14px' }}>
        <div>
          <span style={{ marginRight: '15px' }}>Usuario: <b>{usuarioGenerado}</b></span>
          <span style={{ marginRight: '15px', color: esAnalista ? '#8df' : (esAdmin ? '#ff9900' : '#28a745'), fontSize: '12px', border: `1px solid ${esAnalista ? '#8df' : (esAdmin ? '#ff9900' : '#28a745')}`, padding: '2px 5px', borderRadius: '3px' }}>{cargoUsuario}</span>
          {!esAdmin && (
            <>
              <span style={{ marginRight: '15px' }}>Base: <b>{datosSesion.centro}</b></span>
              <span style={{ color: '#ffc107' }}>Turno: <b>{datosSesion.turno}</b></span>
            </>
          )}
        </div>
        <button onClick={handleLogout} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}><LogOut size={14} /> Salir</button>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>SISTEMA SISIFO - MONITOREO</h2>

      {/* NAVEGACIÓN DE VISTAS */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', justifyContent: 'center' }}>
        {esAdmin && (
          <button onClick={() => setVistaActual('ADMINISTRADOR')} style={{ padding: '10px 15px', cursor: 'pointer', background: vistaActual === 'ADMINISTRADOR' ? '#0056b3' : '#eee', color: vistaActual === 'ADMINISTRADOR' ? 'white' : '#333', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            Panel de Control
          </button>
        )}
        
        {esOperador && (
          <button onClick={() => setVistaActual('FORMULARIO')} style={{ padding: '10px 15px', cursor: 'pointer', background: vistaActual === 'FORMULARIO' ? '#0056b3' : '#eee', color: vistaActual === 'FORMULARIO' ? 'white' : '#333', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            Nuevo Reporte
          </button>
        )}
        
        <button onClick={() => setVistaActual('ALMACEN')} style={{ padding: '10px 15px', cursor: 'pointer', background: vistaActual === 'ALMACEN' ? '#0056b3' : '#eee', color: vistaActual === 'ALMACEN' ? 'white' : '#333', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          {esAdmin || esAnalista ? 'Almacén Global' : 'Mi Almacén'}
        </button>
      </div>

      {/* ENRUTAMIENTO DE VISTAS */}
      {vistaActual === 'ADMINISTRADOR' && <PanelAdministrador usuarioLogueado={usuarioGenerado} />}

      {vistaActual === 'FORMULARIO' && esOperador && (
        <FormularioReporte usuarioGenerado={usuarioGenerado} centro={datosSesion.centro} turno={datosSesion.turno} />
      )}

      {vistaActual === 'ALMACEN' && (
        <Almacen usuarioLogueado={usuarioGenerado} cargo={cargoUsuario} />
      )}
    </div>
  );
}

export default App;