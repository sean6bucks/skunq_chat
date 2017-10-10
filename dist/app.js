'use strict'
// require('jquery');
// require('bootstrap');
// require('lodash');
// require('async');
// require('angular');

var skunq = angular.module( 'Skunq', [
	'ui.router'
]);

skunq.config( [ '$stateProvider', '$qProvider', function( $stateProvider, $qProvider ) {

	var routes = {
		'main': {
			url: '/',
		},
		'chat': {
			url: '/chat',
			template: '<ui-view></ui-view>'
		},
		'chat.show': {
			url: '/:id',
			templateUrl: './assets/templates/chat-window.html'
		},
		'profile': {
			url: '/profile',
			template: '<ui-view></ui-view>'
		},
		'profile.show': {
			url: '/:id',
			templateUrl: './assets/templates/profile.html'
		}
	};

	_.each( routes, function( route, name ) {
		$stateProvider.state( name, route );
	});

}]);
'use strict'

skunq.factory( 'LocalService', function() {
	return {
		// ADD AND REMOVE USER DATA TO LOCAL FOR QUICK LOGIN
		saveLocal: function( attrs ) {
			if ( attrs ) {
				localStorage.setItem( 'skunq_user', JSON.stringify( attrs ) );
			}
		},
		// REMOVE ON LOGOUT
		deleteLocal: function() {
			localStorage.removeItem( 'skunq_user' );
		}
	};
});
'use strict'

