const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("IDEAZ_DESKTOP", Object.freeze({
  isDesktop: true,
  platform: process.platform,
  version: "1.0.0"
}));
