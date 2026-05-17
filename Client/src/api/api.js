import axios from 'axios';

// Aquí es donde en el futuro cambiaremos 'localhost' por la IP del servidor central
const API_URL = 'http://localhost:3000/api';

// Función 1: La que ya tenías para enviar reportes (con fotos/videos)
export const enviarReporte = async (formData) => {
    return await axios.post(`${API_URL}/reportes`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

// Función 2: LA NUEVA ACTUALIZACIÓN (Para traer el historial de tu Almacén)
export const obtenerReportesPorOperador = async (operador) => {
    return await axios.get(`${API_URL}/reportes/${operador}`);
};