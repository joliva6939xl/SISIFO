import { useState, useRef, useEffect } from 'react';
import { Camera, Send, ClipboardPaste, ArrowRight, ArrowLeft, Edit, X as CloseIcon } from 'lucide-react';
import { io } from 'socket.io-client';
import { enviarReporte } from '../api/api';
import { tipificaciones } from '../data/tipificaciones';
import AutocompleteCamara from './AutocompleteCamara';
import AutocompleteAtendido from './AutocompleteAtendido';

export default function FormularioReporte({ usuarioGenerado, centro, turno }) {
  const [etapa, setEtapa] = useState('INICIO');
  const [edicionCampos, setEdicionCampos] = useState(false);
  const [form, setForm] = useState({ 
    camara: '', zona: '', roper: '', 
    categoria: '', incidencia: '', incidencia_otro: '',
    asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '', atendido: '' 
  });
  const [busquedaIncidencia, setBusquedaIncidencia] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1);
  const [enterArmado, setEnterArmado] = useState(false);
  const [archivos, setArchivos] = useState({ inicio: [], desarrollo: [], finalizado: [] });
  const [vistasPrevias, setVistasPrevias] = useState({ inicio: [], desarrollo: [], finalizado: [] });

  const sugerenciasRef = useRef(null);
  const inputBusquedaRef = useRef(null);
  const opcionRef = useRef(null);
  const liveRef = useRef({ enterArmado, etapa, mostrarSugerencias });
  const fnRef = useRef({ avanzar: null, enviar: null });

  const sugerenciasFiltradas = busquedaIncidencia.trim() === '' 
    ? [] 
    : tipificaciones.filter(t => t.incidencia.toUpperCase().includes(busquedaIncidencia.toUpperCase()));

  const seleccionarIncidencia = (tipif) => {
    setForm({ ...form, incidencia: tipif.incidencia, categoria: tipif.categoria, incidencia_otro: '' });
    setBusquedaIncidencia(tipif.incidencia);
    setMostrarSugerencias(false);
    setIndiceSeleccionado(-1);
    setEnterArmado(true);
  };

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

  const avanzarEtapa = () => {
    setEnterArmado(false);
    if (etapa === 'INICIO') {
      if (!form.camara || !form.zona || !form.roper || !form.incidencia || !form.asunto_inicio) 
        return alert("Complete todos los datos iniciales incluyendo la Incidencia.");
      if (form.incidencia === 'ESPECIFICAR' && !form.incidencia_otro) 
        return alert("Debe especificar la incidencia no tipificada.");
      setEtapa('DESARROLLO');
      setEdicionCampos(false);
    } else if (etapa === 'DESARROLLO') {
      if (!form.asunto_desarrollo) return alert("Complete desarrollo.");
      setEtapa('FINALIZADO');
      setEdicionCampos(false);
    }
  };

  const retrocederEtapa = () => {
    if (etapa === 'FINALIZADO') setEtapa('DESARROLLO');
    else if (etapa === 'DESARROLLO') setEtapa('INICIO');
    setEdicionCampos(false);
    setEnterArmado(false);
  };

  const handleSubmitConsolidado = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.asunto_finalizado || !form.atendido) { setEnterArmado(false); return alert("Complete el cierre."); }
    setEnterArmado(false);
    const idGenerado = Math.floor(Math.random() * 1000000);
    const incidenciaFinal = form.incidencia === 'ESPECIFICAR' ? form.incidencia_otro : form.incidencia;
    
    const enviarPaquete = async (nombreEtapa, asuntoTexto, atendidoTexto, listaArchivos) => {
      const fd = new FormData();
      fd.append('id_incidencia', idGenerado);
      fd.append('etapa', nombreEtapa);
      fd.append('camara', form.camara);
      fd.append('zona', form.zona);
      fd.append('roper', form.roper);
      fd.append('categoria', form.categoria);
      fd.append('incidencia', incidenciaFinal);
      fd.append('asunto', asuntoTexto);
      fd.append('atendido', atendidoTexto);
      fd.append('operador', usuarioGenerado);
      fd.append('centro_trabajo', centro);
      fd.append('turno', turno);
      if (listaArchivos && listaArchivos.length > 0) listaArchivos.forEach(file => fd.append('archivos', file));
      return enviarReporte(fd);
    };
    
    try {
      if(form.asunto_inicio) await enviarPaquete('INICIO', form.asunto_inicio, '', archivos.inicio);
      if(form.asunto_desarrollo) await enviarPaquete('DESARROLLO', form.asunto_desarrollo, '', archivos.desarrollo);
      if(form.asunto_finalizado) await enviarPaquete('FINALIZADO', form.asunto_finalizado, form.atendido, archivos.finalizado);
      
      const urlBase = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;
      const socketBot = io(urlBase);
      socketBot.emit('enviar_mensaje', { remitente: 'SISTEMA', contenido: `Incidencia #${idGenerado} consolidada.`, es_sistema: true });
      setTimeout(() => socketBot.disconnect(), 1000);
      
      alert(`Reporte enviado: #${idGenerado}`);
      setEtapa('INICIO');
      setForm({ camara: '', zona: '', roper: '', categoria: '', incidencia: '', incidencia_otro: '', asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '', atendido: '' });
      setBusquedaIncidencia('');
      setArchivos({ inicio: [], desarrollo: [], finalizado: [] });
      setVistasPrevias({ inicio: [], desarrollo: [], finalizado: [] });
    } catch (error) {
      console.error("Error al consolidar:", error);
      alert('Error al enviar.');
    }
  };

  const handleKeyDownBusqueda = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (mostrarSugerencias && sugerenciasFiltradas.length > 0)
        setIndiceSeleccionado(prev => prev < sugerenciasFiltradas.length - 1 ? prev + 1 : 0);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (mostrarSugerencias && sugerenciasFiltradas.length > 0)
        setIndiceSeleccionado(prev => prev > 0 ? prev - 1 : sugerenciasFiltradas.length - 1);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setMostrarSugerencias(false);
      setIndiceSeleccionado(-1);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (mostrarSugerencias && sugerenciasFiltradas.length > 0) {
        e.preventDefault(); e.stopPropagation();
        const idx = indiceSeleccionado >= 0 ? indiceSeleccionado : 0;
        seleccionarIncidencia(sugerenciasFiltradas[idx]);
        return;
      }
      if (mostrarSugerencias) {
        e.preventDefault(); e.stopPropagation();
        setMostrarSugerencias(false);
        setIndiceSeleccionado(-1);
        return;
      }
    }
  };

  useEffect(() => {
    liveRef.current = { enterArmado, etapa, mostrarSugerencias };
    fnRef.current = { avanzar: avanzarEtapa, enviar: handleSubmitConsolidado };
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) return;
        if (e.target.tagName === 'BUTTON') return;
        if (liveRef.current.mostrarSugerencias && e.target === inputBusquedaRef.current) return;
        e.preventDefault();
        if (!liveRef.current.enterArmado) {
          setEnterArmado(true);
        } else if (liveRef.current.etapa !== 'FINALIZADO') {
          fnRef.current.avanzar();
        } else {
          fnRef.current.enviar(e);
        }
      } else if (e.key === 'Escape') {
        setEnterArmado(false);
        setMostrarSugerencias(false);
        setIndiceSeleccionado(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(e.target)) {
        setMostrarSugerencias(false);
        setIndiceSeleccionado(-1);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  useEffect(() => {
    if (indiceSeleccionado >= 0 && opcionRef.current) {
      opcionRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [indiceSeleccionado]);

  useEffect(() => {
    const handlePasteGlobal = (e) => {
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;
      const currEtapa = etapa.toLowerCase();
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
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
    };
    document.addEventListener('paste', handlePasteGlobal);
    return () => document.removeEventListener('paste', handlePasteGlobal);
  }, [etapa]);

  const inputStyle = (bloqueado) => ({ padding: '8px', background: bloqueado ? '#f0f0f0' : '#fff', border: '1px solid #ccc', borderRadius: '4px' });
  const bloqueado = etapa !== 'INICIO' && !edicionCampos;

  return (
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
        
        <AutocompleteCamara
          value={form.camara}
          onSelect={(camara) => {
            setForm(prev => ({
              ...prev,
              camara: `${camara.codigo} - ${camara.nombre}`,
              zona: `${camara.macro_zona}/SECTOR ${camara.sector}`
            }));
          }}
          onClear={() => {
            setForm(prev => ({ ...prev, camara: '', zona: '' }));
          }}
        />

        <input
          style={{
            padding: '8px',
            background: form.zona ? '#e9ecef' : '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            color: form.zona ? '#495057' : '#6c757d',
            fontStyle: form.zona ? 'normal' : 'italic',
            fontWeight: form.zona ? 'bold' : 'normal'
          }}
          type="text"
          placeholder="Zona (se autocompleta al elegir cámara)"
          value={form.zona}
          readOnly
        />

        <input style={inputStyle(bloqueado)} type="text" placeholder="ROPER (Encargado del Servicio)" value={form.roper} onChange={e => setForm({...form, roper: e.target.value.toUpperCase()})} disabled={bloqueado} />
        
        <div style={{ position: 'relative' }} ref={sugerenciasRef}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
            Incidencia: <span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>(↑↓ navegar · Enter elegir · Esc cerrar)</span>
          </label>
          <input 
            ref={inputBusquedaRef}
            type="text" 
            placeholder=" Escriba para buscar incidencia..." 
            value={busquedaIncidencia} 
            onChange={(e) => {
              const valor = e.target.value.toUpperCase();
              setBusquedaIncidencia(valor);
              const coincide = valor.trim() === '' ? [] : tipificaciones.filter(t => t.incidencia.toUpperCase().includes(valor));
              setMostrarSugerencias(coincide.length > 0);
              setIndiceSeleccionado(coincide.length > 0 ? 0 : -1);
              if (form.incidencia && !valor.includes(form.incidencia.substring(0, 10))) setForm({ ...form, incidencia: '', categoria: '' });
            }} 
            onFocus={() => { if (busquedaIncidencia.trim() !== '' && busquedaIncidencia !== form.incidencia) setMostrarSugerencias(true); }} 
            onKeyDown={handleKeyDownBusqueda}
            style={{ padding: '10px', border: '2px solid #0056b3', borderRadius: '4px', fontSize: '13px', background: '#fff', width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} 
          />
          {mostrarSugerencias && sugerenciasFiltradas.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '300px', overflowY: 'auto', zIndex: 1000, marginTop: '5px' }}>
              {sugerenciasFiltradas.map((t, idx) => {
                const activa = idx === indiceSeleccionado;
                return (
                  <div key={idx} ref={activa ? opcionRef : null} onClick={() => seleccionarIncidencia(t)} onMouseEnter={() => setIndiceSeleccionado(idx)}
                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '12px', background: activa ? '#0056b3' : (form.incidencia === t.incidencia ? '#e3f2fd' : 'white'), color: activa ? 'white' : '#333', transition: 'background 0.15s, color 0.15s', fontWeight: activa ? 'bold' : 'normal' }}>
                    <strong style={{ color: activa ? '#ffd54f' : '#0056b3' }}>{String(idx + 1).padStart(3, '0')}.</strong> {t.incidencia}
                  </div>
                );
              })}
            </div>
          )}
          {mostrarSugerencias && sugerenciasFiltradas.length === 0 && busquedaIncidencia.trim() !== '' && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '15px', zIndex: 1000, marginTop: '5px', textAlign: 'center', color: '#666', fontSize: '13px' }}>No se encontraron coincidencias</div>
          )}
        </div>

        <input style={{ padding: '8px', background: form.categoria ? '#e9ecef' : '#fff', border: '1px solid #ccc', borderRadius: '4px', color: form.categoria ? '#495057' : '#6c757d', fontStyle: form.categoria ? 'normal' : 'italic', fontWeight: form.categoria ? 'bold' : 'normal' }} type="text" placeholder="Categoría (autocompletada)" value={form.categoria} readOnly />
        {form.incidencia === 'ESPECIFICAR' && (
          <input style={{ padding: '8px', background: '#fff', border: '2px solid #ff9800', borderRadius: '4px' }} type="text" placeholder="Especifique la incidencia no tipificada..." value={form.incidencia_otro} onChange={e => setForm({...form, incidencia_otro: e.target.value.toUpperCase()})} required />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {etapa === 'INICIO' && (
          <textarea style={{ padding: '8px', height: '60px', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="Describa el Asunto Inicial... (Enter = avanzar · Shift+Enter = nueva línea)" value={form.asunto_inicio} onChange={e => setForm({...form, asunto_inicio: e.target.value.toUpperCase()})} />
        )}
        {etapa === 'DESARROLLO' && (
          <textarea style={{ padding: '8px', height: '60px', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="Describa el Desarrollo... (Enter = avanzar · Shift+Enter = nueva línea)" value={form.asunto_desarrollo} onChange={e => setForm({...form, asunto_desarrollo: e.target.value.toUpperCase()})} />
        )}
        {etapa === 'FINALIZADO' && (
          <>
            <textarea style={{ padding: '8px', height: '60px', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="Conclusión / Reporte Final... (Enter = enviar · Shift+Enter = nueva línea)" value={form.asunto_finalizado} onChange={e => setForm({...form, asunto_finalizado: e.target.value.toUpperCase()})} />
            
            {/* ✅ AUTOCOMPLETE ATENDIDO POR (NUEVO) */}
            <AutocompleteAtendido onChange={(valor) => setForm(prev => ({ ...prev, atendido: valor }))} />
            
          </>
        )}
        <label style={{ cursor: 'pointer', background: '#eaf4ff', padding: '15px', borderRadius: '5px', textAlign: 'center', border: '2px dashed #0056b3', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '5px', color: '#0056b3' }}><Camera size={20} /> o <ClipboardPaste size={20} /></div>
          <span style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>Presiona Ctrl+V para pegar imágenes</span><br />
          <span style={{ fontSize: '11px', color: '#666' }}>O haz clic aquí para buscar</span>
          <input type="file" multiple hidden onChange={handleFileUpload} />
        </label>
        {vistasPrevias[etapa.toLowerCase()].length > 0 && (
          <div style={{ marginTop: '10px', background: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
              {vistasPrevias[etapa.toLowerCase()].map((vp, index) => (
                <div key={index} style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={vp} alt="Evidencia" style={{ height: '80px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #ccc' }} />
                  <button type="button" onClick={() => eliminarFoto(index)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0 }}>
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {enterArmado && (
        <div style={{ textAlign: 'center', marginTop: '15px', padding: '8px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#856404' }}>
          ️ ENTER ARMADO — presione ENTER de nuevo para {etapa !== 'FINALIZADO' ? 'avanzar' : 'ENVIAR'}, o Esc para cancelar
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
        <button type="button" onClick={retrocederEtapa} disabled={etapa === 'INICIO'} style={{ background: etapa === 'INICIO' ? '#ccc' : '#6c757d', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
          <ArrowLeft size={16} /> Atrás
        </button>
        {etapa !== 'FINALIZADO' ? (
          <button type="button" onClick={avanzarEtapa} style={{ background: enterArmado ? '#ff9800' : '#0056b3', color: 'white', padding: '10px 20px', border: enterArmado ? '3px solid #ff5722' : 'none', borderRadius: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: enterArmado ? '0 0 15px rgba(255,152,0,0.6)' : 'none', transform: enterArmado ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.25s ease' }}>
            Continuar <ArrowRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSubmitConsolidado} style={{ background: enterArmado ? '#ff9800' : 'green', color: 'white', padding: '10px 20px', border: enterArmado ? '3px solid #ff5722' : 'none', borderRadius: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: enterArmado ? '0 0 15px rgba(255,152,0,0.6)' : 'none', transform: enterArmado ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.25s ease' }}>
            ENVIAR CONSOLIDADO <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}