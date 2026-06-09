const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      experimentalFeatures: true
    }
  });

  // Enable Bluetooth Permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'bluetooth' || permission === 'bluetoothScanning') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Handle Bluetooth Device Selection
  let latestDevices = [];
  let selectTimeout = null;

  win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    latestDevices = deviceList;

    // Find a matching BMS device (case-insensitive check for common BMS names)
    const bmsDevice = deviceList.find(d => {
      const name = (d.deviceName || '').toUpperCase();
      return name.includes('JBD') || name.includes('BMS') || name.includes('RCL') || name.includes('XIAOXIANG') || name.includes('SMART');
    });

    if (bmsDevice) {
      if (selectTimeout) {
        clearTimeout(selectTimeout);
        selectTimeout = null;
      }
      try { callback(bmsDevice.deviceId); } catch (e) {}
      return;
    }

    // Set a timeout to select the first device if no BMS is found after 6 seconds of scanning
    if (!selectTimeout) {
      selectTimeout = setTimeout(() => {
        selectTimeout = null;
        if (latestDevices.length > 0) {
          try { callback(latestDevices[0].deviceId); } catch (e) {}
        } else {
          try { callback(''); } catch (e) {} // Cancel selection if no devices are found
        }
      }, 6000);
    }
  });

  win.loadFile(path.join(__dirname, 'dist/index.html'));
}

app.whenReady().then(createWindow);