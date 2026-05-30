import { useState, useEffect } from 'react';
import { Camera, Send, User, Shield, MapPin, LogIn, LogOut, ClipboardPaste, ArrowRight, ArrowLeft, Clock, Edit } from 'lucide-react';
import { enviarReporte, loginUsuario, registrarUsuario } from './api/api';
import Almacen from './components/Almacen'; 
import PanelAdministrador from './components/PanelAdministrador'; 
import ChatPanel from './components/ChatPanel'; 
import { io } from 'socket.io-client'; 
import { X as CloseIcon } from 'lucide-react';

function App() {
  const [sesionActiva, setSesionActiva] = useState(false);
  const [modoRegistro, setModoRegistro] = useState(false); 
  
  const [datosUsuario, setDatosUsuario] = useState({ nombre: '', apellido: '', dni: '', centro: 'BASE CENTRAL', turno: 'MAÑANA' });
  const [usuarioGenerado, setUsuarioGenerado] = useState('');
  const [cargoUsuario, setCargoUsuario] = useState(''); 
  
  const [vistaActual, setVistaActual] = useState('FORMULARIO'); 
  const [etapa, setEtapa] = useState('INICIO'); 
  const [edicionCampos, setEdicionCampos] = useState(false);

  const [form, setForm] = useState({ camara: '', zona: '', roper: '', asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '', atendido: '' });
  const [archivos, setArchivos] = useState({ inicio: [], desarrollo: [], finalizado: [] });
  const [vistasPrevias, setVistasPrevias] = useState({ inicio: [], desarrollo: [], finalizado: [] });

  useEffect(() => {
    const handlePasteGlobal = (e) => {
      if (!sesionActiva || vistaActual !== 'FORMULARIO') return;
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      let pegoImagen = false;
      const currEtapa = etapa.toLowerCase();

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          pegoImagen = true;
          const blob = items[i].getAsFile();
          if (!blob) continue;
          const file = new File([blob], `evidencia_${currEtapa}_${Date.now()}_${i}.png`, { type: blob.type });
          const reader = new FileReader();
          
          reader.onloadend = () => {
            setArchivos(prev => ({...prev, [currEtapa]: [...prev[currEtapa], file]}));
            setVistasPrevias(prev => ({...prev, [currEtapa]: [...prev[currEtapa], reader.result]}));
          };
          reader.readAsDataURL(file);
        }
      }
      if (pegoImagen) e.preventDefault();
    };

    document.addEventListener('paste', handlePasteGlobal);
    return () => document.removeEventListener('paste', handlePasteGlobal);
  }, [etapa, sesionActiva, vistaActual]); 

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const currEtapa = etapa.toLowerCase();
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setArchivos(prev => ({...prev, [currEtapa]: [...prev[currEtapa], file]}));
          setVistasPrevias(prev => ({...prev, [currEtapa]: [...prev[currEtapa], reader.result]}));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const eliminarFoto = (index) => {
    const currEtapa = etapa.toLowerCase();
    setArchivos(prev => ({ ...prev, [currEtapa]: prev[currEtapa].filter((_, i) => i !== index) }));
    setVistasPrevias(prev => ({ ...prev, [currEtapa]: prev[currEtapa].filter((_, i) => i !== index) }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!datosUsuario.nombre || !datosUsuario.apellido || !datosUsuario.dni) return alert("Complete los datos.");
    const userEsperado = datosUsuario.nombre.charAt(0).toLowerCase() + datosUsuario.apellido.toLowerCase().replace(/\s/g, ''); 

    try {
      const respuesta = await loginUsuario({ usuario: userEsperado, dni: datosUsuario.dni });
      if (respuesta.data.success) {
        const cargoReal = respuesta.data.cargo ? respuesta.data.cargo.trim().toUpperCase() : 'OPERADOR';
        setUsuarioGenerado(respuesta.data.usuario);
        setCargoUsuario(cargoReal); 
        
        if (cargoReal === 'ADMINISTRADOR') setVistaActual('ADMINISTRADOR');
        else setVistaActual(cargoReal === 'ANALISTA' ? 'ALMACEN' : 'FORMULARIO');
        
        setSesionActiva(true);
      }
    } catch (error) {
      if (error.response) {
         if(error.response.status === 403) alert("¡ATENCIÓN! 🔒\n\nSISTEMA BLOQUEADO.\nContacte al administrador.");
         else alert(error.response.data || "Error al intentar ingresar.");
      } else alert("Error de conexión con el servidor.");
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    if (!datosUsuario.nombre || !datosUsuario.apellido || !datosUsuario.dni) return alert("Complete los campos.");
    try {
      const respuesta = await registrarUsuario({ nombre: datosUsuario.nombre, apellido: datosUsuario.apellido, dni: datosUsuario.dni, cargo: 'OPERADOR' });
      if (respuesta.data.success) {
        alert(`Operador creado con éxito. \nUsuario: ${respuesta.data.usuario} \nContraseña: ${datosUsuario.dni}`);
        setModoRegistro(false); 
      }
    } catch (error) {
      alert(error.response?.data || "No se pudo registrar al operador.");
    }
  };

  const handleLogout = () => {
    if(window.confirm("¿Cerrar sesión activa?")) {
      setSesionActiva(false);
      setUsuarioGenerado(''); 
      setCargoUsuario('');
      setForm({ camara: '', zona: '', roper: '', asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '', atendido: '' });
      setArchivos({ inicio: [], desarrollo: [], finalizado: [] });
      setVistasPrevias({ inicio: [], desarrollo: [], finalizado: [] });
      setEtapa('INICIO');
      setVistaActual('FORMULARIO'); 
      setEdicionCampos(false);
    }
  };

  const avanzarEtapa = () => {
    if (etapa === 'INICIO') {
      if (!form.camara || !form.zona || !form.roper || !form.asunto_inicio) return alert("Complete Cámara, Zona, Roper y Asunto Inicial.");
      setEtapa('DESARROLLO');
      setEdicionCampos(false); 
    } else if (etapa === 'DESARROLLO') {
      if (!form.asunto_desarrollo) return alert("Complete el desarrollo.");
      setEtapa('FINALIZADO');
      setEdicionCampos(false);
    }
  };

  const retrocederEtapa = () => {
    if (etapa === 'FINALIZADO') setEtapa('DESARROLLO');
    else if (etapa === 'DESARROLLO') setEtapa('INICIO');
    setEdicionCampos(false);
  };

  const handleSubmitConsolidado = async (e) => {
    e.preventDefault();
    if (!form.asunto_finalizado || !form.atendido) return alert("Complete el cierre del reporte.");
    const idGenerado = Math.floor(Math.random() * 1000000); 

    const enviarPaquete = async (nombreEtapa, asuntoTexto, atendidoTexto, listaArchivos) => {
      const fd = new FormData();
      fd.append('id_incidencia', idGenerado);
      fd.append('etapa', nombreEtapa);
      fd.append('camara', form.camara);
      fd.append('zona', form.zona);
      fd.append('roper', form.roper);
      fd.append('asunto', asuntoTexto);
      fd.append('atendido', atendidoTexto);
      fd.append('operador', usuarioGenerado);
      fd.append('centro_trabajo', datosUsuario.centro);
      fd.append('turno', datosUsuario.turno); 
      
      if (listaArchivos && listaArchivos.length > 0) {
        listaArchivos.forEach(file => fd.append('archivos', file));
      }
      return enviarReporte(fd); 
    };

    try {
      if(form.asunto_inicio) await enviarPaquete('INICIO', form.asunto_inicio, '', archivos.inicio);
      if(form.asunto_desarrollo) await enviarPaquete('DESARROLLO', form.asunto_desarrollo, '', archivos.desarrollo);
      if(form.asunto_finalizado) await enviarPaquete('FINALIZADO', form.asunto_finalizado, form.atendido, archivos.finalizado);
      
      alert(`Reporte consolidado enviado. ID: ${idGenerado}`);

      try {
        const urlBase = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;
        const socketBot = io(urlBase);
        socketBot.emit('enviar_mensaje', {
          remitente: 'SISTEMA SISIFO',
          contenido: `📢 El operador ${usuarioGenerado} consolidó el Informe #${idGenerado} (Cam: ${form.camara} | Zona: ${form.zona}).`,
          es_sistema: true
        });
        setTimeout(() => socketBot.disconnect(), 1500);
      } catch(err) {
        console.error("Error del bot de sistema:", err);
      }

      setEtapa('INICIO');
      setForm({ camara: '', zona: '', roper: '', asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '', atendido: '' });
      setArchivos({ inicio: [], desarrollo: [], finalizado: [] });
      setVistasPrevias({ inicio: [], desarrollo: [], finalizado: [] });
      setEdicionCampos(false);
    } catch (error) {
      console.error(error); 
      alert('Error al despachar el informe.');
    }
  };

  if (!sesionActiva) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial', backgroundColor: '#f4f4f9' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', width: '380px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{modoRegistro ? 'NUEVO OPERADOR' : 'SISIFO - ACCESO'}</h2>
          
          <form onSubmit={modoRegistro ? handleRegistro : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}><User size={12}/> Nombre</label>
                <input type="text" value={datosUsuario.nombre} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, nombre: e.target.value.toUpperCase()})} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Apellido</label>
                <input type="text" value={datosUsuario.apellido} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, apellido: e.target.value.toUpperCase()})} required />
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}><Shield size={12}/> Contraseña (DNI)</label>
              <input type="password" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, dni: e.target.value})} required maxLength={8} />
            </div>

            {!modoRegistro && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}><MapPin size={12}/> Base</label>
                  <select style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, centro: e.target.value})}>
                    <option value="BASE CENTRAL">BASE CENTRAL</option><option value="CEMO NORTE">CEMO NORTE</option><option value="CEMO SUR">CEMO SUR</option><option value="CEMO CENTRO">CEMO CENTRO</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}><Clock size={12}/> Turno</label>
                  <select style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, turno: e.target.value})}>
                    <option value="MAÑANA">MAÑANA</option><option value="TARDE">TARDE</option><option value="NOCHE">NOCHE</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {!modoRegistro ? (
                <>
                  <button type="submit" style={{ flex: 2, background: '#0056b3', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>INGRESAR <LogIn size={16} /></button>
                  <button type="button" onClick={() => setModoRegistro(true)} style={{ flex: 1, background: '#6c757d', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>Registrar</button>
                </>
              ) : (
                <>
                  <button type="submit" style={{ flex: 2, background: 'green', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>CREAR OPERADOR</button>
                  <button type="button" onClick={() => setModoRegistro(false)} style={{ flex: 1, background: '#dc3545', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Cancelar</button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // VISTA PRINCIPAL CLÁSICA (CENTRALIZADA Y CON BURBUJA FLOTANTE)
  return (
    <div style={{ padding: '20px', maxWidth: '850px', margin: 'auto', fontFamily: 'Arial' }}>
      
      {/* EL CHAT AHORA FLOTA EN LA ESQUINA */}
      {sesionActiva && <ChatPanel usuarioLogueado={usuarioGenerado} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '14px' }}>
        <div>
          <span style={{ marginRight: '15px' }}>Usuario: <b>{usuarioGenerado}</b></span>
          <span style={{ marginRight: '15px', color: cargoUsuario === 'ANALISTA' ? '#8df' : (cargoUsuario === 'ADMINISTRADOR' ? '#ff9900' : '#28a745'), fontSize: '12px', border: `1px solid ${cargoUsuario === 'ANALISTA' ? '#8df' : (cargoUsuario === 'ADMINISTRADOR' ? '#ff9900' : '#28a745')}`, padding: '2px 5px', borderRadius: '3px' }}>{cargoUsuario}</span>
          {cargoUsuario !== 'ADMINISTRADOR' && (
            <>
              <span style={{ marginRight: '15px' }}>Base: <b>{datosUsuario.centro}</b></span>
              <span style={{ color: '#ffc107' }}>Turno: <b>{datosUsuario.turno}</b></span>
            </>
          )}
        </div>
        <button onClick={handleLogout} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}><LogOut size={14} /> Salir</button>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>SISTEMA SISIFO - MONITOREO</h2>

      {vistaActual === 'ADMINISTRADOR' && <PanelAdministrador usuarioLogueado={usuarioGenerado} />}

      {vistaActual !== 'ADMINISTRADOR' && (
        <>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', justifyContent: 'center' }}>
            {cargoUsuario !== 'ANALISTA' && (
              <button onClick={() => setVistaActual('FORMULARIO')} style={{ padding: '10px 15px', cursor: 'pointer', background: vistaActual === 'FORMULARIO' ? '#0056b3' : '#eee', color: vistaActual === 'FORMULARIO' ? 'white' : '#333', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Nuevo Reporte</button>
            )}
            <button onClick={() => setVistaActual('ALMACEN')} style={{ padding: '10px 15px', cursor: 'pointer', background: vistaActual === 'ALMACEN' ? '#0056b3' : '#eee', color: vistaActual === 'ALMACEN' ? 'white' : '#333', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              {cargoUsuario === 'ANALISTA' ? 'Panel de Analista Global' : 'Mi Almacén (Historial)'}
            </button>
          </div>
          
          {vistaActual === 'FORMULARIO' ? (
            <div style={{ background: '#fff', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', maxWidth: '600px', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
                <span style={{ color: etapa === 'INICIO' ? '#0056b3' : 'inherit' }}>1. INICIO</span><span>→</span>
                <span style={{ color: etapa === 'DESARROLLO' ? '#0056b3' : 'inherit' }}>2. DESARROLLO</span><span>→</span>
                <span style={{ color: etapa === 'FINALIZADO' ? '#0056b3' : 'inherit' }}>3. FINALIZADO</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Etapa: {etapa}</h3>
                {etapa !== 'INICIO' && (
                  <button type="button" onClick={() => setEdicionCampos(!edicionCampos)} style={{ background: edicionCampos ? '#6c757d' : '#ff9800', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                    <Edit size={14} /> {edicionCampos ? 'Bloquear Campos' : 'Editar (Seguimiento)'}
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                <input style={{ padding: '8px', background: (etapa !== 'INICIO' && !edicionCampos) ? '#f0f0f0' : '#fff' }} type="text" placeholder="Cámara (Cam)" value={form.camara} onChange={e => setForm({...form, camara: e.target.value.toUpperCase()})} disabled={etapa !== 'INICIO' && !edicionCampos} />
                <input style={{ padding: '8px', background: (etapa !== 'INICIO' && !edicionCampos) ? '#f0f0f0' : '#fff' }} type="text" placeholder="Zona" value={form.zona} onChange={e => setForm({...form, zona: e.target.value.toUpperCase()})} disabled={etapa !== 'INICIO' && !edicionCampos} />
                <input style={{ padding: '8px', background: (etapa !== 'INICIO' && !edicionCampos) ? '#f0f0f0' : '#fff' }} type="text" placeholder="ROPER (Encargado del Servicio)" value={form.roper} onChange={e => setForm({...form, roper: e.target.value.toUpperCase()})} disabled={etapa !== 'INICIO' && !edicionCampos} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {etapa === 'INICIO' && <textarea style={{ padding: '8px', height: '60px' }} placeholder="Describa el Asunto Inicial..." value={form.asunto_inicio} onChange={e => setForm({...form, asunto_inicio: e.target.value.toUpperCase()})} />}
                {etapa === 'DESARROLLO' && <textarea style={{ padding: '8px', height: '60px' }} placeholder="Describa el Desarrollo de la incidencia..." value={form.asunto_desarrollo} onChange={e => setForm({...form, asunto_desarrollo: e.target.value.toUpperCase()})} />}
                {etapa === 'FINALIZADO' && (
                  <>
                    <textarea style={{ padding: '8px', height: '60px' }} placeholder="Conclusión / Reporte Final..." value={form.asunto_finalizado} onChange={e => setForm({...form, asunto_finalizado: e.target.value.toUpperCase()})} />
                    <input style={{ padding: '8px' }} type="text" placeholder="Atendido por..." value={form.atendido} onChange={e => setForm({...form, atendido: e.target.value.toUpperCase()})} />
                  </>
                )}
                
                <label style={{ cursor: 'pointer', background: '#eaf4ff', padding: '15px', borderRadius: '5px', textAlign: 'center', border: '2px dashed #0056b3', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '5px', color: '#0056b3' }}><Camera size={20} /> o <ClipboardPaste size={20} /></div>
                  <span style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>Presiona Ctrl+V en cualquier lugar de esta pantalla para pegar imágenes de Lightshot</span>
                  <br />
                  <span style={{ fontSize: '11px', color: '#666' }}>O haz clic aquí para buscar en tus carpetas</span>
                  <input type="file" multiple hidden onChange={handleFileUpload} />
                </label>

                {vistasPrevias[etapa.toLowerCase()].length > 0 && (
                  <div style={{ marginTop: '10px', background: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                      {vistasPrevias[etapa.toLowerCase()].map((vp, index) => (
                        <div key={index} style={{ position: 'relative', display: 'inline-block' }}>
                          <img src={vp} alt="Evidencia" style={{ height: '80px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #ccc' }} />
                          <button type="button" onClick={() => eliminarFoto(index)} title="Borrar foto" style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            <CloseIcon size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                <button type="button" onClick={retrocederEtapa} disabled={etapa === 'INICIO'} style={{ background: etapa === 'INICIO' ? '#ccc' : '#6c757d', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px' }}><ArrowLeft size={16} /> Atrás</button>
                {etapa !== 'FINALIZADO' ? (
                  <button type="button" onClick={avanzarEtapa} style={{ background: '#0056b3', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>Continuar <ArrowRight size={16} /></button>
                ) : (
                  <button type="button" onClick={handleSubmitConsolidado} style={{ background: 'green', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>ENVIAR CONSOLIDADO <Send size={16} /></button>
                )}
              </div>
            </div>
          ) : (
            <Almacen usuarioLogueado={usuarioGenerado} cargo={cargoUsuario} />
          )}
        </>
      )}
    </div>
  );
}

export default App;