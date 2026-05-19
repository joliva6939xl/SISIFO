import { useEffect, useState } from 'react';
import { obtenerReportesPorOperador } from '../api/api';
import { Eye, FileText, ArrowLeft, Image as ImageIcon, BarChart2, Search, Filter, ChevronLeft, ChevronRight, MapPin, Calendar } from 'lucide-react';

function Almacen({ usuarioLogueado }) {
  const [reportesAgrupados, setReportesAgrupados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [informeSeleccionado, setInformeSeleccionado] = useState(null);

  // --- ESTADOS PARA FILTROS Y PAGINACIÓN ---
  const [busqueda, setBusqueda] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(''); 
  const [paginaActual, setPaginaActual] = useState(1);
  const REGISTROS_POR_PAGINA = 10;

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const respuesta = await obtenerReportesPorOperador(usuarioLogueado);
        const grupos = respuesta.data.reduce((acc, reporte) => {
          if (!acc[reporte.id_incidencia]) acc[reporte.id_incidencia] = [];
          acc[reporte.id_incidencia].push(reporte);
          return acc;
        }, {});
        setReportesAgrupados(grupos);
      } catch (error) {
        console.error("Error al traer el almacén:", error);
      } finally {
        setCargando(false);
      }
    };
    if (usuarioLogueado) cargarHistorial();
  }, [usuarioLogueado]);

  // ELIMINADO: El useEffect problemático ya no está aquí.

  const parseFotos = (foto_video) => {
    if (!foto_video) return [];
    try { return JSON.parse(foto_video); } 
    catch { return [foto_video]; } 
  };

  if (cargando) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando registros...</p>;

  // --- 1. PROCESAMIENTO Y FILTRADO DE DATOS ---
  const expedientesArray = Object.keys(reportesAgrupados).map(id => {
    const paquete = reportesAgrupados[id];
    const inicio = paquete.find(p => p.etapa === 'INICIO') || paquete[0];
    return { id, inicio, paquete };
  });

  const expedientesFiltrados = expedientesArray.filter(exp => {
    const coincideBusqueda = busqueda === '' || 
      exp.id.includes(busqueda) || 
      (exp.inicio.camara && exp.inicio.camara.toUpperCase().includes(busqueda.toUpperCase()));
      
    const coincideTurno = filtroTurno === '' || exp.inicio.turno === filtroTurno;
    const coincideZona = filtroZona === '' || (exp.inicio.zona && exp.inicio.zona.toUpperCase().includes(filtroZona.toUpperCase()));

    let coincideFecha = true;
    if (filtroFecha && exp.inicio.fecha) {
      const [yyyy, mm, dd] = filtroFecha.split('-');
      const fechaFiltroFormateada = `${dd}/${mm}/${yyyy}`; 
      const fechaExpediente = exp.inicio.fecha.split(' ')[0]; 
      coincideFecha = fechaExpediente === fechaFiltroFormateada;
    }

    return coincideBusqueda && coincideTurno && coincideZona && coincideFecha;
  });

  // --- 2. CÁLCULO DE MÉTRICAS (Basado en lo filtrado) ---
  const metricasZonas = {};
  expedientesFiltrados.forEach(exp => {
    const zonaTexto = (exp.inicio.zona || 'DESCONOCIDA').toUpperCase().trim();
    metricasZonas[zonaTexto] = (metricasZonas[zonaTexto] || 0) + 1;
  });
  const zonasOrdenadas = Object.entries(metricasZonas).sort((a, b) => b[1] - a[1]);

  // --- 3. PAGINACIÓN ---
  const totalPaginas = Math.ceil(expedientesFiltrados.length / REGISTROS_POR_PAGINA) || 1;
  const indiceInicial = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const expedientesPaginados = expedientesFiltrados.slice(indiceInicial, indiceInicial + REGISTROS_POR_PAGINA);

  // --- VISTA 2: INFORME DETALLADO (SCROLL) ---
  if (informeSeleccionado) {
    const orden = ['INICIO', 'DESARROLLO', 'FINALIZADO'];
    const informeOrdenado = [...informeSeleccionado].sort((a, b) => orden.indexOf(a.etapa) - orden.indexOf(b.etapa));
    const datosBase = informeOrdenado[0]; 

    return (
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <button onClick={() => setInformeSeleccionado(null)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Volver al Historial
        </button>

        <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>INFORME TÉCNICO #{datosBase.id_incidencia}</h2>
        <div style={{ textAlign: 'center', color: '#555', marginBottom: '20px', fontSize: '14px', background: '#f0f8ff', padding: '10px', borderRadius: '5px', border: '1px solid #cce5ff' }}>
          <b>Turno:</b> <span style={{ color: '#0056b3' }}>{datosBase.turno || 'N/A'}</span> &nbsp;|&nbsp; <b>Cámara:</b> {datosBase.camara} &nbsp;|&nbsp; <b>Zona:</b> {datosBase.zona.toUpperCase()} &nbsp;|&nbsp; <b>Fecha:</b> {datosBase.fecha}
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

  // --- VISTA 1: DASHBOARD Y TABLA ---
  return (
    <div style={{ fontFamily: 'Arial' }}>
      <h3 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>
        <FileText size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        Historial y Productividad de: {usuarioLogueado}
      </h3>

      {expedientesArray.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No hay métricas registradas en la base de datos.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', background: '#e9ecef', padding: '10px', borderRadius: '5px', flexWrap: 'wrap' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 150px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <Search size={16} color="#666" />
              <input type="text" placeholder="ID o Cámara..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 120px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <Filter size={16} color="#666" />
              <select value={filtroTurno} onChange={(e) => { setFiltroTurno(e.target.value); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', background: 'transparent' }}>
                <option value="">Todos los Turnos</option>
                <option value="MAÑANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 120px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <MapPin size={16} color="#666" />
              <input type="text" placeholder="Filtrar Zona..." value={filtroZona} onChange={(e) => { setFiltroZona(e.target.value); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 130px', background: 'white', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <Calendar size={16} color="#666" />
              {/* AQUÍ AGREGUÉ EL setPaginaActual(1) QUE FALTABA */}
              <input 
                type="date" 
                value={filtroFecha} 
                onChange={(e) => { setFiltroFecha(e.target.value); setPaginaActual(1); }} 
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#333' }} 
                title="Filtrar por Fecha Exacta"
              />
            </div>

          </div>

          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0056b3', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BarChart2 size={18} /> Resultados del Filtro ({expedientesFiltrados.length} Incidencias)
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

          {expedientesFiltrados.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#333', color: 'white', textAlign: 'left' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>ID Incidencia</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Turno</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Fecha Inicial</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Cámara</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Zona</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientesPaginados.map((exp) => {
                    return (
                      <tr key={exp.id} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>#{exp.id}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', color: '#0056b3', fontWeight: 'bold' }}>{exp.inicio.turno || '-'}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{exp.inicio.fecha}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{exp.inicio.camara}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{exp.inicio.zona.toUpperCase()}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                          <button onClick={() => setInformeSeleccionado(exp.paquete)} style={{ background: '#0056b3', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <Eye size={14} /> Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #ddd' }}>
                  <button 
                    onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                    disabled={paginaActual === 1}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: paginaActual === 1 ? '#ccc' : '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <ChevronLeft size={16} /> Anterior
                  </button>
                  
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
                    Página {paginaActual} de {totalPaginas}
                  </span>

                  <button 
                    onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                    disabled={paginaActual === totalPaginas}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: paginaActual === totalPaginas ? '#ccc' : '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente <ChevronRight size={16} />
                  </button>
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