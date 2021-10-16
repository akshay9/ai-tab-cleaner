import { liveTabStore } from "../constants";


export function handleTabData(data, request, sender) {
  if (typeof sender.tab === 'undefined') return data;

  if (!data[liveTabStore]['tab' + sender.tab.id]) data[liveTabStore]['tab' + sender.tab.id] = {}
  data[liveTabStore]['tab' + sender.tab.id].tab = JSON.parse(JSON.stringify(sender.tab));
  
  return data
}

export function handleTimingMessage(data, request, sender) {
  if (typeof request.timing === 'undefined') return data;

  if (!data[liveTabStore]['tab' + sender.tab.id]) data[liveTabStore]['tab' + sender.tab.id] = {}
  data[liveTabStore]['tab' + sender.tab.id] = {...data[liveTabStore]['tab' + sender.tab.id], ...request.timing} ;
  
  return data
}

export function handleCopyEvent(data, request, sender) {
  if (typeof request.copy === 'undefined') return data;

  if (!data[liveTabStore]['tab' + sender.tab.id]) data[liveTabStore]['tab' + sender.tab.id] = {}
  data[liveTabStore]['tab' + sender.tab.id].copy = request.copy;
  
  return data
}