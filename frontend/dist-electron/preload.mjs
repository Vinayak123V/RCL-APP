"use strict";const e=require("electron");e.contextBridge.exposeInMainWorld("electronApp",{setAutoSelectDevice:t=>e.ipcRenderer.send("set-auto-select-device",t)});
