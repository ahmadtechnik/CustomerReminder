var {
    app,
    ipcMain,
    Menu,
    BrowserWindow
} = require("electron");


app.on("ready", appOnReady)

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

    MainWindow.loadFile("./views/index.html");
    MainWindow.on("close", WindowOnClose)
}
//
function WindowOnClose(thisWindow) {
    thisWindow = null;
    console.log("Window Closed");
}