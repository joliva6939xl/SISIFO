import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
// ✅ FIX 4: importamos getSocketUrl
import { getSocketUrl } from '../api/api';
import {  Bell } from 'lucide-react';

export default function NotificadorTiempoReal() {
  const [toasts, setToasts] = useState([]);
  
  // Calculamos esto directamente para evitar setState dentro del useEffect
  const esAnalista = (localStorage.getItem('sisifo_cargo') || '').toUpperCase() === 'ANALISTA';

  useEffect(() => {
    if (!esAnalista) return;

    // ✅ FIX 4: el socket ahora conecta al backend (3000) con la IP real, no al 5173
    const socket = io(getSocketUrl());

    const quitar = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    socket.on('nuevo_reporte_analista', (datos) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, datos }]);
      setTimeout(() => quitar(id), 5000); // Desaparece a los 5 segundos
    });

    return () => { socket.disconnect(); };
  }, [esAnalista]);

  if (!esAnalista) return null;

  return (
    <>
      <style>{`
        @keyframes sisifoSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes sisifoFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: '70px',
        right: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 9999,
        pointerEvents: 'none',
        maxWidth: '420px',
        width: 'auto'
      }}>
        {toasts.map(({ id, datos }) => (
          <div 
            key={id} 
            style={{
              pointerEvents: 'auto',
              background: '#ffffff',
              borderLeft: '4px solid #28a745',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '10px 14px',
              animation: 'sisifoSlideIn 0.3s ease-out',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {/* Fila superior: Icono + Título + ID + Cerrar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={14} color="#28a745" />
                <strong style={{ fontSize: '12px', color: '#111', fontWeight: '700' }}>
                  NUEVA INCIDENCIA
                </strong>
                {datos.id_incidencia && (
                  <span style={{ 
                    background: '#0056b3', 
                    color: 'white', 
                    padding: '2px 6px', 
                    borderRadius: '10px', 
                    fontSize: '11px', 
                    fontWeight: 'bold' 
                  }}>
                    #{datos.id_incidencia}
                  </span>
                )}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== id))}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#999', 
                  padding: '0',
                  lineHeight: 1,
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>

            {/* Fila principal: Categoría - Incidencia (truncada si es larga) */}
            <div style={{ 
              fontSize: '12px', 
              color: '#0056b3', 
              fontWeight: '600',
              lineHeight: '1.3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={`${datos.categoria || ''} - ${datos.incidencia || ''}`}>
              {datos.categoria || 'SIN CATEGORÍA'}
              {datos.incidencia && (
                <>
                  <span style={{ color: '#999', margin: '0 4px' }}>—</span>
                  {datos.incidencia}
                </>
              )}
            </div>

            {/* Fila inferior: Usuario · Fecha (más pequeña y gris) */}
            <div style={{ 
              fontSize: '10px', 
              color: '#888',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <span><strong style={{ color: '#666' }}>Operador:</strong> {datos.usuario}</span>
              <span>·</span>
              <span>{datos.fecha}</span>
              {datos.zona && (
                <>
                  <span>·</span>
                  <span>{datos.zona}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}