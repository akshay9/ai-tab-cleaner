const dfd = require("danfojs")
const dataDf = require("./data.json")
const { data, layers, sequential, tensor2d, tidy, train, losses, util, Sequential } = require("@tensorflow/tfjs")


const flattenObj = (ob) => {
 
  // The object which contains the
  // final result
  let result = {};

  // loop through the object "ob"
  for (const i in ob) {

      // We check the type of the i using
      // typeof() function and recursively
      // call the function again
      if ((typeof ob[i]) === 'object' && !Array.isArray(ob[i])) {
          const temp = flattenObj(ob[i]);
          for (const j in temp) {

              // Store temp in result
              result[i + '.' + j] = temp[j];
          }
      }

      // Else store ob[i] in result directly
      else {
          result[i] = ob[i];
      }
  }
  return result;
}

function contains_word (ser, term='search') {
  let pat = new RegExp("(^|\\W)+" + term + "\\W*", "i")

  for (let i = 0; i < ser.length; i++) {
    const str = ser[i];
    if ((str + '').match(pat) != null) return 1
  }

  return 0
}

function contains_search(ser) {
  return contains_word(ser, 'search')
}

function contains_google(ser) {
  return contains_word(ser, 'google')
}

function is_grouped(ser){
    return (!contains_word(ser, '-1'))
}

function is_edge_domain(ser) {
    return contains_word(ser, 'edge://')  // since \W+ doesnt match start of the string
}

function is_tab_loading(ser) {
    return contains_word(ser, 'loading')
}

function is_tab_complete(ser) {
    return contains_word(ser, 'complete')
}

function is_tab_unloaded(ser) {
    return contains_word(ser, 'unloaded')
}

function calculate_tab_life(row) {
  const MAX_TIME = 1*24*60*60*1000 // 3 Days

  if (row.length == 0)
    return 1

  const ret = row.map(startTime => {
    const timeDelta = Date.now() - startTime
    const cappedTime = Math.min(timeDelta, MAX_TIME) 
    const normalisedTime = (cappedTime / MAX_TIME)

    return normalisedTime
  })
  
  return ret[0]
}

function bool_to_int(row) {
  return row.map(val => {
    if (typeof val == "boolean"){
      return val ? 1:0
    } else {
      return val
    }
  })
  
}

function preproccess(data) {
  let flattenData = data.map(row => flattenObj({...row}))
  let COLUMNS = ['copy', 'counters.encodedBodySize', 'counters.fetchStart', 'counters.name', 
  'counters.redirectCount', 'counters.startTime', 'duration', 
  'referrer', 'start', 'tab.active', 'tab.pinned','tab.audible', 'tab.discarded', 
  'tab.favIconUrl', 'tab.groupId', 'tab.windowId', 'tab.highlighted', 'tab.incognito','tab.id',
  'tab.index', 'tab.selected', 'tab.status', 'tab.title', 'tab.url', 'name', 'title', 'close']
  
  flattenData = flattenData.map(row => {
    let newObj = {}
    COLUMNS.forEach( (key) => {
      // console.log(key, row, row[key])
      // newObj[key] = row[key];
      if (Object.keys(row).includes(key)) {
        newObj[key] = row[key];
      } else {
        newObj[key] = null;
      }
    })
    // Object.forEach(key => {
    //   if (key in COLUMNS)
    //     newObj[key] = row[key]
    // })
    return newObj
  })

  // console.log(flattenData)

  const df = new dfd.DataFrame(flattenData)
  // console.log(df.values)
  
  const cdf = df.loc({columns: COLUMNS})



  let  fdf = cdf.loc({columns: ['copy', 'tab.active', 'tab.discarded', 'tab.audible', 'tab.pinned']})

  fdf.addColumn({ "column": 'tabLife', "values": cdf.loc({columns: ['start']}).apply(calculate_tab_life, { axis:0 }), inplace: true  })
  
  fdf.addColumn({ "column": 'domain.cat.search', "values": cdf.loc({columns: ['name', 'title']}).apply(contains_search, { axis:0 }), inplace: true  })
  fdf.addColumn({ "column": 'domain.cat.edge', "values": cdf.loc({columns: ['name', 'tab.url']}).apply(is_edge_domain, { axis:0 }), inplace: true  })
  fdf.addColumn({ "column": 'ref.cat.search', "values": cdf.loc({columns: ['referrer']}).apply(contains_google, { axis:0 }), inplace: true  })
  // fdf['grouped'] = cdf.loc({columns: ['tab.groupId']}).apply(is_grouped, { axis:1 })

  fdf.addColumn({ "column": 'tab.status.cat.loading', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_loading, { axis:0 }), inplace: true  })
  fdf.addColumn({ "column": 'tab.status.cat.complete', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_complete, { axis:0 }), inplace: true  })
  fdf.addColumn({ "column": 'tab.status.cat.unloaded', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_unloaded, { axis:0 }), inplace: true  })

  fdf.fillna(fdf.median().values, {columns: fdf.columns,inplace: true})
  // cdf.fillna([0], {columns:['close'], inplace: true})

  fdf = fdf.apply(bool_to_int, {axis: 0})
  console.log(fdf.values, df['close'].values)

  return {X: fdf.values, y: df['close'].values}
  // console.log(fdf.print())
}

class DNNModel {
  model

  constructor(inputShape) {
    this.model = this._createModel(inputShape)
  }

  _createModel(inputShape) {
    const model = sequential()

    model.add(layers.dense({inputShape: [inputShape], units: 2}));
    // model.add(layers.dense({ units: 1}));
    // model.add(layers.dense({ units: 1}));
    // model.add(layers.dense({ units: 1}));

    // Add an output layer
    model.add(layers.dense({units: 1, activation:'sigmoid'}));
  
    return model;
  }

  _processData(X, y) {
    return tidy(() => {
      util.shuffleCombo(X, y)
      const xTensor = tensor2d(X, [X.length, 12])
      const yTensor = tensor2d(y, [y.length, 1])

      return { xTensor, yTensor }
    })
  }
  
  async train(X, y) {
    const batchSize = 25;
    const epochs = 70;

    const { xTensor, yTensor } = this._processData(X, y)

    this.model.compile({
      optimizer: train.adam(),
      loss: losses.sigmoidCrossEntropy,
      metrics: ['mse', 'accuracy', 'crossentropy'],
    });

    return await this.model.fit(xTensor, yTensor, {
      batchSize,
      epochs,
      shuffle: true
    });
  }

  predict(X) {
    const xTensor = tensor2d(X, [X.length, 1])
    const preds = this.model.predict(xTensor)
    return preds
  }
  
  score() {
    return this.model.loss()
  }

  save() {

  }

}
(async function () {
let {X, y} = preproccess(dataDf)
const model = new DNNModel(12);
let res = await model.train(X, y)

console.log(res)
})()