# API Gateway

## Descripción
Este API Gateway actúa como punto de entrada unificado para los microservicios de la aplicación de e-commerce. Se encarga de gestionar las peticiones entre el cliente y los microservicios, enrutando las solicitudes apropiadas a cada servicio según las rutas configuradas.

## Características

- Punto de entrada único para todos los microservicios
- Enrutamiento inteligente de solicitudes
- Integración con GraphQL
- Gestión de autenticación mediante tokens JWT
- Soporte para múltiples microservicios

## Tecnologías Utilizadas

- Node.js
- TypeScript
- Apollo Gateway
- Apollo Server
- Express
- GraphQL

## Estructura del Proyecto

```
gateway/
├── src/
│   ├── index.ts                 # Punto de entrada principal
│   └── supergraph-config.yaml   # Configuración del supergraph
├── .env.example                 # Ejemplo de variables de entorno
├── .gitignore
├── Dockerfile.example           # Ejemplo de configuración Docker
├── package.json                 # Dependencias y scripts
├── package-lock.json
├── tsconfig.json                # Configuración de TypeScript
└── README.md
```

## Configuración

El API Gateway está configurado para conectarse a los siguientes microservicios:

1. **Microservicio de Autenticación (ms-auth-java)**
   - URL por defecto: `http://localhost:4001/graphql`
   - Funcionalidades: Registro de usuarios, inicio de sesión, gestión de roles, favoritos

2. **Microservicio de Productos y Órdenes (ms-products-orders)**
   - URL por defecto: `http://localhost:4002/graphql`
   - Funcionalidades: Gestión de productos, categorías, órdenes

## Instalación y Ejecución

1. Instalar dependencias:
   ```
   npm install
   ```

2. Configurar variables de entorno (crear archivo .env basado en .env.example):
   ```
   PORT=4000
   AUTH_SERVICE_URL=http://localhost:4001/graphql
   PRODUCTS_SERVICE_URL=http://localhost:4002/graphql
   ```

3. Ejecutar en modo desarrollo:
   ```
   npm run dev
   ```

4. Compilar y ejecutar en producción:
   ```
   npm run build
   npm start
   ```

## Endpoints

El API Gateway expone un único endpoint GraphQL:

- **GraphQL Endpoint**: `http://localhost:4000/graphql`

Este endpoint maneja todas las operaciones de la API, incluyendo:
- Autenticación (registro, login, obtener perfil)
- Gestión de productos favoritos
- Productos y categorías
- Creación y visualización de órdenes

## Integración con Microservicios

El API Gateway utiliza Apollo Gateway para integrar los esquemas GraphQL de los microservicios en un único esquema unificado. Esto permite a los clientes realizar consultas que pueden abarcar múltiples servicios de forma transparente.

La comunicación entre el Gateway y los microservicios se realiza a través de HTTP, utilizando los endpoints GraphQL de cada servicio.

## Autenticación

El Gateway pasa los tokens JWT recibidos en el encabezado `Authorization` a los microservicios correspondientes, permitiendo que estos validen la autenticación y autorización del usuario.
