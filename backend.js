/*
	Global Settings
*/
const path = require('path'),
    url = require('url'),
    nets = require('net'),
    jetpack = require('fs-jetpack'),
    electron = require('electron'),
    app = electron.app;
var colors = require('colors'),
    fs = require('fs'),
    node_ssh = require('node-ssh'),
    request = require('request'),
    await = require('await'),
    needle = require('needle'),
    async = require('neo-async'),
    fullpath = app.getPath("appData"),
    stringify = require('json-stable-stringify'),
    net = require('net'),
    pid = false,
    workerObject = {},
    taskObject = [],
    globalToken = "",
    globalGroup = "",
    syncSUMNum = 0,
    syncSSHNum = 0,
    dummySSHNUM = 0,
    syncTCPNum = 0,
    syncHTTPNum = 0,
    doneSSHNum = 0,
    doneTCPNum = 0,
    doneHTTPNum = 0,
    totalSYNCWorker = 0;

const GLOBAL = {
    "api_endpoint": "https://api.minerstat.com/v2",
    "api_main": "worker.php?token={TOKEN}&group={GROUP}&filter=asic&node=1",
    "api_config": "set_asic_config.php",
    "sync_server": "static.minerstat.farm",
    "sync_port": 1337,
    "ssh_folder": "/tmp",
    "ssh_reboot": "/sbin/reboot -f",
    "ssh_shutdown": "/sbin/shutdown -h now"
};
const ASIC_DEVICE = {
    "antminer": {
        "tcp": true,
        "tcp_port": 4028,
        "tcp_command": "summary+pools+devs",
        "ssh": true,
        "ssh_command": "cgminer-api stats; cgminer-api pools; bmminer-api stats; bmminer-api pools; ",
        "config_supported": true,
        "config_fetch": "cat cgminer.conf; cat bmminer.conf;",
        "config_update": "wget -O config.conf 'http://static.minerstat.farm/proxy.php?token={TOKEN}&worker={WORKER}' && sleep 3 && rm bmminer.conf; rm cgminer.conf; cp config.conf bmminer.conf; cp config.conf cgminer.conf; rm config.conf; sleep 1; echo done && /sbin/reboot",
        "config_location": "/config",
        "http": false
    },
    "baikal": {
        "tcp": false,
        "ssh": true,
        "ssh_command": "wget -O - https://api.minerstat.com/baikal/{TOKEN}.{WORKER}.sh | bash; ",
        "config_supported": true,
        "config_fetch": "cat miner.conf",
        "config_update": "rm miner.conf; wget -O miner.conf 'http://static.minerstat.farm/proxy.php?token={TOKEN}&worker={WORKER}' && sleep 3 && echo done && /sbin/reboot",
        "config_location": "/opt/scripta/etc",
        "http": false
    },
    "dragonmint": {
        "tcp": false,
        "ssh": false,
        "http": true,
        "http_url": "/api/summary",
        "http_auth": true,
        "http_auth_type": "base64",
        "config_supported": false,
	"config_location": "/tmp"
    }
};
/*
	Global FUNCTIONS
*/
function getDateTime() {
    var date = new Date(),
        hour = date.getHours(),
        min = date.getMinutes(),
        sec = date.getSeconds();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;
    return hour + ":" + min + ":" + sec;
}
// RESTART NODE
function restartNode() {
    setTimeout(function() {
        pid = false;
    }, 5 * 1000);
}
// UPDATE USER INTERFACE
function updateStatus(connection, status) {
    var o = {} // empty Object
    o["status"] = [];
    var data = {
        internet: connection,
        status: status
    };
    o["status"].push(data);
    jetpack.write(fullpath + '/user.json', JSON.stringify(o));
}
// VALIDATE INTERNET CONNECTION
function checkConnection() {
    require('dns').resolve(GLOBAL["sync_server"], function(err) {
        if (err) {
            // Start New Round after 10 sec idle
            console.log(colors.red("[%s] NODE => Connection problems."), getDateTime());
            console.log(colors.red("[%s] ERROR => %s"), getDateTime(), err);
            updateStatus(false, "Waiting for connection..");
            restartNode();
        } else {
            pid = true;
            console.log(colors.green("[%s] NODE => Connected !"), getDateTime());
            checkLogin();
        }
    });
}
// GET LOGIN INFORMATION
function checkLogin() {
    if (!fs.existsSync(fullpath + "/login.json")) {
        console.log("[%s] Round skipped, no user details.", getDateTime());
        restartNode();
    } else {
        const data = jetpack.read(fullpath + '/login.json');
        var json_login = data.toString(),
            proc = JSON.parse(json_login),
            login_token = proc["login"][0]["token"],
            login_group = proc["login"][0]["group"];
        console.log("[%s] TOKEN => %s {GROUP: %s}", getDateTime(), login_token, login_group);
        listWorkers(login_token, login_group);
    }
}
// IF KEY MATCH, TRY TO LIST ALL WORKERS
function listWorkers(login_token, login_group) {
    // SET LOGIN DETAILS FOR GLOBAL USAGE
    globalToken = login_token;
    globalGroup = login_group;
    request.get({
        url: GLOBAL["api_endpoint"] + "/" + GLOBAL["api_main"].replace("{TOKEN}", login_token).replace("{GROUP}", login_group),
        form: {
            node: "asic"
        }
    }, function(error, response, body) {
        if (error != null) {
            console.log("[%s] ERROR => %s", getDateTime(), error);
            restartNode();
        } else {
            var json_string = response.body;
            if (json_string.indexOf("asic") > -1) {
                var workerObject = {},
                    obj = JSON.parse(json_string),
                    total_worker = Object.keys(obj).length,
                	current_worker = 0;
                // FRONTEND
                jetpack.write(fullpath + '/api.json', json_string);
                updateStatus(true, "Sync in progress..");
                // BACKEND
                workerObject["list"] = [];
                taskObject = [];
                for (var id in obj) {
                	current_worker ++;
                    var worker = id;
                    var accesskey = obj[worker].info.token,
                        ip_address = obj[worker].info.os.localip,
                        type = obj[worker].info.system,
                        login = obj[worker].info.auth.user,
                        passw = obj[worker].info.auth.pass,
                        remotecommand = obj[worker].info.cmd,
                        isconfig = obj[worker].info.config;
                        syncSUMNum = 0;
        				syncSSHNum = 0;
        				dummySSHNum = 0;
        				syncTCPNum = 0;
        				syncHTTPNum = 0;
        				doneSSHNum = 0;
        				doneTCPNum = 0;
        				doneHTTPNum = 0;
                    // SEND FOR ASYNC PROCESSING
                    workerPreProcess(accesskey, worker, ip_address, type, login, passw, remotecommand, isconfig, current_worker, total_worker);
                }
            } else {
                restartNode();
                console.log("[%s] ERROR => %s", getDateTime(), error);
                try {
                    if (body.indexOf("error")) {
                        console.log("[%s] REASON =>  %s", getDateTime(), JSON.parse(body).error);
                    }
                } catch (err) {}
            }
        }
    })
}
// Worker PRE-Processing
async function workerPreProcess(token, worker, workerIP, workerType, sshLogin, sshPass, remoteCMD, isConfig, current_worker, total_worker) {
    var preData = {
        token: "" + token,
        worker: "" + worker,
        workerIP: "" + workerIP,
        workerType: "" + workerType,
        sshLogin: "" + sshLogin,
        sshPass: "" + sshPass,
        remoteCMD: "" + remoteCMD,
        isConfig: "" + isConfig
    };
    taskObject.push(preData);
    console.log("[%s] List [%s/%s] => %s worker %s {%s} ›%s/%s‹", getDateTime(), current_worker, total_worker, workerType, worker, workerIP, sshLogin, sshPass);
    dummySSHNum = 0;
    doneSSHNum = 0;
    maxThread = 0;
    if (current_worker === total_worker) {
    	totalSYNCWorker = total_worker;
    	backgroundProcess(total_worker);
    }
}
// Background Process
async function backgroundProcess(total_worker) {
	if (maxThread >= totalSYNCWorker || maxThread == 0) {
    	maxThread = 4; // worker at once
    	var startThread = 0;
    }
    function bgListener() {
        if (Object.keys(taskObject).length > 0) {        	
            if (startThread < maxThread && maxThread != 0) {
            	startThread ++;
                var token = taskObject[0]["token"],
                    worker = taskObject[0]["worker"],
                    workerIP = taskObject[0]["workerIP"],
                    workerType = taskObject[0]["workerType"],
                    sshLogin = taskObject[0]["sshLogin"],
                    sshPass = taskObject[0]["sshPass"],
                    remoteCMD = taskObject[0]["remoteCMD"],
                    isConfig = taskObject[0]["isConfig"];
                taskObject.splice(0, 1);
                workerProcess(token, worker, workerIP, workerType, sshLogin, sshPass, remoteCMD, isConfig);
            }
            //console.log(dummySSHNum + "" + doneSSHNum);
            if (dummySSHNum === doneSSHNum && doneSSHNum != 0)  {
            	 maxThread ++;
            }
        } else {
            clearInterval(bgListener);
        }
    }
    setInterval(bgListener, 1 * 100);
}
// Remote Command Processing
function convertCommand(remoteCMD, token, worker, workerType) {
    console.log(colors.yellow("[%s] Remote command => %s {%s}"), getDateTime(), worker, remoteCMD);
    switch (remoteCMD) {
        case 'REBOOT':
            return GLOBAL["ssh_reboot"];
            break;
        case 'SHUTDOWN':
            return GLOBAL["ssh_shutdown"];
            break;
        case 'CONFIG':
            return ASIC_DEVICE[workerType].config_update.replace("{TOKEN}", globalToken).replace("{WORKER}", worker);
            break;
    }
}
// Worker Processing 
async function workerProcess(token, worker, workerIP, workerType, sshLogin, sshPass, remoteCMD, isConfig) {
    syncSUMNum++; // +1 worker to sync statistics
    var isTCP = ASIC_DEVICE[workerType].tcp,
        isSSH = ASIC_DEVICE[workerType].ssh,
        isHTTP = ASIC_DEVICE[workerType].http,
        sshCommand = "";
    if (isTCP === true) {
        syncTCPNum++; // +1 TCP to statistics
        var tcpResponse = await fetchTCP(worker, workerIP, workerType);
    }
    if (isSSH === true) {
        syncSSHNum++; // +1 SSH to statistics
        dummySSHNum++ // fake for background processing
        var forceConfig = false;
        // CHECK CONFIG EDITOR IS EMPY OR NOT
        // IF EMPTY FIRST PUSH ACTUAL CONFIG TO THE SERVER
        if (isConfig == false && ASIC_DEVICE[workerType].config_supported == true) {
            sshCommand = ASIC_DEVICE[workerType].config_fetch;
            forceConfig = true;
        } else {
            sshCommand = ASIC_DEVICE[workerType].ssh_command.replace("{TOKEN}", globalToken).replace("{WORKER}", worker);
        }
        if (remoteCMD) {
            sshCommand += convertCommand(remoteCMD, token, worker, workerType);
        }
        var sshResponse = await fetchSSH(worker, workerIP, workerType, sshLogin, sshPass, sshCommand, isConfig, true, forceConfig, remoteCMD);
    }
    if (isHTTP === true) {
        syncHTTPNum++; // +1 HTTP to statistics
        var httpResponse = await fetchHTTP(worker, workerIP, workerType, sshLogin, sshPass);
    }
    // LOOK AFTER REMOTE COMMANDS 
    // ONLY WHERE NO SSH SYNC NEEDED
    if (isSSH === false) {
        if (remoteCMD) {
            sshCommand += convertCommand(remoteCMD, token, worker, workerType);
            var sshResponse = await fetchSSH(worker, workerIP, workerType, sshLogin, sshPass, sshCommand, isConfig, false, forceConfig, remoteCMD);
        }
    }
}
// TCP API
async function fetchTCP(worker, workerIP, workerType) {
    var response,
        check = 0;
    const nets = require('net'),
        clients = nets.createConnection({
            host: workerIP,
            port: ASIC_DEVICE[workerType].tcp_port
        }, () => {
            clients.write(ASIC_DEVICE[workerType].tcp_command);
            console.log("[%s] Fetching TCP => %s {%s}", getDateTime(), worker, workerIP);
        });
    clients.on('end', () => {
        if (check === 0) {
            apiCallback(worker, "tcp", response);
            check = 1;
        }
        clients.end(); // close connection
    });
    setTimeout(function() {
        if (check === 0) {
            apiCallback(worker, "tcp", "timeout");
            clients.end(); // close connection
        }
    }, 10 * 1000);
    clients.on('data', (data) => {
        response += data.toString();
    });
    return response;
}
// SSH API & CONTROL
async function fetchSSH(worker, workerIP, workerType, sshLogin, sshPass, sshCommand, isConfig, isCallback, forceConfig, remoteCMD) {
    console.log("[%s] Fetching SSH => %s {%s}", getDateTime(), worker, workerIP);
    var ssh2 = new node_ssh();
    if (remoteCMD) {
    	setTimeout(function() {
            apiCallback(worker, "ssh", "skip sync due remote command");
        }, 30 * 1000);
    }
    ssh2.connect({
        host: workerIP,
        username: sshLogin,
        password: sshPass,
        readyTimeout: 30 * 1000
    }).then(function() {
        ssh2.execCommand(sshCommand, {
            cwd: ASIC_DEVICE[workerType].config_location
        }).then(function(result) {
            response = result.stdout;
            response = response.trim();
            if (isCallback == true && forceConfig == false && !remoteCMD) {
                apiCallback(worker, "ssh", response);
            }
            if (forceConfig == true && isConfig == false) {
            console.log(colors.yellow("[%s] Config => %s {%s} - Upload config to 'Config Editor'"), getDateTime(), worker, workerIP);
                var headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
                // Configure the request
                var options = {
                    url: GLOBAL["api_endpoint"] + "/" + GLOBAL["api_config"],
                    method: 'POST',
                    headers: headers,
                    form: {
                        'node': response,
                        'token': globalToken,
                        'worker': worker
                    }
                }
                // Start the request
                request(options, function(error, response, body) {
                    if (!error) {
                        apiCallback(worker, "ssh", "config edit done");
                        console.log(colors.green("[%s] Config => %s {%s} - Done"), getDateTime(), worker, workerIP);
                    } else {
                    	apiCallback(worker, "ssh", "config edit server error");
                    	console.log(colors.red("[%s] Error => %s {%s} - %s"), getDateTime(), worker, workerIP, error);
                    }
                })
            }
        }).catch((error) => {
            console.log(colors.red("[%s] Error => %s {%s} ›%s/%s‹"), getDateTime(), worker, workerIP, sshLogin, sshPass);
            console.log(colors.red(error));
            if (isCallback == true && forceConfig == false && !remoteCMD) {
                apiCallback(worker, "ssh", "bad password");
            }
            if (forceConfig == true && isConfig == false) {
            	apiCallback(worker, "ssh", "config edit error bad password");
                console.log(colors.red("[%s] Error => %s {%s} - Config update failed due bad ssh password"), getDateTime(), worker, workerIP);
            }
        });
    }).catch((error) => {
        console.log(colors.red("[%s] Error => %s {%s} ›%s/%s‹"), getDateTime(), worker, workerIP, sshLogin, sshPass);
        console.log(colors.red(error));
        if (isCallback == true && forceConfig == false && !remoteCMD) {
            apiCallback(worker, "ssh", "timeout");
        }
        if (forceConfig == true && isConfig == false) {
        	apiCallback(worker, "ssh", "config edit timeout");
            console.log(colors.red("[%s] Error => %s {%s} - Config update failed due Timeout"), getDateTime(), worker, workerIP);
        }
    });
}
// HTTP API 
async function fetchHTTP(worker, workerIP, workerType, httpLogin, httpPass) {
    request({
        url: "http://" + workerIP + ASIC_DEVICE[workerType].http_url,
        headers: {
            "Authorization": "Basic " + new Buffer(httpLogin + ":" + httpPass).toString(ASIC_DEVICE[workerType].http_auth_type)
        }
    }, function(error, response, body) {
        apiCallback(worker, "http", body);
    });
}
// CALLBACK
async function apiCallback(worker, callbackType, workerData) {
    // Progress Callback Data
    var callbackName = callbackType + "_response",
        parseWorkerData = "";
    if (callbackType != "http") {
        parseWorkerData = workerData.replace(/[^a-zA-Z0-9,=_;.: ]/g, "");
    } else {
        parseWorkerData = workerData;
        callbackName = "tcp";
    }
    if (typeof workerObject[worker] == "undefined") {
        workerObject[worker] = [];
        workerObject[worker].push({});
        workerObject[worker][0]["token"] = globalToken;
        workerObject[worker][0][callbackName] = parseWorkerData;
        // just in case
        if (typeof workerObject["list"] == "undefined") {
            workerObject["list"] = [];
            workerObject["list"].push(worker);
        } else {
            workerObject["list"].push(worker);
        }
    } else {
        workerObject[worker][0][callbackName] = parseWorkerData;
    }
    // CALCULATE SYNC PROGRESS in %
    switch (callbackType) {
        case 'ssh':
            doneSSHNum++;
            break;
        case 'tcp':
            doneTCPNum++;
            break;
        case 'http':
            doneHTTPNum++;
            break;
    }
    var syncTotalVal = syncSSHNum + syncTCPNum + syncHTTPNum;
    syncDoneVal = doneSSHNum + doneTCPNum + doneHTTPNum;
    syncPercent = ((syncDoneVal) / (syncTotalVal) * 100);
    // DISPLAY PROGRESS, if done push to the server
    console.log("[%s] Progress {%s%} => Total: %s worker, SSH: %s/%s TCP: %s/%s HTTP: %s/%s", getDateTime(), parseInt(syncPercent), syncSUMNum, doneSSHNum, syncSSHNum, doneTCPNum, syncTCPNum, doneHTTPNum, syncHTTPNum);
    
    if (parseInt(syncPercent) === 100 && totalSYNCWorker == syncSUMNum) {
        //console.log(workerObject);
        var jsons = stringify(workerObject).replace(/\\/g, ''),
            client = new net.Socket();
        client.connect(GLOBAL["sync_port"], GLOBAL["sync_server"], function() {
            console.log("[%s] Connected to sync server", getDateTime());
            client.write(jsons);
        });
        client.on('data', function(data) {
            console.log("[%s] SYNC ID =>  %s", getDateTime(), data);
            console.log("");
            console.log(colors.cyan("/*/*/*/*/*/*/*/*/*/*/*/*/*/*/"));
            console.log(colors.cyan("[%s] Waiting for the next sync round."), getDateTime());
            console.log(colors.cyan("/*/*/*/*/*/*/*/*/*/*/*/*/*/*/"));
            console.log("");
            // keep connection for at least 8 seconds.
            setTimeout(function() {
                client.destroy(); // kill client after server's response
            }, 30 * 1000);
        });
        updateStatus(true, "Waiting for the next sync round.");
        // Start New Round after 35 + 5 (40) sec idle
        setTimeout(function() {
            restartNode();
        }, 35 * 1000);
    }
}
/*
	CORE
*/
// Export
module.exports = {
    workersRefresh: function() {
        function globalPID() {
            if (pid == false) {
                pid = true;
                checkConnection();
            }
        }
        setInterval(globalPID, 1 * 1000);
    }
}
