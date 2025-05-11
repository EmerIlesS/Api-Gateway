import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { json } from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// URLs de los microservicios
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql';
const productsServiceUrl = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4002/graphql';

// Configurar middleware CORS
app.use(cors());
app.use(json());

// Middleware para manejar las solicitudes GraphQL y redirigirlas al microservicio adecuado
app.post('/graphql', async (req, res) => {
  try {
    // Determinar a qué servicio enviar la solicitud basado en la operación
    const operation = req.body.query || '';
    let targetUrl;

    // Operaciones relacionadas con autenticación y usuarios
    if (operation.includes('login') || 
        operation.includes('register') || 
        operation.includes('User') || 
        operation.includes('Auth') || 
        operation.includes('token')) {
      targetUrl = authServiceUrl;
    } 
    // Operaciones relacionadas con productos y órdenes
    else if (operation.includes('Product') || 
             operation.includes('Order') || 
             operation.includes('Category')) {
      targetUrl = productsServiceUrl;
    } 
    // Si no podemos determinar el servicio, enviamos al servicio de autenticación por defecto
    else {
      targetUrl = authServiceUrl;
    }

    // Realizar la solicitud al microservicio correspondiente
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pasar el token de autorización si existe
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {})
      },
      body: JSON.stringify(req.body)
    });

    // Obtener la respuesta del microservicio
    const data = await response.json();
    
    // Devolver la respuesta al cliente
    res.json(data);
    
  } catch (error) {
    console.error('Error al procesar la solicitud GraphQL:', error);
    res.status(500).json({ 
      errors: [{ message: 'Error interno del servidor' }] 
    });
  }
});

// Ruta para verificar el estado del gateway
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      auth: authServiceUrl,
      products: productsServiceUrl
    }
  });
});

// Iniciar el servidor Express
app.listen(port, () => {
  console.log(`🚀 Gateway listo en http://localhost:${port}/graphql`);
  console.log(`Verificar estado: http://localhost:${port}/health`);
  console.log(`Servicios conectados:`);
  console.log(`- Auth: ${authServiceUrl}`);
  console.log(`- Products: ${productsServiceUrl}`);
});
