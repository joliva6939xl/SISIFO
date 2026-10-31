import axios from 'axios';

const API_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:3000/api' 
  : `http://${window.location.hostname}:3000/api`;

// ==========================================
// INTERCEPTOR DE RESPUESTAS (Manejo global de errores)
// ==========================================
axios.interceptors.response.use(
  response => response,
  error => {
    const errorMessage = error.response?.data?.error || error.message;
    const statusCode = error.response?.status;

    console.error('❌ Error API:', {
      url: error.config?.url,
      method: error.config?.method,
      status: statusCode,
      message: errorMessage
    });

    if (statusCode === 401) {
      localStorage.removeItem('sisifo_user');
      localStorage.removeItem('sisifo_cargo');
      window.location.href = '/';
      alert('Sesión expirada. Por favor inicie sesión nuevamente.');
    } else if (statusCode === 403) {
      alert('Acceso denegado. No tiene permisos para esta acción.');
    } else if (statusCode === 429) {
      alert('Demasiadas peticiones. Intente nuevamente en unos minutos.');
    } else if (statusCode >= 500) {
      alert('Error del servidor. Intente nuevamente más tarde.');
    }

    return Promise.reject(error);
  }
);

// ==========================================
// INTERCEPTOR DE PETICIONES (Preparado para tokens)
// ==========================================
axios.interceptors.request.use(
  config => {
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// ==========================================
// ENDPOINTS
// ==========================================

export const enviarReporte = async (formData) => {
  return await axios.post(`${API_URL}/reportes`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const obtenerReportesPorOperador = async (operador) => {
  return await axios.get(`${API_URL}/reportes/${operador}`);
};

export const obtenerReportesGlobales = async () => {
  return await axios.get(`${API_URL}/reportes_globales`);
};

export const obtenerUsuariosLista = async () => {
  return await axios.get(`${API_URL}/usuarios`);
};

export const registrarUsuario = async (datos) => {
  return await axios.post(`${API_URL}/usuarios`, datos);
};

export const loginUsuario = async (datos) => {
  return await axios.post(`${API_URL}/login`, datos);
};

export const obtenerSalas = async () => {
  return await axios.get(`${API_URL}/salas`);
};

export const borrarSala = async (id) => {
  return await axios.delete(`${API_URL}/salas/${id}`);
};

export const vincularUsuarioASala = async (datos) => {
  return await axios.post(`${API_URL}/salas/vincular`, datos);
};

export const crearSala = async (datos) => {
  return await axios.post(`${API_URL}/salas`, datos);
};

export const eliminarUsuario = (id) => {
  return axios.delete(`${API_URL}/usuarios/${id}`);
};

export const actualizarEstadoUsuario = (id, data) => {
  return axios.put(`${API_URL}/usuarios/${id}/estado`, data);
};

export const actualizarCargoUsuario = (id, data) => {
  return axios.put(`${API_URL}/usuarios/${id}/cargo`, data);
};

export const configurarOTP = async (datos) => {
  try {
    const res = await axios.post(`${API_URL}/configurar-otp`, datos);
    return res.data;
  } catch (err) {
    console.warn('Endpoint OTP no disponible, usando modo mock:', err.message);
    return { 
      qr: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MockOTP_${datos.usuario}`,
      secret: 'MOCK_SECRET'
    };
  }
};

// ==========================================
// ✅ NUEVO: ENDPOINTS DE CÁMARAS
// ==========================================
export const obtenerCamarasFijas = async () => {
  return await axios.get(`${API_URL}/camaras-fijas`);
};

export const obtenerTodasLasCamaras = async () => {
  return await axios.get(`${API_URL}/camaras/todas`);
};

// ==========================================
// HELPERS DE RED: resuelven imágenes y socket contra el BACKEND (puerto 3000)
// ==========================================
export const getSocketUrl = () =>
  `http://${window.location.hostname || 'localhost'}:3000`;

export const getMediaUrl = (ruta) => {
  if (!ruta) return '';
  if (typeof ruta === 'string' && ruta.startsWith('http')) return ruta;
  return `http://${window.location.hostname || 'localhost'}:3000${ruta}`;
};