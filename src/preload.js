const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('island', {
  onTask: (cb) => ipcRenderer.on('task', (_e, data) => cb(data)),
  onEnd: (cb) => ipcRenderer.on('end', () => cb()),
  setInteractive: (value) => ipcRenderer.send('interactive', !!value)
});
