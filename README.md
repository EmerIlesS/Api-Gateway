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

### Federación de Esquemas GraphQL

La federación de esquemas GraphQL es una característica clave de este gateway que permite:

1. **Esquema Unificado**: Combina los esquemas de múltiples servicios en un único esquema coherente.
2. **Resolución Distribuida**: Las consultas que abarcan múltiples servicios son divididas y enrutadas adecuadamente.
3. **Referencias entre Servicios**: Los tipos pueden hacer referencia a entidades definidas en otros servicios.

### Comunicación entre Servicios

La comunicación entre el Gateway y los microservicios se realiza a través de HTTP, utilizando los endpoints GraphQL de cada servicio:

- **ms-auth-java**: Gestiona la autenticación, usuarios y favoritos en `http://localhost:4001/graphql`
- **ms-products-orders**: Gestiona productos, categorías y órdenes en `http://localhost:4002/graphql`

### Flujo de Datos

1. El cliente envía una consulta GraphQL al Gateway (`http://localhost:4000/graphql`)
2. El Gateway analiza la consulta y determina qué partes corresponden a cada servicio
3. El Gateway envía subconsultas a los servicios correspondientes
4. Los servicios procesan sus subconsultas y devuelven resultados
5. El Gateway combina los resultados y los devuelve al cliente como una respuesta unificada

### Autenticación entre Servicios

El token JWT generado por el servicio de autenticación es pasado a través del Gateway a los demás servicios, permitiendo la validación de permisos en cada microservicio.

## Autenticación

El Gateway pasa los tokens JWT recibidos en el encabezado `Authorization` a los microservicios correspondientes, permitiendo que estos validen la autenticación y autorización del usuario.
