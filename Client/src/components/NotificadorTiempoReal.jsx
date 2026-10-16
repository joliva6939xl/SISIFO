import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { X, Bell } from 'lucide-react';

export default function NotificadorTiempoReal() {
  const [toasts, setToasts] = useState([]);
  
  // ✅ Calculamos esto directamente para evitar setState dentro del useEffect
  const esAnalista = (localStorage.getItem('sisifo_cargo') || '').toUpperCase() === 'ANALISTA';

  useEffect(() => {
    if (!esAnalista) return;

    const urlBase = window.location.origin.includes('localhost')
      ? 'http://localhost:3000'
      : window.location.origin;
    const socket = io(urlBase);

    const quitar = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    socket.on('nuevo_reporte_analista', (datos) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, datos }]);
      setTimeout(() => quitar(id), 6000); // Desaparece solo a los 6 segundos
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
      `}</style>

      <div style={{
        position: 'fixed', top: '80px', right: '20px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        zIndex: 9999, pointerEvents: 'none'
      }}>
        {toasts.map(({ id, datos }) => (
          <div key={id} style={{
            pointerEvents: 'auto',
            background: '#ffffff',
            borderLeft: '5px solid #28a745',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            padding: '14px 18px',
            minWidth: '320px', maxWidth: '400px',
            animation: 'sisifoSlideIn 0.4s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Bell size={18} color="#28a745" />
                  <strong style={{ color: '#111', fontSize: '14px', fontWeight: '700' }}>
                    NUEVA INCIDENCIA REGISTRADA
                  </strong>
                </div>
                <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.7' }}>
                  <div><strong style={{ color: '#777' }}>Usuario:</strong> {datos.usuario}</div>
                  <div><strong style={{ color: '#777' }}>Fecha:</strong> {datos.fecha}</div>
                  <div><strong style={{ color: '#777' }}>Turno:</strong> {datos.turno}</div>
                  <div><strong style={{ color: '#777' }}>Zona:</strong> {datos.zona}</div>
                  <div><strong style={{ color: '#777' }}>Categoría:</strong> {datos.categoria}</div>
                  <div style={{ marginTop: '6px', color: '#0056b3', fontWeight: 'bold', fontSize: '14px' }}>
                    {datos.incidencia}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0', marginLeft: '10px' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}