skunq.controller( 'MainController', [ '$scope', '$rootScope', '$state', '$stateParams', '$timeout', 'LocalService', function( $scope, $rootScope, $state, $stateParams, $timeout, LocalService ) {
	
	var self = this;
	self._tmp = {};
	self.errors = {};
	self.baseUrl = 'http://assignment.bunq.com';
	self.status = {
		loading: true,
		loading_window: true
	};
	
	self.current_user = {
		name: '',
		avatar: '',
		editable: true,
	};
	self.friends = [];
	self.active_chats = [];


	// APP INIT ============================

	self.init = function() {
		self.status.loading = true;
		// CHECK FOR EXISTING USERS AND CHATS DATA TO DETERMINE BLOCKING DATA FETCH
		var local_user = localStorage.getItem( 'skunq_user' );
		if ( local_user ) {
			local_user = JSON.parse( local_user );
			// UPDATE CURRENT USER WITH LOCAL INFO
			_.extend( self.current_user, local_user );
			self.loadUserData();
		} else {
			$state.go( 'main' );
			setTimeout(function(){
				self.status.loading = false;
				$scope.$apply();
				$( '#login-screen' ).removeClass('loading');
			}, 2000 );
		}

		// ADD LISTENERS AFTER UI LOADS ====

		// ON MODAL CLOSE CLEAR TMP DATA
		$( '#create-chat-modal' ).on('hidden.bs.modal', function(){
			self.cancelChat();
		});

		// CREATE CHAT FROM PROFILE CONTROLLER
		$scope.$on( 'create-chat', function() {
			self.saveChat( $stateParams.id )
		});

		// ON LOGOUT DETECT > RESET CURRENT USER AND RESET SHADE
		$scope.$on( 'logout', function(){
			self.resetLoginShade( function() {
				self.current_user = {
					name: '',
					avatar: '',
					editable: true,
				};
				LocalService.deleteLocal();
			});
		});

	};


	// LOAD DATA FUNCTIONS ============================

	self.loadUserData = function() {
		async.parallel([
			function(done){
				self.loadFriends( function(){
					done();
				});
			},
			function(done) {
				self.loadChatData( function(){
					done();
				});
			}
		], function() {
			// UPDATE ANY PERSONAL CHATS WITH USER INFORMATION
			if ( self.active_chats.length ) {
				_.each( self.active_chats, function( chat ) {
					// SET CHAT ID AT HIGHEST LEVEL
					chat.id = chat.conversation.id;
					// SET VALUES FOR PERSONAL CHATS
					if ( chat.users.length == 2 ) {
						// FIND USER ID THAT ISNT CURRENT USER'S
						var user = _.find( chat.users, function( user ) {
							return user.userid != self.current_user.id;
						});

						var friend = _.find( self.friends, { id: user.userid });
						// UPDATE CHAT WITH CONVERSATION INFO > FALLBACK TO FRIENDS'S INFO
						_.extend( chat, {
							name: chat.conversation.name || friend.name,
							avatar: friend.avatar
						});
						// UPDATE USER WITH PERSONAL CHAT ID
						friend.personal_chat_id = chat.conversation.id;
					} else if ( self.friends.length > 2 ) {
						_.extend( chat, {
							avatar: '../../assets/images/group_avatar.png',
							name: chat.conversation.name
						});
					}
				});
			}

			// IF INDEX > GO TO FIRST CHAT OR PROFILE
			if ( $state.is('main') ) {
				if ( self.active_chats.length ) {
					self.showChat( self.active_chats[0].id );
				} else {
					self.showProfile( self.current_user.id );
				}
			} else if ( $state.is('chat.show') ) {
				if ( !self.active_chats.length ) {
					self.showProfile( self.current_user.id );
				} else {
					self.showChat( $stateParams.id || self.active_chats[0].id );
				}
			} else if ( $state.is('profile.show') ) {
				self.showProfile( $stateParams.id || self.current_user.id );
			} else {
				self.showProfile( self.current_user.id );
			}

			self.status.loading = false;
			self.removeLoginShade();

			// START POLLING CHATS FOR NEW MESSAGES
			$timeout( function() {
				self.pollMessages();
			}, 5000);
		});
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

	self.loadChatData = function( callback ) {
		var endpoint = self.baseUrl + '/conversation/user/' + self.current_user.id;
		$.get( endpoint )
			.then(
				function( response ) {
					// SAVE RESPONSE TO ACTIVE CHATS
					self.active_chats = response;

					// TODO: FILTER BY LAST MESSAGE
					if ( _.isFunction(callback) ) {
						callback();
					}
				},
				function(response){
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	self.getMessages = function( chat, callback ) {
		$.get( self.baseUrl + '/conversation/' + chat.id + '/message/limited?limit=50&offset=0' )
			.then(
				function( response ) {
					
					if ( response.length ) {
						chat.last_message = _.last( response.reverse() ).id
					}

					if ( _.isFunction(callback) ) {
						callback();
					}
				},
				function( response ) {
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	self.checkNewMessages = function( chat, callback ) {
		$.get( self.baseUrl + '/conversation/' + chat.id + '/new/' + chat.last_message )
			.then(
				function( response ) {

					if ( response.length ) {
						chat.last_message = _.last( response ).id;
						chat.new_message = true;
					}

					if ( _.isFunction(callback) ) {
						callback();
					}
				},
				function( response ) {
					if ( chat.last_message ) {
						if ( _.isFunction(callback) ) {
							callback();
						}
					} else {
						console.log( '%cErrors', 'background:red;', response );
					}
				}
			);
	};

	self.pollMessages = function( chat, callback ) {
		if ( self.active_chats.length ) {
			var checkFunctions = _.map( self.active_chats, function(chat) {
				return function( done ) {
					if ( chat.last_message ) {
						self.checkNewMessages( chat, function(){
							done();
						});
					} else {
						self.getMessages( chat, function(){
							done();
						});
					}
				};
			});

			async.parallel( checkFunctions, function() {
				$timeout( function() {
					self.pollMessages();
				}, 5000)
			});
		} else {
			$timeout( function() {
				self.pollMessages();
			}, 5000)
		}

	};


	// USER BEHAVIOR & CRUD FUNCTIONS ====================

	self.login = function() {
		if ( !self._tmp.username ) {
			self.errors.login = true;
			console.log('no display name given');
		} else {
			$( '#login-screen .loader' ).removeClass('white');
			self.status.loading = true;
			// USE CURRENT TIMESTAMP AS A SIMPLE UNQIUE ID
			_.extend( self.current_user, { 
				name: _.clone( self._tmp.username ),
				id: Date.now()
			});
			LocalService.saveLocal( self.current_user );

			$( '#login-screen' ).addClass('loading');
			self._tmp = {};
			self.loadUserData();
		}
	};

	self.createTempChat = function() {
		self._tmp.chat = {
			friends: _.map( self.friends, function( friend ) {
				friend.selected = false;
				return friend;
			}),
			users: [],
			name: ''
		};
		$('#create-chat-modal').modal('show');
	};

	self.saveChat = function( id ) {
		// CREATE GROUP CHAT WITH SELECTED USERS
		self.errors.chat = {};
		self.status.saving = true;
		
		// IF ID PASSED > CREATING FROM USER PROFILE
		if ( id ) {
			var data = {
				users: [ id ],
			};
		// ELSE CREATING FROM _tmp MODAL
		} else {
			var data = {
				users: _.map( _.filter( self._tmp.chat.friends, function( friend ) {
					return friend.selected;
				}), 'id' ),
				name: _.clone( self._tmp.chat.name )
			};
		}

		// CHECK REQUIRED VALUES > RETURN IF NOT FOUND
		if ( !data.users.length || ( data.users.length > 1 && !data.name ) ) {
			console.log('Errors');
			if ( !data.name ) self.errors.chat.name = true;
			if ( !data.users.length ) self.errors.chat.users = true;
			self.status.saving = false;
			return;
		}

		// CHECK IF PERSONAL CHAT > IF PERSONAL CHECK IF CHAT EXISTS
		var personal_chat = false, chat_friend;
		if ( data.users.length == 1 && !data.name ) {
			personal_chat = true;
			chat_friend = _.find( self.friends, { id: data.users[0] });
			// IF CHAT FOUND SET AS ACTIVE CHAT WINDOW
			if ( chat_friend.personal_chat_id ) {
				self.status.saving = false;
				$('#create-chat-modal').modal('hide');
				self.showChat( chat_friend.personal_chat_id );
				self.shifted = false;
				return;
			}
		}

		// ADD CURRENT USER ID TO USERS ARRAY
		data.users.push( self.current_user.id );
		// FORMAT USER IDS TO STRING 
		data.users = data.users.join(',');
		// SET CORRECT CHAT ENDPOINT
		var endpoint = personal_chat ? '/conversation/personal' : '/conversation/group';
		$.post( self.baseUrl + endpoint, data )
			.then(
				function( response ) {
					$('#create-chat-modal').modal('hide');
					// PREDICTABLY UPDATE UI
					self.active_chats.splice( 0, 0, {
						id: response.id,
						name: data.name || chat_friend.name,
						avatar: personal_chat ? chat_friend.avatar : '../../assets/images/group_avatar.png'
					});
					// MAKE SURE TO NOT DUPLICATE PERSONAL CHATS AFTER CREATION
					if ( personal_chat ) chat_friend.personal_chat_id = response.id;
					self.status.saving = false;
					self.showChat( response.id );
				},
				function(response){
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	self.cancelChat = function() {
		self._tmp = {};
		self.errors = {};
	};

	self.showProfile = function( id ) {
		if (!id) return;
		// RESET ACTIVE CHATS & FRIENDS
		_.each( self.active_chats, function(chat){ chat.active = false; });
		_.each( self.friends, function(friend){ friend.active = false; });
		
		var friend = _.find( self.friends, { id: id });
		if ( friend ){
			friend.active = true;
		}
		$state.go( 'profile.show', { id: id } );
		self.switchTab( 'friends' )
	};

	self.showChat = function( id ) {
		if (!id) return;

		// RESET FRIENDS & ACTIVE CHATS
		_.each( self.friends, function(chat){ chat.active = false; });
		_.each( self.active_chats, function(friend){ friend.active = false; });
		var chat = _.find( self.active_chats, { id: id });
		if ( chat ){
			chat.active = true;
			chat.new_message = false;

			var chatIndex = _.indexOf( self.active_chats, chat );
			if ( chatIndex > 0 ) {
				self.active_chats.splice( chatIndex, 1 );
				self.active_chats.splice( 0, 0, chat );
			}
		}
		$state.go( 'chat.show', { id: id } );
		self.switchTab( 'chats' )
	};


	// UI CHANGE FUNCTIONS =======================

	self.buildLoginShade = function() {
		$('#login-screen').show();
		var canvas = document.getElementById( "login-bars" );
		var context = canvas.getContext( "2d" );
		// TODO: SET CANVAS TO ADJUST ON WINDOW RESIZE
		context.canvas.height = window.innerHeight;
		context.canvas.width = window.innerWidth;

		for ( var i = 0; i < 12; i++ ) {
			var width =  context.canvas.width / 12,
				height = context.canvas.height,
				x = width * i;

			self.bars.push({
				w: width,
				h: height,
				x: x,
				color: self.colors[i]
			});
		}


		self.drawBars( context );
		$('#login-bars').css({ opacity: 1 });

		self.init();
	};

	self.bars = [];
	self.drawBars = function( context ) {
		var canvas = context.canvas;
		context.clearRect(0, 0, canvas.width, canvas.height);
		for ( var i = 0; i < self.bars.length; i++ ) {
			var bar = self.bars[i];

			context.fillStyle = bar.color;
			context.fillRect( bar.x, 0, bar.w, bar.h );
		}
	};

	self.removeLoginShade = function() {
		$('#chat-platform').removeClass('hide');

		var canvas = document.getElementById("login-bars");
		var context = canvas.getContext("2d");
		var triggerIndex = 0;
		function removeBars() {
			for ( var i = 0; i < self.bars.length; i++ ) {
				if ( i <= triggerIndex ) {
					var bar = self.bars[i];
					if ( bar.h <= 0 ) {
						self.bars.splice( i, 1 );
						continue;
					}

					self.bars[i].h = bar.h - ( bar.h * 0.1 ) - 1;
					if ( self.bars[i].h < ( canvas.height * 0.8 ) ) {
						triggerIndex = i + 1;
					}
				}
			}
			self.drawBars( context );

			if ( !self.bars.length ) {
				$( '#login-screen' ).hide();
				return
			} else {
				setTimeout( removeBars, 10 );
			}
		}

		self.status.loading_window = false;
		removeBars();
	};

	self.resetLoginShade = function( callback ) {
		$('#chat-platform').addClass('hide');
		$('#login-screen').show().addClass('loading');

		var canvas = document.getElementById("login-bars");
		var context = canvas.getContext("2d");

		// SET NEW BARS
		self.bars = [];
		for ( var i = 0; i < 12; i++ ) {
			var width =  context.canvas.width / 12,
				x = width * i;
			self.bars.push({
				w: width,
				h: 0,
				x: x,
				max: context.canvas.height,
				color: self.colors[i]
			});
		}

		var max_height = false;
		function resetBars() {
			for ( var i = 0; i < self.bars.length; i++ ) {
				var bar = self.bars[i];
				if ( bar.h >= bar.max ) {
					max_height = true;
					continue;
				}

				self.bars[i].h = bar.h + ( ( bar.max - bar.h ) * 0.1 + 1 );
			}
			self.drawBars( context );

			if ( max_height ) {
				$('#login-screen').removeClass('loading');
				callback();
			} else {
				setTimeout( resetBars, 10 );
			}
		};

		self.drawBars( context );
		resetBars();

		callback();
	}

	self.shiftView = function() {
		$( '#chat-platform' ).toggleClass('shifted');
		$( '#mobile-menu-btn' ).toggleClass('fa-rotate-180');
	};

	self.switchTab = function( type ) {
		$( '#' + type + '-tab' ).tab('show');
	};


	// STATIC DATA =============

	self.colors = [ '#288542', '#329a43', '#5eb24c', '#7fc450', '#41b19d', '#388abf', '#2c68a6', '#205576', '#822330', '#be1a2e', '#d37527', '#d9b837' ];

}]);
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
'use strict'

skunq.controller( 'ProfileController', [ '$scope', '$state', '$stateParams', '$timeout', function( $scope, $state, $stateParams, $timeout ) {
	var self = this;
	var main = $scope.main;

	self.status = {
		loading: true
	};
	self.baseUrl = 'http://assignment.bunq.com';

	// INIT CONTROLLER =======

	self.init = function() {
		self.status.loading = true;
		_.extend( self, {
			current_user: main.current_user,
			friends: main.friends
		});

		// MAKE SURE USER IS LOGGED IN
		if ( !self.current_user || !self.current_user.id ) self.logout();

		// SET PROFILE AS CURRENT USER IF IDs MATCH
		if ( $stateParams.id == self.current_user.id ) {
			self.profile = self.current_user;
			self.status.loading = false;
		// ELSE IF FRIENDS ARRAY LOADED > CHECK FRIENDS FOR INFO
		} else if ( self.friends && self.friends.length ) {
			self.profile = _.find( self.friends, { id: $stateParams.id } );
			self.status.loading = false;
		// ELSE FETCH FRIENDS > THEN GET PROFILE INFO
		} else {
			self.loadFriends( function() {
				self.profile = _.find( self.friends, { id: $stateParams.id } );
				$timeout(function(){
					$scope.$apply();
					self.status.loading = false;
				});
			});
		}
	};

	// CREATE NEW CHAT ON MAIN SCOPE ==========

	self.createChat = function() {
		self.status.loading = true;
		$scope.$emit('create-chat');
	};

	// TRIGGER LOGOUT ON MAIN SCOPE ===========

	self.logout = function() {
		$scope.$emit('logout');
	};

	//  LOAD DATA FUNCTIONS ====================

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

					if ( _.isFunction( callback ) ) {
						callback();
					}
				},
				function(response){
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	$scope.$on( 'destroy', function(){
		self.status.loading = false;
	});

	self.init();
}]);
'use strict'

skunq.directive( 'skLoader', function() {
	return {
		restrict: 'E',
		replace: false,
		template: '<div id="sk_loader" class="shade"><div class="loader"></div></div>',
		link: function( scope, element, attr ) {

			// // REPLACE WITH IF/ELSES
			// // APPEND OR REMOVE LOADER SHADE
			// function __attachLoader( container ) {
			// 	if ( !container ) container = 'body';
			// 	// DONT CREATE IF LOADER ALREADY EXISTS ON CONTAINER
			// 	if ( $('#sk_loader')[0] ) return;

			// 	var loaderEl = $("<div>", { id: 'sk_loader', class: 'shade' });
			// 	loaderEl.html('<div class="loader"></div>');

			// 	$(container).append(loaderEl);
			// };
			// function __removeLoader() {
			// 	// ADD HALF A SECOND TO PREVENT ANY INSTANT ADD/REMOVE FLICKER
			// 	setTimeout( function(){ 
			// 		$( '#sk_loader' ).remove();
			// 	}, 500);
			// }
		}
	}
});