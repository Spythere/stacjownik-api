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

// DB connection
mongoose
  .connect(`mongodb+srv://${process.env.DB_LOGIN}:${process.env.DB_PWD}@cluster0.pv4eb.mongodb.net/stacjownik-db?retryWrites=true&w=majority`, {
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
setupSceneryDataListener();

// Routing
app.get('/', (req, res) => {
  res.status(200).send({ msg: 'Witaj! Korzystasz teraz z API Stacjownika!', status: 200, statusLoaded: true });
});

// app.get('/testdb', (req, res) => {
//   const scenery = new Scenery({
//     stationHash: '3c26fa1',
//     stationName: 'Testowo',
//     currentDispatcher: 'Spythere',
//     currentDispatcherFrom: new Date(),
//     dispatcherHistory: [[String, Date, Date]],
//   });

//   scenery
//     .save()
//     .then(result => {
//       res.send(result).status(200);
//     })
//     .catch(err => {
//       res.status(400);
//     });
// });

// app.get('/getdb', (req, res) => {
//   Scenery.find()
//     .then(sceneries => res.send(sceneries))
//     .catch(err => res.status(400));
// });

// app.get('/updatedb', (req, res) => {
//   Scenery.updateOne(
//     { stationName: 'Testowo' },
//     { $push: { dispatcherHistory: new Array(20).fill(0).map(v => ({ dispatcherName: 'dsdfgh', dispatcherFrom: Date.now(), dispatcherTo: Date.now() })) } }
//   ).then(() => res.status(200).send('Gitara'));
// });

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
