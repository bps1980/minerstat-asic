/*
	DEPENDENCIES
*/
var async = require('neo-async');
var backend = require('./backend');
var colors = require('colors');
var exec = require('child_process').exec
var fs = require('fs');
var lasterror = new Date;
var request = require('request');
const nets = require('net');
var node_ssh = require('node-ssh');
const path = require('path');
const url = require('url');
var ssh2 = new node_ssh();
const jetpack = require('fs-jetpack');
/*
	ELECTRON
*/
const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow // Module to create native browser window.
var fullpath = app.getPath("appData");
/*
	ERROR HANDLING
*/
let mainWindow
process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
})

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        maxWidth: 1024,
        maxHeight: 768,
        minWidth: 1024,
        minHeight: 768,
        frame: false,
        "fullscreen": false,
        "kiosk": false,
        "resizable": false,
        "web-preferences": {
            "web-security": false
        },
        icon: path.join(__dirname, 'asset/96x96.png')
    })
    // Show Debug Tools
    //mainWindow.webContents.openDevTools()
    // and load the index.html for minerstat.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'www/index.html'),
        protocol: 'file:',
        slashes: true
    }))
    // reload the window when crashed.
    mainWindow.webContents.on('crashed', () => {
        mainWindow.reload();
    });
    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)
// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    //if (process.platform !== 'darwin') {
    app.quit()
    //}
})
app.on('browser-window-created', function(e, window) {
    window.setMenu(null);
});
app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})
/*
	BACKEND
*/
setTimeout(function() {
    backend.workersRefresh();
}, 1 * 1000);
/*
	Error Handling
*/
setTimeout(function() {
    restart();
}, 60 * 1000 * 30); // every 30 minutes (2x a hour)
// Why important to restart the application every 20 minutes?
function restart() {
    app.relaunch()
    app.exit()
}
// SSH dependency without additional reason stop working after a few hour.
// To we make sure everything will work correctly, the software restart itself every hour 3x.
module.exports = {
    sync: function() {
        setTimeout(function() {
            backend.workersRefresh();
        }, 1 * 1000);
    }
}