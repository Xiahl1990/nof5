"use strict";

var _ = require("underscore"),
    getConfig = require("./getConfig.js"),
    getTestRunner = require("./getTestRunner.js"),
    startExpressServer = require("./startExpressServer.js"),
    startSocketIOServer = require("./startSocketIOServer.js"),
    DirectoryMasterWatcher = require("./DirectoryMasterWatcher.js");

function start() {

    var config = getConfig(),

        modulePath = config.modulePath,
        testRunnerSuite = config.testRunnerSuite,
        assertionSuitePath = config.assertionSuite,
        useBrowserify = config.useBrowserify,
        port = config.port,

        testRunner,
        expressServer,
        socketIOServer,

        f5Emitter = [],

        dMaster = new DirectoryMasterWatcher(modulePath);

    /**
     * @param {*} socket
     * @return {Function}
     */
    function getNewChangeListener(socket) {
        return function emitF5() {
            console.log("re-running tests");
            socket.emit("f5");
        };
    }

    /**
     * @param {*} socket
     * @return {Object}
     */
    function getF5EmitterCallback(socket) {

        var emitterData;

        function find(object) {
            return (object.socket = socket);
        }

        emitterData = _.find(f5Emitter);
        return emitterData.callback;
    }

    /**
     * @param {*} socket
     */
    function onSocketConnect(socket) {

        var f5EmitterIndex;

        /*
        function emitF5() {
            console.log("re-running tests");
            socket.emit("f5");
        }
        */

        f5EmitterIndex = f5Emitter.push({
            "socket": socket,
            "callback": getNewChangeListener(socket)
        }) - 1;

        //dMaster.addOnDirChange(emitF5);
        dMaster.on("change", f5Emitter[f5EmitterIndex].callback);
    }

    /**
     * @param {*} socket
     */
    function onSocketDisconnect(socket) {

        var listener = getF5EmitterCallback(socket);

        dMaster.removeListener("change", listener);
    }

    //Create the testRunner
    testRunner = getTestRunner(modulePath, testRunnerSuite, assertionSuitePath, useBrowserify);

    //Create the expressServer
    expressServer = startExpressServer.start(modulePath, testRunner, port);

    //Create the socketIOServer
    socketIOServer = startSocketIOServer.start(expressServer, onSocketConnect, onSocketDisconnect);
}

exports.start = start;