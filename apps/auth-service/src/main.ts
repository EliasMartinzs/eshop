import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { errorMiddleware } from '../../../packages/error-handler/error-middleware';
import cookieParser from 'cookie-parser';
import router from './routes/auth.router';
import swaggerUi from 'swagger-ui-express';
import morgan from 'morgan';

const swaggerPath = path.resolve(
  process.cwd(),
  'apps/auth-service/swagger-output.json'
);

if (!fs.existsSync(swaggerPath)) {
  console.error(
    '❌ swagger-output.json não encontrado. Rode: node apps/auth-service/src/swagger.js'
  );
  process.exit(1);
}

const swaggerDocument = require(swaggerPath);

const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
});

// Routes
app.use('/api/', router);

app.use(errorMiddleware);

const port = process.env.PORT || 6001;
const server = app.listen(port, () => {
  console.log(`Auth service is runinng at http://localhost:${port}/api`);
  console.log(`Swagger Docs available at http:localhost:${port}/docs`);
});

server.on('error', (err) => {
  console.log('Server error:', err);
});
