const { app, BrowserWindow, Menu, Tray, nativeImage, shell, session } = require("electron");
const path = require("path");

const APP_URL = "https://ideaz-messenger.bonto.run/chat";
let mainWindow;
let tray;
let quitting = false;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5147ed"/><stop offset="1" stop-color="#079cc5"/></linearGradient></defs><rect width="256" height="256" rx="60" fill="url(#g)"/><text x="128" y="158" text-anchor="middle" font-family="Arial" font-size="104" font-weight="700" fill="white">IZ</text></svg>`;
const appIcon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`);

function showWindow() {
  if (!mainWindow) return createWindow();
  mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 390,
    minHeight: 620,
    title: "IDEAZ Messenger",
    icon: appIcon,
    backgroundColor: "#07111f",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: true
    }
  });

  mainWindow.loadURL(APP_URL);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://ideaz-messenger.bonto.run")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("https://ideaz-messenger.bonto.run")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

function createTray() {
  tray = new Tray(appIcon.resize({ width: 32, height: 32 }));
  tray.setToolTip("IDEAZ Messenger — background mein active");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open IDEAZ Messenger", click: showWindow },
    { label: "Reload", click: () => mainWindow?.webContents.reload() },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on("double-click", showWindow);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", showWindow);
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(["media", "notifications", "display-capture", "fullscreen"].includes(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) =>
      ["media", "notifications", "display-capture", "fullscreen"].includes(permission)
    );
    createWindow();
    createTray();
    app.setAppUserModelId("com.ideaz.messenger");
  });
}

app.on("activate", showWindow);
app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => {});
