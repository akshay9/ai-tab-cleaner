import ModelType from "./ModelType";
import { data, layers, loadLayersModel, sequential, tensor2d, tidy, train, losses, util, LayersModel, Tensor } from "@tensorflow/tfjs";

class DNNModel implements ModelType {
  MODEL_NAME = "classifierModel1"

  inputShape: number
  model: LayersModel

  constructor(inputShape:number) {
    this.inputShape = inputShape

    // Load Model from storage or create new model
    loadLayersModel('indexeddb://' + this.MODEL_NAME).then((model) => {
      this.model = model
      console.log("Loaded classifier model from Storage")
    })
    .catch(e => {
      console.log(e)
      this.model = this._createModel(inputShape)
    })
  }

  _createModel(inputShape:number) {
    console.log("Creating new classifier model")
    const model = sequential()

    model.add(layers.dense({inputShape: [inputShape], units: 1}));
    model.add(layers.dense({units: 1, activation: 'sigmoid'}));
  
    return model;
  }

  _processData(X, y) {
    return tidy(() => {
      util.shuffleCombo(X, y)
      const xTensor = tensor2d(X)
      const yTensor = tensor2d(y, [y.length, 1])

      return { xTensor, yTensor }
    })
  }
  
  async train(X, y) {
    const batchSize = 25;
    const epochs = 50;

    const { xTensor, yTensor } = this._processData(X, y)

    this.model.compile({
      optimizer: train.adam(),
      loss: losses.sigmoidCrossEntropy,
      metrics: ['mse', 'accuracy'],
    });

    return this.model.fit(xTensor, yTensor, {
          batchSize,
          epochs,
          shuffle: true
        }).then(async result => {
          await this.model.save('indexeddb://' + this.MODEL_NAME)
          return result
        })
      ;
  }

  predict(X) {
    const xTensor = tensor2d(X)
    const preds = this.model.predict(xTensor) as Tensor
    return preds.array()
  }
  
  score(X, y) {

  }

  reset() {
    indexedDB.deleteDatabase('tensorflowjs');
    this.model = this._createModel(this.inputShape)
  }

}

export default DNNModel