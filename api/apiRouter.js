const express = require('express');
const axios = require('axios');

const router = express.Router();
const JSONData = require('../data/stations.json');


async function getStations() {
    const stations = await (await axios.get('https://api.td2.info.pl:9640/?method=getStationsOnline')).data.message;

    if (!stations) return;

    stations.forEach(station => console.log(station.stationName));
}

router.get("/getStationList", (req, res) => {
    res.status(200).send(JSONData);
})

router.get("/getStations", (req, res) => {
    res.status(200).send({ stations: ["Blaszki", "Arkadia"] })

    getStations();
});

module.exports = router;