import swaggerAutogen from 'swagger-autogen';
import path from 'path';
import { fileURLToPath } from 'url';

// recria __dirname no ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doc = {
  info: {
    title: 'Auth Service API',
    description: 'Automatically generated Swagger docs',
    version: '1.0.0',
  },
  host: 'localhost:6001',
  schemes: ['http'],
};

// const outputFile = './swagger-output.json';
// const endpointsFiles = ['./routes/auth.router.ts'];

const outputFile = path.resolve(__dirname, '../swagger-output.json');
const endpointsFiles = [path.resolve(__dirname, './routes/auth.router.ts')];

swaggerAutogen()(outputFile, endpointsFiles, doc);
