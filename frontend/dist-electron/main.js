import { app as c, BrowserWindow as p, ipcMain as l } from "electron";
import m from "path";
import { fileURLToPath as h } from "url";
const b = h(import.meta.url), u = m.dirname(b);
let t;
c.commandLine.appendSwitch("enable-experimental-web-platform-features");
c.commandLine.appendSwitch("enable-web-bluetooth");
function w() {
  t = new p({
    width: 1024,
    height: 768,
    autoHideMenuBar: !0,
    webPreferences: {
      preload: m.join(u, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      webSecurity: !0,
      experimentalFeatures: !0
    }
  });
  let r, e = null, s = "";
  l.on("set-auto-select-device", (n, o) => {
    s = o, setTimeout(() => {
      s = "";
    }, 45e3);
  }), t.webContents.on("select-bluetooth-device", (n, o, d) => {
    if (n.preventDefault(), r = d, s) {
      const a = o.find(
        (i) => i.deviceId.toLowerCase() === s.toLowerCase() || i.deviceName && i.deviceName.toLowerCase() === s.toLowerCase()
      );
      if (a) {
        s = "", e && !e.isDestroyed() && (e.close(), e = null);
        try {
          d(a.deviceId);
        } catch (i) {
          console.error("Bluetooth callback error:", i);
        }
        return;
      }
    }
    e || (e = new p({
      parent: t,
      modal: !0,
      width: 450,
      height: 600,
      title: "ASTRA",
      autoHideMenuBar: !0,
      webPreferences: {
        nodeIntegration: !0,
        contextIsolation: !1
      }
    }), l.removeAllListeners("device-selected"), l.once("device-selected", (i, f) => {
      if (r) {
        try {
          r(f);
        } catch (v) {
          console.error("Bluetooth callback error:", v);
        }
        r = null;
      }
      e && !e.isDestroyed() && e.close();
    }), e.on("closed", () => {
      if (e = null, r) {
        try {
          r("");
        } catch (i) {
          console.error("Bluetooth callback error:", i);
        }
        r = null;
      }
    }), e.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: white; padding: 20px; }
            h2 { font-weight: 500; font-size: 1.2rem; border-bottom: 1px solid #334155; padding-bottom: 10px; margin-top: 0; }
            .device { padding: 12px; border: 1px solid #334155; margin-bottom: 8px; cursor: pointer; border-radius: 8px; background: #1e293b; transition: all 0.2s;}
            .device:hover { background: #2563eb; border-color: #3b82f6; }
            .name { font-weight: bold; font-size: 14px; }
            .id { font-size: 11px; color: #94a3b8; display: block; margin-top: 4px; }
            .device:hover .id { color: #dbeafe; }
          </style>
        </head>
        <body>
          <h2>Select a Bluetooth Device</h2>
          <div id="list">Scanning for devices...</div>
          <script>
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('devices', (e, devices) => {
              const list = document.getElementById('list');
              
              if (devices.length === 0) {
                list.innerHTML = 'Scanning for devices...';
                return;
              }
              if (list.innerHTML === 'Scanning for devices...') {
                list.innerHTML = '';
              }
              
              devices.forEach(d => {
                const safeId = 'dev_' + d.deviceId.replace(/[^a-zA-Z0-9]/g, '');
                if (!document.getElementById(safeId)) {
                  const div = document.createElement('div');
                  div.id = safeId;
                  div.className = 'device';
                  div.innerHTML = '<span class="name">' + (d.deviceName || 'Unknown Device') + '</span><span class="id">' + d.deviceId + '</span>';
                  div.onclick = () => {
                    ipcRenderer.send('device-selected', d.deviceId);
                  };
                  list.appendChild(div);
                }
              });
            });
          <\/script>
        </body>
        </html>
      `))), e && !e.isDestroyed() && e.webContents.send("devices", o);
  }), l.handle("send-configuration", async (n, o, d) => {
    try {
      const { bleService: a } = require("../../ble/service.ts");
    } catch {
    }
    return { success: !1, message: "Not implemented in IPC" };
  }), t.webContents.session.setBluetoothPairingHandler((n, o) => {
    o({
      pin: "0000",
      accept: !0
    });
  }), t.webContents.session.setPermissionCheckHandler((n, o) => !0), t.webContents.session.setPermissionRequestHandler((n, o, d) => {
    d(!0);
  }), t.webContents.session.setDevicePermissionHandler((n) => n.deviceType === "bluetooth"), process.env.VITE_DEV_SERVER_URL ? (t.loadURL(process.env.VITE_DEV_SERVER_URL), t.webContents.openDevTools()) : t.loadFile(m.join(u, "../dist/index.html"));
}
c.whenReady().then(w);
c.on("window-all-closed", () => {
  process.platform !== "darwin" && c.quit();
});
