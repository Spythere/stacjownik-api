import * as express from 'express';

import APIDataParser from '../scripts/apiParser';

const router = express.Router();

const dataParser = new APIDataParser();

router.get('/getStationCount', (req, res) => {
  res.status(200).send({ list: dataParser.getStationList });
});

router.get('/getOnlineSceneries', (req, res) => {});

module.exports = router;
