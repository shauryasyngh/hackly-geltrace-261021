// Chrome DevTools Protocol through Node 22's built-in WebSocket. Test tooling
// only: no browser package or UI dependency is needed by the app.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const exceptions = [];
  let sequence = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return {
    exceptions,
    close() { socket.close(); },
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser timed out: ${method}`)); }, 15000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

export async function runBrowserSmoke(baseUrl, chromeBin) {
  const profile = await mkdtemp(join(tmpdir(), "geltrace-browser-smoke-"));
  const chrome = spawn(chromeBin, ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  let browser;
  let page;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => reject(new Error("Chrome did not start within 15 seconds")), 15000);
      chrome.on("error", (error) => { clearTimeout(timer); reject(error); });
      chrome.on("exit", (code) => { clearTimeout(timer); reject(new Error(`Chrome exited: ${code}`)); });
      chrome.stderr.on("data", (data) => {
        output += data.toString();
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    browser = await connect(endpoint);
    await browser.send("Browser.grantPermissions", { origin: baseUrl, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
    const debugOrigin = new URL(endpoint);
    debugOrigin.protocol = "http:";
    debugOrigin.pathname = "/json/list";
    const targets = await fetch(debugOrigin).then((response) => response.json());
    page = await connect(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const evaluate = async (expression) => {
      const response = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
      return response.result.value;
    };
    const waitFor = async (expression, description) => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        try { if (await evaluate(`Boolean(${expression})`)) return; } catch { /* A page navigation can replace the JavaScript context. */ }
        await delay(75);
      }
      const details = await evaluate("document.body.innerText.slice(0, 2200)").catch(() => "Page unavailable");
      throw new Error(`Browser check timed out: ${description}\n${details}\nUncaught browser errors: ${JSON.stringify(page.exceptions)}`);
    };
    const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const run = JSON.parse(await readFile(new URL("../lib/demo-run.json", import.meta.url), "utf8"));
    const controlId = run.lanes.find((lane) => lane.role === "negative").bands[0].id;

    await page.send("Page.navigate", { url: baseUrl });
    await waitFor("document.querySelectorAll('.lane-outline').length === 5", "five lanes visible");
    // The HTML can arrive before React attaches event handlers. Retry the first
    // selection until it responds, then check the separately loaded pixel trace.
    await waitFor("(document.querySelector('.lane-outline[aria-label=\"Select lane 4: sample a\"]').click(), document.querySelector('.estimated-size strong')?.textContent === '510')", "lane 4 responds with 510 bp");
    await waitFor("Boolean(document.querySelector('.intensity-chart'))", "image pixel trace");
    assert.equal(await evaluate("document.querySelector('.size-comparison > div:nth-child(2) strong').textContent"), "500");
    assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.linked-reference'), node => Number(node.dataset.referenceBp))"), [600, 500]);
    assert.equal(await evaluate("document.querySelector('.band-connection').getAttribute('d').includes('175.655')"), true);
    await click(".reference-links a");
    await waitFor("document.querySelector('.evidence-crop svg')?.getAttribute('aria-label').includes('ladder, band at y = 140')", "ladder reference evidence crop");
    assert.equal(await evaluate("document.querySelector('.evidence-overlay rect').getAttribute('y')"), "133");
    await click(".control-review button");
    await waitFor(`document.querySelector('.evidence-crop')?.dataset.bandId === ${JSON.stringify(controlId)}`, "negative-control evidence");
    assert.equal(await evaluate("document.querySelector('.negative-band-outline').getAttribute('y')"), "170");
    assert.match(await evaluate("document.querySelector('.control-review').textContent"), /seeded review flag, not automatic detection/);

    await click(".note-link");
    await waitFor("document.querySelector('.lab-notebook')", "notebook navigation");
    assert.equal(await evaluate("document.querySelector('.note-conclusion p').textContent"), "repeat control before interpretation");
    assert.equal(await evaluate("document.querySelectorAll('.note-limitations li').length"), 4);
    await click(".note-observation:nth-of-type(3)");
    await waitFor(`document.querySelector('.evidence-crop')?.dataset.bandId === ${JSON.stringify(controlId)}`, "notebook control evidence");
    await page.send("Page.bringToFront");
    await page.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await click(".note-footer button");
    await waitFor("document.querySelector('.copy-status').textContent.includes('Copied lab note')", "copy lab note");
    const copied = await evaluate("navigator.clipboard.readText()");
    for (const text of ["sample a: estimated 510 bp", "target: 500 bp", "negative control: faint band detected (seeded review flag)", "y = 175.655 px", "y = 178 px", "Conclusion: repeat control before interpretation", "Limitations:", "New images are previewed locally and are not measured."]) assert(copied.includes(text), `Copied note is missing: ${text}`);
    await evaluate("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('clipboard blocked for fallback test'); } } })");
    await click(".note-footer button");
    await waitFor("document.querySelector('.manual-copy textarea')?.value.includes('sample a: estimated 510 bp')", "manual copy fallback");
    await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert(await evaluate("document.documentElement.scrollWidth <= innerWidth"), "Notebook overflows on mobile");

    await click(".workspace-header .text-button");
    await waitFor("document.querySelectorAll('.lane-outline').length === 5", "return to gel");
    const documentNode = await page.send("DOM.getDocument");
    const input = await page.send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: "#image-upload" });
    await page.send("DOM.setFileInputFiles", { nodeId: input.nodeId, files: [fileURLToPath(new URL("../public/images/gel-run-07.png", import.meta.url))] });
    await waitFor("document.querySelector('.upload-preview > img')?.naturalWidth === 640", "local image preview");
    assert.equal(await evaluate("document.querySelectorAll('.lane-overlays,.calibration-ruler,.measurement-panel,.measurement-overlay,.control-overlay,.image-evidence,.lane-trace,.note-link').length"), 0, "Demo measurements must be absent from uploaded images");
    assert(await evaluate("document.body.textContent.includes('New images are not measured in this demo.')"));
    assert(await evaluate("document.documentElement.scrollWidth <= innerWidth"), "Preview overflows on mobile");
    await click(".upload-preview button");
    await waitFor("document.querySelectorAll('.lane-outline').length === 5", "restore demo");
    assert.deepEqual(page.exceptions, [], "Uncaught browser errors");
    console.log("browser smoke ok: lane 4 = 510 bp, 600/500 bp ladder links, pixel trace, negative-control crop, notebook, real clipboard copy, manual fallback, mobile layout and preview isolation");
  } finally {
    page?.close();
    browser?.close();
    if (chrome.exitCode === null && chrome.pid) {
      const stopped = once(chrome, "exit");
      chrome.kill();
      await stopped;
    }
    await rm(profile, { recursive: true, force: true });
  }
}
