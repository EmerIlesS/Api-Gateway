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
app.use(json());  // Middleware para manejar las solicitudes GraphQL y redirigirlas al microservicio adecuado
app.post('/graphql', async (req, res) => {
  try {
    // Determinar a qué servicio enviar la solicitud basado en la operación
    const operation = req.body.query || '';
    let targetUrl;
    let targetServiceName;

    // Para depuración: mostrar la operación completa
    console.log(`Operación completa recibida: ${operation}`);
    
    // Debido a que el servicio de autenticación está caído, temporalmente
    // vamos a enviar todas las consultas relacionadas con productos, órdenes y categorías
    // al servicio de products-orders, y solo intentaremos enviar al servicio de auth
    // si es explícitamente una operación de autenticación
    
    // Utilizar expresiones regulares para una detección más precisa
    const isAuthOperation = /\b(login|register|registerAdmin|registerVendor|token|me|password|addToFavorites|removeFromFavorites)\b/.test(operation);
    const isProductOperation = /\b(Product|Order|Category|categories|products|createCategory|createProduct|updateProduct|deleteProduct)\b/.test(operation);
    
    if (isAuthOperation && !isProductOperation) {
      targetUrl = authServiceUrl;
      targetServiceName = 'auth';
      console.log("Detectado como operación de autenticación");
    } else if (isProductOperation) {
      targetUrl = productsServiceUrl;
      targetServiceName = 'products-orders';
      console.log("Detectado como operación de productos o categorías");
    } else {
      // Para consultas ambiguas, revisar más específicamente
      if (operation.includes('me')) {
        targetUrl = authServiceUrl;
        targetServiceName = 'auth (me query)';
        console.log("Detectada consulta 'me' - enviando a autenticación");
      } else {
        console.warn(`Dirigiendo por defecto al servicio de products-orders: "${operation.substring(0, 100)}..."`);
        targetUrl = productsServiceUrl;
        targetServiceName = 'products-orders (default)';
      }
    }

    console.log(`Redirigiendo solicitud a microservicio ${targetServiceName}: ${targetUrl}`);
    console.log(`Operación: ${operation.substring(0, 100)}...`);
    console.log(`Headers de autorización:`, req.headers.authorization ? 'Presente' : 'Ausente');

    // Configurar los timeouts y reintentos para la solicitud fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

    try {
      // Realizar la solicitud al microservicio correspondiente con timeout
      const requestHeaders = {
        'Content-Type': 'application/json',
        // Pasar el token de autorización si existe
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {})
      };
      
      console.log(`Headers enviados al ${targetServiceName}:`, requestHeaders);
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(req.body),
        signal: controller.signal
      });

      clearTimeout(timeout); // Limpiar el timeout si la solicitud fue exitosa

      // Verificar el código de estado de la respuesta
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      // Obtener la respuesta del microservicio
      const data = await response.json();
      
      // Registrar la respuesta para depuración (sin datos sensibles)
      // Hacer una copia profunda para no modificar la respuesta original
      const logData = JSON.parse(JSON.stringify(data));
      if (logData.data && logData.data.login) {
        logData.data.login.token = 'TOKEN_REDACTED';
      }
      if (logData.data && logData.data.register) {
        logData.data.register.token = 'TOKEN_REDACTED';
      }
      console.log(`Respuesta de ${targetServiceName}:`, JSON.stringify(logData));
      
      // Verificar si hay errores específicos y mejorar el mensaje
      if (data.errors) {
        console.error(`Errores en la respuesta de ${targetServiceName}:`, data.errors);
        
        // Mejorar mensajes de error para el cliente
        const enhancedErrors = data.errors.map((err: any) => {
          // Intentar proporcionar mensajes más amigables según el tipo de error
          if (err.message.includes('not found') || err.message.includes('no encontrado')) {
            return {
              ...err,
              userMessage: 'El recurso solicitado no fue encontrado. Verifique los datos e intente nuevamente.'
            };
          } else if (err.message.includes('already exists') || err.message.includes('ya existe')) {
            return {
              ...err,
              userMessage: 'El recurso ya existe. Por favor use un identificador diferente.'
            };
          } else if (err.message.includes('UNAUTHENTICATED') || err.message.includes('no autenticado')) {
            return {
              ...err,
              userMessage: 'Sesión no iniciada o expirada. Por favor inicie sesión nuevamente.'
            };
          } else if (err.message.includes('FORBIDDEN') || err.message.includes('no autorizado')) {
            return {
              ...err,
              userMessage: 'No tienes permiso para realizar esta acción.'
            };
          }
          // Devolver el error original si no hay una mejora específica
          return err;
        });
        
        return res.json({ ...data, errors: enhancedErrors });
      }
      
      // Devolver la respuesta al cliente
      res.json(data);
      
    } catch (error) {
      clearTimeout(timeout);
      
      // Verificar si es un error de timeout
      const fetchError = error as { name: string };
      if (fetchError.name === 'AbortError') {
        console.error(`Timeout al conectar con el microservicio ${targetServiceName}`);
        return res.status(504).json({ 
          errors: [{ 
            message: 'Tiempo de espera agotado',
            details: `No se pudo conectar con el servicio ${targetServiceName} en el tiempo esperado.`,
            code: 'GATEWAY_TIMEOUT'
          }] 
        });
      }
      
      throw fetchError; // Relanzar para ser manejado por el catch exterior
    }
    
  } catch (error) {
    console.error('Error al procesar la solicitud GraphQL:', error);
    
    // Determinar el tipo de error y proporcionar mensajes adecuados
    let statusCode = 500;
    let errorMessage = 'Error interno del servidor';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        statusCode = 503;
        errorMessage = 'El servicio no está disponible temporalmente';
        errorCode = 'SERVICE_UNAVAILABLE';
      } else if (error.message.includes('Unexpected token') || error.message.includes('invalid json')) {
        errorMessage = 'Error al procesar la respuesta del microservicio';
        errorCode = 'INVALID_RESPONSE';
      }
    }
    
    // Proporcionar más detalles sobre el error
    res.status(statusCode).json({ 
      errors: [{ 
        message: errorMessage, 
        details: error instanceof Error ? error.message : 'Error desconocido',
        code: errorCode,
        path: req.body.query ? req.body.query.split(' ')[1] : 'unknown'
      }] 
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
