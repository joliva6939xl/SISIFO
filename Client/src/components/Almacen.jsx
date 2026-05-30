import { useEffect, useState } from 'react';
import { obtenerReportesPorOperador, obtenerReportesGlobales, obtenerUsuariosLista } from '../api/api';
import { Eye, FileText, ArrowLeft, Image as ImageIcon, BarChart2, Search, Filter, ChevronLeft, ChevronRight, MapPin, Calendar, User, Users, Activity, BarChart, Download, Shield } from 'lucide-react';

function Almacen({ usuarioLogueado, cargo }) {
  const [reportesAgrupados, setReportesAgrupados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [informeSeleccionado, setInformeSeleccionado] = useState(null);

  const [vistaAnalista, setVistaAnalista] = useState('GLOBAL'); 
  const [listaUsuariosBD, setListaUsuariosBD] = useState([]);

  const [busqueda, setBusqueda] = useState('');
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
        if (cargo === 'ANALISTA') {
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
  }, [usuarioLogueado, cargo]);

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
      const urlBase = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;
      const response = await fetch(`${urlBase}/api/exportar`, {
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
      a.download = `SISIFO_${nomArchivo}_${marcaTiempo}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Error exportar:", error);
    }
  };

  if (cargando) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando registros...</p>;

  if (cargo === 'ANALISTA' && vistaAnalista === 'USUARIOS' && !informeSeleccionado) {
    return (
      <div style={{ fontFamily: 'Arial' }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
          <button onClick={() => { setVistaAnalista('GLOBAL'); setFiltroOperador(''); setBusqueda(''); setFiltroRoper(''); setPaginaActual(1); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', background: '#e9ecef', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><Activity size={16} /> Panel Global</button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'default', fontWeight: 'bold' }}><Users size={16} /> Ver Usuarios</button>
        </div>

        <h3 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>Personal del Sistema</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {listaUsuariosBD.map(u => (
            <div key={u.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <div style={{ background: u.cargo === 'ANALISTA' ? '#eaf4ff' : '#eafaf1', padding: '10px', borderRadius: '50%' }}>
                  <User size={24} color={u.cargo === 'ANALISTA' ? '#0056b3' : '#28a745'} />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{u.nombre} {u.apellido}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>@{u.usuario}</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: u.cargo === 'ANALISTA' ? '#0056b3' : '#28a745', fontWeight: 'bold' }}>CARGO: {u.cargo}</div>
              <button onClick={() => { setFiltroOperador(u.usuario); setVistaAnalista('GLOBAL'); setPaginaActual(1); }} style={{ width: '100%', padding: '8px', background: '#f8f9fa', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', marginTop: 'auto', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                <Activity size={14} /> Ver Productividad
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const expedientesArray = Object.keys(reportesAgrupados).map(id => {
    const paquete = reportesAgrupados[id];
    const inicio = paquete.find(p => p.etapa === 'INICIO') || paquete[0];
    return { id, inicio, paquete };
  });

  // LÓGICA DE FILTRADO CORREGIDA Y ROBUSTA
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
  expedientesFiltrados.forEach(exp => {
    const zonaTexto = (exp.inicio.zona || 'DESCONOCIDA').toUpperCase().trim();
    metricasZonas[zonaTexto] = (metricasZonas[zonaTexto] || 0) + 1;
  });
  const zonasOrdenadas = Object.entries(metricasZonas).sort((a, b) => b[1] - a[1]);
  const maxIncidencias = zonasOrdenadas.length > 0 ? Math.max(...zonasOrdenadas.map(z => z[1])) : 1;

  const totalPaginas = Math.ceil(expedientesFiltrados.length / REGISTROS_POR_PAGINA) || 1;
  const indiceInicial = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const expedientesPaginados = expedientesFiltrados.slice(indiceInicial, indiceInicial + REGISTROS_POR_PAGINA);

  if (informeSeleccionado) {
    const orden = ['INICIO', 'DESARROLLO', 'FINALIZADO'];
    const informeOrdenado = [...informeSeleccionado].sort((a, b) => orden.indexOf(a.etapa) - orden.indexOf(b.etapa));
    const datosBase = informeOrdenado[0]; 

    return (
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <button onClick={() => setInformeSeleccionado(null)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Volver al Historial
        </button>

        <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>INFORME DE INCIDENCIA #{datosBase.id_incidencia}</h2>
        <div style={{ textAlign: 'center', color: '#555', marginBottom: '20px', fontSize: '14px', background: '#f0f8ff', padding: '10px', borderRadius: '5px', border: '1px solid #cce5ff' }}>
          {cargo === 'ANALISTA' && (<><b>Operador:</b> <span style={{ color: '#28a745' }}>{datosBase.operador}</span> &nbsp;|&nbsp;</>)}
          <b>Turno:</b> <span style={{ color: '#0056b3' }}>{datosBase.turno || 'N/A'}</span> &nbsp;|&nbsp; 
          <b>Roper:</b> <span style={{ color: '#d32f2f' }}>{datosBase.roper || 'N/A'}</span> &nbsp;|&nbsp; 
          <b>Cámara:</b> {datosBase.camara} &nbsp;|&nbsp; 
          <b>Zona:</b> {(datosBase.zona || '').toUpperCase()} &nbsp;|&nbsp; 
          <b>Fecha:</b> {datosBase.fecha}
        </div>

        {informeOrdenado.map((item, index) => {
          const fotos = parseFotos(item.foto_video);
          return (
            <div key={index} style={{ marginBottom: '20px', padding: '15px', borderLeft: `4px solid ${item.etapa === 'INICIO' ? '#007bff' : item.etapa === 'DESARROLLO' ? '#ffc107' : '#28a745'}`, background: '#f8f9fa' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{item.etapa} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>({item.fecha})</span></h3>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{item.asunto}</p>
              {item.atendido && <p style={{ fontSize: '14px', background: '#eafaf1', padding: '5px', display: 'inline-block' }}><b>Atendido por:</b> {item.atendido}</p>}
              {fotos.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <b style={{ fontSize: '12px', color: '#666' }}><ImageIcon size={14} style={{ verticalAlign: 'middle' }}/> Evidencia ({fotos.length}):</b>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                    {fotos.map((url, i) => (
                      <a key={i} href={`http://localhost:3000${url}`} target="_blank" rel="noreferrer">
                        <img src={`http://localhost:3000${url}`} alt="Evidencia" style={{ height: '100px', borderRadius: '4px', border: '1px solid #ccc', objectFit: 'cover' }} />
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

  return (
    <div style={{ fontFamily: 'Arial' }}>
      
      {cargo === 'ANALISTA' && !informeSeleccionado && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
          <button onClick={() => { setVistaAnalista('GLOBAL'); setFiltroOperador(''); setBusqueda(''); setFiltroRoper(''); setPaginaActual(1); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', background: (vistaAnalista === 'GLOBAL' && filtroOperador === '') ? '#0056b3' : '#e9ecef', color: (vistaAnalista === 'GLOBAL' && filtroOperador === '') ? 'white' : '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><Activity size={16} /> Panel Global</button>
          <button onClick={() => setVistaAnalista('USUARIOS')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', background: '#e9ecef', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><Users size={16} /> Ver Usuarios</button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>
          <FileText size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          {cargo === 'ANALISTA' ? 'Panel Global de Analítica' : `Historial y Productividad de: ${usuarioLogueado}`}
        </h3>
        
        {cargo === 'ANALISTA' && (
          <button onClick={() => handleExportar(expedientesFiltrados)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            <Download size={16} /> Excel
          </button>
        )}
      </div>

      {expedientesArray.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No hay métricas registradas en la base de datos.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', background: '#e9ecef', padding: '10px', borderRadius: '5px', flexWrap: 'wrap' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 120px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <Search size={16} color="#666" />
              <input type="text" placeholder="Cámara o ID" value={busqueda} onChange={(e) => { setBusqueda(e.target.value.toUpperCase()); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', textTransform: 'uppercase' }} />
            </div>

            {cargo === 'ANALISTA' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 120px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <User size={16} color="#666" />
                <input type="text" placeholder="Operador..." value={filtroOperador} onChange={(e) => { setFiltroOperador(e.target.value.toUpperCase()); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', textTransform: 'uppercase' }} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 100px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <Filter size={16} color="#666" />
              <select value={filtroTurno} onChange={(e) => { setFiltroTurno(e.target.value); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', background: 'transparent' }}>
                <option value="">Turnos</option>
                <option value="MAÑANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 100px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <MapPin size={16} color="#666" />
              <input type="text" placeholder="Zona..." value={filtroZona} onChange={(e) => { setFiltroZona(e.target.value.toUpperCase()); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', textTransform: 'uppercase' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 120px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <Shield size={16} color="#666" />
              <input type="text" placeholder="Roper..." value={filtroRoper} onChange={(e) => { setFiltroRoper(e.target.value.toUpperCase()); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', textTransform: 'uppercase' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 130px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <Calendar size={16} color="#666" />
              <input type="date" value={filtroFecha} onChange={(e) => { setFiltroFecha(e.target.value); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#333' }} />
            </div>

          </div>

          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0056b3', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BarChart2 size={18} /> Resultados ({expedientesFiltrados.length} Incidencias)
            </h4>
            {zonasOrdenadas.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {zonasOrdenadas.map(([zona, cantidad]) => (
                  <div key={zona} style={{ background: '#fff', padding: '10px', borderRadius: '5px', border: '1px solid #eee', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ZONA {zona}</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{cantidad}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>Ingresos</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: '#666', textAlign: 'center' }}>No hay resultados para estos filtros.</p>
            )}
          </div>
          
          {cargo === 'ANALISTA' && filtroOperador === '' ? (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <h4 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                <BarChart size={18} color="#0056b3"/> Gráfico de Incidencias por Zona
              </h4>
              {zonasOrdenadas.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '250px', padding: '10px 0', borderBottom: '2px solid #eee' }}>
                  {zonasOrdenadas.map(([zona, cantidad]) => {
                    const alturaBarra = (cantidad / maxIncidencias) * 180;
                    return (
                      <div key={zona} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '80px', height: '220px' }}>
                        <span style={{ marginBottom: '8px', fontWeight: 'bold', color: '#0056b3' }}>{cantidad}</span>
                        <div style={{ width: '50px', height: `${alturaBarra}px`, background: '#28a745', borderRadius: '6px 6px 0 0', transition: '0.5s' }} />
                        <span style={{ marginTop: '10px', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>{zona}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#999' }}>Sin datos suficientes para graficar.</p>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: '#333', color: 'white', textAlign: 'left' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>ID</th>
                    {cargo === 'ANALISTA' && <th style={{ padding: '10px', border: '1px solid #ddd' }}>Operador</th>}
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Turno</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Fecha</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Cámara</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Zona</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Roper</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientesPaginados.map((exp) => (
                    <tr key={exp.id} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>#{exp.id}</td>
                      {cargo === 'ANALISTA' && <td style={{ padding: '10px', border: '1px solid #ddd', color: '#28a745', fontWeight: 'bold' }}>{exp.inicio.operador}</td>}
                      <td style={{ padding: '10px', border: '1px solid #ddd', color: '#0056b3', fontWeight: 'bold' }}>{exp.inicio.turno || '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{exp.inicio.fecha}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{exp.inicio.camara}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{(exp.inicio.zona || '').toUpperCase()}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', color: '#d32f2f', fontWeight: 'bold' }}>{(exp.inicio.roper || '-').toUpperCase()}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <button onClick={() => setInformeSeleccionado(exp.paquete)} style={{ background: '#0056b3', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Eye size={14} /> Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #ddd' }}>
                  <button onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))} disabled={paginaActual === 1} style={{ padding: '5px 10px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px' }}><ChevronLeft size={16} /> Anterior</button>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Página {paginaActual} de {totalPaginas}</span>
                  <button onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas} style={{ padding: '5px 10px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px' }}>Siguiente <ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default Almacen;