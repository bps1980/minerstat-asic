/*
	Global Settings
*/
const GLOBAL = {
    "api_endpoint": "https://api.minerstat.com/v2",
    "api_main": "worker.php?token={TOKEN}&group={GROUP}&filter=asic&node=1",
    "api_config": "set_asic_config.php",
    "sync_protocol": "wss",
    "sync_server": "minerstat.com",
    "sync_port": 2096,
    "sync_endpoint": "asic",
    "ssh_folder": "/tmp",
    "ssh_reboot": "/sbin/reboot -f",
    "ssh_shutdown": "/sbin/shutdown -h now"
};

const path = require('path'),
    url = require('url'),
    nets = require('net'),
    jetpack = require('fs-jetpack'),
    electron = require('electron'),
    WebSocket = require('ws'),
    app = electron.app;
    login_token = "",
    login_group = "";
var colors = require('colors'),
    fs = require('fs'),
    node_ssh = require('node-ssh'),
    request = require('request'),
    needle = require('needle'),
    stringify = require('json-stable-stringify'),
    net = require('net'),
    zlib = require('zlib'),
    escapeJSON = require('escape-json-node'),
    isJSON = require('is-json'),
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
    totalSYNCWorker = 0,
    maxThread = 6,
    fullpath = __dirname,
    client = new net.Socket();
    
    if (!process.argv.includes("headless")) {
    	fullpath = app.getPath("appData");
    }

