const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pingAPI", {
    pingOnce: (t) => ipcRenderer.invoke("ping:once", t)
});