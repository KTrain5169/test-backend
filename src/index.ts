import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { Client } from 'pg';
import Joi from 'joi';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Load environment variables from .env file
dotenv.config();

// Create an Express application
const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY || '';

// Set up PostgreSQL client
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});
pgClient.connect().catch((err) => {
  console.error('Failed to connect to the database:', err);
  process.exit(1);
});

// Middleware to parse JSON bodies
app.use(express.json());
// Security middleware
app.use(cors());
app.use(helmet());
// HTTP request logger
app.use(morgan('dev'));

/**
 * @apiDefine ApiKeyHeader
 * @apiHeader {String} x-api-key Your API Key.
 */

/**
 * @apiDefine UnauthorizedError
 * @apiError (401) Unauthorized Invalid API key.
 */

// Authentication Middleware: verifies x-api-key header.
app.use((req: Request, res: Response, next: NextFunction): void => {
  const key = req.header('x-api-key');
  if (!key || key !== apiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

/**
 * @api {get} /items Retrieve all items
 * @apiName GetItems
 * @apiGroup Items
 *
 * @apiUse ApiKeyHeader
 *
 * @apiSuccess {Object[]} items List of items.
 * @apiSuccess {number} items.id Unique ID.
 * @apiSuccess {string} items.name Name of the item.
 *
 * @apiUse UnauthorizedError
 *
 * @apiError (500) InternalServerError An error occurred while fetching items.
 */
app.get('/items', async (req: Request, res: Response) => {
  try {
    const result = await pgClient.query('SELECT id, name FROM items');
    res.json({ items: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @api {post} /items Create a new item
 * @apiName CreateItem
 * @apiGroup Items
 *
 * @apiUse ApiKeyHeader
 *
 * @apiParam {string} name Name of the item.
 *
 * @apiSuccess (201) {number} id Unique ID of the created item.
 * @apiSuccess (201) {string} name Name of the created item.
 *
 * @apiUse UnauthorizedError
 *
 * @apiError (400) ValidationError The input data is invalid.
 * @apiError (500) InternalServerError An error occurred while creating the item.
 */
app.post('/items', async (req: Request, res: Response): Promise<void> => {
  // Define the schema for input validation using Joi
  const schema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
  });

  // Validate request body against the schema
  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }

  try {
    // Insert new item into the database
    const result = await pgClient.query(
      'INSERT INTO items (name) VALUES ($1) RETURNING id, name',
      [value.name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Global error handler for any uncaught errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Standalone server start (skip if running as an Appwrite function)
if (process.env.NODE_ENV !== 'appwrite') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export the app for hosting on Appwrite or testing frameworks
export default app;
