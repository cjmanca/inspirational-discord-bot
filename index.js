
process.on('uncaughtException', UncaughtExceptionHandler);

function UncaughtExceptionHandler(err) {
    console.log("Uncaught Exception Encountered!!");
    console.log("err: ", err);
    console.log("Stack trace: ", err.stack);
}
var mysql = require('mysql');

console.log('RDS_HOSTNAME: ' + process.env.RDS_HOSTNAME);

global.db = mysql.createConnection({
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,
    database: process.env.RDS_DB_NAME
});

db.connect(function (err) {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }

    console.log('Connected to database.');
});


var Discord = require('discord.io');
var logger = require('winston');
var request = require("request");


var channelID = 0;
var server = null;

function CanChangeSettings(userID) {

    var member = server.members[userID];

    if (server.owner_id === member.id) {
        return true;
    }

    if (member.roles.includes(settingRole)) {
        return true;
    }

    return false;
}

function VerifyServer(next) {

    // execute query
    db.query({
        sql: "SELECT * FROM `server_settings` where id = ?",
        values: [server.id]
    }, (err, result) => {
        if (err) {
            console.log("Couldn't execute query: ", err);
        }

        if (result.length <= 0) {

            _commandChar[server.id] = '!inspire';
            _settingRole[server.id] = '0';

            // execute query
            db.query({
                sql: "INSERT INTO `server_settings` (`id`, `commandChar`, `settingRole`) VALUES ( ? , '!inspire', '0')",
                values: [server.id]
            }, (err, result) => {

                if (err) {
                    console.log("Couldn't execute query: ", err);
                }
                else {
                    console.log("Added DB entry for server: " + server.id);
                }
            });
        }
        else {
            //console.log("Result: ", result[0]);
            _commandChar[server.id] = result[0].commandChar;
            _settingRole[server.id] = result[0].settingRole;
        }

        if (next) {
            next();
        }
    });
}

function VerifyChannel(next) {

    // execute query
    db.query({
        sql: "SELECT * FROM `channel_settings` where id = ?",
        values: [channelID]
    }, (err, result) => {
        if (err) {
            console.log("Couldn't execute query: ", err);
        }

        if (result.length <= 0) {

            let rnd = Math.random();

            _autoPostIntervalMin[channelID] = 0;
            _autoPostIntervalMax[channelID] = 0;
            _postsSeen[channelID] = 0;
            _autoPostIntervalRand[channelID] = rnd;

            // execute query
            db.query({
                sql: "INSERT INTO `channel_settings` (`id`, `autoPostIntervalMin`, `autoPostIntervalMax`,`postsSeen`,`autoPostIntervalRand`)VALUES( ?, ?, ?, ?, ?)",
                values: [channelID, 0, 0, 0, rnd]
            }, (err, result) => {
                if (err) {
                    console.log("Couldn't execute query: ", err);
                }
                else {
                    console.log("Added DB entry for channel: " + channelID);
                }
            });
        }
        else {
            //console.log("Result: ", result[0]);
            _autoPostIntervalMin[channelID] = result[0].autoPostIntervalMin;
            _autoPostIntervalMax[channelID] = result[0].autoPostIntervalMax;
            _postsSeen[channelID] = result[0].postsSeen;
            _autoPostIntervalRand[channelID] = result[0].autoPostIntervalRand;
        }
        
        if (next) {
            next();
        }
    });
}

function CheckValues(next) {
    
    if (!(server.id in _commandChar)) {
        
        VerifyServer(() => {
            if (!(channelID in _autoPostIntervalMin)) {
                
                VerifyChannel(() => {
                    if (next) {
                        next();
                    }
                });
            }
            else {
                if (next) {
                    next();
                }
            }
        });
    }
    else if (!(channelID in _autoPostIntervalMin)) {
        
        VerifyChannel(() => {
            if (next) {
                next();
            }
        });
    }
    else {
        if (next) {
            next();
        }
    }
    
}



var _commandChar = {};
Object.defineProperty(global, "commandChar", {
    get() {
        if (server.id in _commandChar) {
            return _commandChar[server.id];
        }

        console.log("cache miss: commandChar");

        return "!inspire";
    },
    set(x) {
        _commandChar[server.id] = x;

        db.query({
            sql: "UPDATE `server_settings` SET `commandChar` = ? WHERE id = ?",
            values: [x, server.id]
        }, (err, result) => {
            if (err) {
                console.log("Couldn't execute query: ", err);
            }
        });
    }
});

