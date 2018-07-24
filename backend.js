/*
	DEPENDENCIES
*/
const path = require('path');
var colors = require('colors');
const url = require('url');
var fs = require('fs');
var node_ssh = require('node-ssh');
var request = require('request');
const nets = require('net');
var await = require('await');
var needle = require('needle');
var async = require('neo-async');
const jetpack = require('fs-jetpack');
const electron = require('electron')
const app = electron.app
var fullpath = app.getPath("appData");
var stringify = require('json-stable-stringify');
var net = require('net');
/*
	Error Handling
*/
var issue = true;
var error = false;
var errnum = 0;
"use strict";
/*
	MAIN FUNCTIONS
*/
function getDateTime() {
    var date = new Date();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;
    return hour + ":" + min + ":" + sec;
}

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
/*
	STAT PROCESSING
*/
module.exports = {
    workersRefresh: function() {
        // Starts from here
        var o = {} // empty Object
        console.log("-*-*- STARTING NEW SYNC ROUND -*-*-");
        require('dns').resolve('api.minerstat.com', function(err) {
            if (err) {
                console.log("Round skipped, connection problems.");
                updateStatus(false, "Waiting for connection..");
                // Start New Round after 20 sec idle
                setTimeout(function() {
                    var main = require('./main');
                    main.sync();
                }, 25000);
            } else {
                start(true);
            }
        });

        function start(connection) {
            if (connection === true) {
                // GET LOGIN INFORMATION
                if (!fs.existsSync(fullpath + "/login.json")) {
                    console.log("Round skipped, no user details.");
                    setTimeout(function() {
                        var main = require('./main');
                        main.sync();
                    }, 1000);
                } else {
                    var myMiner = {
                        sync: 'false'
                    };
                    var json_login, login_token, login_group;
                    const data = jetpack.read(fullpath + '/login.json');
                    json_login = data.toString();
                    console.log(json_login);
                    var proc = JSON.parse(json_login);
                    login_token = proc["login"][0]["token"];
                    login_group = proc["login"][0]["group"];
                    //loop();
                    // Boot Protection
                    issue = true;
                    setTimeout(function() {
                        if (issue === true) {
                            loop();
                        }
                    }, 5000);

                    function loop() {
                        // Request JSON from the Server
                        request.get({
                            url: 'https://api.minerstat.com/v2/worker.php?node=1&token=' + login_token + '&filter=asic&group=' + login_group,
                            form: {
                                node: "asic"
                            }
                        }, function(error, response, body) {
                            if (error != null) {
                                console.log("ERROR =>" + error);
                                issue = true;
                                setTimeout(function() {
                                    loop();
                                }, 5000);
                            } else {
                                issue = false;
                                var json_string = response.body;
                                if (json_string.indexOf("asic") > -1) {
                                    var obj = JSON.parse(json_string);
                                    var total_worker = Object.keys(obj).length;
                                    var total_count = 0;
                                    var sync_done = false;
                                    // SAVE .JSON for Front-end
                                    jetpack.write(fullpath + '/api.json', json_string);
                                    // empty list Array, push() values into
                                    o["list"] = [];
                                    updateStatus(connection, "Sync in progress..");
                                    for (var id in obj) {
                                        var worker = id;
                                        // empty Array, push() values into
                                        o[worker] = [];
                                        var accesskey = obj[worker].info.token;
                                        var ip_address = obj[worker].info.os.localip;
                                        var type = obj[worker].info.system;
                                        var login = obj[worker].info.auth.user;
                                        var passw = obj[worker].info.auth.pass;
                                        var remotecommand = obj[worker].info.cmd;
                                        var isconfig = obj[worker].info.config;
                                        console.log("[" + getDateTime() + "] " + "Async Fetch: " + type + " worker: " + worker + " at " + ip_address + " with " + login + "/" + passw);
                                        // Starting Process data's
                                        var command, folder, sshinfo, sshres1, sshres2;
                                        var tcpinfo = "";
                                        // DragonMint
                                        async function callbackdragon(accesskey, worker, response) {
                                            // Push values
                                            var data = {
                                                token: accesskey,
                                                tcp_response: "" + response,
                                                ssh_response: ""
                                            };
                                            o[worker].push(data);
                                            o["list"].push(worker);
                                            total_count++;
                                            if (total_worker == total_count) {
                                                sync_done = true;
                                            }
                                        }
                                        // Fetch TCP
                                        async function callbackssh(worker, tcp, ssh, accesskey) {
                                            // Push values
                                            var data = {
                                                token: accesskey,
                                                tcp_response: tcp.replace(/[^a-zA-Z0-9,=_;.: ]/g, ""),
                                                ssh_response: ssh.replace(/[^a-zA-Z0-9,=_;.: ]/g, "")
                                            };
                                            o[worker].push(data);
                                            o["list"].push(worker);
                                            total_count++;
                                            if (total_worker == total_count) {
                                                sync_done = true;
                                            }
                                        }
                                        //////////////////////////////////////////////////////////////
                                        async function callbacktcp(worker, tcp, host, accesskey, remotecommand, isconfig, type, login, passw) {
                                            var command, folder, ssh = "";
                                            if (tcp == "timeout" && remotecommand != "CONFIG") {
                                                console.log("[" + getDateTime() + "] " + worker + " - SSH Skipped - Reason: Worker inactive");
                                                total_count++;
                                                if (total_worker == total_count) {
                                                    sync_done = true;
                                                }
                                            } else {
                                                if (tcp.indexOf("cgminer") > -1) {
                                                    command = "cgminer-api stats; cgminer-api pools; ";
                                                    folder = "/root";
                                                }
                                                if (tcp.indexOf("bmminer") > -1) {
                                                    command = "bmminer-api stats; bmminer-api pools; ";
                                                    folder = "/root";
                                                }
                                                if (remotecommand == "CONFIG") {
                                                    // PATH & COMMANDS
                                                    if (type == "antminer") {
                                                        if (command.indexOf("cgminer") > -1) {
                                                            command = command + "wget -O cgminer.conf 'http://static.minerstat.farm/proxy.php?token=" + accesskey + "&worker=" + worker + "' && sleep 3 && echo done && /sbin/reboot";
                                                        }
                                                        if (command.indexOf("bmminer") > -1) {
                                                            command = command + "wget -O bmminer.conf 'http://static.minerstat.farm/proxy.php?token=" + accesskey + "&worker=" + worker + "' && sleep 3 && echo done && /sbin/reboot";
                                                        }
                                                        folder = "/config";
                                                    }
                                                    if (type == "baikal") {
                                                        command = command + "wget -O miner.conf 'http://static.minerstat.farm/proxy.php?token=" + accesskey + "&worker=" + worker + "' && sleep 3 && echo done && /sbin/reboot";
                                                        folder = "/opt/scripta/etc";
                                                    }
                                                }
                                                ssh = await getSSH(host, login, passw, folder, command, worker, tcp, accesskey, remotecommand, isconfig, type)
                                            }
                                        }
                                        async function getResponse(worker, type, ip_address, token, remotecommand, isconfig, type, login, passw) {
                                            if (type === "antminer") {
                                                var tcp = await getTCP(ip_address, worker, token, remotecommand, isconfig, type, login, passw);
                                            }
                                            if (type === "dragonmint") {
                                                var tcp = await getDragon(token, ip_address, worker, login, passw);
                                            }
                                            if (type === "baikal") {
                                                var ssh;
                                                command = "wget -O - https://api.minerstat.com/baikal/" + token + "." + worker + ".sh | bash";
                                                folder = "/tmp";
                                                ssh = await getSSH(ip_address, login, passw, folder, command, worker, "", token, remotecommand, isconfig, type)
                                            }
                                            return 'ok';
                                        }
                                        // START
                                        getResponse(worker, type, ip_address, accesskey, remotecommand, isconfig, type, login, passw);
                                        // FETCH DRAGONMINT HTTP WOTH BASIC (BASE64) AUTH
                                        function getDragon(accesskey, ip_address, worker, login, passw) {
                                            var auth = "Basic " + new Buffer(login + ":" + passw).toString("base64");
                                            request({
                                                url: "http://" + ip_address + "/api/summary",
                                                headers: {
                                                    "Authorization": auth
                                                }
                                            }, function(error, response, body) {
                                                callbackdragon(accesskey, worker, body);
                                                // DEBUG
                                                // console.log(body);
                                            });
                                        }
                                        // Fetch TCP
                                        function getTCP(host, worker, accesskey, remotecommand, isconfig, type, login, passw) {
                                            var response;
                                            var check = 0;
                                            const nets = require('net');
                                            const clients = nets.createConnection({
                                                host: host,
                                                port: 4028
                                            }, () => {
                                                clients.write("summary+pools+devs");
                                                console.log("[" + getDateTime() + "] " + "Fetching TCP: " + worker + " (" + host + ")");
                                            });
                                            clients.on('end', () => {});
                                            setTimeout(function() {
                                                if (check === 0) {
                                                    callbacktcp(worker, "timeout", host, accesskey, remotecommand, isconfig, type, login, passw); // send response to callback function
                                                    clients.end(); // close connection
                                                }
                                            }, 15000);
                                            clients.on('data', (data) => {
                                                if (check === 0) {
                                                    response += data.toString();
                                                    callbacktcp(worker, response, host, accesskey, remotecommand, isconfig, type, login, passw); // send response to callback function
                                                    check = 1;
                                                }
                                                clients.end(); // close connection
                                            });
                                            return response;
                                        }
                                        // Fetch SSH
                                        async function getSSH(ip_address, login, passw, folder, command, worker, tcp, accesskey, remotecommand, isconfig, type) {
                                            var response, dump = "";
                                            var ssh2 = new node_ssh();
                                            if (command === undefined) {
                                                command = "echo recovery;"
                                                folder = "/tmp";
                                            }
                                            console.log("[" + getDateTime() + "] " + worker + ": " + ip_address + " " + login + "/" + passw + " in - " + folder + " -  exec: " + command);
                                            ssh2.connect({
                                                host: ip_address,
                                                username: login,
                                                password: passw,
                                                readyTimeout: 30000
                                            }).then(function() {
                                                // Command
                                                ssh2.execCommand(command, {
                                                    cwd: folder
                                                }).then(function(result) {
                                                    console.log("[" + getDateTime() + "] " + "Fetching SSH: "+worker+"" + "(" + ip_address + ")");
                                                    response = result.stdout;
                                                    response = response.trim();
                                                    callbackssh(worker, tcp, response, accesskey)
                                                }).catch((error) => {
                                                    console.log(colors.red("[" + getDateTime() + "] " + "Error on: " + worker + " with: " + login + "/" + passw));
                                                    console.log(colors.red(error));
                                                    callbackssh(worker, tcp, "bad password", accesskey)
                                                    errnum++;
                                                    var calc = total_worker * 3;
                                                    if (errnum >= calc) {
                                                        if (error === false) {
                                                            error = true;
                                                            app.relaunch()
                                                            app.exit()
                                                        }
                                                    }
                                                });
                                                if (remotecommand != null && remotecommand != "" && remotecommand != undefined && remotecommand != "CONFIG") {
                                                    // Remote Command [Reboot, Shutdown]
                                                    if (remotecommand == "SHUTDOWN") {
                                                        command = "/sbin/shutdown -h now";
                                                        folder = "/tmp";
                                                    }
                                                    if (remotecommand == "REBOOT") {
                                                        command = "/sbin/reboot";
                                                        folder = "/tmp";
                                                    }
                                                    // Console Output
                                                    console.log(colors.green("[" + getDateTime() + "] " + "Remote command to: " + worker + " on: " + ip_address + " with: " + remotecommand));
                                                    ssh2.execCommand(command, {
                                                        cwd: folder
                                                    }).then(function(result) {
                                                        response = result.stdout;
                                                        response = response.trim();
                                                        console.log("[" + getDateTime() + "] " + " " + response);
                                                    }).catch((error) => {
                                                        console.log(colors.red("[" + getDateTime() + "] " + "Remote command errored on: " + worker + " with: " + login + "/" + passw));
                                                        console.log(colors.red(error));
                                                    });
                                                }
                                                if (isconfig === false) {
                                                    console.log(colors.green("[" + getDateTime() + "] " + "Pushing config: " + worker + " to online config editor.."));
                                                    if (type == "antminer") {
                                                        if (command.indexOf("cgminer") > -1) {
                                                            command = "cat cgminer.conf";
                                                        }
                                                        if (command.indexOf("bmminer") > -1) {
                                                            command = "cat bmminer.conf";
                                                        }
                                                        folder = "/config";
                                                    }
                                                    if (type == "baikal") {
                                                        command = "cat miner.conf";
                                                        folder = "/opt/scripta/etc";
                                                    }
                                                    ssh2.execCommand(command, {
                                                        cwd: folder
                                                    }).then(function(result) {
                                                        response = result.stdout;
                                                        response = response.trim();
                                                        //console.log("[" + getDateTime() + "] " + " " + response);
                                                        // Set the headers
                                                        var headers = {
                                                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
                                                            'Content-Type': 'application/x-www-form-urlencoded'
                                                        }
                                                        // Configure the request
                                                        var options = {
                                                            url: 'https://api.minerstat.com/api/set_asic_config.php',
                                                            method: 'POST',
                                                            headers: headers,
                                                            form: {
                                                                'node': response,
                                                                'token': accesskey,
                                                                'worker': worker
                                                            }
                                                        }
                                                        // Start the request
                                                        request(options, function(error, response, body) {
                                                            if (!error && response.statusCode == 200) {
                                                                // Print out the response body
                                                                console.log(body);
                                                                console.log("");
                                                            }
                                                        })
                                                    }).catch((error) => {
                                                        console.log(colors.red("[" + getDateTime() + "] " + "Config Fetch errored on: " + worker + " with: " + login + "/" + passw));
                                                        console.log(colors.red(error));
                                                    });
                                                }
                                                return response;
                                            }).catch((error) => {
                                                console.log(colors.red("[" + getDateTime() + "] " + "Authentication failed on: " + worker + " with: " + login + "/" + passw));
                                                console.log(colors.red(error));
                                                callbackssh(worker, tcp, "bad password", accesskey)
                                            });
                                        }
                                    }
                                    // Send Full JSON Data to the Endpoint
                                    var _flagCheck = setInterval(function() {
                                        if (sync_done === true) {
                                            clearInterval(_flagCheck);
                                            // Debug JSON 
                                            var jsons = stringify(o);
                                            // console.log(jsons);
                                            // Set the headers
                                            var client = new net.Socket();
                                            client.connect(1337, 'static.minerstat.farm', function() {
                                                console.log('Connected to sync server');
                                                client.write(jsons);
                                            });
                                            client.on('data', function(data) {
                                                console.log('SYNC ID => ' + data);
						// keep connection for at least 8 seconds.
						setTimeout(function() {
                                                	client.destroy(); // kill client after server's response
						 }, 8000);
                                            });
                                            updateStatus(connection, "Waiting for the next sync round.");
                                            console.log("");
                                            console.log(colors.cyan("/*/*/*/*/*/*/*/*/*/*/*/*/*/*/"));
                                            console.log(colors.cyan("[" + getDateTime() + "] " + "Waiting for the next sync round."));
                                            console.log(colors.cyan("/*/*/*/*/*/*/*/*/*/*/*/*/*/*/"));
                                            console.log("");
                                            // Start New Round after 40 sec idle
                                            setTimeout(function() {
                                                var main = require('./main');
                                                main.sync();
                                            }, 40000);
                                        }
                                    }, 5000); // interval set at 100 milliseconds
                                }
                            }
                        }) // Config exist?	  
                    }
                }
            }
        }
    }
}
