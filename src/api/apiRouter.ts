import * as express from 'express';

import APIDataParser from '../scripts/apiParser';

const router = express.Router();

const dataParser = new APIDataParser();

// async function getStations() {
//     const data = dataParser.getAllData;

//     console.log(data.stationCount);

// }

router.get('/getStationCount', (req, res) => {
  res.status(200).send({ list: dataParser.getStationList });
});

// router.get('/getStations', (req, res) => {
//   res.status(200).send({ stations: ['Blaszki', 'Arkadia'] });

//   getStations();
// });

module.exports = router;
