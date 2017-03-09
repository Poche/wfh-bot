'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

var WFHBot = function Constructor(settings) {
	this.settings = settings;
	this.settings.name = this.settings.name || 'wfh';
	this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'wfh.db');

	this.user = null;
	this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(WFHBot, Bot);

module.exports = WFHBot;

WFHBot.prototype.run = function () {
	console.log('Starting WFH Bot!');
	WFHBot.super_.call(this, this.settings);

	this.on('start', this._onStart);
	this.on('message', this._onMessage);
};

WFHBot.prototype._onStart = function () {
	this._loadBotUser();
	this._connectDb();
	this._firstRunCheck();
};

WFHBot.prototype._loadBotUser = function () {
	var self = this;
	this.user = this.users.filter(function (user) {
		return user.name === self.name;
	})[0];
};

WFHBot.prototype._connectDb = function () {
	if (!fs.existsSync(this.dbPath)) {
		console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
		process.exit(1);
	}

	this.db = new SQLite.Database(this.dbPath);
};

WFHBot.prototype._firstRunCheck = function () {
	var self = this;
	self.db.get('SELECT value FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
		if (err) {
			return console.error('DATABASE ERROR:', err);
		}

		var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
        	self._welcomeMessage();
        	return self.db.run('INSERT INTO info(name, value) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET value = ? WHERE name = "lastrun"', currentTime);
    });
};

WFHBot.prototype._welcomeMessage = function () {
	this.postMessageToChannel(this.channels[0].name, 'Hi guys, tired of going to the office?' +
		'\n I can tell you how many times you worked from home. Just say `wfh` to update your home office count!',
		{as_user: true});
};

WFHBot.prototype._onMessage = function (message) {
	console.log('onMessage: %s', JSON.stringify(message));
	if (this._isChatMessage(message) &&
		this._isChannelConversation(message) &&
		!this._isFromWFHBot(message) &&
		this._isMentioningWFH(message)
		) {
		if (this._isAskingForLeaderBoard(message)){
			this._showLeaderBoard(message);
		}
		else {
			this._saveNewCount(message);
		}
		
}
};

WFHBot.prototype._isChatMessage = function (message) {
	return message.type === 'message' && Boolean(message.text);
};

WFHBot.prototype._isChannelConversation = function (message) {
	return typeof message.channel === 'string' &&
	message.channel[0] === 'C';
};

WFHBot.prototype._isFromWFHBot = function (message) {
	return message.user === this.user.id;
};

WFHBot.prototype._isMentioningWFH = function (message) {
	return message.text.toLowerCase().indexOf('wfh') > -1 ||
	message.text.toLowerCase().indexOf(this.name) > -1;
};

WFHBot.prototype._isAskingForLeaderBoard = function (message) {
	return message.text.toLowerCase().indexOf('leaderboard') > -1;
};

WFHBot.prototype._showLeaderBoard = function (message) {
	var self = this;

	self.db.all('SELECT * FROM users order by times desc limit 10', function (err, record) {
		
		console.log(record);
		var response = 'LeaderBoard: \n';

		 record.forEach(function(user) {
		 	response = response + user.user + ' worked ' + user.times+ ' times! \n'; 
		 });

		let channel = self._getChannelById(message.channel);

		self.postMessageToChannel(channel.name, response, {as_user: true});
    });
};

WFHBot.prototype._saveNewCount = function (message) {
	var self = this;

	var channel = self._getChannelById(message.channel);
	let user = self.getUserByID(message.user).name;

	let userExist = self.db.get('SELECT * FROM users WHERE user = ? LIMIT 1', user, function (err, record) {
		if (err) {
			return console.error('DATABASE ERROR:', err);
		}

        // this is a first run
        if (!record) {
        	return self.db.run('INSERT INTO users(user, times) VALUES(?, 1)', user);
        }

        // updates with new last running time
        self.db.run('UPDATE users SET times = times + 1 WHERE user = ?', user);
    });
	     
	let response = 'Saved new WFH for '+ user + '!';

	self.postMessageToChannel(channel.name, response, {as_user: true});
};

WFHBot.prototype.getUserByID = function(key){
  // Send either a U123456 UserID or bob UserName and it will return the bob value all the time
  var targetUser = this.users.filter(function (user) {
  	return user.id === key;
  })[0];
  return targetUser;
}

WFHBot.prototype._getChannelById = function (channelId) {
	return this.channels.filter(function (item) {
		return item.id === channelId;
	})[0];
};