var _settingRole = {};
Object.defineProperty(global, "settingRole", {
    get() {
        if (server.id in _settingRole) {
            return _settingRole[server.id];
        }

        console.log("cache miss: settingRole");

        return "0";
    },
    set(x) {
        _settingRole[server.id] = x;

        db.query({
            sql: "UPDATE `server_settings` SET `settingRole` = ? WHERE id = ?",
            values: [x, server.id]
        }, (err, result) => {
            if (err) {
                console.log("Couldn't execute query: ", err);
            }
        });
    }
});

var _autoPostIntervalMin = {};
Object.defineProperty(global, "autoPostIntervalMin", {
    get() {
        if (channelID in _autoPostIntervalMin) {
            return _autoPostIntervalMin[channelID];
        }

        console.log("cache miss: autoPostIntervalMin");

        return 0;
    },
    set(x) {
        _autoPostIntervalMin[channelID] = x;

        db.query({
            sql: "UPDATE `channel_settings` SET `autoPostIntervalMin` = ? WHERE id = ?",
            values: [x, channelID]
        }, (err, result) => {
            if (err) {
                console.log("Couldn't execute query: ", err);
            }
        });
    }
});

var _autoPostIntervalMax = {};
Object.defineProperty(global, "autoPostIntervalMax", {
    get() {
        if (channelID in _autoPostIntervalMax) {
            return _autoPostIntervalMax[channelID];
        }

        console.log("cache miss: autoPostIntervalMax");

        return 0;
    },
    set(x) {
        _autoPostIntervalMax[channelID] = x;

        db.query({
            sql: "UPDATE `channel_settings` SET `autoPostIntervalMax` = ? WHERE id = ?",
            values: [x, channelID]
        }, (err, result) => {
            if (err) {
                console.log("Couldn't execute query: ", err);
            }
        });
    }
});

var _postsSeen = {};
Object.defineProperty(global, "postsSeen", {
    get() {
        if (channelID in _postsSeen) {
            return _postsSeen[channelID];
        }

        console.log("cache miss: postsSeen");

        return 0;
    },
    set(x) {
        _postsSeen[channelID] = x;

        db.query({
            sql: "UPDATE `channel_settings` SET `postsSeen` = ? WHERE id = ?",
            values: [x, channelID]
        }, (err, result) => {
            if (err) {
                console.log("Couldn't execute query: ", err);
            }
        });
    }
});

var _autoPostIntervalRand = {};
Object.defineProperty(global, "autoPostIntervalRand", {
    get() {
        if (channelID in _autoPostIntervalRand) {
            return _autoPostIntervalRand[channelID];
        }

        console.log("cache miss: autoPostIntervalRand");

        return 0;
    },
    set(x) {
        _autoPostIntervalRand[channelID] = x;

        db.query({
            sql: "UPDATE `channel_settings` SET `autoPostIntervalRand` = ? WHERE id = ?",
            values: [x, channelID]
        }, (err, result) => {
            if (err) {
                console.log("Couldn't execute query: ", err);
            }
        });
    }
});




// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
    token: process.env.DISCORD_TOKEN,
    autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, pChannelID, message, evt) {

    // ignore DMs
    if (!("guild_id" in evt.d)) {
        return;
    }

    // ignore the bot's messages/responses
    if (bot.users[userID].bot) {
        return;
    }


    server = bot.servers[evt.d.guild_id];
    channelID = pChannelID;


    CheckValues(function () {
        
        var args = message.split(' ');

        if (args[0] === commandChar || args[0] === "!inspire") {

            var cmd = args[1];
            args = args.splice(2);

            if (cmd === undefined || cmd === "") {
                request("https://inspirobot.me/api?generate=true", function (err, res, body) {
                    bot.sendMessage({
                        to: channelID,
                        message: body
                    });
                });
                return;
            }


            switch (cmd) {
                case 'role':

                    if (!CanChangeSettings(userID)) {
                        bot.sendMessage({
                            to: channelID,
                            message: "You don't have permission to change the settings."
                        });
                        return;
                    }

                    var roleName = "Not assigned";

                    if ((typeof args[0] !== 'string' && !(args[0] instanceof String)) || args[0].length < 1) {

                        if (settingRole in server.roles) {
                            roleName = server.roles[settingRole].name;
                        }

                        bot.sendMessage({
                            to: channelID,
                            message: 'role is set to: ' + roleName + '\nUsage: ' + commandChar + ' role <new role>\nUpdates the role that\'s allowed to change settings. Server owner can always change settings.\nServer wide setting.'
                        });
                        return;
                    }

                    if (evt.d.mention_roles.length > 0) {
                        settingRole = evt.d.mention_roles[0];
                    }
                    else {
                        settingRole = 0;
                    }

                    if (settingRole in server.roles) {
                        roleName = server.roles[settingRole].name;
                    }

                    bot.sendMessage({
                        to: channelID,
                        message: 'role set to: ' + roleName
                    });
                    return;
                case 'prompt':

                    if (!CanChangeSettings(userID)) {
                        bot.sendMessage({
                            to: channelID,
                            message: "You don't have permission to change the settings."
                        });
                        return;
                    }

                    if ((typeof args[0] !== 'string' && !(args[0] instanceof String)) || args[0].length < 1) {
                        bot.sendMessage({
                            to: channelID,
                            message: 'prompt is set to ' + commandChar + '\nUsage: ' + commandChar + ' prompt <new prompt>\nChanges the command that the bot responds to. Will always respond to !inspire.\nServer wide setting.'
                        });
                        return;
                    }
                    commandChar = args[0];

                    bot.sendMessage({
                        to: channelID,
                        message: 'prompt set to ' + commandChar
                    });
                    return;
                case 'min':

                    if (!CanChangeSettings(userID)) {
                        bot.sendMessage({
                            to: channelID,
                            message: "You don't have permission to change the settings."
                        });
                        return;
                    }

                    if (isNaN(parseInt(args[0]))) {
                        bot.sendMessage({
                            to: channelID,
                            message: 'autoPostIntervalMin is set to ' + autoPostIntervalMin + '\nUsage: ' + commandChar + ' min <new value>\nSets the minimum number of posts before an inspirational message can be generated automatically. Set to 0 to disable auto posting.\nChannel specific setting.'
                        });
                        return;
                    }
                    autoPostIntervalMin = parseInt(args[0]);

                    if (autoPostIntervalMax < autoPostIntervalMin) {
                        autoPostIntervalMax = autoPostIntervalMin;
                    }

                    bot.sendMessage({
                        to: channelID,
                        message: 'autoPostIntervalMin set to ' + autoPostIntervalMin
                    });
                    return;
                case 'max':

                    if (!CanChangeSettings(userID)) {
                        bot.sendMessage({
                            to: channelID,
                            message: "You don't have permission to change the settings."
                        });
                        return;
                    }

                    if (isNaN(parseInt(args[0]))) {
                        bot.sendMessage({
                            to: channelID,
                            message: 'autoPostIntervalMax is set to ' + autoPostIntervalMax + '\nUsage: ' + commandChar + ' max <new value>\nSets the maximum number of posts before an inspirational message can be generated automatically. Cannot be less than min.\nChannel specific setting.'
                        });
                        return;
                    }
                    autoPostIntervalMax = parseInt(args[0]);

                    if (autoPostIntervalMax < autoPostIntervalMin) {
                        autoPostIntervalMax = autoPostIntervalMin;
                    }

                    bot.sendMessage({
                        to: channelID,
                        message: 'autoPostIntervalMax set to ' + autoPostIntervalMax
                    });
                    return;
            }

            bot.sendMessage({
                to: channelID,
                message: 'Commands are: role, prompt, min, max'
            });

        }
        else {
            var firstChar = message.substring(0, 1);

            // ignore entries that are probably bot commands to other bots
            if (firstChar === '$' || firstChar === '%' || firstChar === '^' || firstChar === '/' || firstChar === '&' || firstChar === '\\' || firstChar === '!' || firstChar === '|' || firstChar === '*' || firstChar === '?' || firstChar === '>' || firstChar === '<' || firstChar === '.' || firstChar === ',' || firstChar === ';' || firstChar === ':' || firstChar === '[' || firstChar === ']' || firstChar === '{' || firstChar === '}' || firstChar === '~' || firstChar === '-' || firstChar === '+') {
                return;
            }

            postsSeen++;

            if (autoPostIntervalMin > 0) {
                if (postsSeen > autoPostIntervalMin + ((autoPostIntervalMax - autoPostIntervalMin) * autoPostIntervalRand)) {
                    autoPostIntervalRand = Math.random();
                    postsSeen = 0;
                    request("https://inspirobot.me/api?generate=true", function (err, res, body) {
                        bot.sendMessage({
                            to: channelID,
                            message: body
                        });
                    });
                }
            }

        }

    });
});



//var done = (function wait() { if (!done) setTimeout(wait, 1000); })();