import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Shield, MapPin, LogIn, Clock } from 'lucide-react';
import { registrarUsuario } from '../api/api';

const API_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:3000/api' 
  : `http://${window.location.hostname}:3000/api`;

export default function LoginScreen({ onLoginSuccess }) {
  const [modoRegistro, setModoRegistro] = useState(false);
  const [token, setToken] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState({ nombre: '', apellido: '', dni: '', centro: 'BASE CENTRAL', turno: 'MAÑANA' });

  useEffect(() => {
    const cargarQR = async () => {
      if (datosUsuario.nombre && datosUsuario.apellido) {
        const userEsperado = datosUsuario.nombre.charAt(0).toLowerCase() + datosUsuario.apellido.toLowerCase().replace(/\s/g, '');
        try {
          const qrRes = await axios.post(`${API_URL}/otp/setup`, { usuario: userEsperado });
          setQrCode(qrRes.data.qr);
        } catch (err) { console.error("Error QR:", err); }
      } else { setQrCode(null); }
    };
    cargarQR();
  }, [datosUsuario.nombre, datosUsuario.apellido]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!datosUsuario.nombre || !datosUsuario.apellido || !token) return alert("Complete los datos y el código OTP.");
    const userEsperado = datosUsuario.nombre.charAt(0).toLowerCase() + datosUsuario.apellido.toLowerCase().replace(/\s/g, '');
    try {
      const respuesta = await axios.post(`${API_URL}/login`, { usuario: userEsperado, token });
      if (respuesta.data.success) {
        onLoginSuccess(respuesta.data.usuario, respuesta.data.cargo, datosUsuario.centro, datosUsuario.turno);
      }
    } catch (error) {
      alert("Atención: " + (error.response?.data || "Error al intentar ingresar."));
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    if (!datosUsuario.nombre || !datosUsuario.apellido || !datosUsuario.dni) return alert("Complete los campos.");
    try {
      const respuesta = await registrarUsuario({ nombre: datosUsuario.nombre, apellido: datosUsuario.apellido, dni: datosUsuario.dni, cargo: 'OPERADOR' });
      if (respuesta.data.success) {
        alert(`Operador creado: ${respuesta.data.usuario}`);
        setModoRegistro(false);
        setDatosUsuario({ nombre: '', apellido: '', dni: '', centro: 'BASE CENTRAL', turno: 'MAÑANA' });
        setToken('');
      }
    } catch (error) {
      alert(error.response?.data || "Error al registrar.");
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: '#f0f2f5', 
      padding: '20px' 
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '16px', 
        boxShadow: '0 12px 32px rgba(0,0,0,0.08)', 
        maxWidth: '900px',
        width: '100%'
      }}>
        {/* TÍTULO - Ocupa todo el ancho */}
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '30px', 
          color: '#1a1a1a', 
          fontSize: '32px', 
          fontWeight: '700',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          margin: '0 0 30px 0'
        }}>
          SISIFO - ACCESO
        </h2>

        {/* CONTENIDO - QR y Formulario */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          
          {/* COLUMNA IZQUIERDA - QR */}
          <div style={{ 
            flex: '0 0 240px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            paddingTop: '10px'
          }}>
            {qrCode ? (
              <>
                <div style={{ 
                  background: '#fff', 
                  padding: '15px', 
                  borderRadius: '12px', 
                  border: '2px solid #e5e7eb', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  marginBottom: '12px' 
                }}>
                  <img src={qrCode} style={{ width: '180px', display: 'block' }} alt="QR" />
                </div>
                <p style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                  Escanea con Google Authenticator
                </p>
              </>
            ) : (
              <div style={{ 
                height: '200px', 
                width: '200px', 
                background: '#f9fafb', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                border: '2px dashed #d1d5db', 
                borderRadius: '12px', 
                color: '#9ca3af', 
                fontSize: '12px', 
                textAlign: 'center', 
                padding: '15px'
              }}>
                El código QR aparecerá aquí al ingresar tu nombre y apellido
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA - Formulario */}
          <div style={{ flex: 1 }}>
            <form onSubmit={modoRegistro ? handleRegistro : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Nombre y Apellido */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} /> Nombre
                  </label>
                  <input 
                    type="text" 
                    value={datosUsuario.nombre} 
                    style={{ width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }} 
                    onFocus={(e) => e.target.style.borderColor = '#0056b3'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    onChange={e => setDatosUsuario({...datosUsuario, nombre: e.target.value.toUpperCase()})} 
                    required 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Apellido</label>
                  <input 
                    type="text" 
                    value={datosUsuario.apellido} 
                    style={{ width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }} 
                    onFocus={(e) => e.target.style.borderColor = '#0056b3'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    onChange={e => setDatosUsuario({...datosUsuario, apellido: e.target.value.toUpperCase()})} 
                    required 
                  />
                </div>
              </div>

              {/* OTP o Contraseña */}
              {!modoRegistro ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} /> Código OTP
                  </label>
                  <input 
                    type="text" 
                    value={token} 
                    style={{ width: '100%', padding: '14px', boxSizing: 'border-box', letterSpacing: '6px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold', border: '2px solid #0056b3', borderRadius: '8px', background: '#f8fafc', outline: 'none' }} 
                    onChange={e => setToken(e.target.value.replace(/\D/g, ''))} 
                    required 
                    placeholder="123456" 
                    maxLength={6} 
                  />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} /> Contraseña (DNI)
                  </label>
                  <input 
                    type="password" 
                    style={{ width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }} 
                    onFocus={(e) => e.target.style.borderColor = '#0056b3'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    onChange={e => setDatosUsuario({...datosUsuario, dni: e.target.value})} 
                    required 
                  />
                </div>
              )}

              {/* Base y Turno */}
              {!modoRegistro && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} /> Base
                    </label>
                    <select 
                      style={{ width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white', outline: 'none', cursor: 'pointer' }} 
                      onChange={e => setDatosUsuario({...datosUsuario, centro: e.target.value})}
                    >
                      <option value="BASE CENTRAL">BASE CENTRAL</option>
                      <option value="CEMO NORTE">CEMO NORTE</option>
                      <option value="CEMO SUR">CEMO SUR</option>
                      <option value="CEMO CENTRO">CEMO CENTRO</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} /> Turno
                    </label>
                    <select 
                      style={{ width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white', outline: 'none', cursor: 'pointer' }} 
                      onChange={e => setDatosUsuario({...datosUsuario, turno: e.target.value})}
                    >
                      <option value="MAÑANA">MAÑANA</option>
                      <option value="TARDE">TARDE</option>
                      <option value="NOCHE">NOCHE</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                {!modoRegistro ? (
                  <>
                    <button 
                      type="submit" 
                      style={{ flex: 2, background: '#0056b3', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.background = '#004494'}
                      onMouseLeave={(e) => e.target.style.background = '#0056b3'}
                    >
                      INGRESAR <LogIn size={18} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setModoRegistro(true)} 
                      style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: '14px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
                      onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
                    >
                      Registrar
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="submit" 
                      style={{ flex: 2, background: '#059669', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.background = '#047857'}
                      onMouseLeave={(e) => e.target.style.background = '#059669'}
                    >
                      CREAR OPERADOR
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setModoRegistro(false)} 
                      style={{ flex: 1, background: '#fee2e2', color: '#991b1b', padding: '14px', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.background = '#fecaca'}
                      onMouseLeave={(e) => e.target.style.background = '#fee2e2'}
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}