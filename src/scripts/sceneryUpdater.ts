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

  onlineStationsData.forEach(async station => {
    if (station.region != 'eu' || !station.isOnline) return;

    onlineStationList.push(station.stationName);
    const sceneryDoc = await Scenery.findOne({ stationName: station.stationName });

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

    if (sceneryDoc.currentDispatcher == '') {
      sceneryDoc
        .updateOne({
          currentDispatcher: station.dispatcherName,
          currentDispatcherId: station.dispatcherId,
          currentDispatcherFrom: Date.now(),
        })
        .then(() => console.log('Sceneria online!', station.stationName, Date.now()))
        .catch(() => console.log('Błąd podczas aktualizacji nowej scenerii online!'));
    } else if (sceneryDoc.currentDispatcher != station.dispatcherName) {
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

  (await Scenery.find({ stationName: { $nin: onlineStationList }, currentDispatcher: { $ne: '' } })).forEach(sceneryDoc => {
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
  });
};

const setupSceneryDataListener = (interval: number) => {
  _getSceneryData();
  setInterval(_getSceneryData, interval);

  console.log('Scenery Data Listener initialized!');
};

export default setupSceneryDataListener;
