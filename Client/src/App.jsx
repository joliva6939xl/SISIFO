import { useState, useEffect } from 'react';
import { Camera, Send, User, Shield, MapPin, LogIn, LogOut, ClipboardPaste, ArrowRight, ArrowLeft } from 'lucide-react';
import { enviarReporte } from './api/api';
import Almacen from './components/Almacen'; 

function App() {
  const [sesionActiva, setSesionActiva] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState({ nombre: '', apellido: '', dni: '', centro: 'BASE CENTRAL' });
  const [usuarioGenerado, setUsuarioGenerado] = useState('');
  const [vistaActual, setVistaActual] = useState('FORMULARIO'); 
  const [etapa, setEtapa] = useState('INICIO'); 

  const [form, setForm] = useState({
    camara: '', zona: '', asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '', atendido: ''
  });

  // AHORA SON ARREGLOS PARA SOPORTAR MÚLTIPLES FOTOS
  const [archivos, setArchivos] = useState({ inicio: [], desarrollo: [], finalizado: [] });
  const [vistasPrevias, setVistasPrevias] = useState({ inicio: [], desarrollo: [], finalizado: [] });

  // --- LÓGICA DE PEGADO (CTRL+V PARA MÚLTIPLES IMÁGENES) ---
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const currEtapa = etapa.toLowerCase();

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const file = new File([blob], `captura_${currEtapa}_${Date.now()}_${i}.png`, { type: blob.type });
          
          const reader = new FileReader();
          reader.onloadend = () => {
            setArchivos(prev => ({...prev, [currEtapa]: [...prev[currEtapa], file]}));
            setVistasPrevias(prev => ({...prev, [currEtapa]: [...prev[currEtapa], reader.result]}));
          };
          reader.readAsDataURL(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [etapa]); 

  // --- CARGA MANUAL DE MÚLTIPLES FOTOS ---
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
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

  const handleLogin = (e) => {
    e.preventDefault();
    if (!datosUsuario.nombre || !datosUsuario.apellido || !datosUsuario.dni) return alert("Por favor complete todos los campos.");
    const usuarioCreado = datosUsuario.nombre.charAt(0).toLowerCase() + datosUsuario.apellido.toLowerCase().replace(/\s/g, ''); 
    setUsuarioGenerado(usuarioCreado);
    setSesionActiva(true); 
  };

  const handleLogout = () => {
    if(window.confirm("¿Estás seguro que deseas cerrar sesión?")) {
      setSesionActiva(false);
      setUsuarioGenerado('');
      setForm({ camara: '', zona: '', asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '', atendido: '' });
      setArchivos({ inicio: [], desarrollo: [], finalizado: [] });
      setVistasPrevias({ inicio: [], desarrollo: [], finalizado: [] });
      setEtapa('INICIO');
      setVistaActual('FORMULARIO'); 
    }
  };

  const avanzarEtapa = () => {
    if (etapa === 'INICIO') {
      if (!form.camara || !form.zona || !form.asunto_inicio) return alert("Completa Cámara, Zona y Asunto inicial.");
      setEtapa('DESARROLLO');
    } else if (etapa === 'DESARROLLO') {
      if (!form.asunto_desarrollo) return alert("Completa el desarrollo de la incidencia.");
      setEtapa('FINALIZADO');
    }
  };

  const retrocederEtapa = () => {
    if (etapa === 'FINALIZADO') setEtapa('DESARROLLO');
    else if (etapa === 'DESARROLLO') setEtapa('INICIO');
  };

  const handleSubmitConsolidado = async (e) => {
    e.preventDefault();
    if (!form.asunto_finalizado || !form.atendido) return alert("Completa Asunto y Atendido Por para finalizar.");

    const idGenerado = Math.floor(Math.random() * 1000000); 

    const enviarPaquete = async (nombreEtapa, asuntoTexto, atendidoTexto, listaArchivos) => {
      const fd = new FormData();
      fd.append('id_incidencia', idGenerado);
      fd.append('etapa', nombreEtapa);
      fd.append('camara', form.camara);
      fd.append('zona', form.zona);
      fd.append('asunto', asuntoTexto);
      fd.append('atendido', atendidoTexto);
      fd.append('operador', usuarioGenerado);
      fd.append('centro_trabajo', datosUsuario.centro);
      
      // AGREGAR MÚLTIPLES ARCHIVOS AL FORMDATA
      if (listaArchivos && listaArchivos.length > 0) {
        listaArchivos.forEach(file => fd.append('archivos', file));
      }
      return enviarReporte(fd);
    };

    try {
      if(form.asunto_inicio) await enviarPaquete('INICIO', form.asunto_inicio, '', archivos.inicio);
      if(form.asunto_desarrollo) await enviarPaquete('DESARROLLO', form.asunto_desarrollo, '', archivos.desarrollo);
      if(form.asunto_finalizado) await enviarPaquete('FINALIZADO', form.asunto_finalizado, form.atendido, archivos.finalizado);
      
      alert(`Consolidado enviado con éxito. ID Referencia: ${idGenerado}`);
      
      setEtapa('INICIO');
      setForm({ camara: '', zona: '', asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '', atendido: '' });
      setArchivos({ inicio: [], desarrollo: [], finalizado: [] });
      setVistasPrevias({ inicio: [], desarrollo: [], finalizado: [] });
      
    } catch (error) {
      console.error(error);
      alert('Error crítico al enviar el consolidado.');
    }
  };

  // RENDERIZADO LOGIN (Oculto en código para no abrumar, es idéntico al anterior)
  if (!sesionActiva) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial', backgroundColor: '#f4f4f9' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', width: '350px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>SISIFO - ACCESO</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}><User size={12}/> Nombre</label><input type="text" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, nombre: e.target.value})} required /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>Apellido</label><input type="text" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, apellido: e.target.value})} required /></div>
            </div>
            <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}><Shield size={12}/> Contraseña (DNI)</label><input type="password" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, dni: e.target.value})} required maxLength={8} /></div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}><MapPin size={12}/> Centro de Trabajo</label>
              <select style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} onChange={e => setDatosUsuario({...datosUsuario, centro: e.target.value})}>
                <option value="BASE CENTRAL">BASE CENTRAL</option><option value="CEMO NORTE">CEMO NORTE</option><option value="CEMO SUR">CEMO SUR</option><option value="CEMO CENTRO">CEMO CENTRO</option>
              </select>
            </div>
            <button type="submit" style={{ background: '#0056b3', color: 'white', padding: '10px', marginTop: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>INGRESAR <LogIn size={16} /></button>
          </form>
        </div>
      </div>
    );
  }

  // PANTALLA PRINCIPAL
  return (
    <div style={{ padding: '20px', maxWidth: '850px', margin: 'auto', fontFamily: 'Arial' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '14px' }}>
        <div><span style={{ marginRight: '15px' }}>Operador: <b>{usuarioGenerado}</b></span><span>Base: <b>{datosUsuario.centro}</b></span></div>
        <button onClick={handleLogout} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}><LogOut size={14} /> Salir</button>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>SISTEMA SISIFO - MONITOREO</h2>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', justifyContent: 'center' }}>
        <button onClick={() => setVistaActual('FORMULARIO')} style={{ padding: '10px 15px', cursor: 'pointer', background: vistaActual === 'FORMULARIO' ? '#0056b3' : '#eee', color: vistaActual === 'FORMULARIO' ? 'white' : '#333', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Nuevo Reporte</button>
        <button onClick={() => setVistaActual('ALMACEN')} style={{ padding: '10px 15px', cursor: 'pointer', background: vistaActual === 'ALMACEN' ? '#0056b3' : '#eee', color: vistaActual === 'ALMACEN' ? 'white' : '#333', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Mi Almacén (Historial)</button>
      </div>
      
      {vistaActual === 'FORMULARIO' ? (
        <div style={{ background: '#fff', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', maxWidth: '600px', margin: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
            <span style={{ color: etapa === 'INICIO' ? '#0056b3' : 'inherit' }}>1. INICIO</span><span>→</span>
            <span style={{ color: etapa === 'DESARROLLO' ? '#0056b3' : 'inherit' }}>2. DESARROLLO</span><span>→</span>
            <span style={{ color: etapa === 'FINALIZADO' ? '#0056b3' : 'inherit' }}>3. FINALIZADO</span>
          </div>

          <h3 style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}>Etapa: {etapa}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
            <input style={{ padding: '8px', background: etapa !== 'INICIO' ? '#f0f0f0' : '#fff' }} type="text" placeholder="Cámara (Cam)" value={form.camara} onChange={e => setForm({...form, camara: e.target.value})} disabled={etapa !== 'INICIO'} />
            <input style={{ padding: '8px', background: etapa !== 'INICIO' ? '#f0f0f0' : '#fff' }} type="text" placeholder="Zona" value={form.zona} onChange={e => setForm({...form, zona: e.target.value})} disabled={etapa !== 'INICIO'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {etapa === 'INICIO' && <textarea style={{ padding: '8px', height: '60px' }} placeholder="Describa el Asunto Inicial..." value={form.asunto_inicio} onChange={e => setForm({...form, asunto_inicio: e.target.value})} />}
            {etapa === 'DESARROLLO' && <textarea style={{ padding: '8px', height: '60px' }} placeholder="Describa el Desarrollo de la incidencia..." value={form.asunto_desarrollo} onChange={e => setForm({...form, asunto_desarrollo: e.target.value})} />}
            {etapa === 'FINALIZADO' && (
              <><textarea style={{ padding: '8px', height: '60px' }} placeholder="Conclusión / Reporte Final..." value={form.asunto_finalizado} onChange={e => setForm({...form, asunto_finalizado: e.target.value})} />
                <input style={{ padding: '8px' }} type="text" placeholder="Atendido por (Ej. Serenazgo Unidad 5)..." value={form.atendido} onChange={e => setForm({...form, atendido: e.target.value})} /></>
            )}

            <label style={{ cursor: 'pointer', background: '#eaf4ff', padding: '15px', borderRadius: '5px', textAlign: 'center', border: '2px dashed #0056b3', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '5px', color: '#0056b3' }}><Camera size={20} /> o <ClipboardPaste size={20} /></div>
              <span style={{ fontSize: '14px', color: '#333' }}>Pegar MÚLTIPLES Evidencias (Ctrl+V) o Subir</span>
              {/* input multiple añadido aquí */}
              <input type="file" multiple hidden onChange={handleFileUpload} />
            </label>

            {/* MOSTRAR MÚLTIPLES VISTAS PREVIAS */}
            {vistasPrevias[etapa.toLowerCase()].length > 0 && (
               <div style={{ marginTop: '10px', background: '#f8f9fa', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}>
                 <p style={{ fontSize: '12px', color: 'green', margin: '0 0 10px 0', textAlign: 'center' }}>✅ {vistasPrevias[etapa.toLowerCase()].length} archivo(s) cargado(s)</p>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                   {vistasPrevias[etapa.toLowerCase()].map((vp, index) => (
                     <img key={index} src={vp} alt="Evidencia" style={{ height: '80px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #ccc' }} />
                   ))}
                 </div>
               </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
            <button type="button" onClick={retrocederEtapa} disabled={etapa === 'INICIO'} style={{ background: etapa === 'INICIO' ? '#ccc' : '#6c757d', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: etapa === 'INICIO' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><ArrowLeft size={16} /> Atrás</button>
            {etapa !== 'FINALIZADO' ? (
              <button type="button" onClick={avanzarEtapa} style={{ background: '#0056b3', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>Continuar <ArrowRight size={16} /></button>
            ) : (
              <button type="button" onClick={handleSubmitConsolidado} style={{ background: 'green', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>ENVIAR CONSOLIDADO <Send size={16} /></button>
            )}
          </div>
        </div>
      ) : (
        <Almacen usuarioLogueado={usuarioGenerado} />
      )}
    </div>
  );
}

export default App;