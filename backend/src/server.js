const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const sequelize = require('./config/database');
const AppError = require('./utils/AppError');

// Import routes
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const tripRoutes = require('./routes/trips');
const maintenanceRoutes = require('./routes/maintenance');
const fuelRoutes = require('./routes/fuelLogs');
const expenseRoutes = require('./routes/expenses');
const reportRoutes = require('./routes/reports');
const trackingRoutes = require('./routes/tracking');

const app = express();
const server = http.createServer(app);

// CORS — allow localhost in dev AND the deployed Vercel URL in prod
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Socket.io Setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for Socket.io compatibility
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile apps)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Socket.io Connection Room Setup
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  socket.on('join', (room) => {
    console.log(`Socket ${socket.id} joined room: ${room}`);
    socket.join(room);
  });

  // ── Real-Time Driver GPS Relay ─────────────────────────────────
  // Drivers emit 'driverLocation' with their GPS coordinates.
  // Server relays it instantly to everyone watching that trip room.
  // No DB write — this is pure real-time streaming.
  socket.on('driverLocation', ({ trip_id, latitude, longitude, location, speed }) => {
    if (!trip_id || latitude === undefined || longitude === undefined) return;
    
    // Relay to all clients watching this trip (including the shipper portal)
    io.to(trip_id).emit('trackingUpdated', {
      id: `live-${Date.now()}`,
      trip_id,
      latitude,
      longitude,
      location: location || 'Live GPS Position',
      status: 'in_transit',
      speed: speed || null,
      notes: null,
      timestamp: new Date().toISOString(),
      isLive: true   // flag so the UI can render it differently
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});


// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel-logs', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tracking', trackingRoutes);

// Fallback route
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Error Handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error('SERVER ERROR 💥:', err);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || undefined
    });
  }

  // Programmer or other unknown error: don't leak details
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on the server'
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    server.listen(PORT, () => {
      console.log(`TransitOps server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    console.error('Unable to start TransitOps server:', error);
    process.exit(1);
  }
};

startServer();
