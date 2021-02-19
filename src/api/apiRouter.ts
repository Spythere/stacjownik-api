import * as express from 'express';

import APIDataParser from '../scripts/apiParser';

import Scenery from '../db/models/SceneryModel';

const router = express.Router();

const dataParser = new APIDataParser();

router.get('/getStationCount', (req, res) => {
  res.status(200).send({ list: dataParser.getStationList });
});

router.get('/getSceneryHistory', async (req, res) => {
  if (req.query.name && typeof req.query.name !== 'string') return res.status(400).json({ errorMessage: 'Invalid request!' });

  const sceneries = await (!req.query.name ? Scenery.find({}) : Scenery.find({ stationName: (req.query.name as string).replace(/_/g, ' ') }));

  if (!sceneries) return res.status(404).json([]);
  res.status(200).json(sceneries);
});

module.exports = router;
