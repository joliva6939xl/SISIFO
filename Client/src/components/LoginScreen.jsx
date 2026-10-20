import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Shield, MapPin, LogIn, Clock } from 'lucide-react';
import { registrarUsuario } from '../api/api';

// ✅ AGREGAR ESTA LÍNEA
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
          // ✅ CAMBIAR: usar API_URL completo
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
      // ✅ CAMBIAR: usar API_URL completo
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
      }
    } catch (error) {
      alert(error.response?.data || "Error al registrar.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f4f9', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', gap: '40px', alignItems: 'center', maxWidth: '850px' }}>
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '2px solid #eee', paddingRight: '40px' }}>
          <div style={{ background: '#e8f4fd', color: '#0056b3', padding: '15px', borderRadius: '50%', marginBottom: '15px' }}><Shield size={40} /></div>
          <h3 style={{ margin: '0 0 10px 0', color: '#333', textAlign: 'center' }}>Seguridad OTP</h3>
          {qrCode ? (
            <>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
                <img src={qrCode} style={{ width: '180px', display: 'block' }} alt="QR" />
              </div>
              <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', lineHeight: '1.4', margin: 0 }}>Escanea este código con <b>Google Authenticator</b>.</p>
            </>
          ) : (
            <div style={{ height: '200px', width: '200px', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc', borderRadius: '10px', color: '#888', fontSize: '12px', textAlign: 'center', padding: '20px', margin: '10px 0' }}>El código aparecerá aquí al ingresar tu nombre.</div>
          )}
        </div>
        <div style={{ width: '380px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>{modoRegistro ? 'NUEVO OPERADOR' : 'SISIFO - ACCESO'}</h2>
          <form onSubmit={modoRegistro ? handleRegistro : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}><User size={12}/> Nombre</label>
                <input type="text" value={datosUsuario.nombre} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} onChange={e => setDatosUsuario({...datosUsuario, nombre: e.target.value.toUpperCase()})} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Apellido</label>
                <input type="text" value={datosUsuario.apellido} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} onChange={e => setDatosUsuario({...datosUsuario, apellido: e.target.value.toUpperCase()})} required />
              </div>
            </div>
            {!modoRegistro ? (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}><Shield size={12}/> Código OTP</label>
                <input type="text" value={token} style={{ width: '100%', padding: '12px', boxSizing: 'border-box', letterSpacing: '4px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', border: '2px solid #0056b3', borderRadius: '4px', background: '#f4f9ff' }} onChange={e => setToken(e.target.value)} required placeholder="123456" maxLength={6} />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}><Shield size={12}/> Contraseña (DNI)</label>
                <input type="password" style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} onChange={e => setDatosUsuario({...datosUsuario, dni: e.target.value})} required />
              </div>
            )}
            {!modoRegistro && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}><MapPin size={12}/> Base</label>
                  <select style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} onChange={e => setDatosUsuario({...datosUsuario, centro: e.target.value})}>
                    <option value="BASE CENTRAL">BASE CENTRAL</option><option value="CEMO NORTE">CEMO NORTE</option><option value="CEMO SUR">CEMO SUR</option><option value="CEMO CENTRO">CEMO CENTRO</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}><Clock size={12}/> Turno</label>
                  <select style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} onChange={e => setDatosUsuario({...datosUsuario, turno: e.target.value})}>
                    <option value="MAÑANA">MAÑANA</option><option value="TARDE">TARDE</option><option value="NOCHE">NOCHE</option>
                  </select>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              {!modoRegistro ? (
                <>
                  <button type="submit" style={{ flex: 2, background: '#0056b3', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>INGRESAR <LogIn size={16} /></button>
                  <button type="button" onClick={() => setModoRegistro(true)} style={{ flex: 1, background: '#6c757d', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Registrar</button>
                </>
              ) : (
                <>
                  <button type="submit" style={{ flex: 2, background: '#28a745', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>CREAR OPERADOR</button>
                  <button type="button" onClick={() => setModoRegistro(false)} style={{ flex: 1, background: '#dc3545', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Cancelar</button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}