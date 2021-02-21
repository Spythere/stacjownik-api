import express from 'express';
import mongoose from 'mongoose';
const cors = require('cors');

import setupSceneryDataListener from './scripts/sceneryUpdater';

// Global variables
const PORT = process.env.PORT || 3001;
const allowedSites = ['https://stacjownik-td2.web.app', 'http://localhost:8080'];
const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (!origin) return callback(null, false);
    if (allowedSites.indexOf(origin) == -1) {
      const msg = `Strona ${origin} nie ma dostępu do danych tego API! W celu uzyskania dostępu skontaktuj się z Spythere na forum TD2 bądź Discordzie!`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
};

const app: express.Application = express();

const DB_URL = process.env.NODE_ENV == 'production' ? `mongodb+srv://${process.env.DB_LOGIN}:${process.env.DB_PWD}@cluster0.pv4eb.mongodb.net/stacjownik-db?retryWrites=true&w=majority` : 'mongodb://127.0.0.1/stacjownik-db';
// DB connection
mongoose
  .connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(res => console.log('MongoDB: Connected!'))
  .catch(err => console.error("Something's wrong! " + err));

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', require('./api/apiRouter'));

// API listeners setup
setupSceneryDataListener(5);

// Routing
app.get('/', (req, res) => {
  res.status(200).send({ msg: 'Witaj! Korzystasz teraz z API Stacjownika!', status: 200, statusLoaded: true });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
