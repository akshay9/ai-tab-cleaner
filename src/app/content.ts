import  * as browser from 'webextension-polyfill'

interface timingType {
    counters: any,
    duration: number,
    title: string,
    referrer: string,
    name: string,
    start: number
}

(function(){
    
    if (document.readyState === 'complete') {
      startCollect();
    } else {
      window.addEventListener('load', startCollect);
    }
  
    document.addEventListener('copy', (event) => {
        var promise = browser.runtime.sendMessage({type: "copyData", copy: 1});
        promise.catch((reason) => console.log(reason));
    })

    function startCollect() {
      const counters = performance.getEntriesByType('navigation')[0].toJSON()
      const timing : timingType = {
          counters: counters,
          duration: counters.duration,
          title: document.title,
          referrer: document.referrer,
          name: counters.name,
          start: performance.timing.requestStart,
      };
      delete timing.counters.serverTiming;
      if (typeof timing.duration !== 'undefined' && timing.duration > 0) {
  
        // we have only 4 chars in our disposal including decimal point
        var duration = timing.duration / 1000;
        var precision = (duration >= 100) ? 0 : (duration >= 10 ? 1 : 2);
        var time = duration.toFixed(precision).substring(0, 4);
        console.log({type: "timingData", time: time, timing: timing, copy: 0})
        var promise = browser.runtime.sendMessage({type: "timingData", time: time, timing: timing, copy: 0})
        promise.catch((reason) => console.log(reason));
      } else {
        setTimeout(startCollect, 100);
      }
    }
  })();