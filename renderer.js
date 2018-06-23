/*
	DEPENDENCIES
*/
const remote = require('electron').remote;
const {
    shell
} = require('electron');
var fs = require('fs');
const jetpack = require('fs-jetpack');
const electron = require('electron')
const app = remote.app;
var fullpath = app.getPath("appData");
/*
	FUNCTIONS
*/
function parseJSON(data) {
    return window.JSON && window.JSON.parse ? window.JSON.parse(data) : (new Function("return " + data))();
}

function firstToUpperCase(str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
}
/*
	MAIN FRAME BUTTONS
*/
document.getElementsByClassName("minimize")[0].addEventListener("click", function(e) {
    var window = remote.getCurrentWindow();
    window.minimize();
});
document.getElementsByClassName("close")[0].addEventListener("click", function(e) {
    var window = remote.getCurrentWindow();
    window.close();
});
document.getElementsByClassName("minimize")[1].addEventListener("click", function(e) {
    var window = remote.getCurrentWindow();
    window.minimize();
});
document.getElementsByClassName("close")[1].addEventListener("click", function(e) {
    var window = remote.getCurrentWindow();
    window.close();
});
/*
	LOGIN SYSTEM
*/
if (jetpack.exists(fullpath + "/login.json")) {
    $('.checkmark').hide();
    $('.circle-loader').removeClass('load-complete');
    $('.circle-loader, .message_err, .message_suc').hide();
    $('.empty').hide();
    $('.main').show();
    setTimeout(function() {
        workersRefresh();
    }, 50);
}
document.getElementById("button_logout").addEventListener("click", function(e) {
    try {
        jetpack.remove(fullpath + '/login.json');
        jetpack.remove(fullpath + '/user.json');
        jetpack.remove(fullpath + '/api.json');
    } catch (e) {
        console.log(2);
    }
    setTimeout(function() {
        location.reload();
    }, 300);
});
document.getElementById("button_addworker").addEventListener("click", function(e) {
    // Call the right location for login
    // clearTimeout(timeVar); // Clear timeout
    $.post("https://api.minerstat.com/api/asic_login.php", {
        key: document.getElementById("key").value,
        group: document.getElementById("group").value
    }, function(data) {
        if (data == '1') { // Success
            $('.circle-loader').addClass('load-complete');
            $('.notification_row').addClass('finished');
            $('.checkmark').show();
            $('.message_suc').show();
            //$this.removeClass('disabled');
            $('#login_menu').fadeOut('fast');
            $('#popupbackground').fadeOut('fast');
            setTimeout(function() {
                $('.circle-loader').show();
                $('.circle-loader').removeClass('load-complete');
                $('.notification_row').removeClass('finished');
                $('.checkmark').hide();
                $('.message_suc').hide();
            }, 4000);
            setTimeout(function() {
                location.reload();
            }, 10000);
            var o = {} // empty Object
            o["login"] = [];
            var wlogin, wgroup;
            if (jetpack.exists(fullpath + "/login.json")) {} else {
                wlogin = document.getElementById("key").value;
                wgroup = document.getElementById("group").value;
            }
            var data = {
                token: wlogin,
                group: wgroup
            };
            o["login"].push(data);
            jetpack.write(fullpath + "/login.json", JSON.stringify(o));
        } else { // Fail
            $('.circle-loader').hide();
            $('.notification_row').addClass('finished');
            setTimeout(function() {
                $('#button_addworker').removeClass('disabled');
            }, 1500);
            $('.message_err').html("Error").show();
        }
    });
});
/*
	STAT PROCESSING
*/
function workersRefresh() {
    setTimeout(function() {
        workersRefresh();
    }, 1000);
    $.getJSON(fullpath + '/api.json', function(workersList) {
        document.getElementById("asiclist").innerHTML = "";
        loadWorkers(workersList);
    });
    $.getJSON(fullpath + '/user.json', function(wJson) {
        loadStatus(wJson);
    });

    function loadStatus(wJson) {
        var proc = parseJSON(JSON.stringify(wJson["status"]));
        var winternet;
        if (proc[0]["internet"] === true) {
            winternet = "Connected to the endpoint.";
            $("#bar_icon").removeClass("disconnected");
            if ($("p").hasClass("intro") == false) {
                $("#bar_icon").addClass("connection");
            }
        } else {
            winternet = "Socket disconnected.";
            $('#bar_icon').toggleClass("disconnected connection");
        }
        document.getElementById("bar_1").innerHTML = winternet;
        document.getElementById("bar_2").innerHTML = proc[0]["status"];
    }

    function loadWorkers(workersList) {
        try {
            var json = JSON.stringify(workersList);
            var obj = parseJSON(json);
            var total_worker = 0,
                total_online = 0,
                total_daily = 0;
            total_worker = Object.keys(obj).length;
            for (var id in obj) {
                var wname, wcoin, wspeed, wunit, wuptime, wdaily;
                // Worker JSON
                wname = id;
                wstatus = obj[wname]["info"]["status"];
                wcoin = obj[wname]["mining"]["crypto"];
                wspeed = obj[wname]["mining"]["hashrate"]["hashrate"];
                wunit = obj[wname]["mining"]["hashrate"]["hashrate_unit"];
                wuptime = obj[wname]["info"]["uptime"];
                wdaily = obj[wname]["revenue"]["usd_day"];
                if (wstatus === "online") {
                    total_online++;
                    total_daily = total_daily + wdaily;
                }
                $("#asiclist").append("<div class='row'><div class='element'><div data-tooltip='" + firstToUpperCase(wstatus) + "' class='status " + wstatus + "'><div class='bullet'></div></div> " + wname + "</div><div class='element'>" + wcoin + "</div><div class='element'>" + wspeed + " " + wunit + "</div><div class='element'>" + wuptime + "</div><div class='element'>$" + wdaily.toFixed(2) + "</div></div>");
            }
            // Global JSON
            document.getElementById("total_worker").innerHTML = total_worker;
            document.getElementById("total_online").innerHTML = total_online;
            document.getElementById("total_daily").innerHTML = total_daily.toFixed(2);
        } catch (err) {
            console.log("UX ERROR: " + err);
        }
    }
}