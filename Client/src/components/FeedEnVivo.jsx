import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
// ✅ FIX 4: importamos getSocketUrl
import { obtenerReportesGlobales, getSocketUrl } from '../api/api';
import { Activity, Clock, MapPin, User, Hash, Eye } from 'lucide-react';

export default function FeedEnVivo({ onVerReporte }) {
  const [incidencias, setIncidencias] = useState([]);
  const [hoverId, setHoverId] = useState(null);
  const esAnalista = (localStorage.getItem('sisifo_cargo') || '').toUpperCase() === 'ANALISTA';
  const listaRef = useRef(null);

  useEffect(() => {
    if (!esAnalista) return;

    // ✅ Cargar los últimos reportes existentes al montar el componente
    const cargarHistorial = async () => {
      try {
        const respuesta = await obtenerReportesGlobales();
        // Filtrar solo los FINALIZADO y tomar los últimos 20
        const finalizados = respuesta.data
          .filter(r => r.etapa === 'FINALIZADO')
          .slice(0, 20)
          .map(r => ({
            id: Math.random(),
            id_incidencia: r.id_incidencia,
            usuario: r.operador,
            fecha: r.fecha,
            turno: r.turno,
            zona: r.zona,
            categoria: r.categoria,
            incidencia: r.incidencia,
            timestamp: Date.now()
          }));
        setIncidencias(finalizados);
      } catch (error) {
        console.error("Error al cargar historial para Feed:", error);
      }
    };

    cargarHistorial();

    // ✅ FIX 4: el socket ahora conecta al backend (3000) con la IP real, no al 5173
    const socket = io(getSocketUrl());

    socket.on('nuevo_reporte_analista', (datos) => {
      const nueva = {
        id: Date.now() + Math.random(),
        id_incidencia: datos.id_incidencia,
        usuario: datos.usuario,
        fecha: datos.fecha,
        turno: datos.turno,
        zona: datos.zona,
        categoria: datos.categoria,
        incidencia: datos.incidencia,
        timestamp: Date.now()
      };
      setIncidencias(prev => {
        const actualizadas = [nueva, ...prev].slice(0, 20);
        return actualizadas;
      });
    });

    return () => { socket.disconnect(); };
  }, [esAnalista]);

  useEffect(() => {
    if (listaRef.current && incidencias.length > 0) {
      listaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [incidencias]);

  if (!esAnalista) return null;

  const colorZona = (zona) => {
    const z = (zona || '').toUpperCase();
    if (z.includes('NORTE')) return { bg: '#eaf4ff', border: '#0056b3', text: '#0056b3' };
    if (z.includes('SUR')) return { bg: '#eafaf1', border: '#28a745', text: '#28a745' };
    if (z.includes('CENTRO')) return { bg: '#fff8e1', border: '#ff9800', text: '#e65100' };
    return { bg: '#f5f5f5', border: '#999', text: '#666' };
  };

  const handleVer = (inc) => {
    if (onVerReporte) onVerReporte(inc.usuario);
  };

  return (
    <div style={{ 
      background: '#fff', 
      padding: '20px', 
      borderRadius: '8px', 
      border: '1px solid #ddd', 
      boxShadow: '0 2px 5px rgba(0,0,0,0.05)' 
    }}>
      <h4 style={{ 
        textAlign: 'center', 
        margin: '0 0 15px 0', 
        color: '#333', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '8px' 
      }}>
        <Activity size={18} color="#dc3545" />
        Feed en Vivo — Últimas Incidencias
        <span style={{ 
          background: '#dc3545', 
          color: 'white', 
          padding: '2px 8px', 
          borderRadius: '10px', 
          fontSize: '11px', 
          fontWeight: 'bold' 
        }}>
          {incidencias.length}
        </span>
      </h4>

      {incidencias.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          color: '#999', 
          padding: '30px 10px',
          fontSize: '13px'
        }}>
          <Activity size={32} color="#ddd" style={{ marginBottom: '10px' }} />
          <p>Cargando incidencias recientes...</p>
          <p style={{ fontSize: '11px', marginTop: '5px' }}>
            Las nuevas incidencias aparecerán aquí automáticamente
          </p>
        </div>
      ) : (
        <div 
          ref={listaRef}
          style={{ 
            maxHeight: '320px', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {incidencias.map((inc) => {
            const colores = colorZona(inc.zona);
            const isHover = hoverId === inc.id;
            return (
              <div 
                key={inc.id}
                onClick={() => handleVer(inc)}
                onMouseEnter={() => setHoverId(inc.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  background: isHover ? '#f0f7ff' : colores.bg,
                  borderLeft: `4px solid ${colores.border}`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  animation: 'sisifoSlideIn 0.3s ease-out',
                  boxShadow: isHover ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  transform: isHover ? 'translateX(-2px)' : 'none'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ 
                      background: '#0056b3', 
                      color: 'white', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Hash size={10} />#{inc.id_incidencia}
                    </span>
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      color: '#555',
                      fontWeight: '600'
                    }}>
                      <User size={11} />{inc.usuario}
                    </span>
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      color: '#777',
                      fontSize: '11px'
                    }}>
                      <Clock size={10} />{inc.fecha}
                    </span>
                  </div>

                  {isHover && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVer(inc);
                      }}
                      title="Ver historial del operador"
                      style={{ 
                        background: '#0056b3', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        padding: '3px 8px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    >
                      <Eye size={11} /> Ver
                    </button>
                  )}
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  flexWrap: 'wrap',
                  fontSize: '11px'
                }}>
                  <span style={{ 
                    background: 'white', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    color: colores.text,
                    border: `1px solid ${colores.border}`
                  }}>
                    {inc.turno}
                  </span>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: '#555'
                  }}>
                    <MapPin size={10} />{inc.zona}
                  </span>
                  <span style={{ color: '#999' }}>·</span>
                  <span style={{ 
                    color: colores.text, 
                    fontWeight: '600',
                    flex: 1,
                    minWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={`${inc.categoria} — ${inc.incidencia}`}>
                    {inc.categoria} — {inc.incidencia}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}