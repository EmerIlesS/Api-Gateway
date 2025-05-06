import { ApolloGateway } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { json } from 'body-parser';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Configure Gateway
const gateway = new ApolloGateway({
  serviceList: [
    { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql' },
    { name: 'products', url: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4002/graphql' },
  ],
});

async function startServer() {
  try {
    // Create Apollo Server
    const server = new ApolloServer({
      gateway,
      plugins: [],
    });

    // Start the server
    await server.start();

    // Apply middleware
    app.use(
      '/graphql',
      cors<cors.CorsRequest>(),
      json(),
      expressMiddleware(server, {
        context: async ({ req }) => ({
          token: req.headers.authorization,
        }),
      })
    );

    // Start Express server
    app.listen(port, () => {
      console.log(`🚀 Gateway ready at http://localhost:${port}/graphql`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
