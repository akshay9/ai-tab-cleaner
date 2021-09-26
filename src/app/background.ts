import * as browser from 'webextension-polyfill'
import async from 'async'


browser.browserAction = browser.browserAction || browser.action

var q = async.queue(function({request, sender}, callback) {
  handleMessage(request, sender).then(() => callback())
  // callback();
}, 1);

q.drain(() => {
  browser.storage.local.get('cache').then(console.log.bind(this, "browser"))
  chrome.storage.local.get('cache', console.log.bind(this, "chrome"))
})

let color = '#3aa757';

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.set({ cache: {} })
  extractDataForAllTabs()
  chrome.storage.sync.set({ color });
  console.log('Default background color set to %cgreen', `color: ${color}`);
});

browser.runtime.onStartup.addListener(() => {
  extractDataForAllTabs()
})

browser.runtime.onMessage.addListener((request, sender: chrome.runtime.MessageSender) => {
  q.push({request, sender})
});

// cache eviction
browser.tabs.onRemoved.addListener(tabId => {
  browser.storage.local.get('cache').then(data => {
    if (data.cache) delete data.cache['tab' + tabId];
    browser.storage.local.set(data);
  });
});

// browser.storage.onChanged.addListener( (changes, area) => {
//   if (area == 'local') {
//     for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
//       if (key.beginsWith('tab')) {
//         browser.storage.local.set({cache})
//       }
//       console.log(
//         `Storage key "${key}" in namespace "${namespace}" changed.`,
//         `Old value was "${oldValue}", new value is "${newValue}".`
//       );
//     }
//   }
// })

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

async function handleMessage(request, sender: chrome.runtime.MessageSender) {
  // This cache stores page load time for each tab, so they don't interfere
  console.log("received message: ", sender.tab.id);

  let cacheState = await browser.storage.local.get('cache')
  if (!cacheState.cache) cacheState.cache = {};

  cacheState = handleTabData(cacheState, request, sender)
  
  if (typeof request.timing !== 'undefined') {
    cacheState = handleTimingMessage(cacheState, request, sender)
  }
  if (typeof request.copy !== 'undefined') {
    cacheState = handleCopyEvent(cacheState, request, sender)
  }

  browser.storage.local.set(cacheState)
}

function handleTabData(data, request, sender) {
  if (!data.cache['tab' + sender.tab.id]) data.cache['tab' + sender.tab.id] = {}
  console.log("tab content", JSON.parse(JSON.stringify(sender.tab)))
  data.cache['tab' + sender.tab.id].tab = JSON.parse(JSON.stringify(sender.tab));
  
  return data
}

function handleTimingMessage(data, request, sender) {
  if (!data.cache['tab' + sender.tab.id]) data.cache['tab' + sender.tab.id] = {}
  data.cache['tab' + sender.tab.id] = {...data.cache['tab' + sender.tab.id], ...request.timing} ;
  
  return data
}

function handleCopyEvent(data, request, sender) {
  if (!data.cache['tab' + sender.tab.id]) data.cache['tab' + sender.tab.id] = {}
  data.cache['tab' + sender.tab.id].copy = request.copy;
  
  return data
}