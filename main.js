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
    jetpack = require('fs-jetpack'),
	electron = require('electron'),
    app = electron.app,
    fullpath = app.getPath("appData");

/*
	ERROR HANDLING
*/
function restart() {
    app.relaunch()
    app.exit()
}
process.on('uncaughtException', function(err) {
    console.log(colors.grey('NOTICE => %s'), err);
    // This is only for Ubuntu / Linux
    // Read about: ulimit -n
    if (err.toString().includes("EMFILE")) {
    	console.log("SYSTEM ERROR => Please set ulimit -n (nofile) to unlimited.");
    	console.log("NODE => Restarting.. Max connection limit has been reached.");
    	restart();
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.log(colors.grey('WARNING => %s %s'), reason.stack);
})
if (process.argv.includes("logout")) {
    try {
        jetpack.remove(fullpath + '/login.json');
        jetpack.remove(fullpath + '/user.json');
        jetpack.remove(fullpath + '/api.json');
    } catch (e) {
        console.log(e.toString());
    }
}
/*
	ELECTRON (GUI)
*/
if (!process.argv.includes("console") && !process.argv.includes("logout")) {

	const BrowserWindow = electron.BrowserWindow,
          fullpath = app.getPath("appData");
    let   mainWindow;

    function createWindow() {
        // Create the browser window.
        mainWindow = new BrowserWindow({
            width: 640,
            height: 480,
            maxWidth: 640,
            maxHeight: 480,
            minWidth: 640,
            minHeight: 480,
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

}

/*
	BACKEND
*/
setTimeout(function() {
    backend.workersRefresh();
}, 1 * 1000);
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