import * as browser from 'webextension-polyfill'
import async from 'async'
import { Series } from "danfojs/dist/index"
import TabClassifer from '../ml/TabClassifier'
import TabMessageType from '../types/TabMessageType'
import { closedTabStore, liveTabStore } from './constants'
import { handleCopyEvent, handleTabData, handleTimingMessage } from './contentActions/actions'

// browser.browserAction = browser.browserAction || browser.action

const tabClassifer = new TabClassifer();

const queue = async.queue(({requestMessage, sender}, callback) => {
  handleMessage(requestMessage, sender).then(() => callback())
}, 1);

queue.drain(() => {
  browser.storage.local.get(liveTabStore).then(console.log.bind(this, "chrome"))
})

// Browser events

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.set({ cache: {} })
  extractDataForAllTabs()
});

browser.runtime.onStartup.addListener(() => {
  extractDataForAllTabs()
})

browser.runtime.onMessage.addListener((requestMessage, sender: browser.Runtime.MessageSender) => {
  if (sender.url === browser.runtime.getURL('popup.html')) {
    return handleTabMessage(requestMessage, sender)
  } else {
    queue.push({requestMessage, sender})
  }
});

browser.tabs.onRemoved.addListener(async tabId => {
  const closedStore = await initialiseStore(closedTabStore, []);
  const tabStore = await initialiseStore(liveTabStore);
  
  if (tabStore['tab' + tabId]) {
    closedStore[closedTabStore].push({...tabStore['tab' + tabId], ...{close: 1, end: Date.now()}})
    delete tabStore['tab' + tabId];
  }

  browser.storage.local.set(tabStore);
  browser.storage.local.set(closedStore);
});

async function extractDataForAllTabs () {
  browser.storage.local.set({[liveTabStore]: {}})
  let tabs = await browser.tabs.query({})

  // Populate values for tab.status === "unloaded"
  tabs.map((tab) => {
    queue.push({type: "tabData",request: {tab: tab}, sender:{ tab }})
  })

  let ret = Promise.allSettled(
    tabs.filter(
        (tab, index, arr) => tab.status !== "unloaded"
      )
      .map(
        (tab) => browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["js/content.js"]
        })
      )
  ).then(console.log.bind(this, "All Tabs"))
}

async function handleTabMessage(message, sender: browser.Runtime.MessageSender) {
  let res:any = 'response'
  if (message.type === "trainTabs"){
    let data = tabClassifer.preproccess(message.data)
    return tabClassifer.train(data)
  }
  if (message.type === 'resetTabs') { 
    extractDataForAllTabs()
  }
  if (message.type === 'classifyTabs') { 
    let {X, y} = tabClassifer.preproccess(message.data)
    return tabClassifer.predict(X)
  }
  
  return res
}

async function handleMessage(message, sender: browser.Runtime.MessageSender) {
  if (!message) return;
  
  let tabState = await initialiseStore(liveTabStore);
  // await initialiseStore(closedTabStore)
  // await initialiseStore(autoClosedStore)
  // await initialiseStore(changedOnCloseStore)

  let reducers = [handleTabData, handleTimingMessage, handleCopyEvent]

  let finalTabState = reducers.reduce((tabStateData, reducerFn, id) => {
    return reducerFn(tabStateData, message, sender)
    }, tabState)

  browser.storage.local.set(finalTabState)
}

async function initialiseStore(storeName, defaultValue={}, commit=false) {
  let cacheState = await browser.storage.local.get(storeName)

  if (!cacheState[storeName]) {
    cacheState[storeName] = defaultValue;
  }

  if (commit) {
    await browser.storage.local.set(cacheState)
  }

  return cacheState
}
