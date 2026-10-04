import dotenv from 'dotenv';
import app from './app';
import { initAutoDeleteScheduler } from './services/cleanup.service';

// Load environment variables from a .env file
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is up and listening on port ${PORT}`);
  // Start 24-hour auto-delete scheduler
  initAutoDeleteScheduler(10);
});
