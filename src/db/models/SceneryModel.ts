import { Schema, model, Model, Document } from 'mongoose';

interface IScenery extends Document {
  stationHash: String;
  stationName: String;
  currentDispatcher: String;
  currentDispatcherId: Number;
  currentDispatcherFrom: Number;
  dispatcherHistory: [{ dispatcherName: String; dispatcherId: Number; dispatcherFrom: Number; dispatcherTo: Number }];
}

const ScenerySchema = new Schema({
  stationHash: String,
  stationName: String,
  currentDispatcher: String,
  currentDispatcherFrom: Number,
  currentDispatcherId: Number,
  dispatcherHistory: [{ dispatcherName: String, dispatcherId: Number, dispatcherFrom: Number, dispatcherTo: Number }],
});

const SceneryModel: Model<IScenery> = model<IScenery>('Scenery', ScenerySchema);

export default SceneryModel;
