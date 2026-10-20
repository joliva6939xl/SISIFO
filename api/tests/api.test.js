const request = require('supertest');
const app = require('../index'); // Importa tu app de Express

// ==========================================
// TEST 1: Login exitoso con OTP válido
// ==========================================
describe('POST /api/login', () => {
  test('debería permitir login con usuario y OTP válidos', async () => {
    // NOTA: Reemplaza 'ccenter' y el token con un usuario real de tu BD
    // El token debe ser el código OTP actual de Google Authenticator
    const response = await request(app)
      .post('/api/login')
      .send({
        usuario: 'ccenter',
        token: '123456' // ← Reemplaza con un código OTP válido de tu app
      });

    // El test pasa si el status es 200 (éxito)
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('usuario', 'ccenter');
  });

  // ==========================================
  // TEST 2: Login fallido con OTP incorrecto
  // ==========================================
  test('debería rechazar login con OTP incorrecto', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        usuario: 'ccenter',
        token: '000000' // Código falso
      });

    // El test pasa si el status es 401 (no autorizado)
    expect(response.status).toBe(401);
  });

  // ==========================================
  // TEST 3: Login con usuario inexistente
  // ==========================================
  test('debería rechazar login con usuario que no existe', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        usuario: 'usuario_falso_123',
        token: '123456'
      });

    expect(response.status).toBe(401);
  });
});

// ==========================================
// TEST 4: Crear usuario nuevo
// ==========================================
describe('POST /api/usuarios', () => {
  test('debería crear un nuevo usuario exitosamente', async () => {
    const response = await request(app)
      .post('/api/usuarios')
      .send({
        nombre: 'JUAN',
        apellido: 'PEREZ',
        dni: '12345678',
        cargo: 'OPERADOR'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('usuario', 'jperez');
  });

  // ==========================================
  // TEST 5: Intentar crear usuario duplicado
  // ==========================================
  test('debería rechazar crear un usuario duplicado', async () => {
    const response = await request(app)
      .post('/api/usuarios')
      .send({
        nombre: 'JUAN',
        apellido: 'PEREZ',
        dni: '12345678',
        cargo: 'OPERADOR'
      });

    // El test pasa si el status es 400 (bad request) por duplicado
    expect(response.status).toBe(400);
  });
});

// ==========================================
// TEST 6: Obtener lista de usuarios
// ==========================================
describe('GET /api/usuarios', () => {
  test('debería devolver la lista de usuarios', async () => {
    const response = await request(app)
      .get('/api/usuarios');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

// ==========================================
// TEST 7: Ruta inexistente (404)
// ==========================================
describe('Rutas no encontradas', () => {
  test('debería devolver 404 para rutas inexistentes', async () => {
    const response = await request(app)
      .get('/api/ruta-que-no-existe');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Ruta no encontrada');
  });
});