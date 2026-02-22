import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customer.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import orderRoutes from './routes/order.routes.js';
import reportRoutes from './routes/report.routes.js';
import serviceRoutes from './routes/service.routes.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/customers', requireAuth, customerRoutes);
app.use('/api/v1/orders', requireAuth, orderRoutes);
app.use('/api/v1/services', requireAuth, serviceRoutes);
app.use('/api/v1/inventory', requireAuth, inventoryRoutes);
app.use('/api/v1/reports', requireAuth, reportRoutes);

app.use(errorHandler);

export default app;
