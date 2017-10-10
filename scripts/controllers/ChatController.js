'use strict'

skunq.controller( 'ChatController', [ '$scope', '$state', '$stateParams', '$timeout', function( $scope, $state, $stateParams, $timeout ) {
	var self = this;
	var main = $scope.main;

	self.status = {
		loading: true
	};
	self.baseUrl = 'http://assignment.bunq.com';

	self._tmp = {};

	// INIT CONTROLLER ===================

	self.init = function() {
		_.extend( self, {
			current_user: main.current_user,
			friends: main.friends,
			active_chats: main.active_chats
		});

		// MAKE SURE USER IS LOGGED IN
		if ( !self.current_user || !self.current_user.id ) self.logout();

		// GET CURRENT CHAT DATA
		self.loadChat();
	};

	// LOAD AND SET CHAT DATA =============
	self.loadChat = function() {
		self.status.loading = true;
		$.get( self.baseUrl + '/conversation/' + $stateParams.id )
			.then(
				function( response ) {
					self.chat = _.extend( {
						id: $stateParams.id,
						messages: []
					}, response );
					// ADD NAME TO TOP LEVEL
					if ( self.chat.conversation && self.chat.conversation.name )
						self.chat.name = self.chat.conversation.name;

					if ( self.friends && self.friends.length ) {
						self.setUsersInfo();
						self.getMessages( function(){
							self.status.loading = false;
						});
					} else {
						self.loadFriends( function(){
							self.setUsersInfo();
							self.getMessages( function(){
								self.status.loading = false;
							});
						});
					}
				},
				function(response){
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	self.loadFriends = function( callback ) {
		var endpoint = self.baseUrl + '/users';
		$.get( endpoint )
			.then(
				function( response ) {
					// SAVE RESPONSE TO FRIENDS LIST
					self.friends = _.map( response, function( user ) {
						var attrs = _.extend({
							name: '',
							avatar: '../../assets/images/avatars/' + user.id + '.jpg',
							new_message: '',
							editable: false,
							active: false,
							selected: false
						}, user );

						return attrs;
					});

					if ( _.isFunction(callback) ) {
						callback();
					}
				},
				function(response){
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	self.setUsersInfo = function() {
		self.users_info = {};
		_.each( self.chat.users, function( user ) {
			if ( user.userid == self.current_user.id ) {
				self.users_info[ user.userid ] = self.current_user;
			} else {
				self.users_info[ user.userid ] = _.find( self.friends, { id: user.userid } );
			}
		});
	};

	self.getMessages = function( callback ) {
		$.get( self.baseUrl + '/conversation/' + self.chat.id + '/message/limited?limit=50&offset=0' )
			.then(
				function( response ) {
					
					self.chat.messages = _.concat( self.chat.messages, response.reverse() );
					if ( self.chat.messages.length ) {
						self.chat.last_message = _.last( self.chat.messages ).id
					}

					// START POLLING FOR NEW MESSAGES
					self.pollMessages();

					if ( _.isFunction(callback) ) {
						callback();
					}
				},
				function( response ) {
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	self.checkNewMessages = function( callback ) {
		$.get( self.baseUrl + '/conversation/' + self.chat.id + '/new/' + self.chat.last_message )
			.then(
				function( response ) {
					if ( response && response.length ) {
						self.chat.messages = _.concat( self.chat.messages, response );
						self.chat.last_message = _.last( self.chat.messages ).id;
					}

					// CONTINUE POLLING LOOP
					self.pollMessages();

					if ( _.isFunction(callback) ) {
						callback();
					}
				},
				function( response ) {
					if ( self.chat.last_message ) {
						// CONTINUE POLLING LOOP
						self.pollMessages();
						if ( _.isFunction(callback) ) {
							callback();
						}
					} else {
						console.log( '%cErrors', 'background:red;', response );
					}
				}
			);
	};

	self.pollMessages = function() {
		self.pollTimeout = $timeout( function(){
			if ( self.chat.last_message ) {
				self.checkNewMessages();
			} else {
				self.getMessages();
			}
		}, 3000 );
	};

	// CHAT FUNCTIONS ========================

	self.sendMessage = function( message ) {
		// IF EMPTY STOP EVENT
		if ( !self._tmp.message && !message ) return;

		// CREATE TEMP ID UNTIL BACKEND RETURNS FULL INFO
		var temp_id = Date.now();
		var new_message = {
			tempId: temp_id,
			message: _.clone( self._tmp.message ),
			senderId: self.current_user.id,
			conversationId: self.chat.id,
			status: 'sending'
		};
		// ADD NEW MESSAGES INTUITIVELY > UPDATE STATUS ON BACKEND RESPONSE
		self.chat.messages.push( new_message );
		self._tmp.message = '';
		// STOP NEW MESSAGES POLLING
		$timeout.cancel(self.pollTimeout);
		// SEND (POST) MESSAGE
		$.post( self.baseUrl + '/conversation/' + self.chat.id + '/message/send', new_message )
			.then(
				function( response ) {
					var msgIndex = _.indexOf( self.chat.messages, new_message );
					_.extend( self.chat.messages[msgIndex], {
						id: response.id,
						status: 'sent',
						timestamp:  timestampString()
					});
					
					// UPDATE CHAT WITH SENT MESSAGE ID
					self.chat.last_message = response.id
					// UPDATE CHAT ITEM ON MAIN SCOPE WITH LAST MESSAGE VALUE
					_.find( main.active_chats, { id: self.chat.id }).last_message = response.id;

					// CONTINUE POLLING LOOP
					self.pollMessages();

					// FE HACK TO TRIGGER FAKE RESPONSE JUST TO SHOW UI
					$timeout( function(){ fakeResponse(); }, 5000 );
				},
				function( response ) {
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	// HELPER UTLITIES =======================

	var timestampString = function() {
		var date = new Date(),
			year = date.getFullYear(),
			month = date.getMonth() + 1,
			day = date.getDate(),
			hour = date.getHours(),
			minute = date.getMinutes(),
			second = date.getSeconds();

		var timestamp = year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
		return timestamp;
	};

	var fakeResponse = function() {
		var friend_id = _.find( self.chat.users, function( user ) {
			return user.userid != self.current_user.id;
		}).userid;

		var new_message = {
			message: 'Sorry about this.' + Date.now(),
			senderId: friend_id,
			conversationId: self.chat.id,
		};

		$.post( self.baseUrl + '/conversation/' + self.chat.id + '/message/send', new_message );
	};

	self.init();
}]);