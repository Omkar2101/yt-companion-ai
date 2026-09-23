import dotenv from 'dotenv';
import app from './app';

// Load environment variables from a .env file
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is up and listening on port ${PORT}`);
});
