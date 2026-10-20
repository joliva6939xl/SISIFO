import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// ✅ AGREGAR: URL del backend (igual que en LoginScreen)
const API_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:3000/api' 
  : `http://${window.location.hostname}:3000/api`;

export default function AutocompleteCamara({ value, onSelect, onClear }) {
  const [busqueda, setBusqueda] = useState(value || '');
  const [camaras, setCamaras] = useState([]);
  const [mostrar, setMostrar] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    // ✅ CAMBIAR: Usar API_URL completa en vez de '/api/camaras'
    axios.get(`${API_URL}/camaras`)
      .then(res => setCamaras(Array.isArray(res.data) ? res.data : []))
      .catch(err => { console.error("Error cargando cámaras:", err); setCamaras([]); });
  }, []);

  const filtradas = busqueda.trim() === ''
    ? []
    : camaras.filter(c =>
        c.codigo.toUpperCase().includes(busqueda.toUpperCase()) ||
        c.nombre.toUpperCase().includes(busqueda.toUpperCase())
      );

  useEffect(() => {
    const clickFuera = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setMostrar(false);
    };
    document.addEventListener('mousedown', clickFuera);
    return () => document.removeEventListener('mousedown', clickFuera);
  }, []);

  const manejarKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (mostrar && filtradas.length > 0)
        setIndiceActivo(prev => prev < filtradas.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (mostrar && filtradas.length > 0)
        setIndiceActivo(prev => prev > 0 ? prev - 1 : filtradas.length - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMostrar(false);
      setIndiceActivo(-1);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      if (mostrar && filtradas.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const idx = indiceActivo >= 0 ? indiceActivo : 0;
        seleccionar(filtradas[idx]);
      }
    }
  };

  const seleccionar = (camara) => {
    setBusqueda(`${camara.codigo} - ${camara.nombre}`);
    setMostrar(false);
    setIndiceActivo(-1);
    onSelect(camara);
  };

  return (
    <div style={{ position: 'relative' }} ref={wrapperRef}>
      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
        Cámara: <span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>(↑↓ navegar · Enter elegir · Esc cerrar)</span>
      </label>
      <input
        type="text"
        placeholder="🔍 Buscar Cámara (ej: C-02, Hogar...)"
        value={busqueda}
        onChange={(e) => {
          const valor = e.target.value.toUpperCase();
          setBusqueda(valor);
          setMostrar(valor.trim() !== '');
          setIndiceActivo(-1);
          if (onClear) onClear();
        }}
        onFocus={() => { if (busqueda.trim() !== '') setMostrar(true); }}
        onKeyDown={manejarKeyDown}
        style={{ padding: '10px', border: '2px solid #0056b3', borderRadius: '4px', fontSize: '13px', background: '#fff', width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }}
      />

      {mostrar && filtradas.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '250px', overflowY: 'auto', zIndex: 1000, marginTop: '5px' }}>
          {filtradas.map((c, idx) => {
            const activa = idx === indiceActivo;
            return (
              <div key={idx} onClick={() => seleccionar(c)} onMouseEnter={() => setIndiceActivo(idx)}
                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '12px', background: activa ? '#0056b3' : 'white', color: activa ? 'white' : '#333', transition: 'background 0.15s, color 0.15s', fontWeight: activa ? 'bold' : 'normal' }}>
                <strong style={{ color: activa ? '#ffd54f' : '#0056b3' }}>{String(idx + 1).padStart(3, '0')}.</strong> {' '}
                {c.codigo} - {c.nombre}
                <span style={{ float: 'right', fontWeight: 'bold', color: activa ? '#ffd54f' : '#666', fontSize: '11px' }}>
                  {c.macro_zona}/SECTOR {c.sector}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {mostrar && filtradas.length === 0 && busqueda.trim() !== '' && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '15px', zIndex: 1000, marginTop: '5px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
          No se encontraron cámaras para "{busqueda}"
        </div>
      )}
    </div>
  );
}