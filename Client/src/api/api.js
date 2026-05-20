import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

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