import { useEffect, useState } from 'react';
import { obtenerReportesPorOperador } from '../api/api';
import { Eye, FileText, ArrowLeft, Image as ImageIcon } from 'lucide-react';

function Almacen({ usuarioLogueado }) {
  const [reportesAgrupados, setReportesAgrupados] = useState({});
  const [cargando, setCargando] = useState(true);
  
  // Estado para saber qué informe estamos viendo en detalle
  const [informeSeleccionado, setInformeSeleccionado] = useState(null);

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const respuesta = await obtenerReportesPorOperador(usuarioLogueado);
        
        // Agrupar reportes por id_incidencia
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

// Función de seguridad para leer fotos (viejas o nuevas)
  const parseFotos = (foto_video) => {
    if (!foto_video) return [];
    try { return JSON.parse(foto_video); } 
    catch { return [foto_video]; } // <-- ¡Listo! Borramos la (e)
  };

  if (cargando) return <p style={{ textAlign: 'center' }}>Cargando registros...</p>;

  // --- VISTA 2: INFORME DETALLADO (SCROLL) ---
  if (informeSeleccionado) {
    // Ordenamos para que siempre sea Inicio -> Desarrollo -> Finalizado
    const orden = ['INICIO', 'DESARROLLO', 'FINALIZADO'];
    const informeOrdenado = [...informeSeleccionado].sort((a, b) => orden.indexOf(a.etapa) - orden.indexOf(b.etapa));
    const datosBase = informeOrdenado[0]; // Usamos el primero para sacar Camara y Zona

    return (
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <button onClick={() => setInformeSeleccionado(null)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Volver a la Lista
        </button>

        <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>INFORME TÉCNICO #{datosBase.id_incidencia}</h2>
        <div style={{ textAlign: 'center', color: '#555', marginBottom: '20px', fontSize: '14px' }}>
          <b>Cámara:</b> {datosBase.camara} &nbsp;|&nbsp; <b>Zona:</b> {datosBase.zona} &nbsp;|&nbsp; <b>Fecha:</b> {datosBase.fecha}
        </div>

        {/* Mapeo de las etapas */}
        {informeOrdenado.map((item, index) => {
          const fotos = parseFotos(item.foto_video);
          return (
            <div key={index} style={{ marginBottom: '20px', padding: '15px', borderLeft: `4px solid ${item.etapa === 'INICIO' ? '#007bff' : item.etapa === 'DESARROLLO' ? '#ffc107' : '#28a745'}`, background: '#f8f9fa' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{item.etapa} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>({item.fecha})</span></h3>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{item.asunto}</p>
              
              {item.atendido && <p style={{ fontSize: '14px', background: '#eafaf1', padding: '5px', display: 'inline-block' }}><b>Atendido por:</b> {item.atendido}</p>}

              {/* Mostrar Galería de Fotos de esa Etapa */}
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

  // --- VISTA 1: TABLA PRINCIPAL DE INCIDENCIAS ---
  const llavesGrupos = Object.keys(reportesAgrupados);

  return (
    <div style={{ fontFamily: 'Arial' }}>
      <h3 style={{ textAlign: 'center', color: '#333' }}>
        <FileText size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        Mis Expedientes ({usuarioLogueado})
      </h3>

      {llavesGrupos.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No tienes expedientes registrados.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#333', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>ID Incidencia</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Fecha Inicial</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Cámara</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Zona</th>
              <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {llavesGrupos.map((id) => {
              const paquete = reportesAgrupados[id];
              const inicio = paquete.find(p => p.etapa === 'INICIO') || paquete[0]; // Datos principales
              return (
                <tr key={id} style={{ background: '#fff' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>#{id}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{inicio.fecha}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{inicio.camara}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{inicio.zona}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <button onClick={() => setInformeSeleccionado(paquete)} style={{ background: '#0056b3', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Eye size={14} /> Abrir Informe
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Almacen;