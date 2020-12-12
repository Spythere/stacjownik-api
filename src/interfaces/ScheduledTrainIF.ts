import TrainStop from './TrainStopIF';

export default interface ScheduledTrainIF {
  trainNo: number;
  driverName: string;
  driverId: number;
  currentStationName: string;
  currentStationHash: string;
  category: string;
  stopInfo: TrainStop;

  terminatesAt: string;
  beginsAt: string;
  nearestStop: string;

  stopLabel: string;
  stopStatus: string;
  stopStatusID: number;
}
