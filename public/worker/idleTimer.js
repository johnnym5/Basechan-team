
let startTime = 0;
let isRunning = false;
let interval = null;

self.onmessage = (e) => {
  if (e.data.command === 'START') {
    if (isRunning) return;
    startTime = Date.now();
    isRunning = true;
    interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      self.postMessage({ type: 'TICK', elapsed });
    }, 1000);
  } else if (e.data.command === 'STOP') {
    isRunning = false;
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
  } else if (e.data.command === 'RESET') {
    startTime = Date.now();
  }
};
