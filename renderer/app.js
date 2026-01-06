const target = "1.1.1.1";

const currentEl = document.getElementById("current");
const avgEl = document.getElementById("avg");
const minEl = document.getElementById("min");
const maxEl = document.getElementById("max");
const jitterEl = document.getElementById("jitter");
const lossEl = document.getElementById("loss");

const startBtn = document.getElementById("startBtn");
const speedInfoModal = document.getElementById("speedInfoModal");
const speedStatus = document.getElementById("speedStatus");
const speedLoader = document.getElementById("speedLoader");
const speedStartBtn = document.getElementById("speedStartBtn");
const speedResults = document.getElementById("speedResults");
const resultDownload = document.getElementById("resultDownload");
const resultUpload = document.getElementById("resultUpload");
const muteBtn = document.getElementById("muteBtn");

let running = false;
let pingIntervalId = null;

let pingHistory = [];
let loss = 0;

const chartContainer = document.getElementById("chart");

let xData = [];
let pingData = [];

const chartOpts = {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    scales: {
        x: { time: false },
        y: { auto: true },
    },
    axes: [
        {
            stroke: "#888",
            grid: { stroke: "rgba(255,255,255,0.06)" },
            values: (u, vals) => vals.map(v => v.toString()),
        },
        {
            scale: "y",
            stroke: "rgba(30, 255, 0, 1)",
            grid: { stroke: "rgba(255,255,255,0.06)" },
            values: (u, vals) => vals.map(v => `${v} ms`),
        },
    ],
    series: [
        {},
        {
            label: "Ping (ms)",
            scale: "y",
            stroke: "rgba(30, 255, 0, 1)",
            width: 2,
        },
    ],
};

let u = new uPlot(chartOpts, [xData, pingData], chartContainer);

window.addEventListener("resize", () => {
    u.setSize({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
    });
});

let sampleIndex = 0;

async function pingTick() {
    const res = await window.pingAPI.pingOnce(target);
    const ping = res.alive ? res.time : null;

    sampleIndex += 1;
    xData.push(sampleIndex);
    pingData.push(ping ?? 0);

    if (!ping && ping !== 0) {
        loss++;
    } else {
        pingHistory.push(ping);
    }

    const MAX_POINTS = 300;
    if (xData.length > MAX_POINTS) {
        xData = xData.slice(-MAX_POINTS);
        pingData = pingData.slice(-MAX_POINTS);
    }

    if (pingHistory.length) {
        const min = Math.min(...pingHistory);
        const max = Math.max(...pingHistory);
        const avg =
            Math.round(
                pingHistory.reduce((a, b) => a + b, 0) / pingHistory.length
            );

        const jitter =
            pingHistory.length > 1
                ? Math.round(
                    pingHistory
                        .slice(1)
                        .map((v, i) => Math.abs(v - pingHistory[i]))
                        .reduce((a, b) => a + b, 0) /
                    (pingHistory.length - 1)
                )
                : 0;

        currentEl.textContent = ping ?? "LOSS";
        avgEl.textContent = `${avg} ms`;
        minEl.textContent = `${min} ms`;
        maxEl.textContent = `${max} ms`;
        jitterEl.textContent = `${jitter} ms`;
        lossEl.textContent =
            Math.round((loss / (pingHistory.length + loss)) * 100) + "%";
    }

    var sound = new Howl({
        src: ['beep.mp3'],
        loop: false,
        volume: 0.05,
    });
    sound.play();

    u.setData([xData, pingData]);
}

startBtn.addEventListener("click", () => {
    if (!running) {
        running = true;
        startBtn.textContent = "Stop";
        pingIntervalId = setInterval(pingTick, 1000);
        muteBtn.classList.remove("hidden");
    } else {
        running = false;
        startBtn.textContent = "Start";
        clearInterval(pingIntervalId);
        muteBtn.classList.add("hidden");
    }
});

muteBtn.addEventListener("click", () => {
    Howler.mute(!Howler._muted);
    if (Howler._muted) {
        muteBtn.textContent = "Unmute";
    } else {
        muteBtn.textContent = "Mute";
    }
});

async function runDownloadTest(bytes = 40 * 1024 * 1024) {
    const url = `https://speed.cloudflare.com/__down?bytes=${bytes}`;
    const start = performance.now();

    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");

    await res.arrayBuffer();

    const sec = (performance.now() - start) / 1000;
    return (bytes * 8) / 1e6 / sec; // Mbps
}

async function runUploadTest(bytes = 15 * 1024 * 1024) {
    const url = "https://speed.cloudflare.com/__up";
    const buf = new Uint8Array(bytes);

    const start = performance.now();
    const res = await fetch(url, {
        method: "POST",
        body: buf,
    });
    if (!res.ok) throw new Error("Upload failed");

    const sec = (performance.now() - start) / 1000;
    return (bytes * 8) / 1e6 / sec; // Mbps
}

let speedRunning = false;

async function runSpeedTest() {
    if (speedRunning) return;
    speedRunning = true;
    speedResults.classList.add("hidden");
    speedLoader.classList.remove("hidden");
    speedStartBtn.classList.add("hidden");
    speedStatus.textContent = "Downloadt…";
    try {
        const dl = await runDownloadTest();
        resultDownload.textContent = dl.toFixed(2);
        speedStatus.textContent = "Upload...";
        const ul = await runUploadTest();
        resultUpload.textContent = ul.toFixed(2);
        speedStatus.textContent = "Done!";
        speedLoader.classList.add("hidden");
        speedResults.classList.remove("hidden");

    } catch (err) {
        speedStatus.textContent = "Error: " + err.message;
    } finally {
        speedRunning = false;
        speedStartBtn.classList.remove("hidden");
    }
}

function startSpeedTest() {
    runSpeedTest();
}