import * as browser from 'webextension-polyfill'
import async from 'async'
import { Series } from "danfojs/dist/index"
import TabClassifer from '../ml/TabClassifier'
import TabMessageType from '../types/TabMessageType'

browser.browserAction = browser.browserAction || browser.action

const liveTabStore = 'liveTabs'
const closedTabStore = 'closedTabs'
const autoClosedStore = 'autoClosedStore'
const changedOnCloseStore = 'changedOnCloseStore'

const tabClassifer = new TabClassifer();

var q = async.queue(function({request, sender, sendResponse}, callback) {
  handleMessage(request, sender, sendResponse).then(() => callback())
}, 1);

q.drain(() => {
  chrome.storage.local.get(liveTabStore, console.log.bind(this, "chrome"))
})

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.set({ cache: {} })
  extractDataForAllTabs()
});

browser.runtime.onStartup.addListener(() => {
  extractDataForAllTabs()
})

browser.runtime.onMessage.addListener((requestMessage, sender: chrome.runtime.MessageSender, sendResponse: Function) => {
  if (sender.url == chrome.runtime.getURL('popup.html')) {
    handleTabMessage(requestMessage, sender, sendResponse)
  } else {
    q.push({requestMessage, sender, sendResponse})
  }
});

// cache eviction
browser.tabs.onRemoved.addListener(async tabId => {
  const closedStore = await initialiseStore(closedTabStore) 
  browser.storage.local.get(liveTabStore).then(data => {
    if (data[liveTabStore]) {
      closedStore['tab' + tabId] = data[liveTabStore]['tab' + tabId] 
      delete data[liveTabStore]['tab' + tabId];
    }
    browser.storage.local.set(data);
  });
});

async function extractDataForAllTabs () {
  let tabs = await browser.tabs.query({currentWindow: true})

  // Populate values for tab.status === "unloaded"
  tabs.map((tab) => {
    q.push({request: {tab: tab}, sender:{ tab }})
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

function handleTabMessage(message: TabMessageType, sender: chrome.runtime.MessageSender, sendResponse: Function) {
  let res:any = 'response'
  if (message.type == "classifyTabs"){
    tabClassifer.preproccess(message.data)
  }
  
  sendResponse(res)
}

async function handleMessage(message, sender: chrome.runtime.MessageSender, sendResponse: Function) {
  // This cache stores page load time for each tab, so they don't interfere
  // console.log("received message: ", sender.tab.id);
  
  let cacheState = await initialiseStore(liveTabStore);
  // await initialiseStore(closedTabStore)
  // await initialiseStore(autoClosedStore)
  // await initialiseStore(changedOnCloseStore)

  console.log("Sender message", chrome.runtime.getURL(''), sender)
  return

  cacheState = handleTabData(cacheState, message, sender)
  
  if (typeof message.timing !== 'undefined') {
    cacheState = handleTimingMessage(cacheState, message, sender)
  }
  if (typeof message.copy !== 'undefined') {
    cacheState = handleCopyEvent(cacheState, message, sender)
  }

  browser.storage.local.set(cacheState)
}

async function initialiseStore(storeName, commit=false) {
  let cacheState = await browser.storage.local.get(storeName)
  if (!cacheState[storeName]) {
    cacheState[storeName] = {};

    if (commit) {
      await browser.storage.local.set(cacheState)
    }
  }
  

  return cacheState
}

function handleTabData(data, request, sender) {
  if (!data[liveTabStore]['tab' + sender.tab.id]) data[liveTabStore]['tab' + sender.tab.id] = {}
  console.log("tab content", JSON.parse(JSON.stringify(sender.tab)))
  data[liveTabStore]['tab' + sender.tab.id].tab = JSON.parse(JSON.stringify(sender.tab));
  
  return data
}

function handleTimingMessage(data, request, sender) {
  if (!data[liveTabStore]['tab' + sender.tab.id]) data[liveTabStore]['tab' + sender.tab.id] = {}
  data[liveTabStore]['tab' + sender.tab.id] = {...data[liveTabStore]['tab' + sender.tab.id], ...request.timing} ;
  
  return data
}

function handleCopyEvent(data, request, sender) {
  if (!data[liveTabStore]['tab' + sender.tab.id]) data[liveTabStore]['tab' + sender.tab.id] = {}
  data[liveTabStore]['tab' + sender.tab.id].copy = request.copy;
  
  return data
}