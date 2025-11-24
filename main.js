const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const ping = require("ping");

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 900,
        resizable: false,
        frame: true,
        backgroundColor: "#0a0a0a",
        titleBarStyle: "hiddenInset",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.removeMenu();
    win.loadFile("renderer/index.html");
}

app.whenReady().then(createWindow);

// Ping IPC
ipcMain.handle("ping:once", async (_, target) => {
    try {
        const res = await ping.promise.probe(target, { timeout: 2 });
        return {
            alive: res.alive,
            time: res.time === "unknown" ? null : parseInt(res.time)
        };
    } catch {
        return { alive: false, time: null };
    }
});