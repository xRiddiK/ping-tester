const target = "1.1.1.1";

const currentEl = document.getElementById("current");
const avgEl = document.getElementById("avg");
const minEl = document.getElementById("min");
const maxEl = document.getElementById("max");
const jitterEl = document.getElementById("jitter");
const lossEl = document.getElementById("loss");
const startBtn = document.getElementById("startBtn");

let running = false;
let intervalId = null;

let history = [];
let loss = 0;

/* --- Smoothie Setup --- */
const canvas = document.getElementById("chart");

const chart = new SmoothieChart({
    millisPerPixel: 18,
    grid: {
        strokeStyle: "rgba(255,255,255,0.08)",
        lineWidth: 1,
        millisPerLine: 2000,
        verticalSections: 8
    },
    labels: { fillStyle: "#fff" },
    timestampFormatter: () => ""
});

const line = new TimeSeries();
chart.addTimeSeries(line, { strokeStyle: "rgba(0,200,255,1)", lineWidth: 3 });
chart.streamTo(canvas, 50);

/* DPI FIX */
function fixDPR() {
    let dpr = window.devicePixelRatio || 1;
    let rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
}
fixDPR();
window.addEventListener("resize", fixDPR);

/* --- PING LOOP --- */
async function pingTick() {
    const res = await window.pingAPI.pingOnce(target);
    const timeNow = Date.now();

    const ping = res.alive ? res.time : null;

    line.append(timeNow, ping ?? 0);

    if (!ping) loss++;
    else history.push(ping);

    if (history.length) {
        const min = Math.min(...history);
        const max = Math.max(...history);
        const avg = Math.round(history.reduce((a, b) => a + b) / history.length);

        const jitter =
            history.length > 1
                ? Math.round(
                    history
                        .slice(1)
                        .map((v, i) => Math.abs(v - history[i]))
                        .reduce((a, b) => a + b) /
                    (history.length - 1)
                )
                : 0;

        currentEl.textContent = ping ?? "LOSS";
        avgEl.textContent = avg + " ms";
        minEl.textContent = min + " ms";
        maxEl.textContent = max + " ms";
        jitterEl.textContent = jitter + " ms";
        lossEl.textContent = Math.round((loss / (history.length + loss)) * 100) + "%";
    }
}

/* --- BUTTON --- */
startBtn.addEventListener("click", () => {
    if (!running) {
        running = true;
        startBtn.textContent = "Stop";
        intervalId = setInterval(pingTick, 1000);
    } else {
        running = false;
        startBtn.textContent = "Start";
        clearInterval(intervalId);
    }
});