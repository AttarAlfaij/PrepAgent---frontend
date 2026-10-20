const dotenv = require('dotenv');
// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[Server] PrepAgent AI backend is running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle graceful shutdown
    const handleShutdown = () => {
      console.log('\n[Server] Shutting down gracefully...');
      server.close(() => {
        console.log('[Server] Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
  } catch (err) {
    console.error(`[Server Error] Startup failed: ${err.message}`);
    process.exit(1);
  }
};

startServer();
