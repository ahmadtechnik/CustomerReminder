var {
    app,
    ipcMain,
    Menu,
    BrowserWindow
} = require("electron");
var path = require("path");
var mac = require("getmac");
app.on("ready", appOnReady);
app.on("before-quit", () => {

});

var MainWindow;
//
function appOnReady() {
    MainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }

    });
    mac.getMac((err, macAddress) => {
        if (err) alert("COULD NOT GET MAC ADDRESS...");
        console.log(macAddress)
        MainWindow.webContents.setUserAgent("CostumerReminder");
        MainWindow.loadFile("./views/index.html");
        MainWindow.on("close", WindowOnClose)

        // emit the mac address to render window
        MainWindow.webContents.on("did-finish-load", () => {
            MainWindow.webContents.send("MAC_"  , macAddress);
        })

    })

}
//
function WindowOnClose(thisWindow) {
    thisWindow = null;
    console.log("Window Closed");
}

/** BACKGROUND SERVICE ACTION */



/*
var childProcess = require('child_process');

function runScript(scriptPath, callback) {

    // keep track of whether callback has been invoked to prevent multiple invocations
    var invoked = false;

    var process = childProcess.fork(scriptPath);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });

}

// Now we can run a script and invoke a callback when complete, e.g.
runScript('./BGP.js &', function (err) {
    if (err) throw err;
    console.log('finished running some-script.js');
});
*/