const ASIC_DEVICE = {
    "antminer": {
        "tcp": false,
        "tcp_port": 4028,
        "tcp_command": "stats+pools",
        "ssh": true,
        "ssh_command": "echo '{\"command\":\"stats+summary+pools\"}' | nc 127.0.0.1 4028",
        "config_supported": true,
        "config_fetch": "rm bak.conf; cp bmminer.conf bak.conf;  cp cgminer.conf bak.conf; rm bmminer.conf; rm cgminer.conf; cat bak.conf; cp bak.conf cgminer.conf; cp bak.conf bmminer.conf;",
        "config_update": "mount -o remount,rw /; sleep 5; wget -O config.conf 'http://static.minerstat.farm/asicproxy.php?token={TOKEN}&worker={WORKER}&type=antminer' && sleep 3 && rm bmminer.conf; rm cgminer.conf; cp config.conf bmminer.conf; cp config.conf cgminer.conf; rm config.conf; sleep 1; /etc/init.d/cgminer.sh restart > /dev/null; /etc/init.d/bmminer.sh restart > /dev/null;",
        "config_location": "/config",
        "http": false
    },
    "baikal": {
        "tcp": false,
        "ssh": true,
        "ssh_command": "exec 3<>/dev/tcp/127.0.0.1/4028; echo '{\"command\":\"stats+summary+pools+devs\"}' 1>&3; RESPONSE=$(cat <&3); echo $RESPONSE;",
        "config_supported": true,
        "config_fetch": "cat miner.conf",
        "config_update": "mount -o remount,rw /; sleep 5; rm miner.conf; wget -O miner.conf 'http://static.minerstat.farm/asicproxy.php?token={TOKEN}&worker={WORKER}&type=baikal' && sleep 3 && /sbin/reboot > /dev/null",
        "config_location": "/opt/scripta/etc",
        "http": false
    },
    "dayun": {
        "tcp": false,
        "tcp_port": 4028,
        "tcp_command": "stats+pools",
        "ssh": true,
        "ssh_command": "echo '{\"command\":\"stats+summary+pools\"}' | nc 127.0.0.1 4028",
        "config_supported": true,
        "config_fetch": "cat cgminer.config;",
	    "config_update": "mount -o remount,rw /; sleep 5; rm cgminer.config; wget -O cgminer.config 'http://static.minerstat.farm/asicproxy.php?token={TOKEN}&worker={WORKER}&type=dayun' && sleep 3 && /sbin/reboot > /dev/null",
        "config_location": "/var/www/html/resources",
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
    },
    "innosilicon": {
        "tcp": true,
        "tcp_port": 4028,
        "tcp_command": "{\"command\":\"stats+summary+pools\"}",
        "ssh": false,
        "ssh_command": "echo '{\"command\":\"stats+summary+pools\"}' | nc 127.0.0.1 4028",
        "config_supported": true,
        "config_fetch": "cat cgminer.conf;",
        "config_update": "mount -o remount,rw /; sleep 5; wget -O config.conf 'http://static.minerstat.farm/asicproxy.php?token={TOKEN}&worker={WORKER}&type=innosilicon' && sleep 3 rm cgminer.conf; cp config.conf cgminer.conf; cp config.conf cgminer.conf; rm config.conf; sleep 1; rm /etc/cgminer.conf; cp cgminer.conf /etc; sleep 1; /sbin/reboot > /dev/null",
        "config_location": "/config",
        "http": false
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
function restartNode(reason) {
    if (reason == "001") {
        console.log("[%s] ERROR => SYNC Server is not reachable.", getDateTime());
    }
    if (reason == "002") {
        console.log("[%s] INFO => Disconnected from the sync server", getDateTime());
    }
    setTimeout(function() {
        pid = false;
    }, 5 * 1000);
}
// UPDATE USER INTERFACE
function updateStatus(connection, status) {
    if (!process.argv.includes("console") && !process.argv.includes("logout")) {
        try {
            var o = {} // empty Object
            o["status"] = [];
            var data = {
                internet: connection,
                status: status
            };
            o["status"].push(data);
            jetpack.write(fullpath + '/user.json', JSON.stringify(o));
        } catch (exception) {
            console.log("[%s] ERROR => %s", getDateTime(), exception);
        }
    }
}
// VALIDATE INTERNET CONNECTION
function checkConnection() {
    require('dns').resolve(GLOBAL["sync_server"], function(err) {
        if (err) {
            // Start New Round after 10 sec idle
            console.log(colors.red("[%s] NODE => Connection problems !"), getDateTime());
            console.log(colors.red("[%s] ERROR => %s"), getDateTime(), err);
            updateStatus(false, "Waiting for connection..");
            restartNode();
        } else {
            pid = true;
            console.log(colors.green("[%s] NODE => Internet available !"), getDateTime());
            checkLogin();
        }
    });
}
// GET LOGIN INFORMATION
function checkLogin() {
    if (!fs.existsSync(fullpath + "/login.json") && !login_token) {
        console.log("[%s] Round skipped, no user details.", getDateTime());
        if (process.argv.includes("console") || process.argv.includes("logout")) {
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            console.log("");
            console.log("Please, provide your login token below.");
            console.log("");

            rl.question('Login Token: ', (loginTokenSet) => {
                console.log("");
                console.log("If you want to monitor all asic worker => Enter: asic");
                console.log("If you want to monitor a group of asic => Enter your group name");
                console.log("");
                rl.close();
                const rL = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                rL.question('Group / Location (Default: asic) ', (loginGroupSet) => {
                    console.log("");
                    console.log("Thank you !");
                    console.log("To remove login details (re)start with ./minerstat logout");
                    var o = {} // empty Object
                    o["login"] = [];
                    var wlogin = loginTokenSet,
                        wgroup = loginGroupSet,
                        data = {
                            token: wlogin,
                            group: wgroup
                        };
                    o["login"].push(data);
                    jetpack.write(fullpath + "/login.json", JSON.stringify(o));
                    restartNode();
                    rL.close();
                });
            });


        } else {
            restartNode();
        }
    } else {
        if (!login_token) {
            try {
                const data = jetpack.read(fullpath + '/login.json');
                var json_login = data.toString(),
                    proc = JSON.parse(json_login);
                login_token = proc["login"][0]["token"],
                    login_group = proc["login"][0]["group"];
                if (!login_group) {
                    login_group = "asic";
                }
            } catch (exception) {
                console.log("[%s] ERROR => %s", getDateTime(), exception);
                restartNode();
            }
        }
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
                if (!process.argv.includes("console") && !process.argv.includes("logout")) {
                	try {
                	jetpack.write(fullpath + '/api.json', json_string);
                    updateStatus(true, "Sync in progress..");
                	} catch (exception) { }
                }
                // BACKEND
                workerObject["list"] = [];
                taskObject = [];
                for (var id in obj) {
                    current_worker++;
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
                    // SEND FOR  PROCESSING
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
 function workerPreProcess(token, worker, workerIP, workerType, sshLogin, sshPass, remoteCMD, isConfig, current_worker, total_worker) {
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
    console.log("[%s] List [%s/%s] => %s worker %s {%s} >%s/%s<", getDateTime(), current_worker, total_worker, workerType, worker, workerIP, sshLogin, sshPass);
    dummySSHNum = 0;
    doneSSHNum = 0;
    maxThread = 0;
    if (current_worker === total_worker) {
        totalSYNCWorker = total_worker;
        backgroundProcess(total_worker);
    }
}
// Background Process
 function backgroundProcess(total_worker) {

    function bgListener() {
        if (Object.keys(taskObject).length > 0) {
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
        } else {
            clearInterval(bgListener);
        }
    }
    setInterval(bgListener, 1 * 50);
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
            return ASIC_DEVICE[workerType].config_update.replace("{TOKEN}", token).replace("{WORKER}", worker);
            break;
    }
}
// Worker Processing 
 function workerProcess(token, worker, workerIP, workerType, sshLogin, sshPass, remoteCMD, isConfig) {
    syncSUMNum++; // +1 worker to sync statistics
    var isTCP = ASIC_DEVICE[workerType].tcp,
        isSSH = ASIC_DEVICE[workerType].ssh,
        isHTTP = ASIC_DEVICE[workerType].http,
        sshCommand = "";
    if (isTCP === true) {
        syncTCPNum++; // +1 TCP to statistics
        var tcpResponse =  fetchTCP(worker, workerIP, workerType, token);
    }
    if (isSSH === true) {
        syncSSHNum++; // +1 SSH to statistics
        dummySSHNum++ // fake for background processing
        var forceConfig = false;
        // CHECK CONFIG EDITOR IS EMPY OR NOT
        // IF EMPTY FIRST PUSH ACTUAL CONFIG TO THE SERVER
        if (isConfig.toString() === "false" && ASIC_DEVICE[workerType].config_supported.toString() == "true") {
            sshCommand = ASIC_DEVICE[workerType].config_fetch;
            forceConfig = true;
            //remoteCMD = "CONFIG";
        } else {
            sshCommand = ASIC_DEVICE[workerType].ssh_command.replace("{TOKEN}", token).replace("{WORKER}", worker);
        }
        if (remoteCMD) {
            sshCommand += convertCommand(remoteCMD, token, worker, workerType);
        }
        var sshResponse =  fetchSSH(worker, workerIP, workerType, sshLogin, sshPass, sshCommand, isConfig, true, forceConfig, remoteCMD, token);
    }
    if (isHTTP === true) {
        syncHTTPNum++; // +1 HTTP to statistics
        var httpResponse =  fetchHTTP(worker, workerIP, workerType, sshLogin, sshPass, token);
    }
    // LOOK AFTER REMOTE COMMANDS 
    // ONLY WHERE NO SSH SYNC NEEDED
    if (isSSH === false) {
    	if (isConfig.toString() === "false" && ASIC_DEVICE[workerType].config_supported.toString() == "true") {
            sshCommand = ASIC_DEVICE[workerType].config_fetch;
            forceConfig = true;
        } else {
            sshCommand = ASIC_DEVICE[workerType].ssh_command.replace("{TOKEN}", token).replace("{WORKER}", worker);
        }
        if (remoteCMD) {
            sshCommand += convertCommand(remoteCMD, token, worker, workerType);
        }
        if (remoteCMD || forceConfig) {
        	syncSSHNum++; // +1 SSH to statistics
       		dummySSHNum++ // fake for background processing
        	var sshResponse =  fetchSSH(worker, workerIP, workerType, sshLogin, sshPass, sshCommand, isConfig, false, forceConfig, remoteCMD, token);
    	}
    }
}
// TCP API
 function fetchTCP(worker, workerIP, workerType, token) {
    var response,
        check = 0;
    const nets = require('net');
    var   clients = nets.createConnection({
            host: workerIP,
            port: ASIC_DEVICE[workerType].tcp_port
        }, () => {
            clients.write(ASIC_DEVICE[workerType].tcp_command);
            console.log("[%s] Fetching TCP => %s {%s}", getDateTime(), worker, workerIP);
        });
    clients.setTimeout(10 * 1000);
    clients.on('timeout', () => {
    	try {
        	clients.destroy();
        	clients.end(); // close connection
        } catch (exception) { }
    });
    clients.on('data', (data) => {
    	check = 1;
        response += data.toString();
    });
    clients.on('close', () => {
    if (check == 0) { response = "timeout"; }
	    apiCallback(worker, "tcp", response, workerType, token);
    });
    clients.on('error', (exception) => {});
    clients.on('end', () => {
        try {
        clients.destroy();
        clients.end(); // close connection
        } catch (exception) { }
    });
    return response;
}
// SSH API & CONTROL
 function fetchSSH(worker, workerIP, workerType, sshLogin, sshPass, sshCommand, isConfig, isCallback, forceConfig, remoteCMD, token) {
    console.log("[%s] Fetching SSH => %s {%s}", getDateTime(), worker, workerIP);
    var ssh2 = new node_ssh(),
        sshFolder = "/tmp";
    // Protection in case config_location missing
    try {
        sshFolder = ASIC_DEVICE[workerType].config_location;
    } catch (err) {
        sshFolder = "/tmp";
    }
    if (remoteCMD) {
        setTimeout(function() {
            apiCallback(worker, "ssh", "skip sync due remote command", workerType, token);
        }, 15 * 1000);
    }
    ssh2.connect({
        host: workerIP,
        username: sshLogin,
        password: sshPass,
        readyTimeout: 15 * 1000
    }).then(function() {
        ssh2.execCommand(sshCommand, {
            cwd: sshFolder
        }).then(function(result) {
            response = result.stdout;
            response = response.trim();
            if (isCallback.toString() == "true" && forceConfig.toString() == "false" && !remoteCMD) {
                apiCallback(worker, "ssh", response, workerType, token);
            }
            if (forceConfig.toString() == "true" && isConfig.toString() == "false") {
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
                        'token': token,
                        'worker': worker
                    }
                }
                // Start the request
                request(options, function(error, response, body) {
                    if (!error) {
                        apiCallback(worker, "ssh", "", workerType, token);
                        console.log(colors.green("[%s] Config => %s {%s} - Done"), getDateTime(), worker, workerIP); 
                        // UPDATE & RESTART MINER/MACHINE AFTER CONFIG PUSH                   
                    	console.log(colors.cyan("[%s] Notice => Your miner now will restart / reboot (New API settings required) "), getDateTime());
                    	fetchSSH(worker, workerIP, workerType, sshLogin, sshPass, ASIC_DEVICE[workerType].config_update.replace("{TOKEN}", token).replace("{WORKER}", worker), isConfig, isCallback, false, "", token);                
                    } else {
                        apiCallback(worker, "ssh", "", workerType, token);
                        console.log(colors.red("[%s] Error => %s {%s} - %s"), getDateTime(), worker, workerIP, error);
                    }
                })
            }
        }).catch((error) => {
            console.log(colors.red("[%s] Error => %s {%s} >%s/%s<"), getDateTime(), worker, workerIP, sshLogin, sshPass);
            console.log(colors.red(error));
            if (isCallback == true && forceConfig == false && !remoteCMD) {
                apiCallback(worker, "ssh", "bad password",workerType, token);
            }
            if (forceConfig == true && isConfig == false) {
                apiCallback(worker, "ssh", "config edit error bad password", workerType, token);
                console.log(colors.red("[%s] Error => %s {%s} - Config update failed due bad ssh password"), getDateTime(), worker, workerIP);
            }
        });
    }).catch((error) => {
        console.log(colors.red("[%s] Error => %s {%s} >%s/%s<"), getDateTime(), worker, workerIP, sshLogin, sshPass);
        console.log(colors.red(error));
        if (isCallback == true && forceConfig == false && !remoteCMD) {
            apiCallback(worker, "ssh", "timeout", token);
        }
        if (forceConfig == true && isConfig == false) {
            apiCallback(worker, "ssh", "config edit timeout", workerType, token);
            console.log(colors.red("[%s] Error => %s {%s} - Config update failed due Timeout"), getDateTime(), worker, workerIP);
        }
    });
}
// HTTP API 
 function fetchHTTP(worker, workerIP, workerType, httpLogin, httpPass, token) {
    request({
        url: "http://" + workerIP + ASIC_DEVICE[workerType].http_url,
        headers: {
            "Authorization": "Basic " + new Buffer(httpLogin + ":" + httpPass).toString(ASIC_DEVICE[workerType].http_auth_type)
        }
    }, function(error, response, body) {
        apiCallback(worker, "http", body, workerType, token);
    });
}
// CALLBACK
 function apiCallback(worker, callbackType, workerData, asicType, token) {
    // Progress Callback Data
    var callbackName = callbackType + "_response",
        parseWorkerData = "";
    if (callbackType != "http") {
        //parseWorkerData = workerData.replace(/[^a-zA-Z0-9,=_;.-/: ]/g, "");
        if (isJSON(workerData)) {
        	parseWorkerData = escapeJSON(workerData.replace("}{","},{"));
        } else {
        	parseWorkerData = workerData.replace("}{","},{");
        }
    } else {
        parseWorkerData = workerData;
        callbackName = "tcp";
    }
    if (typeof workerObject[worker] == "undefined") {
        workerObject[worker] = [];
        workerObject[worker].push({});
        workerObject[worker][0]["token"] = token;
        workerObject[worker][0]["asicType"] = asicType;
        workerObject[worker][0]["tcp_response"] = "";
        workerObject[worker][0]["ssh_response"] = "";
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
    console.log("[%s] Progress {%s%} => Total: %s worker, SSH: %s/%s TCP: %s/%s HTTP: %s/%s", getDateTime(), parseInt(syncPercent), totalSYNCWorker, doneSSHNum, syncSSHNum, doneTCPNum, syncTCPNum, doneHTTPNum, syncHTTPNum);
    if (parseInt(syncPercent) === 100 && totalSYNCWorker == syncSUMNum) {
        //console.log(workerObject);
        var jsons = stringify(workerObject);
        const shell = new WebSocket('{PROTOCOL}://{HOST}:{PORT}/{FOLDER}'.replace('{PROTOCOL}', GLOBAL["sync_protocol"]).replace('{HOST}', GLOBAL["sync_server"]).replace('{PORT}', GLOBAL["sync_port"]).replace('{FOLDER}', GLOBAL["sync_endpoint"]));
		//console.log(jsons);
		
        var deflatedJson = new Buffer(jsons, 'utf8');
        zlib.deflate(deflatedJson, function(err, buf) {
            if (err) {
                console.log("[%s] ERROR => %s", getDateTime(), err.toString());
            } else {
                shell.on('open', function open() {
                    console.log("[%s] SYNC => Connected to sync server", getDateTime());
                    console.log("[%s] SYNC => Sending %s kbyte of data", getDateTime(), Math.round(Buffer.byteLength(deflatedJson, 'utf8')) / 1000);
                    shell.send(buf);
                    //console.log(buf);
                });
                shell.on('message', function incoming(data) {
                    if (data.toString()) {
                        console.log("[%s] SYNC =>  %s", getDateTime(), data);
                        console.log("");
                        console.log(colors.cyan("/*/*/*/*/*/*/*/*/*/*/*/*/*/*/"));
                        console.log(colors.cyan("[%s] DONE => Waiting for the next sync round."), getDateTime());
                        console.log(colors.cyan("/*/*/*/*/*/*/*/*/*/*/*/*/*/*/"));
                        console.log("");
                        updateStatus(true, "Waiting for the next sync round.");
                    }
                });
                shell.on('error', () => restartNode("001"));
                shell.on('close', () => restartNode("002"));
                setTimeout(function() {
                	shell.close();
                }, 35 * 1000);
            }
        });
    }
}

/*
	CORE
*/

function globalStart() {

        function globalPID() {
            if (pid == false) {
                pid = true;
                checkConnection();
            }
        }
        setInterval(globalPID, 1 * 1000);

}

if (process.argv.includes("headless")) {
	globalStart();
}

module.exports = {
    workersRefresh: function() {
	globalStart();
    }
}
