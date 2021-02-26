import * as express from 'express';

import Scenery from '../db/models/SceneryModel';

const router = express.Router();

const sceneryOptions = {
  dispatcherHistory: { $slice: 0 },
};

router.get('/getSceneryInfo', async (req, res) => {
  if (req.query.name && typeof req.query.name !== 'string') return res.status(400).json({ errorMessage: 'Invalid request!' });

  const itemsLength = req.query.items ? -1 * parseInt(req.query.items as string) : NaN;

  const options = {
    dispatcherHistory: itemsLength > 0 ? 0 : { $slice: itemsLength },
  };

  try {
    const scenery = await (!req.query.name
      ? Scenery.find({}, sceneryOptions)
      : Scenery.findOne(
          {
            stationName: (req.query.name as string).replace(/_/g, ' '),
          },
          options
        ));
    res.status(200).json(scenery);
  } catch (error) {
    res.status(404).json({ errorMessage: 'Something went wrong! ' + error });
  }
});

module.exports = router;
