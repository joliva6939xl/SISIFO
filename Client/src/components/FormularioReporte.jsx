import { useState, useRef, useEffect } from 'react';
import { Camera, Send, ClipboardPaste, ArrowRight, ArrowLeft, Edit, X as CloseIcon } from 'lucide-react';
import { io } from 'socket.io-client';
import { enviarReporte, getSocketUrl } from '../api/api';
import { tipificaciones } from '../data/tipificaciones';
import AutocompleteCamara from './AutocompleteCamara';
import AutocompleteAtendido from './AutocompleteAtendido';
import './FormularioReporte.css';

const requiereEspecificar = (incidencia) =>
  typeof incidencia === 'string' && incidencia.toUpperCase().includes('(ESPECIFICAR)');

const buscarTipif = (q) => {
  if (q.trim() === '') return [];
  const v = q.toUpperCase().trim();
  return tipificaciones.filter(t =>
    t.incidencia.toUpperCase().includes(v) || t.categoria.toUpperCase().includes(v)
  );
};

export default function FormularioReporte({ usuarioGenerado, centro, turno }) {
  const [etapa, setEtapa] = useState('INICIO');
  const [edicionCampos, setEdicionCampos] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [tipoCamara, setTipoCamara] = useState('PTZ');
  const [esRetroactivo, setEsRetroactivo] = useState(false);
  const [fechaRetroactiva, setFechaRetroactiva] = useState('');

  const roperInicial = localStorage.getItem('sisifo_roper') || '';

  const [form, setForm] = useState({
    camara: '', zona: '', roper: roperInicial,
    categoria: '', incidencia: '', incidencia_otro: '',
    asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '',
    atendido_desarrollo: '',
    atendido: ''
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

  const sugerenciasFiltradas = buscarTipif(busquedaIncidencia);

  const seleccionarIncidencia = (tipif) => {
    setForm({ ...form, incidencia: tipif.incidencia, categoria: tipif.categoria, incidencia_otro: '' });
    setBusquedaIncidencia(tipif.incidencia);
    setMostrarSugerencias(false);
    setIndiceSeleccionado(-1);
    setEnterArmado(true);
  };

  const limpiarIncidencia = () => {
    setBusquedaIncidencia('');
    setForm(prev => ({ ...prev, incidencia: '', categoria: '', incidencia_otro: '' }));
    setMostrarSugerencias(false);
    setIndiceSeleccionado(-1);
    setTimeout(() => { if (inputBusquedaRef.current) inputBusquedaRef.current.focus(); }, 0);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const currEtapa = etapa.toLowerCase();
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setArchivos(prev => ({ ...prev, [currEtapa]: [...prev[currEtapa], file] }));
          setVistasPrevias(prev => ({ ...prev, [currEtapa]: [...prev[currEtapa], reader.result] }));
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

  const cambiarRoper = (valor) => {
    const v = valor.toUpperCase();
    setForm(prev => ({ ...prev, roper: v }));
    localStorage.setItem('sisifo_roper', v);
  };

  const avanzarEtapa = () => {
    setEnterArmado(false);
    if (etapa === 'INICIO') {
      if (!form.camara || !form.zona || !form.roper || !form.incidencia || !form.asunto_inicio)
        return alert("Complete todos los datos iniciales incluyendo la Incidencia.");
      if (requiereEspecificar(form.incidencia) && !form.incidencia_otro)
        return alert("Debe especificar el detalle de incidencias.");
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

    // ✅ VALIDACIÓN INTELIGENTE: Solo exige "cierre" si estás en FINALIZADO
    if (etapa === 'FINALIZADO') {
      if (!form.asunto_finalizado || !form.atendido) {
        setEnterArmado(false);
        return alert("Complete el cierre (Conclusión y Atendido por Finalizado).");
      }
    } else if (etapa === 'DESARROLLO') {
      if (!form.asunto_desarrollo) {
        setEnterArmado(false);
        return alert("Complete el Desarrollo.");
      }
    }

    if (esRetroactivo && !fechaRetroactiva) {
      return alert("Por favor, seleccione la fecha y hora real del incidente.");
    }

    // ✅ NUEVO: Pregunta de confirmación antes de enviar (solo en FINALIZADO)
    if (etapa === 'FINALIZADO') {
      const respuesta = window.confirm(
        "¿Falta ingresar más unidades o entidades que participaron en la atención?\n\n" +
        "• Haga clic en ACEPTAR si quiere AGREGAR más unidades.\n" +
        "• Haga clic en CANCELAR si ya está todo completo y desea ENVIAR el reporte."
      );

      if (respuesta) {
        // El usuario dijo SÍ (falta agregar más) → No envía, se queda editando
        setEnterArmado(false);
        return;
      }
      // Si dijo NO (cancelar en el confirm), continúa con el envío
    }

    setEnterArmado(false);
    const idGenerado = Math.floor(Math.random() * 1000000);
    const incidenciaFinal = requiereEspecificar(form.incidencia) ? `${form.incidencia} - ${form.incidencia_otro}` : form.incidencia;

    const enviarPaquete = async (nombreEtapa, asuntoTexto, atendidoTexto, atendidoDesarrolloTexto, listaArchivos) => {
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
      fd.append('atendido_desarrollo', atendidoDesarrolloTexto || '');
      fd.append('operador', usuarioGenerado);
      fd.append('centro_trabajo', centro);
      fd.append('turno', turno);
      if (esRetroactivo && fechaRetroactiva) fd.append('fecha_real_input', fechaRetroactiva);
      if (listaArchivos && listaArchivos.length > 0) listaArchivos.forEach(file => fd.append('archivos', file));
      return enviarReporte(fd);
    };

    try {
      if (form.asunto_inicio) await enviarPaquete('INICIO', form.asunto_inicio, '', '', archivos.inicio);
      if (form.asunto_desarrollo) await enviarPaquete('DESARROLLO', form.asunto_desarrollo, form.atendido_desarrollo || '', '', archivos.desarrollo);
      if (form.asunto_finalizado) await enviarPaquete('FINALIZADO', form.asunto_finalizado, form.atendido, form.atendido_desarrollo || '', archivos.finalizado);

      const socketBot = io(getSocketUrl());
      socketBot.on('connect', () => {
        socketBot.emit('enviar_mensaje', { remitente: 'SISTEMA', contenido: `Incidencia #${idGenerado} consolidada.`, es_sistema: true });
        setTimeout(() => socketBot.disconnect(), 500);
      });

      alert(`Reporte enviado: #${idGenerado}`);
      setEtapa('INICIO');
      setResetKey(prev => prev + 1);
      setForm({
        camara: '', zona: '', roper: form.roper, categoria: '', incidencia: '', incidencia_otro: '',
        asunto_inicio: '', asunto_desarrollo: '', asunto_finalizado: '',
        atendido_desarrollo: '',
        atendido: ''
      });
      setBusquedaIncidencia('');
      setArchivos({ inicio: [], desarrollo: [], finalizado: [] });
      setVistasPrevias({ inicio: [], desarrollo: [], finalizado: [] });
      setEsRetroactivo(false);
      setFechaRetroactiva('');
    } catch (error) {
      console.error("Error al consolidar:", error);
      alert('Error al enviar.');
    }
  };

  const handleKeyDownBusqueda = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (mostrarSugerencias && sugerenciasFiltradas.length > 0) setIndiceSeleccionado(prev => prev < sugerenciasFiltradas.length - 1 ? prev + 1 : 0); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (mostrarSugerencias && sugerenciasFiltradas.length > 0) setIndiceSeleccionado(prev => prev > 0 ? prev - 1 : sugerenciasFiltradas.length - 1); return; }
    if (e.key === 'Escape') { e.preventDefault(); setMostrarSugerencias(false); setIndiceSeleccionado(-1); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (mostrarSugerencias && sugerenciasFiltradas.length > 0) { e.preventDefault(); e.stopPropagation(); const idx = indiceSeleccionado >= 0 ? indiceSeleccionado : 0; seleccionarIncidencia(sugerenciasFiltradas[idx]); return; }
      if (mostrarSugerencias) { e.preventDefault(); e.stopPropagation(); setMostrarSugerencias(false); setIndiceSeleccionado(-1); return; }
    }
  };

  useEffect(() => { liveRef.current = { enterArmado, etapa, mostrarSugerencias }; fnRef.current = { avanzar: avanzarEtapa, enviar: handleSubmitConsolidado }; });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) return;
        if (e.target.tagName === 'BUTTON') return;
        if (liveRef.current.mostrarSugerencias && e.target === inputBusquedaRef.current) return;
        e.preventDefault();
        if (!liveRef.current.enterArmado) setEnterArmado(true);
        else if (liveRef.current.etapa !== 'FINALIZADO') fnRef.current.avanzar();
        else fnRef.current.enviar(e);
      } else if (e.key === 'Escape') { setEnterArmado(false); setMostrarSugerencias(false); setIndiceSeleccionado(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const handleClickFuera = (e) => { if (sugerenciasRef.current && !sugerenciasRef.current.contains(e.target)) { setMostrarSugerencias(false); setIndiceSeleccionado(-1); } };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  useEffect(() => { if (indiceSeleccionado >= 0 && opcionRef.current) opcionRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [indiceSeleccionado]);

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
            setArchivos(prev => ({ ...prev, [currEtapa]: [...prev[currEtapa], file] }));
            setVistasPrevias(prev => ({ ...prev, [currEtapa]: [...prev[currEtapa], reader.result] }));
          };
          reader.readAsDataURL(file);
        }
      }
    };
    document.addEventListener('paste', handlePasteGlobal);
    return () => document.removeEventListener('paste', handlePasteGlobal);
  }, [etapa]);

  const bloqueado = etapa !== 'INICIO' && !edicionCampos;
  const esIncidenciaEspecificar = requiereEspecificar(form.incidencia);

  return (
    <div className="formulario-container">
      <div className="formulario-etapas">
        <span className={etapa === 'INICIO' ? 'etapa-activa' : ''}>1. INICIO</span>
        <span className="etapa-separador">→</span>
        <span className={etapa === 'DESARROLLO' ? 'etapa-activa' : ''}>2. DESARROLLO</span>
        <span className="etapa-separador">→</span>
        <span className={etapa === 'FINALIZADO' ? 'etapa-activa' : ''}>3. FINALIZADO</span>
      </div>

      <div className="formulario-header">
        <h3>Etapa: {etapa}</h3>
        {etapa !== 'INICIO' && (
          <button type="button" onClick={() => setEdicionCampos(!edicionCampos)} className={`btn-editar ${edicionCampos ? 'editando' : ''}`}>
            <Edit size={14} /> {edicionCampos ? 'Bloquear Campos' : 'Editar (Seguimiento)'}
          </button>
        )}
      </div>

      <div className="formulario-campos">
        <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
            <input type="radio" name="tipoCamara" value="PTZ" checked={tipoCamara === 'PTZ'} onChange={(e) => { setTipoCamara(e.target.value); setForm(prev => ({ ...prev, camara: '', zona: '' })); }} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0056b3' }} />
            CPTZ
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
            <input type="radio" name="tipoCamara" value="FIJA" checked={tipoCamara === 'FIJA'} onChange={(e) => { setTipoCamara(e.target.value); setForm(prev => ({ ...prev, camara: '', zona: '' })); }} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0056b3' }} />
            CF
          </label>
        </div>

        <AutocompleteCamara
          key={resetKey + '-' + tipoCamara}
          tipoCamara={tipoCamara}
          value={form.camara}
          onSelect={(camara) => {
            setForm(prev => ({
              ...prev,
              camara: `${camara.codigo} - ${camara.nombre}`,
              zona: `${camara.macro_zona}${camara.sector ? ' / SECTOR ' + camara.sector : ''}`
            }));
          }}
          onClear={() => { setForm(prev => ({ ...prev, camara: '', zona: '' })); }}
        />

        <input className={`formulario-input ${form.zona ? 'con-valor' : ''}`} type="text" placeholder="Zona (se autocompleta al elegir cámara)" value={form.zona} readOnly />

        <input className={`formulario-input roper ${form.roper ? 'con-valor' : ''}`} type="text" placeholder="ROPER (escríbelo una vez y se guarda para el turno)" value={form.roper} onChange={(e) => cambiarRoper(e.target.value)} disabled={bloqueado} title="Se guarda automáticamente; se limpia al cerrar sesión" />

        {esIncidenciaEspecificar ? (
          <div className="incidencia-especificar">
            <span className="etiqueta">{form.incidencia}</span>
            <input type="text" placeholder="Escriba el detalle de la incidencia..." value={form.incidencia_otro} onChange={e => setForm({ ...form, incidencia_otro: e.target.value.toUpperCase() })} autoFocus className="input-detalle" />
            <button type="button" onClick={() => setForm({ ...form, incidencia: '', categoria: '', incidencia_otro: '' })} title="Cancelar y volver a buscar" className="btn-cancelar">×</button>
          </div>
        ) : (
          <div className="sugerencias-container" ref={sugerenciasRef}>
            <label className="formulario-label">Incidencia: <span className="label-hint">(↑↓ navegar · Enter elegir · Esc cerrar)</span></label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input ref={inputBusquedaRef} type="text" placeholder=" Escriba para buscar incidencia o categoría..." value={busquedaIncidencia} onChange={(e) => { const valor = e.target.value.toUpperCase(); setBusquedaIncidencia(valor); const coincide = buscarTipif(valor); setMostrarSugerencias(coincide.length > 0); setIndiceSeleccionado(coincide.length > 0 ? 0 : -1); if (form.incidencia && !valor.includes(form.incidencia.substring(0, 10))) setForm({ ...form, incidencia: '', categoria: '' }); }} onFocus={() => { if (busquedaIncidencia.trim() !== '' && busquedaIncidencia !== form.incidencia) setMostrarSugerencias(true); }} onKeyDown={handleKeyDownBusqueda} className="formulario-input incidencia" style={{ paddingRight: busquedaIncidencia ? '40px' : '14px' }} />
              {busquedaIncidencia && (
                <button type="button" onClick={limpiarIncidencia} title="Limpiar incidencia" style={{ position: 'absolute', right: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '14px', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'} onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}>×</button>
              )}
            </div>
            {mostrarSugerencias && sugerenciasFiltradas.length > 0 && (
              <div className="sugerencias-lista">
                {sugerenciasFiltradas.map((t, idx) => { const activa = idx === indiceSeleccionado; const esGlobal = t.categoria === "OTRAS INCIDENCIAS NO TIPIFICADAS"; return (<div key={idx} ref={activa ? opcionRef : null} onClick={() => seleccionarIncidencia(t)} onMouseEnter={() => setIndiceSeleccionado(idx)} className={`sugerencia-item ${activa ? 'activa' : ''} ${esGlobal ? 'global' : ''} ${form.incidencia === t.incidencia ? 'seleccionada' : ''}`}><strong className="sugerencia-numero">{String(idx + 1).padStart(3, '0')}.</strong> {t.incidencia}<span className="sugerencia-categoria">{t.categoria}</span></div>); })}
              </div>
            )}
            {mostrarSugerencias && sugerenciasFiltradas.length === 0 && busquedaIncidencia.trim() !== '' && (<div className="sugerencias-vacio">No se encontraron coincidencias</div>)}
          </div>
        )}

        <input className={`formulario-input ${form.categoria ? 'con-valor' : ''}`} type="text" placeholder="Categoría (autocompletada)" value={form.categoria} readOnly />
      </div>

      <div style={{ background: esRetroactivo ? '#fff3cd' : '#f8f9fa', border: `1px solid ${esRetroactivo ? '#ffc107' : '#dee2e6'}`, borderRadius: '6px', padding: '12px', marginBottom: '15px', transition: 'all 0.3s ease' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#333' }}>
          <input type="checkbox" checked={esRetroactivo} onChange={(e) => { setEsRetroactivo(e.target.checked); if (!e.target.checked) setFechaRetroactiva(''); }} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          📅 ¿El incidente ocurrió en una fecha anterior? (Ej. por fallas de sistema)
        </label>
        {esRetroactivo && (
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#856404' }}>Fecha y hora real del incidente:</label>
            <input type="datetime-local" value={fechaRetroactiva} onChange={(e) => setFechaRetroactiva(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
            <div style={{ fontSize: '11px', color: '#856404', marginTop: '5px', fontStyle: 'italic' }}>ℹ El sistema guardará esta fecha para el reporte, pero mantendrá el registro de auditoría de subida.</div>
          </div>
        )}
      </div>

      <div className="formulario-textareas">
        <div style={{ display: etapa === 'INICIO' ? 'block' : 'none' }}>
          <label className="formulario-label">Asunto Inicial</label>
          <textarea className="formulario-textarea" placeholder="Describa el Asunto Inicial... (Enter = avanzar · Shift+Enter = nueva línea)" value={form.asunto_inicio} onChange={e => setForm({ ...form, asunto_inicio: e.target.value.toUpperCase() })} />
        </div>

        {/* ✅ ETAPA DESARROLLO: Con campo Atendido por */}
        <div style={{ display: etapa === 'DESARROLLO' ? 'block' : 'none' }}>
          <label className="formulario-label">Desarrollo</label>
          <textarea className="formulario-textarea" placeholder="Describa el Desarrollo... (Enter = avanzar · Shift+Enter = nueva línea)" value={form.asunto_desarrollo} onChange={e => setForm({ ...form, asunto_desarrollo: e.target.value.toUpperCase() })} />
          <div style={{ marginTop: '15px' }}>
            <label className="formulario-label">Atendido por (Desarrollo):</label>
            <AutocompleteAtendido
              value={form.atendido_desarrollo}
              onChange={(valor) => setForm(prev => ({ ...prev, atendido_desarrollo: valor }))}
            />
          </div>
        </div>

        {/* ✅ ETAPA FINALIZADO: Con campo Atendido por (se bloquea el de desarrollo) */}
        <div style={{ display: etapa === 'FINALIZADO' ? 'block' : 'none' }}>
          <label className="formulario-label">Conclusión / Reporte Final</label>
          <textarea
            className="formulario-textarea"
            placeholder="Conclusión / Reporte Final... (Enter = enviar · Shift+Enter = nueva línea)"
            value={form.asunto_finalizado}
            onChange={e => setForm({ ...form, asunto_finalizado: e.target.value.toUpperCase() })}
          />

          {form.atendido_desarrollo && (
            <div style={{ marginTop: '15px', padding: '10px', background: '#f0f7ff', border: '1px solid #cce5ff', borderRadius: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0056b3', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                🔒 Atendido en Desarrollo (bloqueado):
              </label>
              <input
                type="text"
                value={form.atendido_desarrollo}
                readOnly
                style={{ width: '100%', padding: '8px', background: '#e9ecef', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', color: '#495057', boxSizing: 'border-box', fontStyle: 'italic' }}
              />
              <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '4px', fontStyle: 'italic' }}>
                ℹ Este dato fue registrado en la etapa de Desarrollo y no puede modificarse.
              </div>
            </div>
          )}

          <div style={{ marginTop: '15px' }}>
            <label className="formulario-label">
              Atendido por (Finalizado):
              <span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal', marginLeft: '5px' }}>
                (escribe, elige con ↑↓/Enter, y usa + para varias unidades)
              </span>
            </label>
            <AutocompleteAtendido
              value={form.atendido}
              onChange={(valor) => setForm(prev => ({ ...prev, atendido: valor }))}
            />
          </div>
        </div>

        <label className="formulario-imagenes">
          <div className="iconos"><Camera size={22} /> o <ClipboardPaste size={22} /></div>
          <span className="texto-principal">Presiona Ctrl+V para pegar imágenes</span><br />
          <span className="texto-secundario">O haz clic aquí para buscar</span>
          <input type="file" multiple hidden onChange={handleFileUpload} />
        </label>
        {vistasPrevias[etapa.toLowerCase()].length > 0 && (
          <div className="formulario-vistas-previas">
            <div className="formulario-vistas-previas-grid">
              {vistasPrevias[etapa.toLowerCase()].map((vp, index) => (
                <div key={index} className="vista-previa-item">
                  <img src={vp} alt="Evidencia" />
                  <button type="button" onClick={() => eliminarFoto(index)} className="btn-eliminar"><CloseIcon size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {enterArmado && (<div className="formulario-enter-armado">⚠️ ENTER ARMADO — presione ENTER de nuevo para {etapa !== 'FINALIZADO' ? 'avanzar' : 'ENVIAR'}, o Esc para cancelar</div>)}

      <div className="formulario-navegacion">
        <button type="button" onClick={retrocederEtapa} disabled={etapa === 'INICIO'} className="btn-navegacion btn-atras"><ArrowLeft size={16} /> Atrás</button>
        {etapa !== 'FINALIZADO' ? (
          <button type="button" onClick={avanzarEtapa} className={`btn-navegacion btn-continuar ${enterArmado ? 'armado' : ''}`}>Continuar <ArrowRight size={16} /></button>
        ) : (
          <button type="button" onClick={handleSubmitConsolidado} className={`btn-navegacion btn-enviar ${enterArmado ? 'armado' : ''}`}>ENVIAR CONSOLIDADO <Send size={16} /></button>
        )}
      </div>
    </div>
  );
}