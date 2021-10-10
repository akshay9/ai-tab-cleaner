import { TabListItemType } from "../ui/App";
import { flattenObj } from "../ui/helpers/flattenObj";
import DNNModel from "./DNNModel";
import ModelType from "./ModelType";
import { DataFrame } from "danfojs/dist/index"


function contains_word (ser, term='search') {
  let pat = new RegExp("(^|\\W)+" + term + "\\W*", "i")

  for (let i = 0; i < ser.length; i++) {
    const str = ser[i];
    if ((str + '').match(pat) != null) return 1
  }

  return 0
    
  for (let col in ser) {
      let txt = ser[col]
      let pat = new RegExp("(^|\W)+" + term + "\W*")
      return txt.match(pat).length
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

class TabClassifer {
  dataset: any
  classifier: ModelType

  constructor() {
    // this.dataset = this.preproccess(dataset);
    this.classifier = new DNNModel()
  }

  preproccess(data: Array<TabListItemType>) {
    const flattenData = data.map(row => flattenObj({...row.rawData, close: row.selected}))

    const df = new DataFrame(flattenData)
    
    const cdf = df.loc({columns: ['copy', 'counters.encodedBodySize', 'counters.fetchStart', 'counters.name', 
    'counters.redirectCount', 'counters.startTime', 'duration', 
    'referrer', 'start', 'tab.active', 'tab.pinned','tab.audible', 'tab.discarded', 
    'tab.favIconUrl', 'tab.groupId', 'tab.windowId', 'tab.highlighted', 'tab.incognito','tab.id', 'tab.index', 
    'tab.selected', 'tab.status', 'tab.title', 'tab.url', 'name', 'title', 'close']})

    let fdf = cdf.loc({columns: ['copy', 'tab.active', 'tab.pinned']})

    fdf.addColumn({ "column": 'domain.cat.search', "values": cdf.loc({columns: ['name', 'title']}).apply(contains_search, { axis:0 }), inplace: true  })
    fdf.addColumn({ "column": 'domain.cat.edge', "values": cdf.loc({columns: ['name', 'tab.url']}).apply(is_edge_domain, { axis:0 }), inplace: true  })
    fdf.addColumn({ "column": 'ref.cat.search', "values": cdf.loc({columns: ['referrer']}).apply(contains_google, { axis:0 }), inplace: true  })
    // fdf['grouped'] = cdf.loc({columns: ['tab.groupId']}).apply(is_grouped, { axis:1 })

    fdf.addColumn({ "column": 'tab.status.cat.loading', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_loading, { axis:0 }), inplace: true  })
    fdf.addColumn({ "column": 'tab.status.cat.complete', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_complete, { axis:0 }), inplace: true  })
    fdf.addColumn({ "column": 'tab.status.cat.unloaded', "values": cdf.loc({columns: ['tab.status']}).apply(is_tab_unloaded, { axis:0 }), inplace: true  })
    console.log("fdff", fdf, cdf)
    fdf = fdf.fillna(fdf.median())
    cdf['close'] = cdf['close'].fillna(0)

    console.log("fdf", fdf)

    // let s = new dfd.Series([1, 3, 5, undefined, 6, 8], {})
    // console.log("Series", s)
  }

  predict() {
    
  }
}

export default TabClassifer;