import axios from 'axios';
import Scenery from '../db/models/SceneryModel';

const STATIONS_URL = 'https://api.td2.info.pl:9640/?method=getStationsOnline';
// const DISPATCHERS_URL = 'https://api.td2.info.pl:9640/?method=readFromSWDR&value=getDispatcherStatusList%3B1';

interface IStationData {
  stationName: string;
  stationHash: string;
  dispatcherName: string;
  dispatcherId: number;
  region: string;
  isOnline: boolean;
}

const _getSceneryData = async () => {
  console.log('Gathering scenery data from TD2 API...');
  const onlineStationsData: IStationData[] = await (await axios.get(STATIONS_URL)).data.message;

  const onlineStationList: string[] = [];

  // Loop through every single online station in EU region
  onlineStationsData.forEach(async station => {
    if (station.region != 'eu' || !station.isOnline) return;

    onlineStationList.push(station.stationName);
    const sceneryDoc = await Scenery.findOne({ stationName: station.stationName });

    // If station isn't in DB, add it with current dispatcher info and empty history array
    if (!sceneryDoc) {
      const newSceneryDoc = await Scenery.create({
        stationHash: station.stationHash,
        stationName: station.stationName,
        currentDispatcher: station.dispatcherName,
        currentDispatcherId: station.dispatcherId,
        currentDispatcherFrom: Date.now(),
        dispatcherHistory: [],
      });

      newSceneryDoc
        .save()
        .then(() => console.log('Nowa sceneria dodana do bazy!', station.stationName))
        .catch(err => console.error('Błąd podczas dodawania nowej scenerii!', err));

      return;
    }

    // Check if station doesn't have current dispatcher (was offline before)
    if (sceneryDoc.currentDispatcher == '') {
      const lastDispatcher = sceneryDoc.dispatcherHistory.length > 0 ? sceneryDoc.dispatcherHistory[sceneryDoc.dispatcherHistory.length - 1] : null;

      // If station's current dispatcher is the same as the last one withing 30min time range, continue his duty (remove the last entry from history array)
      if (lastDispatcher && station.dispatcherName == lastDispatcher.dispatcherName && lastDispatcher.dispatcherTo > Date.now() - 30 * 60 * 1000)
        sceneryDoc.updateOne({
          currentDispatcher: station.dispatcherName,
          currentDispatcherId: station.dispatcherId,
          currentDispatcherFrom: lastDispatcher.dispatcherFrom,
          $pop: { dispatcherHistory: 1 },
        });
      // If not - update current dispatcher info only
      else
        sceneryDoc
          .updateOne({
            currentDispatcher: station.dispatcherName,
            currentDispatcherId: station.dispatcherId,
            currentDispatcherFrom: Date.now(),
          })
          .then(() => console.log('Sceneria online!', station.stationName, Date.now()))
          .catch(() => console.log('Błąd podczas aktualizacji nowej scenerii online!'));
    } else if (sceneryDoc.currentDispatcher != station.dispatcherName) {
      // If scenery has a current dispatcher but it's not the same one as in DB,
      //save the previous one to history array and update current info
      sceneryDoc
        .updateOne({
          currentDispatcher: station.dispatcherName,
          currentDispatcherId: station.dispatcherId,
          currentDispatcherFrom: Date.now(),
          $push: {
            dispatcherHistory: {
              dispatcherName: sceneryDoc.currentDispatcher,
              dispatcherId: sceneryDoc.currentDispatcherId,
              dispatcherFrom: sceneryDoc.currentDispatcherFrom,
              dispatcherTo: Date.now(),
            },
          },
        })
        .then(() => console.log('Zmiana dyżurnego na scenerii!', station.stationName, Date.now()))
        .catch(() => console.log('Błąd podczas aktualizacji nowej scenerii online!'));
    }
  });

  // The rest of sceneries which aren't online anymore (aren't in online list but have current dispatcher)
  (await Scenery.find({ stationName: { $nin: onlineStationList }, currentDispatcher: { $ne: '' } })).forEach(sceneryDoc => {
    // If a dispatcher has duty equal/longer than 30 min, save it in history array
    if (sceneryDoc.currentDispatcherFrom <= Date.now() - 30 * 60 * 1000)
      sceneryDoc
        .updateOne({
          currentDispatcher: '',
          currentDispatcherId: 0,
          currentDispatcherFrom: -1,
          $push: {
            dispatcherHistory: {
              dispatcherName: sceneryDoc.currentDispatcher,
              dispatcherId: sceneryDoc.currentDispatcherId,
              dispatcherFrom: sceneryDoc.currentDispatcherFrom,
              dispatcherTo: Date.now(),
            },
          },
        })
        .then(() => console.log('Sceneria offline!', sceneryDoc.stationName, Date.now()))
        .catch(() => console.log('Błąd podczas aktualizacji scenerii offline!'));
    else
      sceneryDoc.updateOne({
        currentDispatcher: '',
        currentDispatcherId: 0,
        currentDispatcherFrom: -1,
      });
  });
};

const setupSceneryDataListener = (minuteInterval: number) => {
  // _getSceneryData();

  /* Check and update data at exact minutes */
  setInterval(() => {
    if (new Date().getMinutes() % minuteInterval == 0) _getSceneryData();
  }, 1000 * 60);

  console.log('Scenery Data Listener initialized!');
};

export default setupSceneryDataListener;
