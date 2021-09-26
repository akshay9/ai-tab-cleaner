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

async function handleMessage(request, sender) {
  // This cache stores page load time for each tab, so they don't interfere
  console.log("received message: ", sender.tab.id);
  
  if (typeof request.timing !== 'undefined') {
    await handleTimingMessage(request, sender)
  }
  if (typeof request.copy !== 'undefined') {
    await handleCopyEvent(request, sender)
  }
  if (typeof request.tab !== 'undefined') {
    await handleTabData(request, sender)
  }

}

function handleTabData(request, sender) {
  return browser.storage.local.get('cache').then(data => {
    if (!data.cache) data.cache = {};
    if (!data.cache['tab' + sender.tab.id]) data.cache['tab' + sender.tab.id] = {}
    data.cache['tab' + sender.tab.id].tab = request.tab;
    return browser.storage.local.set(data)
  });
}

function handleTimingMessage(request, sender) {
  return browser.storage.local.get('cache').then(data => {
    if (!data.cache) data.cache = {};
    if (!data.cache['tab' + sender.tab.id]) data.cache['tab' + sender.tab.id] = {}
    data.cache['tab' + sender.tab.id] = {...data.cache['tab' + sender.tab.id], ...request.timing} ;
    return browser.storage.local.set(data)
  });
}

function handleCopyEvent(request, sender) {
  return browser.storage.local.get('cache').then(data => {
    if (!data.cache) data.cache = {};
    if (!data.cache['tab' + sender.tab.id]) data.cache['tab' + sender.tab.id] = {}
    data.cache['tab' + sender.tab.id].copy = request.copy;
    return browser.storage.local.set(data);
  });
}