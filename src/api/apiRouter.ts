import * as express from 'express';

import Scenery from '../db/models/SceneryModel';

const router = express.Router();

router.get('/getSceneryInfo', async (req, res) => {
  if (req.query.name && typeof req.query.name !== 'string') return res.status(400).json({ errorMessage: 'Invalid request!' });

  try {
    const scenery = await (!req.query.name ? Scenery.find({}) : Scenery.findOne({ stationName: (req.query.name as string).replace(/_/g, ' ') }));
    res.status(200).json(scenery);
  } catch (error) {
    res.status(404).json({ errorMessage: 'Something went wrong! ' + error });
  }
});

module.exports = router;
