import axios from 'axios';

const API_URL = window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : window.location.origin + '/api';

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

// NUEVA CONEXIÓN: Pide la lista de personal a la base de datos
export const obtenerUsuariosLista = async () => {
    return await axios.get(`${API_URL}/usuarios`);
};

export const registrarUsuario = async (datos) => {
    return await axios.post(`${API_URL}/usuarios`, datos);
};

export const loginUsuario = async (datos) => {
    return await axios.post(`${API_URL}/login`, datos);


};

// AÑADIR EN Client/src/api/api.js
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
export const eliminarUsuario = (id) => axios.delete(`${API_URL}/usuarios/${id}`);
export const actualizarEstadoUsuario = (id, data) => axios.put(`${API_URL}/usuarios/${id}/estado`, data);
