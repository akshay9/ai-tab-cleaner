import { TabListItemType } from "../ui/App";
import { flattenObj } from "../ui/helpers/flattenObj";
import DNNModel from "./DNNModel";
import ModelType from "./ModelType";
import { DataFrame } from "danfojs/dist/index"
import { bool_to_int, calculate_tab_life, contains_google, contains_search, is_edge_domain, is_tab_complete, is_tab_loading, is_tab_unloaded } from "./reducers";


class TabClassifer {
  dataset: any
  classifier: ModelType

  constructor() {
    this.classifier = new DNNModel(12)
  }

  preproccess(data: Array<TabListItemType>) {
    let flattenData = data.map(row => flattenObj({...row.rawData, close: row.selected}))
    let COLUMNS = ['copy', 'counters.encodedBodySize', 'counters.fetchStart', 'counters.name', 
    'counters.redirectCount', 'counters.startTime', 'duration', 
    'referrer', 'start', 'tab.active', 'tab.pinned','tab.audible', 'tab.discarded', 
    'tab.favIconUrl', 'tab.groupId', 'tab.windowId', 'tab.highlighted', 'tab.incognito','tab.id',
    'tab.index', 'tab.selected', 'tab.status', 'tab.title', 'tab.url', 'name', 'title', 'close']
    
    flattenData = flattenData.map(row => {
      let newObj = {}
      for (const key in row) {
        if (COLUMNS.includes(key)) {
          newObj[key] = row[key];
        } else {
          newObj[key] = null;
        }
      }
      return newObj
    })

    console.log(flattenData)

    const df = new DataFrame(flattenData)
    const cdf = df.loc({columns: COLUMNS})

    let  fdf: DataFrame = cdf.loc({columns: ['copy', 'tab.active', 'tab.discarded', 'tab.audible', 'tab.pinned']})

    fdf.addColumn({ "column": 'tabLife', "values": cdf.loc({columns: ['start']}).apply(calculate_tab_life, { axis:0 }), inplace: true  })
    
    fdf.addColumn({ "column": 'domain.cat.search', "values": cdf.loc({columns: ['name', 'title']}).apply(contains_search, { axis:0 }), inplace: true  })
    fdf.addColumn({ "column": 'domain.cat.edge', "values": cdf.loc({columns: ['name', 'tab.url']}).apply(is_edge_domain, { axis:0 }), inplace: true  })
    fdf.addColumn({ "column": 'ref.cat.search', "values": cdf.loc({columns: ['referrer']}).apply(contains_google, { axis:0 }), inplace: true  })
    // fdf['grouped'] = cdf.loc({columns: ['tab.groupId']}).apply(is_grouped, { axis:1 })

    fdf.addColumn({ "column": 'tab.status.cat.loading', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_loading, { axis:0 }), inplace: true  })
    fdf.addColumn({ "column": 'tab.status.cat.complete', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_complete, { axis:0 }), inplace: true  })
    fdf.addColumn({ "column": 'tab.status.cat.unloaded', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_unloaded, { axis:0 }), inplace: true  })

    fdf.fillna(fdf.median().values, {columns: fdf.columns,inplace: true})
    cdf.fillna([0], {columns:['close'], inplace: true})

    fdf = fdf.apply(bool_to_int, {axis: 0}) as DataFrame

    return {X: fdf.values, y: df['close'].values}
  }

  train({X, y}) {
    return this.classifier.train(X, y)
  }

  predict(X) {
    return this.classifier.predict(X)
  }

  reset() {
    this.classifier.reset();
  }
}

export default TabClassifer;