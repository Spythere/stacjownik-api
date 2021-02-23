import { Schema, model, Model, Document } from 'mongoose';

interface IScenery extends Document {
  stationName: String;
  stationURL: String;
  stationLines: String;
  stationProject: String;

  reqLevel: String;
  supportersOnly: String;
  signalType: String;
  controlType: String;
  SBL: String;
  twoWayBlock: String;

  routesOneWayCatenary: Number;
  routesOneWayOther: Number;
  routesTwoWayCatenary: Number;
  routesToWayOther: Number;

  default: Boolean;
  nonPublic: Boolean;
  unavailable: Boolean;
  hasData: Boolean;

  stops: String[];
  checkpoints: String[];

  currentDispatcher: String;
  currentDispatcherId: Number;
  currentDispatcherFrom: Number;
  dispatcherHistory: [{ dispatcherName: String; dispatcherId: Number; dispatcherFrom: Number; dispatcherTo: Number }];
}

const ScenerySchema = new Schema({
  stationName: String,
  stationURL: String,
  stationLines: String,
  stationProject: String,
  reqLevel: String,
  supportersOnly: String,
  signalType: String,
  controlType: String,
  SBL: String,
  twoWayBlock: String,
  routesOneWayCatenary: Number,
  routesOneWayOther: Number,
  routesTwoWayCatenary: Number,
  routesToWayOther: Number,
  default: Boolean,
  nonPublic: Boolean,
  unavailable: Boolean,
  stops: [],
  checkpoints: [],

  hasData: Boolean,

  currentDispatcher: String,
  currentDispatcherFrom: Number,
  currentDispatcherId: Number,
  dispatcherHistory: [{ dispatcherName: String, dispatcherId: Number, dispatcherFrom: Number, dispatcherTo: Number }],
});

export default model<IScenery>('Scenery', ScenerySchema);
