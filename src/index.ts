import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
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

// Función para hacer peticiones a los microservicios
const forwardToService = async (serviceUrl: string, query: string, variables: any, headers: any) => {
  try {
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error conectando con ${serviceUrl}:`, error);
    throw error;
  }
};

// Esquema combinado manualmente para el gateway
const typeDefs = `
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: String!
    favorites: [ID!]!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type UserProfile {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: String!
    favorites: [ID!]!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    originalPrice: Float
    discount: Int
    image: String!
    images: [String!]!
    category: String!
    categoryId: ID!
    stock: Int!
    rating: Float
    reviews: Int
    featured: Boolean
    active: Boolean
    createdAt: String
    updatedAt: String
  }

  type ProductsResponse {
    products: [Product!]!
    total: Int!
    page: Int!
    totalPages: Int!
    hasMore: Boolean!
  }

  type Category {
    id: ID!
    name: String!
    description: String!
    icon: String
    image: String
    productsCount: Int!
    active: Boolean!
    createdAt: String
    updatedAt: String
  }

  type Order {
    id: ID!
    userId: ID!
    status: OrderStatus!
    total: Float!
    items: [OrderItem!]!
    createdAt: String!
    updatedAt: String!
  }

  type OrderItem {
    product: Product!
    quantity: Int!
    price: Float!
    subtotal: Float!
  }

  enum OrderStatus {
    pending
    processing
    completed
    cancelled
  }

  enum SortOrder {
    ASC
    DESC
  }

  input ProductFiltersInput {
    category: String
    categoryId: ID
    search: String
    minPrice: Float
    maxPrice: Float
    featured: Boolean
    active: Boolean
    inStock: Boolean
    page: Int = 1
    limit: Int = 10
    sortBy: String = "createdAt"
    sortOrder: SortOrder = DESC
  }

  input CreateProductInput {
    name: String!
    description: String!
    price: Float!
    originalPrice: Float
    image: String!
    images: [String!]
    categoryId: ID!
    stock: Int!
    featured: Boolean = false
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    originalPrice: Float
    image: String
    images: [String!]
    categoryId: ID
    stock: Int
    featured: Boolean
    active: Boolean
  }

  input CreateCategoryInput {
    name: String!
    description: String!
  }

  input CreateOrderInput {
    items: [OrderItemInput!]!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  type Query {
    # Auth queries
    me: UserProfile
    
    # Products queries
    products(filters: ProductFiltersInput): ProductsResponse!
    product(id: ID!): Product
    featuredProducts(limit: Int = 8): [Product!]!
    categories: [Category!]!
    category(id: ID!): Category
    
    # Orders queries
    orders: [Order!]!
    order(id: ID!): Order
  }

  type Mutation {
    # Auth mutations
    register(input: RegisterInput!): AuthPayload!
    registerVendor(input: RegisterInput!): AuthPayload!
    registerAdmin(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    addToFavorites(productId: ID!): User!
    removeFromFavorites(productId: ID!): User!
    
    # Products mutations
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
    createCategory(input: CreateCategoryInput!): Category!
    
    # Orders mutations
    createOrder(input: CreateOrderInput!): Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
    cancelOrder(id: ID!): Order!
  }
`;

// Resolvers que redirigen a los microservicios apropiados
const resolvers = {
  Query: {
    // Auth queries
    me: async (_: any, __: any, context: any) => {
      const result = await forwardToService(
        authServiceUrl,
        'query { me { id email firstName lastName role favorites } }',
        {},
        context.headers
      );
      return result.data?.me;
    },

    // Products queries
    products: async (_: any, { filters }: { filters?: any }) => {
      const result = await forwardToService(
        productsServiceUrl,
        'query($filters: ProductFiltersInput) { products(filters: $filters) { products { id name description price originalPrice discount image images category categoryId stock rating reviews featured active createdAt updatedAt } total page totalPages hasMore } }',
        { filters },
        {}
      );
      return result.data?.products;
    },

    product: async (_: any, { id }: { id: string }) => {
      const result = await forwardToService(
        productsServiceUrl,
        'query($id: ID!) { product(id: $id) { id name description price originalPrice discount image images category categoryId stock rating reviews featured active createdAt updatedAt } }',
        { id },
        {}
      );
      return result.data?.product;
    },

    featuredProducts: async (_: any, { limit }: { limit?: number }) => {
      const result = await forwardToService(
        productsServiceUrl,
        'query($limit: Int) { featuredProducts(limit: $limit) { id name description price originalPrice discount image images category categoryId stock rating reviews featured active createdAt updatedAt } }',
        { limit },
        {}
      );
      return result.data?.featuredProducts;
    },

    categories: async () => {
      const result = await forwardToService(
        productsServiceUrl,
        'query { categories { id name description icon image productsCount active createdAt updatedAt } }',
        {},
        {}
      );
      return result.data?.categories;
    },

    category: async (_: any, { id }: { id: string }) => {
      const result = await forwardToService(
        productsServiceUrl,
        'query($id: ID!) { category(id: $id) { id name description icon image productsCount active createdAt updatedAt } }',
        { id },
        {}
      );
      return result.data?.category;
    },

    orders: async (_: any, __: any, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'query { orders { id userId status total items { product { id name description price } quantity price subtotal } createdAt updatedAt } }',
        {},
        context.headers
      );
      return result.data?.orders;
    },

    order: async (_: any, { id }: { id: string }, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'query($id: ID!) { order(id: $id) { id userId status total items { product { id name description price } quantity price subtotal } createdAt updatedAt } }',
        { id },
        context.headers
      );
      return result.data?.order;
    },
  },

  Mutation: {
    // Auth mutations
    register: async (_: any, { input }: any) => {
      const result = await forwardToService(
        authServiceUrl,
        'mutation($input: RegisterInput!) { register(input: $input) { token user { id email firstName lastName role favorites } } }',
        { input },
        {}
      );
      return result.data?.register;
    },

    registerVendor: async (_: any, { input }: any) => {
      const result = await forwardToService(
        authServiceUrl,
        'mutation($input: RegisterInput!) { registerVendor(input: $input) { token user { id email firstName lastName role favorites } } }',
        { input },
        {}
      );
      return result.data?.registerVendor;
    },

    registerAdmin: async (_: any, { input }: any) => {
      const result = await forwardToService(
        authServiceUrl,
        'mutation($input: RegisterInput!) { registerAdmin(input: $input) { token user { id email firstName lastName role favorites } } }',
        { input },
        {}
      );
      return result.data?.registerAdmin;
    },

    login: async (_: any, { input }: any) => {
      const result = await forwardToService(
        authServiceUrl,
        'mutation($input: LoginInput!) { login(input: $input) { token user { id email firstName lastName role favorites } } }',
        { input },
        {}
      );
      return result.data?.login;
    },

    addToFavorites: async (_: any, { productId }: any, context: any) => {
      const result = await forwardToService(
        authServiceUrl,
        'mutation($productId: ID!) { addToFavorites(productId: $productId) { id email firstName lastName role favorites } }',
        { productId },
        context.headers
      );
      return result.data?.addToFavorites;
    },

    removeFromFavorites: async (_: any, { productId }: any, context: any) => {
      const result = await forwardToService(
        authServiceUrl,
        'mutation($productId: ID!) { removeFromFavorites(productId: $productId) { id email firstName lastName role favorites } }',
        { productId },
        context.headers
      );
      return result.data?.removeFromFavorites;
    },

    // Products mutations
    createProduct: async (_: any, { input }: any, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'mutation($input: CreateProductInput!) { createProduct(input: $input) { id name description price originalPrice discount image images category categoryId stock rating reviews featured active createdAt updatedAt } }',
        { input },
        context.headers
      );
      return result.data?.createProduct;
    },

    updateProduct: async (_: any, { id, input }: any, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'mutation($id: ID!, $input: UpdateProductInput!) { updateProduct(id: $id, input: $input) { id name description price originalPrice discount image images category categoryId stock rating reviews featured active createdAt updatedAt } }',
        { id, input },
        context.headers
      );
      return result.data?.updateProduct;
    },

    deleteProduct: async (_: any, { id }: any, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'mutation($id: ID!) { deleteProduct(id: $id) }',
        { id },
        context.headers
      );
      return result.data?.deleteProduct;
    },

    createCategory: async (_: any, { input }: any, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'mutation($input: CreateCategoryInput!) { createCategory(input: $input) { id name description icon image productsCount active createdAt updatedAt } }',
        { input },
        context.headers
      );
      return result.data?.createCategory;
    },

    createOrder: async (_: any, { input }: any, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'mutation($input: CreateOrderInput!) { createOrder(input: $input) { id userId status total items { product { id name description price } quantity price subtotal } createdAt updatedAt } }',
        { input },
        context.headers
      );
      return result.data?.createOrder;
    },

    updateOrderStatus: async (_: any, { id, status }: any, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'mutation($id: ID!, $status: OrderStatus!) { updateOrderStatus(id: $id, status: $status) { id userId status total items { product { id name description price } quantity price subtotal } createdAt updatedAt } }',
        { id, status },
        context.headers
      );
      return result.data?.updateOrderStatus;
    },

    cancelOrder: async (_: any, { id }: any, context: any) => {
      const result = await forwardToService(
        productsServiceUrl,
        'mutation($id: ID!) { cancelOrder(id: $id) { id userId status total items { product { id name description price } quantity price subtotal } createdAt updatedAt } }',
        { id },
        context.headers
      );
      return result.data?.cancelOrder;
    },
  },
};

// Crear Apollo Server con el esquema unificado
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    
    // Mejorar mensajes de error para el cliente
    if (error.message.includes('not found') || error.message.includes('no encontrado')) {
      return {
        ...error,
        message: 'El recurso solicitado no fue encontrado. Verifique los datos e intente nuevamente.',
        extensions: {
          ...error.extensions,
          code: 'NOT_FOUND'
        }
      };
    } else if (error.message.includes('already exists') || error.message.includes('ya existe')) {
      return {
        ...error,
        message: 'El recurso ya existe. Por favor use un identificador diferente.',
        extensions: {
          ...error.extensions,
          code: 'ALREADY_EXISTS'
        }
      };
    } else if (error.message.includes('UNAUTHENTICATED') || error.message.includes('no autenticado')) {
      return {
        ...error,
        message: 'Sesión no iniciada o expirada. Por favor inicie sesión nuevamente.',
        extensions: {
          ...error.extensions,
          code: 'UNAUTHENTICATED'
        }
      };
    } else if (error.message.includes('FORBIDDEN') || error.message.includes('no autorizado')) {
      return {
        ...error,
        message: 'No tienes permiso para realizar esta acción.',
        extensions: {
          ...error.extensions,
          code: 'FORBIDDEN'
        }
      };
    }
    
    return error;
  },
});

// Función de contexto para pasar headers de autenticación
const contextFunction = async ({ req }: { req: express.Request }) => {
  // Obtener el token de autorización del header
  const authorization = req.headers.authorization || '';
  
  return {
    // Pasar headers a los subgrafos
    headers: {
      authorization,
    },
    // Información del usuario (se puede extraer del token si es necesario)
    user: null, // Se puede decodificar el JWT aquí si se necesita
  };
};

// Configurar middleware CORS
app.use(cors());

async function startServer() {
  try {
    // Inicializar Apollo Server
    await server.start();
    
    console.log('🚀 Gateway Híbrido iniciado exitosamente!');
    console.log('📊 Conectando con microservicios...');
    
    // Aplicar middleware de Apollo Server a Express
    app.use(
      '/graphql',
      json(),
      expressMiddleware(server, {
        context: contextFunction,
      })
    );
    
    // Ruta para verificar el estado del gateway
    app.get('/health', async (req, res) => {
      let authStatus = 'disconnected';
      let productsStatus = 'disconnected';
      
      try {
        await fetch(authServiceUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '{ __typename }' }) });
        authStatus = 'connected';
      } catch (error) {
        authStatus = 'disconnected';
      }
      
      try {
        await fetch(productsServiceUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '{ __typename }' }) });
        productsStatus = 'connected';
      } catch (error) {
        productsStatus = 'disconnected';
      }
      
      res.json({
        status: 'ok',
        gateway: 'Hybrid Gateway',
        services: {
          auth: {
            url: authServiceUrl,
            status: authStatus
          },
          products: {
            url: productsServiceUrl,
            status: productsStatus
          }
        },
        type: 'hybrid-schema-stitching'
      });
    });

    // Ruta para obtener información del esquema del supergraph (útil para debugging)
    app.get('/schema', async (req, res) => {
      try {
        res.json({
          status: 'Schema active',
          type: 'Hybrid Schema Stitching',
          services: [
            { name: 'auth', url: authServiceUrl },
            { name: 'products', url: productsServiceUrl }
          ],
          approach: 'Manual schema unification',
          introspection: 'enabled'
        });
      } catch (error) {
        res.status(500).json({ error: 'Error retrieving schema info' });
      }
    });

    // Iniciar el servidor Express
    app.listen(port, () => {
      console.log(`🚀 Gateway Híbrido listo en http://localhost:${port}/graphql`);
      console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`📋 Schema: http://localhost:${port}/schema`);
      console.log(`🔗 Servicios conectados:`);
      console.log(`   - Auth Service: ${authServiceUrl}`);
      console.log(`   - Products Service: ${productsServiceUrl}`);
      console.log(`🌐 Hybrid Schema Stitching activo`);
    });

  } catch (error) {
    console.error('❌ Error al iniciar Gateway:', error);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer().catch((error) => {
  console.error('❌ Error fatal al iniciar el servidor:', error);
  process.exit(1);
});
