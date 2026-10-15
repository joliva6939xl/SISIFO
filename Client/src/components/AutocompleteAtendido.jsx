import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const computeValor = (c) => {
  if (c.modo === 'LISTO') return c.valorFinal || '';
  if (c.modo === 'DETALLE') {
    const v = (c.subValor || '').trim();
    if (v === '') return '';
    if (c.prefijo === 'EME') return `EME-${v}`;
    if (c.prefijo === 'PIE/CASETA') return `PIE - ${v}`;
    return `${c.prefijo} - ${v}`;
  }
  return '';
};

const serialize = (campos) =>
  campos.map(computeValor).filter((x) => x !== '').join(', ');

const coincide = (p, partes) =>
  partes.every((parte) =>
    (p.codigo || '').toUpperCase().includes(parte) ||
    (p.nombre || '').toUpperCase().includes(parte) ||
    (p.grupo || '').toUpperCase().includes(parte)
  );

const crearCampoVacio = () => ({
  id: Date.now() + Math.random(),
  modo: 'BUSCAR',
  busqueda: '',
  mostrandoPopup: false,
  indiceActivo: -1,
  prefijo: '',
  subTipo: '',
  subValor: '',
  subMostrando: false,
  subIndice: -1,
  valorFinal: ''
});

export default function AutocompleteAtendido({ onChange }) {
  const [personal, setPersonal] = useState([]);
  const [campos, setCampos] = useState([crearCampoVacio()]);

  // ✅ REFS para scroll automático
  const opcionRef = useRef(null);       // popup principal
  const subOpcionRef = useRef(null);    // popup paramédicos

  useEffect(() => {
    axios.get('/api/personal')
      .then((res) => setPersonal(Array.isArray(res.data) ? res.data : []))
      .catch((err) => { console.error('Error cargando personal:', err); setPersonal([]); });
  }, []);

  // ✅ SCROLL automático para popup principal
  useEffect(() => {
    if (opcionRef.current) {
      opcionRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [campos.map(c => c.indiceActivo).join(',')]);

  // ✅ SCROLL automático para popup de paramédicos
  useEffect(() => {
    if (subOpcionRef.current) {
      subOpcionRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [campos.map(c => c.subIndice).join(',')]);

  const aplicar = (nuevos) => { setCampos(nuevos); onChange(serialize(nuevos)); };

  const agregarCampo = () => aplicar([...campos, crearCampoVacio()]);

  const eliminarCampo = (id) => {
    const nuevos = campos.filter((c) => c.id !== id);
    aplicar(nuevos.length === 0 ? [crearCampoVacio()] : nuevos);
  };

  const resultadosPrincipal = (q) => {
    if (q.trim() === '') return [];
    const partes = q.toUpperCase().trim().split(/\s+/);
    return personal.filter((p) => {
      if (p.tipo_entrada === 'FIJA' && p.grupo === 'PARAMEDICOS') return false;
      return coincide(p, partes);
    });
  };

  const resultadosSub = (q) => {
    if (q.trim() === '') return [];
    const partes = q.toUpperCase().trim().split(/\s+/);
    return personal.filter((p) => p.grupo === 'PARAMEDICOS' && p.tipo_entrada === 'FIJA' && coincide(p, partes));
  };

  const elegirPrincipal = (campoId, persona) => {
    const nuevos = campos.map((c) => {
      if (c.id !== campoId) return c;
      if (persona.tipo_entrada === 'FIJA') {
        return {
          ...c, modo: 'LISTO',
          valorFinal: persona.codigo ? `${persona.codigo} - ${persona.nombre}` : persona.nombre,
          busqueda: '', mostrandoPopup: false, indiceActivo: -1
        };
      }
      const prefijo = persona.codigo || persona.grupo;
      return {
        ...c, modo: 'DETALLE', prefijo,
        subTipo: prefijo === 'PARAMEDICOS' ? 'AUTOCOMPLETE' : 'LIBRE',
        subValor: '', subMostrando: false, subIndice: -1,
        busqueda: '', mostrandoPopup: false, indiceActivo: -1
      };
    });
    aplicar(nuevos);
  };

  const elegirSub = (campoId, persona) => {
    const nuevos = campos.map((c) =>
      c.id === campoId ? { ...c, subValor: persona.nombre, subMostrando: false, subIndice: -1 } : c
    );
    aplicar(nuevos);
  };

  const setBusqueda = (campoId, valor) =>
    aplicar(campos.map((c) =>
      c.id === campoId
        ? { ...c, busqueda: valor, mostrandoPopup: valor.trim() !== '', indiceActivo: valor.trim() !== '' ? 0 : -1 }
        : c
    ));

  const setSubValor = (campoId, valor) =>
    aplicar(campos.map((c) =>
      c.id === campoId
        ? { ...c, subValor: valor.toUpperCase(), subMostrando: valor.trim() !== '', subIndice: valor.trim() !== '' ? 0 : -1 }
        : c
    ));

  const navegar = (campoId, delta, total, esSub) =>
    aplicar(campos.map((c) => {
      if (c.id !== campoId || total === 0) return c;
      if (esSub) return { ...c, subIndice: Math.min(Math.max(c.subIndice + delta, 0), total - 1) };
      return { ...c, indiceActivo: Math.min(Math.max(c.indiceActivo + delta, 0), total - 1) };
    }));

  const cerrar = (campoId, esSub) =>
    aplicar(campos.map((c) =>
      c.id === campoId ? (esSub ? { ...c, subMostrando: false, subIndice: -1 } : { ...c, mostrandoPopup: false, indiceActivo: -1 }) : c
    ));

  const onKeyDownPrincipal = (e, campoId) => {
    const campo = campos.find((c) => c.id === campoId);
    if (!campo || campo.modo !== 'BUSCAR') return;
    const res = resultadosPrincipal(campo.busqueda);
    if (e.key === 'ArrowDown') { e.preventDefault(); navegar(campoId, 1, res.length, false); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); navegar(campoId, -1, res.length, false); }
    else if (e.key === 'Escape') { e.preventDefault(); cerrar(campoId, false); }
    else if (e.key === 'Enter' && !e.shiftKey && res.length > 0 && campo.mostrandoPopup) {
      e.preventDefault(); e.stopPropagation();
      elegirPrincipal(campoId, res[campo.indiceActivo >= 0 ? campo.indiceActivo : 0]);
    }
  };

  const onKeyDownSub = (e, campoId) => {
    const campo = campos.find((c) => c.id === campoId);
    if (!campo || campo.subTipo !== 'AUTOCOMPLETE') return;
    const res = resultadosSub(campo.subValor);
    if (e.key === 'ArrowDown') { e.preventDefault(); navegar(campoId, 1, res.length, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); navegar(campoId, -1, res.length, true); }
    else if (e.key === 'Escape') { e.preventDefault(); cerrar(campoId, true); }
    else if (e.key === 'Enter' && !e.shiftKey && res.length > 0 && campo.subMostrando) {
      e.preventDefault(); e.stopPropagation();
      elegirSub(campoId, res[campo.subIndice >= 0 ? campo.subIndice : 0]);
    }
  };

  const estiloEtiqueta = {
    display: 'flex', alignItems: 'center', padding: '0 12px',
    background: '#e9ecef', border: '1px solid #adb5bd', borderRight: 'none',
    borderRadius: '4px 0 0 4px', fontSize: '12px', fontWeight: 'bold', color: '#495057', whiteSpace: 'nowrap'
  };
  const estiloCaja = {
    flex: 1, padding: '10px', border: '2px solid #ff9800', borderRadius: '0 4px 4px 0',
    fontSize: '13px', textTransform: 'uppercase', background: '#fff8ee'
  };
  const estiloBtnX = {
    background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px',
    width: '34px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px'
  };
  const estiloPopup = {
    position: 'absolute', top: '100%', left: 0, right: 40, background: 'white',
    border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxHeight: '220px', overflowY: 'auto', zIndex: 1000, marginTop: '2px'
  };

  return (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
        Atendido por:{' '}
        <span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>
          (escribe, elige con ↑↓/Enter, y usa + para varias unidades)
        </span>
      </label>

      {campos.map((campo, index) => {
        const resP = campo.modo === 'BUSCAR' ? resultadosPrincipal(campo.busqueda) : [];
        const resS = campo.modo === 'DETALLE' && campo.subTipo === 'AUTOCOMPLETE' ? resultadosSub(campo.subValor) : [];
        return (
          <div key={campo.id} style={{ position: 'relative', display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'stretch' }}>

            {campo.modo === 'BUSCAR' && (
              <input
                type="text"
                placeholder={`Unidad ${index + 1}: ALFA 71, OMEGA 44, PNP, PARAMEDICO, EME, PIE...`}
                value={campo.busqueda}
                onChange={(e) => setBusqueda(campo.id, e.target.value.toUpperCase())}
                onKeyDown={(e) => onKeyDownPrincipal(e, campo.id)}
                autoFocus={index === 0 && campos.length === 1}
                style={{ flex: 1, padding: '10px', border: '2px solid #0056b3', borderRadius: '4px', fontSize: '13px', textTransform: 'uppercase' }}
              />
            )}

            {campo.modo === 'DETALLE' && (
              <>
                <span style={estiloEtiqueta}>{campo.prefijo}</span>
                <input
                  type="text"
                  placeholder={
                    campo.prefijo === 'EME' ? 'número (ej: 754)'
                    : campo.prefijo === 'PIE/CASETA' ? 'nombre / código del operador'
                    : 'escribe el nombre del paramédico...'
                  }
                  value={campo.subValor}
                  onChange={(e) => setSubValor(campo.id, e.target.value)}
                  onKeyDown={(e) => onKeyDownSub(e, campo.id)}
                  autoFocus
                  style={estiloCaja}
                />
              </>
            )}

            {campo.modo === 'LISTO' && (
              <input
                type="text"
                value={campo.valorFinal}
                readOnly
                style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', background: '#e9ecef', fontWeight: 'bold', color: '#333' }}
              />
            )}

            <button type="button" onClick={() => eliminarCampo(campo.id)} title="Quitar campo" style={estiloBtnX}>×</button>

            {/* ✅ POPUP PRINCIPAL con ref para scroll */}
            {campo.modo === 'BUSCAR' && campo.mostrandoPopup && resP.length > 0 && (
              <div style={estiloPopup}>
                {resP.map((p, idx) => {
                  const act = idx === campo.indiceActivo;
                  return (
                    <div 
                      key={p.id} 
                      ref={act ? opcionRef : null}
                      onClick={() => elegirPrincipal(campo.id, p)} 
                      onMouseEnter={() => aplicar(campos.map((c) => c.id === campo.id ? { ...c, indiceActivo: idx } : c))}
                      style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '12px', background: act ? '#0056b3' : 'white', color: act ? 'white' : '#333', fontWeight: act ? 'bold' : 'normal' }}>
                      <strong style={{ color: act ? '#ffd54f' : '#0056b3' }}>{String(idx + 1).padStart(3, '0')}.</strong>{' '}
                      {p.codigo ? `${p.codigo} - ${p.nombre}` : p.nombre}
                      <span style={{ float: 'right', fontWeight: 'bold', color: act ? '#ffd54f' : '#666', fontSize: '10px' }}>
                        {p.grupo}{p.tipo_entrada === 'CON_DETALLE' ? ' ✍️' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {campo.modo === 'BUSCAR' && campo.mostrandoPopup && resP.length === 0 && campo.busqueda.trim() !== '' && (
              <div style={{ ...estiloPopup, padding: '12px', textAlign: 'center', color: '#666', fontSize: '12px' }}>Sin coincidencias para "{campo.busqueda}"</div>
            )}

            {/* ✅ POPUP PARAMÉDICOS con ref para scroll */}
            {campo.modo === 'DETALLE' && campo.subTipo === 'AUTOCOMPLETE' && campo.subMostrando && resS.length > 0 && (
              <div style={estiloPopup}>
                {resS.map((p, idx) => {
                  const act = idx === campo.subIndice;
                  return (
                    <div 
                      key={p.id} 
                      ref={act ? subOpcionRef : null}
                      onClick={() => elegirSub(campo.id, p)} 
                      onMouseEnter={() => aplicar(campos.map((c) => c.id === campo.id ? { ...c, subIndice: idx } : c))}
                      style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '12px', background: act ? '#ff9800' : 'white', color: act ? 'white' : '#333', fontWeight: act ? 'bold' : 'normal' }}>
                      <strong style={{ color: act ? '#fff3cd' : '#ff9800' }}>{String(idx + 1).padStart(3, '0')}.</strong> {p.nombre}
                    </div>
                  );
                })}
              </div>
            )}
            {campo.modo === 'DETALLE' && campo.subTipo === 'AUTOCOMPLETE' && campo.subMostrando && resS.length === 0 && campo.subValor.trim() !== '' && (
              <div style={{ ...estiloPopup, padding: '12px', textAlign: 'center', color: '#666', fontSize: '12px' }}>Ningún paramédico coincide con "{campo.subValor}"</div>
            )}
          </div>
        );
      })}

      <button type="button" onClick={agregarCampo}
        style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', padding: '9px 18px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Agregar otra unidad
      </button>
    </div>
  );
}