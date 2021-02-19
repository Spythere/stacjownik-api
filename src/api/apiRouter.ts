import * as express from 'express';

import APIDataParser from '../scripts/apiParser';

import Scenery from '../db/models/SceneryModel';

const router = express.Router();

const dataParser = new APIDataParser();

router.get('/getStationCount', (req, res) => {
  res.status(200).send({ list: dataParser.getStationList });
});

router.get('/getSceneryHistory', async (req, res) => {
  const sceneries = await (req.query.name ? Scenery.find({ stationName: req.query.name as string }) : Scenery.find({}));

  if (!sceneries) res.status(404);

  res.status(200).send(sceneries);
});

module.exports = router;
