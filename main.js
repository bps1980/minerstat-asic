/*
	DEPENDENCIES
*/
var async = require('neo-async'),
	backend = require('./backend'),
	colors = require('colors'),
	exec = require('child_process').exec,
	fs = require('fs'),
	lasterror = new Date,
	request = require('request'),
	node_ssh = require('node-ssh'),
	ssh2 = new node_ssh();
const nets = require('net'),
	  path = require('path'),
	  url = require('url'),
	  jetpack = require('fs-jetpack');
/*
	ELECTRON
*/
const electron = require('electron'),
	  app = electron.app,
      BrowserWindow = electron.BrowserWindow,
      fullpath = app.getPath("appData");
/*
	ERROR HANDLING
*/
let mainWindow
process.on('uncaughtException', function(err) {
    console.log(colors.grey('NOTICE => %s'), err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.log(colors.grey('WARNING => %s %s'), reason.stack);
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
function restart() {
    app.relaunch()
    app.exit()
}
/*
	Core
*/
module.exports = {
    sync: function() {
        setTimeout(function() {
            backend.workersRefresh();
        }, 1 * 1000);
    }
}