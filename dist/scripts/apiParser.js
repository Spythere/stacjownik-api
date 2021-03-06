"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const stations_json_1 = __importDefault(require("../data/stations.json"));
var Status;
(function (Status) {
    Status[Status["Initialized"] = -1] = "Initialized";
    Status[Status["Loading"] = 0] = "Loading";
    Status[Status["Error"] = 1] = "Error";
    Status[Status["Loaded"] = 2] = "Loaded";
})(Status || (Status = {}));
// const devEnv = true;
const URLs = {
    stations: 'https://api.td2.info.pl:9640/?method=getStationsOnline',
    trains: 'https://api.td2.info.pl:9640/?method=getTrainsOnline',
    dispatchers: 'https://api.td2.info.pl:9640/?method=readFromSWDR&value=getDispatcherStatusList%3B1',
};
const timetableURL = (trainNo) => `https://api.td2.info.pl:9640/?method=readFromSWDR&value=getTimetable%3B${trainNo}%3Beu`;
const getLocoURL = (locoType) => `https://rj.td2.info.pl/dist/img/thumbnails/${locoType.includes('EN') ? locoType + 'rb' : locoType}.png`;
const getStatusLabel = (stationStatus) => {
    if (!stationStatus)
        return 'NIEZALOGOWANY';
    const statusCode = stationStatus[2];
    const statusTimestamp = stationStatus[3];
    switch (statusCode) {
        case 0:
            if (statusTimestamp - Date.now() > 21000000)
                return 'BEZ LIMITU';
            return `DO ${new Date(statusTimestamp).toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
            })}`;
        case 1:
            return 'Z/W';
        case 2:
            if (statusTimestamp == 0)
                return 'KOŃCZY';
            break;
        case 3:
            return 'BRAK MIEJSCA';
        default:
            break;
    }
    return 'NIEDOSTĘPNY';
};
const getStatusTimestamp = (stationStatus) => {
    if (!stationStatus)
        return -2;
    const statusCode = stationStatus[2];
    const statusTimestamp = stationStatus[3];
    switch (statusCode) {
        case 0:
        case 1:
        case 3:
            return statusTimestamp;
        case 2:
            if (statusTimestamp == 0)
                return 0;
            break;
        default:
            break;
    }
    return -1;
};
const parseSpawns = (spawnString) => {
    if (!spawnString)
        return [];
    if (spawnString === 'NO_SPAWN')
        return [];
    return spawnString.split(';').map(spawn => {
        const spawnArray = spawn.split(',');
        const spawnName = spawnArray[6] ? spawnArray[6] : spawnArray[0];
        const spawnLength = parseInt(spawnArray[2]);
        return { spawnName, spawnLength };
    });
};
const getTimestamp = (date) => (date ? new Date(date).getTime() : 0);
const timestampToTime = (timestamp) => new Date(timestamp).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
});
class APIDataParser {
    constructor() {
        this.trainCount = 0;
        this.stationCount = 0;
        this.dataConnectionStatus = Status.Loading;
        this.timetableLoaded = Status.Loading;
        this.stationList = [];
        this.trainList = [];
        this.fetchJSONData();
        this.synchronizeData();
        setInterval(() => this.synchronizeData(), 4000);
    }
    //GETTERS
    get getAllData() {
        return {
            stationList: this.stationList,
            trainList: this.trainList,
            trainCount: this.trainCount,
            stationCount: this.stationCount,
            dataConnectionStatus: this.dataConnectionStatus,
            timetableDataStatus: this.timetableLoaded,
        };
    }
    get getStationList() {
        return this.stationList;
    }
    get getTrainList() {
        return this.trainList;
    }
    get getTimetableDataStatus() {
        return this.timetableLoaded;
    }
    get getDataStatus() {
        return this.dataConnectionStatus;
    }
    fetchJSONData() {
        this.stationList = stations_json_1.default.map(stationData => ({
            ...stationData,
            stationProject: '',
            stationHash: '',
            maxUsers: 0,
            currentUsers: 0,
            dispatcherName: '',
            dispatcherRate: 0,
            dispatcherExp: -1,
            dispatcherId: 0,
            dispatcherIsSupporter: false,
            online: false,
            occupiedTo: 'WOLNA',
            statusTimestamp: -3,
            stationTrains: [],
            scheduledTrains: [],
            spawns: [],
            checkpoints: stationData.subStations ? stationData.subStations.map(sub => ({ checkpointName: sub, scheduledTrains: [] })) : null,
        }));
    }
    async fetchOnlineData() {
        Promise.all([axios_1.default.get(URLs.stations), axios_1.default.get(URLs.trains), axios_1.default.get(URLs.dispatchers)])
            .then(async (response) => {
            const onlineStationsData = response[0].data.message;
            const onlineTrainsData = await response[1].data.message;
            const onlineDispatchersData = await response[2].data.message;
            let updatedStationList = onlineStationsData.reduce((acc, station) => {
                if (station.region !== 'eu' || !station.isOnline)
                    return acc;
                const stationStatus = onlineDispatchersData.find((status) => status[0] == station.stationHash && status[1] == 'eu');
                const statusLabel = getStatusLabel(stationStatus);
                const statusTimestamp = getStatusTimestamp(stationStatus);
                const stationTrains = onlineTrainsData.filter((train) => train.region === 'eu' && train.isOnline && train.station.stationName === station.stationName);
                acc.push({
                    stationName: station.stationName,
                    stationHash: station.stationHash,
                    maxUsers: station.maxUsers,
                    currentUsers: station.currentUsers,
                    spawns: parseSpawns(station.spawnString),
                    dispatcherName: station.dispatcherName,
                    dispatcherRate: station.dispatcherRate,
                    dispatcherId: station.dispatcherId,
                    dispatcherExp: station.dispatcherExp,
                    dispatcherIsSupporter: station.dispatcherIsSupporter,
                    occupiedTo: statusLabel,
                    stationTrains,
                    statusTimestamp,
                });
                return acc;
            }, []);
            let updatedTrainList = await Promise.all(onlineTrainsData
                .filter((train) => train.region === 'eu')
                .map(async (train) => {
                const locoType = train.dataCon.split(';') ? train.dataCon.split(';')[0] : train.dataCon;
                return {
                    trainNo: train.trainNo,
                    mass: train.dataMass,
                    length: train.dataLength,
                    speed: train.dataSpeed,
                    distance: train.dataDistance,
                    signal: train.dataSignal,
                    online: train.isOnline,
                    driverId: train.driverId,
                    driverName: train.driverName,
                    currentStationName: train.station.stationName,
                    currentStationHash: train.station.stationHash,
                    connectedTrack: train.dataSceneryConnection,
                    locoType,
                    locoURL: getLocoURL(locoType),
                };
            }));
            this.updateOnlineStations(updatedStationList);
            this.updateOnlineTrains(updatedTrainList);
        })
            .catch(err => {
            this.setDataConnectionStatus(Status.Error);
        });
    }
    async fetchTimetableData() {
        const timetableData = await this.trainList.reduce(async (acc, train) => {
            const timetable = await (await axios_1.default.get(timetableURL(train.trainNo))).data.message;
            const trainInfo = timetable.trainInfo;
            if (!timetable || !trainInfo)
                return acc;
            const followingStops = timetable.stopPoints.reduce((stopsAcc, point) => {
                const arrivalTimestamp = getTimestamp(point.arrivalTime);
                const arrivalRealTimestamp = getTimestamp(point.arrivalRealTime);
                const departureTimestamp = getTimestamp(point.departureTime);
                const departureRealTimestamp = getTimestamp(point.departureRealTime);
                stopsAcc.push({
                    stopName: point.pointName,
                    stopNameRAW: point.pointNameRAW,
                    stopType: point.pointStopType,
                    mainStop: point.pointName.includes('strong'),
                    arrivalLine: point.arrivalLine,
                    arrivalTimeString: timestampToTime(point.arrivalTime),
                    arrivalTimestamp: arrivalTimestamp,
                    arrivalRealTimeString: timestampToTime(point.arrivalRealTime),
                    arrivalRealTimestamp: arrivalRealTimestamp,
                    arrivalDelay: point.arrivalDelay,
                    departureLine: point.departureLine,
                    departureTimeString: timestampToTime(point.departureTime),
                    departureTimestamp: departureTimestamp,
                    departureRealTimeString: timestampToTime(point.departureRealTime),
                    departureRealTimestamp: departureRealTimestamp,
                    departureDelay: point.departureDelay,
                    beginsHere: arrivalTimestamp == 0,
                    terminatesHere: departureTimestamp == 0,
                    confirmed: point.confirmed,
                    stopped: point.isStopped,
                    stopTime: point.pointStopTime,
                });
                return stopsAcc;
            }, []);
            (await acc).push({
                trainNo: train.trainNo,
                driverName: train.driverName,
                driverId: train.driverId,
                currentStationName: train.currentStationName,
                currentStationHash: train.currentStationHash,
                timetableId: trainInfo.timetableId,
                category: trainInfo.trainCategoryCode,
                route: trainInfo.route,
                TWR: trainInfo.twr,
                SKR: trainInfo.skr,
                routeDistance: timetable.stopPoints[timetable.stopPoints.length - 1].pointDistance,
                followingStops,
                followingSceneries: trainInfo.sceneries,
            });
            return acc;
        }, Promise.resolve([]));
        this.updateTimetableData(timetableData);
    }
    async synchronizeData() {
        this.fetchOnlineData();
        this.fetchTimetableData();
    }
    // //ACTIONS
    // @Action
    // async synchronizeData() {
    //   this.context.commit('setJSONData');
    //   this.context.dispatch('fetchOnlineData');
    //   setInterval(() => this.context.dispatch('fetchOnlineData'), 20000);
    // }
    // @Action({ commit: 'updateTimetableData' })
    // async fetchTimetableData() {
    //   return this.trainList.reduce(async (acc: Promise<TimetableData[]>, train) => {
    //     const timetable = await (await axios.get(timetableURL(train.trainNo))).data.message;
    //     const trainInfo = timetable.trainInfo;
    //     if (!timetable || !trainInfo) return acc;
    //     const followingStops: TrainStop[] = timetable.stopPoints.reduce((stopsAcc: TrainStop[], point) => {
    //       const arrivalTimestamp = getTimestamp(point.arrivalTime);
    //       const arrivalRealTimestamp = getTimestamp(point.arrivalRealTime);
    //       const departureTimestamp = getTimestamp(point.departureTime);
    //       const departureRealTimestamp = getTimestamp(point.departureRealTime);
    //       stopsAcc.push({
    //         stopName: point.pointName,
    //         stopNameRAW: point.pointNameRAW,
    //         stopType: point.pointStopType,
    //         mainStop: point.pointName.includes('strong'),
    //         arrivalLine: point.arrivalLine,
    //         arrivalTimeString: timestampToTime(point.arrivalTime),
    //         arrivalTimestamp: arrivalTimestamp,
    //         arrivalRealTimeString: timestampToTime(point.arrivalRealTime),
    //         arrivalRealTimestamp: arrivalRealTimestamp,
    //         arrivalDelay: point.arrivalDelay,
    //         departureLine: point.departureLine,
    //         departureTimeString: timestampToTime(point.departureTime),
    //         departureTimestamp: departureTimestamp,
    //         departureRealTimeString: timestampToTime(point.departureRealTime),
    //         departureRealTimestamp: departureRealTimestamp,
    //         departureDelay: point.departureDelay,
    //         beginsHere: arrivalTimestamp == 0,
    //         terminatesHere: departureTimestamp == 0,
    //         confirmed: point.confirmed,
    //         stopped: point.isStopped,
    //         stopTime: point.pointStopTime,
    //       });
    //       return stopsAcc;
    //     }, []);
    //     (await acc).push({
    //       trainNo: train.trainNo,
    //       driverName: train.driverName,
    //       driverId: train.driverId,
    //       currentStationName: train.currentStationName,
    //       currentStationHash: train.currentStationHash,
    //       timetableId: trainInfo.timetableId,
    //       category: trainInfo.trainCategoryCode,
    //       route: trainInfo.route,
    //       TWR: trainInfo.twr,
    //       SKR: trainInfo.skr,
    //       routeDistance: timetable.stopPoints[timetable.stopPoints.length - 1].pointDistance,
    //       followingStops,
    //       followingSceneries: trainInfo.sceneries,
    //     });
    //     return acc;
    //   }, Promise.resolve([]));
    // }
    // @Action
    // async fetchOnlineData() {
    //   Promise.all([axios.get(URLs.stations), axios.get(URLs.trains), axios.get(URLs.dispatchers)])
    //     .then(async response => {
    //       const onlineStationsData = response[0].data.message;
    //       const onlineTrainsData = await response[1].data.message;
    //       const onlineDispatchersData = await response[2].data.message;
    //       let updatedStationList = onlineStationsData.reduce((acc, station) => {
    //         if (station.region !== 'eu' || !station.isOnline) return acc;
    //         const stationStatus = onlineDispatchersData.find(status => status[0] == station.stationHash && status[1] == 'eu');
    //         const statusLabel = getStatusLabel(stationStatus);
    //         const statusTimestamp = getStatusTimestamp(stationStatus);
    //         const stationTrains = onlineTrainsData.filter(train => train.region === 'eu' && train.isOnline && train.station.stationName === station.stationName);
    //         acc.push({
    //           stationName: station.stationName,
    //           stationHash: station.stationHash,
    //           maxUsers: station.maxUsers,
    //           currentUsers: station.currentUsers,
    //           spawns: parseSpawns(station.spawnString),
    //           dispatcherName: station.dispatcherName,
    //           dispatcherRate: station.dispatcherRate,
    //           dispatcherId: station.dispatcherId,
    //           dispatcherExp: station.dispatcherExp,
    //           dispatcherIsSupporter: station.dispatcherIsSupporter,
    //           occupiedTo: statusLabel,
    //           stationTrains,
    //           statusTimestamp,
    //         });
    //         return acc;
    //       }, []);
    //       let updatedTrainList = await Promise.all(
    //         onlineTrainsData
    //           .filter(train => train.region === 'eu')
    //           .map(async train => {
    //             const locoType = train.dataCon.split(';') ? train.dataCon.split(';')[0] : train.dataCon;
    //             return {
    //               trainNo: train.trainNo,
    //               mass: train.dataMass,
    //               length: train.dataLength,
    //               speed: train.dataSpeed,
    //               distance: train.dataDistance,
    //               signal: train.dataSignal,
    //               online: train.isOnline,
    //               driverId: train.driverId,
    //               driverName: train.driverName,
    //               currentStationName: train.station.stationName,
    //               currentStationHash: train.station.stationHash,
    //               connectedTrack: train.dataSceneryConnection,
    //               locoType,
    //               locoURL: getLocoURL(locoType),
    //             };
    //           })
    //       );
    //       this.context.commit('updateOnlineStations', updatedStationList);
    //       this.context.commit('updateOnlineTrains', updatedTrainList);
    //       this.context.dispatch('fetchTimetableData');
    //     })
    //     .catch(err => {
    //       this.context.commit('setDataConnectionStatus', Status.Error);
    //     });
    // }
    setDataConnectionStatus(status) {
        this.dataConnectionStatus = status;
    }
    // @Mutation setJSONData() {
    //   this.stationList = JSONStationData.map(stationData => ({
    //     ...stationData,
    //     stationProject: '',
    //     stationHash: '',
    //     maxUsers: 0,
    //     currentUsers: 0,
    //     dispatcherName: '',
    //     dispatcherRate: 0,
    //     dispatcherExp: -1,
    //     dispatcherId: 0,
    //     dispatcherIsSupporter: false,
    //     online: false,
    //     occupiedTo: 'WOLNA',
    //     statusTimestamp: -3,
    //     stationTrains: [],
    //     scheduledTrains: [],
    //     spawns: [],
    //     checkpoints: stationData.subStations ? stationData.subStations.map(sub => ({ checkpointName: sub, scheduledTrains: [] })) : null,
    //   }));
    // }
    updateOnlineStations(updatedStationList) {
        this.stationList = this.stationList.reduce((acc, station) => {
            const onlineStationData = updatedStationList.find(updatedStation => updatedStation.stationName === station.stationName);
            const registeredStation = stations_json_1.default.find(data => data.stationName === station.stationName);
            if (onlineStationData)
                acc.push({
                    ...station,
                    ...onlineStationData,
                    online: true,
                });
            else if (registeredStation)
                acc.push({
                    ...station,
                    stationProject: '',
                    stationHash: '',
                    maxUsers: 0,
                    currentUsers: 0,
                    dispatcherName: '',
                    dispatcherRate: 0,
                    dispatcherExp: -1,
                    dispatcherId: 0,
                    dispatcherIsSupporter: false,
                    online: false,
                    occupiedTo: 'WOLNA',
                    statusTimestamp: -3,
                    stationTrains: [],
                    scheduledTrains: [],
                    checkpoints: null,
                });
            return acc;
        }, []);
        // Dodawanie do listy online potencjalnych scenerii niewpisanych do bazy
        updatedStationList.forEach(updatedStation => {
            const alreadyInList = this.stationList.some(station => station.stationName === updatedStation.stationName);
            if (!alreadyInList) {
                this.stationList.push({
                    ...updatedStation,
                    scheduledTrains: [],
                    stationTrains: [],
                    subStations: [],
                    online: true,
                    reqLevel: '-1',
                    nonPublic: true,
                });
            }
        });
        this.stationCount = this.stationList.filter(station => station.online).length;
        this.dataConnectionStatus = Status.Loaded;
    }
    updateOnlineTrains(updatedTrainList) {
        this.trainList = updatedTrainList.reduce((acc, updatedTrain) => {
            const trainData = this.trainList.find(train => train.trainNo === updatedTrain.trainNo);
            if (trainData)
                acc.push({ ...trainData, ...updatedTrain });
            else
                acc.push({ ...updatedTrain });
            return acc;
        }, []);
        this.trainCount = this.trainList.filter(train => train.online).length;
        this.dataConnectionStatus = Status.Loaded;
    }
    updateTimetableData(timetableList) {
        this.stationList = this.stationList.map(station => {
            const stationName = station.stationName.toLowerCase();
            const scheduledTrains = timetableList.reduce((acc, timetableData, index) => {
                if (!timetableData.followingSceneries.includes(station.stationHash))
                    return acc;
                const stopInfoIndex = timetableData.followingStops.findIndex(stop => {
                    const stopName = stop.stopNameRAW.toLowerCase();
                    if (stationName === stopName)
                        return true;
                    if (stopName.includes(stationName) && !stop.stopName.includes('po.') && !stop.stopName.includes('podg.'))
                        return true;
                    if (stationName.includes(stopName) && !stop.stopName.includes('po.') && !stop.stopName.includes('podg.'))
                        return true;
                    if (stopName.includes('podg.') && stopName.split(', podg.')[0] && stationName === stopName.split(', podg.')[0])
                        return true;
                    if (stations_json_1.default.some(data => data.stationName.includes(station.stationName) && data.stops && data.stops.includes(stop.stopNameRAW)))
                        return true;
                    return false;
                });
                if (stopInfoIndex == -1)
                    return acc;
                const stopInfo = timetableData.followingStops[stopInfoIndex];
                let stopStatus = '';
                let stopLabel = '';
                let stopStatusID = 0;
                let nearestStop = '';
                if (stopInfo.terminatesHere && stopInfo.confirmed) {
                    stopStatus = 'terminated';
                    stopLabel = 'Skończył bieg';
                    stopStatusID = 5;
                }
                else if (!stopInfo.terminatesHere && stopInfo.confirmed && timetableData.currentStationName == station.stationName) {
                    stopStatus = 'departed';
                    stopLabel = 'Odprawiony';
                    stopStatusID = 2;
                }
                else if (!stopInfo.terminatesHere && stopInfo.confirmed && timetableData.currentStationName != station.stationName) {
                    stopStatus = 'departed-away';
                    stopLabel = 'Odjechał';
                    stopStatusID = 4;
                }
                else if (timetableData.currentStationName == station.stationName && !stopInfo.stopped) {
                    stopStatus = 'online';
                    stopLabel = 'Na stacji';
                    stopStatusID = 0;
                }
                else if (timetableData.currentStationName == station.stationName && stopInfo.stopped) {
                    stopStatus = 'stopped';
                    stopLabel = 'Postój';
                    stopStatusID = 1;
                }
                else if (timetableData.currentStationName != station.stationName) {
                    stopStatus = 'arriving';
                    stopLabel = 'W drodze';
                    stopStatusID = 3;
                }
                if (stopInfoIndex < timetableData.followingStops.length - 2) {
                    for (let i = stopInfoIndex + 1; i < timetableData.followingStops.length - 1; i++) {
                        const stop = timetableData.followingStops[i];
                        if (stop.mainStop && stop.stopType.includes('ph')) {
                            nearestStop = stop.stopNameRAW;
                            break;
                        }
                    }
                }
                acc.push({
                    trainNo: timetableData.trainNo,
                    driverName: timetableData.driverName,
                    driverId: timetableData.driverId,
                    currentStationName: timetableData.currentStationName,
                    currentStationHash: timetableData.currentStationHash,
                    category: timetableData.category,
                    beginsAt: timetableData.followingStops[0].stopNameRAW,
                    terminatesAt: timetableData.followingStops[timetableData.followingStops.length - 1].stopNameRAW,
                    nearestStop,
                    stopInfo,
                    stopLabel,
                    stopStatus,
                    stopStatusID,
                });
                return acc;
            }, []);
            if (station.checkpoints) {
                station.checkpoints.forEach(cp => (cp.scheduledTrains.length = 0));
                for (let checkpoint of station.checkpoints) {
                    timetableList.reduce((acc, data) => {
                        data.followingStops
                            .filter(stop => stop.stopNameRAW === checkpoint.checkpointName)
                            .forEach(stopInfo => {
                            // const stopInfo = data.followingStops[stopInfoIndex];
                            let stopStatus = '';
                            let stopLabel = '';
                            let nearestStop = '';
                            let stopStatusID = 0;
                            if (stopInfo.terminatesHere && stopInfo.confirmed) {
                                stopStatus = 'terminated';
                                stopLabel = 'Skończył bieg';
                                stopStatusID = 5;
                            }
                            else if (!stopInfo.terminatesHere && stopInfo.confirmed && data.currentStationName == station.stationName) {
                                stopStatus = 'departed';
                                stopLabel = 'Odprawiony';
                                stopStatusID = 2;
                            }
                            else if (!stopInfo.terminatesHere && stopInfo.confirmed && data.currentStationName != station.stationName) {
                                stopStatus = 'departed-away';
                                stopLabel = 'Odjechał';
                                stopStatusID = 4;
                            }
                            else if (data.currentStationName == station.stationName && !stopInfo.stopped) {
                                stopStatus = 'online';
                                stopLabel = 'Na stacji';
                                stopStatusID = 0;
                            }
                            else if (data.currentStationName == station.stationName && stopInfo.stopped) {
                                stopStatus = 'stopped';
                                stopLabel = 'Postój';
                                stopStatusID = 1;
                            }
                            else if (data.currentStationName != station.stationName) {
                                stopStatus = 'arriving';
                                stopLabel = 'W drodze';
                                stopStatusID = 3;
                            }
                            // for (let i = stopInfoIndex; i < data.followingStops.length - 1; i++){
                            //   const stop = data.followingStops[i];
                            //   if (stop.mainStop && stop.stopType.includes("ph")) {
                            //     nearestStop = stop.stopNameRAW;
                            //     break;
                            //   }
                            // }
                            checkpoint.scheduledTrains.push({
                                trainNo: data.trainNo,
                                driverName: data.driverName,
                                driverId: data.driverId,
                                currentStationName: data.currentStationName,
                                currentStationHash: data.currentStationHash,
                                category: data.category,
                                beginsAt: data.followingStops[0].stopNameRAW,
                                terminatesAt: data.followingStops[data.followingStops.length - 1].stopNameRAW,
                                stopInfo,
                                stopLabel,
                                stopStatus,
                                nearestStop,
                                stopStatusID,
                            });
                        });
                        return acc;
                    }, []);
                }
            }
            return { ...station, scheduledTrains };
        });
        this.trainList = this.trainList.reduce((acc, train) => {
            const timetableData = timetableList.find(data => data && data.trainNo === train.trainNo);
            if (timetableData) {
                const foundStation = this.stationList.find(station => station.stationName === train.currentStationName);
                if (foundStation) {
                    const trainData = foundStation.scheduledTrains.find(stationTrain => stationTrain.trainNo === train.trainNo);
                    acc.push({ ...train, timetableData, stopStatus: trainData ? trainData.stopStatus : '', stopLabel: trainData ? trainData.stopLabel : '' });
                }
            }
            return acc;
        }, []);
        this.timetableLoaded = Status.Loaded;
    }
}
exports.default = APIDataParser;
