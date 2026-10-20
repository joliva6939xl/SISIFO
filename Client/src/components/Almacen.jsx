import { useEffect, useState } from 'react';
// ✅ FIX 3: importamos getMediaUrl y getSocketUrl
import { obtenerReportesPorOperador, obtenerReportesGlobales, obtenerUsuariosLista, getMediaUrl, getSocketUrl } from '../api/api';
import { Eye, FileText, ArrowLeft, Image as ImageIcon, BarChart2, Search, Filter, ChevronLeft, ChevronRight, MapPin, Calendar, User, Users, Activity, Download, Shield } from 'lucide-react';
import NotificadorTiempoReal from './NotificadorTiempoReal';
import FeedEnVivo from './FeedEnVivo';
import './Almacen.css';

function Almacen({ usuarioLogueado, cargo }) {
  const tieneAccesoGlobal = cargo === 'ANALISTA' || cargo === 'ADMINISTRADOR';
  const esSoloAnalista = cargo === 'ANALISTA';
  
  const [vistaAnalista, setVistaAnalista] = useState(() => {
    return cargo === 'ADMINISTRADOR' ? 'USUARIOS' : 'GLOBAL';
  });

  const [reportesAgrupados, setReportesAgrupados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [informeSeleccionado, setInformeSeleccionado] = useState(null);
  const [listaUsuariosBD, setListaUsuariosBD] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [busquedaId, setBusquedaId] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(''); 
  const [filtroOperador, setFiltroOperador] = useState(''); 
  const [filtroRoper, setFiltroRoper] = useState(''); 
  const [paginaActual, setPaginaActual] = useState(1);
  const REGISTROS_POR_PAGINA = 10;

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        let respuesta;
        if (tieneAccesoGlobal) {
          respuesta = await obtenerReportesGlobales();
          const resUsuarios = await obtenerUsuariosLista();
          setListaUsuariosBD(resUsuarios.data);
        } else {
          respuesta = await obtenerReportesPorOperador(usuarioLogueado);
        }

        const grupos = respuesta.data.reduce((acc, reporte) => {
          if (!acc[reporte.id_incidencia]) acc[reporte.id_incidencia] = [];
          acc[reporte.id_incidencia].push(reporte);
          return acc;
        }, {});
        setReportesAgrupados(grupos);
      } catch (error) {
        console.error("Error al traer datos:", error);
      } finally {
        setCargando(false);
      }
    };
    if (usuarioLogueado) cargarDatos();
  }, [usuarioLogueado, cargo, tieneAccesoGlobal]);

  const parseFotos = (foto_video) => {
    if (!foto_video) return [];
    try { return JSON.parse(foto_video); } 
    catch { return [foto_video]; } 
  };

  const handleExportar = async (datos) => {
    if (!datos || datos.length === 0) {
      alert('No hay datos filtrados para exportar.');
      return;
    }
    const idsFiltrados = datos.map(exp => parseInt(exp.id));
    try {
      // ✅ FIX 3: el export ahora apunta al backend (3000) con la IP real, no a localhost
      const response = await fetch(`${getSocketUrl()}/api/exportar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsFiltrados, generadoPor: usuarioLogueado, operadorFiltro: filtroOperador })
      });
      
      if (!response.ok) return alert('Error al generar el archivo.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const marcaTiempo = new Date().getTime();
      const nomArchivo = filtroOperador ? filtroOperador : 'GLOBAL';
      a.download = `SISIFO_${nomArchivo}_${marcaTiempo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Error exportar:", error);
    }
  };

  const irAlAlmacenDelOperador = (usuarioOperador) => {
    setFiltroOperador(usuarioOperador.toUpperCase());
    setVistaAnalista('GLOBAL');
    setPaginaActual(1);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  if (cargando) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando registros...</p>;

  // ==========================================
  // VISTA: USUARIOS
  // ==========================================
  if (vistaAnalista === 'USUARIOS' && !informeSeleccionado) {
    return (
      <div className="almacen-container">
        {esSoloAnalista && (
          <div className="almacen-nav-buttons">
            <button onClick={() => { setVistaAnalista('GLOBAL'); setFiltroOperador(''); setBusqueda(''); setBusquedaId(''); setFiltroRoper(''); setPaginaActual(1); }} className="almacen-nav-btn">
              <Activity size={16} /> Panel Global
            </button>
            <button className="almacen-nav-btn active">
              <Users size={16} /> Ver Usuarios
            </button>
          </div>
        )}

        <h3 className="usuarios-title">Personal del Sistema</h3>
        
        <div className="usuarios-scroll">
          {listaUsuariosBD.map(u => (
            <div key={u.id} className="usuario-card">
              <div className="usuario-card-header">
                <div className={`usuario-card-avatar ${u.cargo === 'ANALISTA' || u.cargo === 'ADMINISTRADOR' ? 'admin-analista' : 'operador'}`}>
                  <User size={24} color={(u.cargo === 'ANALISTA' || u.cargo === 'ADMINISTRADOR') ? '#0056b3' : '#28a745'} />
                </div>
                <div className="usuario-card-info">
                  <h4>{u.nombre} {u.apellido}</h4>
                  <span>@{u.usuario}</span>
                </div>
              </div>
              <div className={`usuario-card-cargo ${u.cargo === 'ANALISTA' || u.cargo === 'ADMINISTRADOR' ? 'admin-analista' : 'operador'}`}>
                CARGO: {u.cargo}
              </div>
              <button onClick={() => { setFiltroOperador(u.usuario); setVistaAnalista('GLOBAL'); setPaginaActual(1); }} className="usuario-card-btn">
                <Activity size={14} /> Ver Productividad
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const parsearFecha = (fechaStr) => {
    if (!fechaStr) return new Date(0);
    const [fecha, hora] = fechaStr.split(' ');
    const [dd, mm, yyyy] = fecha.split('/');
    const [hh, mi] = (hora || '00:00').split(':');
    return new Date(yyyy, mm - 1, dd, hh, mi);
  };

  const expedientesArray = Object.keys(reportesAgrupados)
    .map(id => {
      const paquete = reportesAgrupados[id];
      const inicio = paquete.find(p => p.etapa === 'INICIO') || paquete[0];
      return { id, inicio, paquete };
    })
    .sort((a, b) => parsearFecha(b.inicio.fecha) - parsearFecha(a.inicio.fecha));

  const terminoId = busquedaId.trim();
  const resultadosBusquedaId = (tieneAccesoGlobal && terminoId !== '')
    ? expedientesArray.filter(exp => String(exp.id).includes(terminoId) || String(exp.inicio.id_incidencia).includes(terminoId))
    : [];

  const expedientesFiltrados = expedientesArray.filter(exp => {
    const roperTexto = (exp.inicio.roper || '').toUpperCase();
    const operadorTexto = (exp.inicio.operador || '').toUpperCase();
    const zonaTexto = (exp.inicio.zona || '').toUpperCase();
    const camaraTexto = (exp.inicio.camara || '').toUpperCase();
    const turnoTexto = (exp.inicio.turno || '').toUpperCase();

    const matchRoper = filtroRoper.trim() === '' || roperTexto.includes(filtroRoper.trim().toUpperCase());
    const matchOperador = filtroOperador.trim() === '' || operadorTexto.includes(filtroOperador.trim().toUpperCase());
    const matchZona = filtroZona.trim() === '' || zonaTexto.includes(filtroZona.trim().toUpperCase());
    const matchTurno = filtroTurno === '' || turnoTexto === filtroTurno.toUpperCase();
    const matchBusqueda = busqueda.trim() === '' || String(exp.id).includes(busqueda.trim()) || camaraTexto.includes(busqueda.trim().toUpperCase());

    let matchFecha = true;
    if (filtroFecha && exp.inicio.fecha) {
      const [yyyy, mm, dd] = filtroFecha.split('-');
      const fechaExpediente = exp.inicio.fecha.split(' ')[0];
      matchFecha = fechaExpediente === `${dd}/${mm}/${yyyy}`;
    }

    return matchRoper && matchOperador && matchZona && matchTurno && matchBusqueda && matchFecha;
  });

  const metricasZonas = {};
  if (tieneAccesoGlobal) {
    expedientesFiltrados.forEach(exp => {
      const zonaTexto = (exp.inicio.zona || 'DESCONOCIDA').toUpperCase().trim();
      metricasZonas[zonaTexto] = (metricasZonas[zonaTexto] || 0) + 1;
    });
  }
  const zonasOrdenadas = Object.entries(metricasZonas).sort((a, b) => b[1] - a[1]);

  const totalPaginas = Math.ceil(expedientesFiltrados.length / REGISTROS_POR_PAGINA) || 1;
  const indiceInicial = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const expedientesPaginados = expedientesFiltrados.slice(indiceInicial, indiceInicial + REGISTROS_POR_PAGINA);

  // ==========================================
  // VISTA: INFORME DETALLADO
  // ==========================================
  if (informeSeleccionado) {
    const orden = ['INICIO', 'DESARROLLO', 'FINALIZADO'];
    const informeOrdenado = [...informeSeleccionado].sort((a, b) => orden.indexOf(a.etapa) - orden.indexOf(b.etapa));
    const datosBase = informeOrdenado[0]; 

    return (
      <div className="informe-container">
        <button onClick={() => setInformeSeleccionado(null)} className="btn-volver">
          <ArrowLeft size={16} /> Volver al Historial
        </button>

        <h2 className="informe-titulo">INFORME DE INCIDENCIA #{datosBase.id_incidencia}</h2>
        
        <div className="informe-meta">
          {tieneAccesoGlobal && (<><b>Operador:</b> <span className="informe-meta-operador">{datosBase.operador}</span> &nbsp;|&nbsp;</>)}
          <b>Turno:</b> <span className="informe-meta-turno">{datosBase.turno || 'N/A'}</span> &nbsp;|&nbsp; 
          <b>Roper:</b> <span className="informe-meta-roper">{datosBase.roper || 'N/A'}</span> &nbsp;|&nbsp; 
          <b>Cámara:</b> {datosBase.camara} &nbsp;|&nbsp; 
          <b>Zona:</b> {(datosBase.zona || '').toUpperCase()} &nbsp;|&nbsp; 
          <b>Fecha:</b> {datosBase.fecha}
        </div>

        {informeOrdenado.map((item, index) => {
          const fotos = parseFotos(item.foto_video);
          const claseEtapa = item.etapa === 'INICIO' ? 'informe-etapa-inicio' : item.etapa === 'DESARROLLO' ? 'informe-etapa-desarrollo' : 'informe-etapa-finalizado';
          
          return (
            <div key={index} className={`informe-etapa ${claseEtapa}`}>
              <h3 className="informe-etapa-titulo">
                {item.etapa} 
                <span className="informe-etapa-fecha">({item.fecha})</span>
              </h3>
              <p className="informe-etapa-asunto">{item.asunto}</p>
              {item.atendido && <p className="informe-atendido"><b>Atendido por:</b> {item.atendido}</p>}
              {fotos.length > 0 && (
                <div className="informe-evidencias">
                  <b className="informe-evidencias-titulo">
                    <ImageIcon size={14} className="informe-evidencias-icono"/> Evidencia ({fotos.length}):
                  </b>
                  <div className="informe-evidencias-grid">
                    {/* ✅ FIX 3: getMediaUrl(url) arma la URL correcta según quién mire (servidor, compañero o analista WiFi) */}
                    {fotos.map((url, i) => (
                      <a key={i} href={getMediaUrl(url)} target="_blank" rel="noreferrer">
                        <img src={getMediaUrl(url)} alt="Evidencia" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ==========================================
  // VISTA: PANEL GLOBAL / HISTORIAL
  // ==========================================
  return (
    <div className="almacen-container">
      <NotificadorTiempoReal />
      
      {esSoloAnalista && (
        <div className="almacen-nav-buttons">
          <button onClick={() => { setVistaAnalista('GLOBAL'); setFiltroOperador(''); setBusqueda(''); setBusquedaId(''); setFiltroRoper(''); setPaginaActual(1); }} className={`almacen-nav-btn ${vistaAnalista === 'GLOBAL' && filtroOperador === '' ? 'active' : ''}`}>
            <Activity size={16} /> Panel Global
          </button>
          <button onClick={() => setVistaAnalista('USUARIOS')} className="almacen-nav-btn">
            <Users size={16} /> Ver Usuarios
          </button>
        </div>
      )}

      <div className="almacen-header">
        <h3>
          <FileText size={20} className="almacen-header-icon" />
          {tieneAccesoGlobal ? 'Panel Global de Analítica' : `Historial y Productividad de: ${usuarioLogueado}`}
        </h3>
        {tieneAccesoGlobal && (
          <button onClick={() => handleExportar(expedientesFiltrados)} className="btn-exportar">
            <Download size={16} /> Excel
          </button>
        )}
      </div>

      {expedientesArray.length === 0 ? (
        <p className="sin-datos">No hay métricas registradas en la base de datos.</p>
      ) : (
        <>
          <div className="almacen-filtros">
            {tieneAccesoGlobal ? (
              <div className="almacen-filtro-group almacen-filtro-lg">
                <Search size={16} color="#666" />
                <input type="text" placeholder="N° de Reporte..." value={busquedaId} onChange={(e) => setBusquedaId(e.target.value)} />
              </div>
            ) : (
              <div className="almacen-filtro-group almacen-filtro-md">
                <Search size={16} color="#666" />
                <input type="text" placeholder="Cámara o ID" value={busqueda} onChange={(e) => { setBusqueda(e.target.value.toUpperCase()); setPaginaActual(1); }} />
              </div>
            )}

            {tieneAccesoGlobal && (
              <div className="almacen-filtro-group almacen-filtro-md">
                <User size={16} color="#666" />
                <input type="text" placeholder="Operador..." value={filtroOperador} onChange={(e) => { setFiltroOperador(e.target.value.toUpperCase()); setPaginaActual(1); }} />
              </div>
            )}

            <div className="almacen-filtro-group almacen-filtro-sm">
              <Filter size={16} color="#666" />
              <select value={filtroTurno} onChange={(e) => { setFiltroTurno(e.target.value); setPaginaActual(1); }}>
                <option value="">Turnos</option>
                <option value="MAÑANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>

            <div className="almacen-filtro-group almacen-filtro-sm">
              <MapPin size={16} color="#666" />
              <input type="text" placeholder="Zona..." value={filtroZona} onChange={(e) => { setFiltroZona(e.target.value.toUpperCase()); setPaginaActual(1); }} />
            </div>

            <div className="almacen-filtro-group almacen-filtro-md">
              <Shield size={16} color="#666" />
              <input type="text" placeholder="Roper..." value={filtroRoper} onChange={(e) => { setFiltroRoper(e.target.value.toUpperCase()); setPaginaActual(1); }} />
            </div>

            <div className="almacen-filtro-group almacen-filtro-xl">
              <Calendar size={16} color="#666" />
              <input type="date" value={filtroFecha} onChange={(e) => { setFiltroFecha(e.target.value); setPaginaActual(1); }} />
            </div>
          </div>

          {esSoloAnalista && (
            <div className="metricas-panel">
              <h4 className="metricas-title">
                <BarChart2 size={18} /> Resultados ({expedientesFiltrados.length} Incidencias)
              </h4>
              {zonasOrdenadas.length > 0 ? (
                <div className="metricas-grid">
                  {zonasOrdenadas.map(([zona, cantidad]) => (
                    <div key={zona} className="metrica-card">
                      <div className="metrica-card-zona">ZONA {zona}</div>
                      <div className="metrica-card-cantidad">{cantidad}</div>
                      <div className="metrica-card-label">Ingresos</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="metricas-sin-resultados">No hay resultados para estos filtros.</p>
              )}
            </div>
          )}

          {/* [NUEVO WRAPPER] Caja de altura FIJA: Feed/Resultados/Tabla miden siempre lo mismo => cero temblor */}
          <div className="almacen-area-contenido">
            {tieneAccesoGlobal && filtroOperador === '' ? (
              terminoId !== '' ? (
                <div className="resultados-busqueda-container">
                  <h4 className="resultados-busqueda-title">
                    <Search size={18} /> Resultados para "{terminoId}" ({resultadosBusquedaId.length})
                  </h4>
                  {resultadosBusquedaId.length > 0 ? (
                    <div className="resultados-busqueda-lista">
                      {resultadosBusquedaId.map((exp) => (
                        <div key={exp.id} onClick={() => irAlAlmacenDelOperador(exp.inicio.operador)} className="resultado-item">
                          <div className="resultado-item-header">
                            <span className="resultado-item-id">#{exp.id}</span>
                            <span className="resultado-item-fecha">{exp.inicio.fecha}</span>
                          </div>
                          <div className="resultado-item-operador">👤 {exp.inicio.operador}</div>
                          <div className="resultado-item-meta">
                            <span>🕐 {exp.inicio.turno || '-'}</span>
                            <span>📍 {(exp.inicio.zona || '').toUpperCase()}</span>
                            <span> {exp.inicio.camara}</span>
                          </div>
                          <div className="resultado-item-desc">
                            {exp.inicio.categoria} — {exp.inicio.incidencia}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="sin-resultados">No se encontraron reportes con el N° "{terminoId}".</p>
                  )}
                </div>
              ) : (
                <div className="feed-en-vivo-wrapper">
                  <FeedEnVivo onVerReporte={irAlAlmacenDelOperador} />
                </div>
              )
            ) : (
              <div className="tabla-container">
                <table className="tabla-wrapper">
                  <thead>
                    <tr>
                      <th>ID</th>
                      {tieneAccesoGlobal && <th>Operador</th>}
                      <th>Turno</th>
                      <th>Fecha</th>
                      <th>Cámara</th>
                      <th>Zona</th>
                      <th>Roper</th>
                      <th className="centro">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expedientesPaginados.map((exp) => (
                      <tr key={exp.id}>
                        <td className="bold">#{exp.id}</td>
                        {tieneAccesoGlobal && <td className="tabla-operador">{exp.inicio.operador}</td>}
                        <td className="tabla-turno">{exp.inicio.turno || '-'}</td>
                        <td>{exp.inicio.fecha}</td>
                        <td>{exp.inicio.camara}</td>
                        <td>{(exp.inicio.zona || '').toUpperCase()}</td>
                        <td className="tabla-roper">{(exp.inicio.roper || '-').toUpperCase()}</td>
                        <td className="centro">
                          <button onClick={() => setInformeSeleccionado(exp.paquete)} className="btn-abrir">
                            <Eye size={14} /> Abrir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPaginas > 1 && (
                  <div className="paginacion">
                    <button onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))} disabled={paginaActual === 1}>
                      <ChevronLeft size={16} /> Anterior
                    </button>
                    <span className="paginacion-info">Página {paginaActual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas}>
                      Siguiente <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
export default Almacen;