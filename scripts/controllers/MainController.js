'use strict'

skunq.controller( 'MainController', [ '$scope', '$rootScope', '$state', '$stateParams', '$transitions', '$http', 'LocalService', function( $scope, $rootScope, $state, $stateParams, $transitions, $http, LocalService ) {
	
	var $this = this;
	this._tmp = {};
	this.errors = {};
	this.baseUrl = 'http://assignment.bunq.com';
	this.status = {
		loading: true,
		loading_window: true
	};
	
	$scope.current_user = {
		name: '',
		avatar: '',
		editable: true,
	};
	$rootScope.friends = [];
	$rootScope.active_chats = [];


	// SCOPE BOUND FUNCTIONS ====================

	$scope.login = function() {
		if ( !$this._tmp.username ) {
			$this.errors.login = true;
			console.log('no display name given');
		} else {
			$( '#login-screen .loader' ).removeClass('white');
			$this.status.loading = true;
			// USE CURRENT TIMESTAMP AS A SIMPLE UNQIUE ID
			_.extend( $scope.current_user, { 
				name: _.clone( $this._tmp.username ),
				id: Date.now()
			});

			$( '#login-screen' ).addClass('loading');
			$this._tmp = {};
			$this.loadUserData();
		}
	};

	$scope.createTempChat = function() {
		$this._tmp.chat = {
			friends: _.map( $rootScope.friends, function( friend ) {
				friend.selected = false;
				return friend;
			}),
			users: [],
			name: ''
		};
		$('#create-chat-modal').modal('show');
	};

	$scope.saveChat = function() {
		console.log('Save');
		// CREATE GROUP CHAT WITH SELECTED USERS
		$this.errors.chat = {};
		$this.status.saving = true;
		// ATTACH USER IDS
		var data = {
			users: _.filter( $this._tmp.chat.friends, function( friend ) {
				return friend.selected;
			}),
			name: _.clone( $this._tmp.chat.name )
		};

		// CHECK REQUIRED VALUES > RETURN IF NOT FOUND
		if ( !data.users.length || ( data.users.length > 1 && !data.name ) ) {
			console.log('Errors');
			if ( !data.name ) $this.errors.chat.name = true;
			if ( !data.users.length ) $this.errors.chat.users = true;
			$this.status.saving = false;
			return;
		}

		// CHECK IF PERSONAL CHAT > IF PERSONAL CHECK IF CHAT EXISTS
		var personal_chat = false;
		if ( data.users.length == 1 && !data.name ) {
			personal_chat = true;
			var friend = _.find( $rootScope.friends, { id: data.users[0] });
			// IF CHAT FOUND SET AS ACTIVE CHAT WINDOW
			if ( friends.personal_chat_id ) {
				$this.status.saving = false;
				$('#create-chat-modal').modal('hide');
				$scope.showChat( friend.personal_chat_id );
				$this.shifted = false;
				return;
			}
		}

		// ADD CURRENT USER ID TO USERS ARRAY
		data.users.push( $scope.current_user.id );
		// FORMAT USER IDS TO STRING 
		data.users = data.users.join(',');
		// SET CORRECT CHAT ENDPOINT
		var endpoint = personal_chat ? '/conversation/personal' : '/conversation/group';
		$http.post( $this.baseUrl + endpoint, data )
			.then(
				function( response ) {
					console.log('Group Created');
					$('#create-chat-modal').modal('hide');
					$this.status.saving = false;
					$scope.showChat( response.id );
				},
				function(response){
					console.log( '%cErrors', 'background:red;', response );
				}
			);
	};

	$scope.cancelChat = function() {
		$this._tmp = {};
		$this.errors = {};
	};

	$scope.showProfile = function( id ) {
		if (!id) return;
		$state.go( 'profile.show', { id: id } );
		$this.switchTab( 'friends' )
	};
	$scope.showChat = function( id ) {
		if (!id) return;
		$state.go( 'chat.show', { id: id } );
		$this.switchTab( 'chats' )
	};

	// ON LOGOUT DETECT > RESET CURRENT USER AND RESET SHADE
	$scope.$on( 'logout', function(){
		$this.resetLoginShade( function() {
			$scope.current_user = {
				name: '',
				avatar: '',
				editable: true,
			};
			LocalService.deleteLocal();
		});
	})

	// DATA FUNCTIONS ============================

	this.init = function() {
		$this.status.loading = true;
		// CHECK FOR EXISTING USERS AND CHATS DATA TO DETERMINE BLOCKING DATA FETCH
		var local_user = localStorage.getItem( 'skunq_user' );
		if ( local_user ) {
			local_user = JSON.parse( local_user );
			// UPDATE CURRENT USER WITH LOCAL INFO
			_.extend( $scope.current_user, local_user );
			$this.loadUserData();
		} else {
			$state.go( 'main' );
			setTimeout(function(){
				$this.status.loading = false;
				$scope.$apply();
				$( '#login-screen' ).removeClass('loading');
			}, 2000 );
		}

		// ADD CHANGE LISTENER > ON CURRENT USER CHANGES, UPDATE LOCAL STORAGE VALUE 
		$scope.$watch( 'current_user', function( newVal, oldVal ) {
			if ( newVal && newVal.id ) {
				LocalService.saveLocal( newVal );
			} else {
				LocalService.deleteLocal();
			}
		}, true );
	};

	this.loadUserData = function() {
		async.parallel([
			function(done){
				$this.loadFriends( function(){
					done();
				});
			},
			function(done) {
				$this.loadChatData( function(){
					done();
				});
			}
		], function() {
			// UPDATE ANY PERSONAL CHATS WITH USER INFORMATION
			if ( $rootScope.active_chats.length ) {
				_.each( $rootScope.active_chats, function( chat ) {
					// SET CHAT ID AT HIGHEST LEVEL
					chat.id = chat.conversation.id;
					// SET VALUES FOR PERSONAL CHATS
					if ( $rootScope.friends.length == 2 ) {
						// FIND USER ID THAT ISNT CURRENT USER'S
						var friend_id = _.find( chat.users, function( user ) {
							return user.userid != $scope.current_user.id;
						});
						var friend = _.find( $rootScope.friends, { id: friend_id });
						// UPDATE CHAT WITH CONVERSATION INFO > FALLBACK TO FRIENDS'S INFO
						_.extend( chat, {
							name: chat.conversation.name || friend.name,
							avatar: friend.avatar
						});
						// UPDATE USER WITH PERSONAL CHAT ID
						friend.personal_chat_id = chat.conversation.id;
					} else if ( $rootScope.friends.length > 2 ) {
						_.extend( chat, {
							avatar: '../../assets/images/group_avatar.png',
							display_name: chat.conversation.name
						});
					}
				});
			}

			// IF INDEX > GO TO FIRST CHAT OR PROFILE
			console.log($state.current.name);
			if ( $state.current.name == 'main' ) {
				if ( $rootScope.active_chats.length ) {
					$scope.showChat( $rootScope.active_chats[0].id );
				} else {
					$scope.showProfile( $scope.current_user.id );
				}
			} else if ( $state.current.name == 'chat.show' ) {
				if ( !$rootScope.active_chats.length ) {
					$scope.showProfile( $scope.current_user.id );
				} else {
					$scope.showChat( $stateParams.id || $rootScope.active_chats[0].id );
				}
			} else if ( $state.current.name == 'profile.show' ) {
				$scope.showProfile( $stateParams.id || $scope.current_user.id );
			} else {
				$scope.showProfile( $scope.current_user.id );
			}

			$this.status.loading = false;
			$this.removeLoginShade();
		});
	};

	this.loadFriends = function( callback ) {
		var endpoint = $this.baseUrl + '/users';
		$http.get( endpoint )
			.then(
				function( response ) {
					// SAVE RESPONSE TO FRIENDS LIST
					$rootScope.friends = _.map( response.data, function( user ) {
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
	this.loadChatData = function( callback ) {
		var endpoint = $this.baseUrl + '/conversation/user/' + $scope.current_user.id;
		$http.get( endpoint )
			.then(
				function( response ) {
					// SAVE RESPONSE TO ACTIVE CHATS
					$rootScope.active_chats = response.data;

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


	// UI CHANGE FUNCTIONS =======================

	$scope.buildLoginShade = function() {
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

			$this.bars.push({
				w: width,
				h: height,
				x: x,
				color: $this.colors[i]
			});
		}


		$this.drawBars( context );
		$('#login-bars').css({ opacity: 1 });

		$this.init();
	};

	$this.bars = [];
	this.drawBars = function( context ) {
		var canvas = context.canvas;
		context.clearRect(0, 0, canvas.width, canvas.height);
		for ( var i = 0; i < $this.bars.length; i++ ) {
			var bar = $this.bars[i];

			context.fillStyle = bar.color;
			context.fillRect( bar.x, 0, bar.w, bar.h );
		}
	};

	this.removeLoginShade = function() {
		$('#chat-platform').removeClass('hide');

		var canvas = document.getElementById("login-bars");
		var context = canvas.getContext("2d");
		var triggerIndex = 0;
		function removeBars() {
			for ( var i = 0; i < $this.bars.length; i++ ) {
				if ( i <= triggerIndex ) {
					var bar = $this.bars[i];
					if ( bar.h <= 0 ) {
						$this.bars.splice( i, 1 );
						continue;
					}

					$this.bars[i].h = bar.h - ( bar.h * 0.1 ) - 1;
					if ( $this.bars[i].h < ( canvas.height * 0.8 ) ) {
						triggerIndex = i + 1;
					}
				}
			}
			$this.drawBars( context );

			if ( !$this.bars.length ) {
				$( '#login-screen' ).hide();
				return
			} else {
				setTimeout( removeBars, 10 );
			}
		}

		$this.status.loading_window = false;
		removeBars();
	};

	this.resetLoginShade = function( callback ) {
		$('#chat-platform').addClass('hide');
		$('#login-screen').show().addClass('loading');

		var canvas = document.getElementById("login-bars");
		var context = canvas.getContext("2d");

		// SET NEW BARS
		$this.bars = [];
		for ( var i = 0; i < 12; i++ ) {
			var width =  context.canvas.width / 12,
				x = width * i;
			$this.bars.push({
				w: width,
				h: 0,
				x: x,
				max: context.canvas.height,
				color: $this.colors[i]
			});
		}

		var max_height = false;
		function resetBars() {
			for ( var i = 0; i < $this.bars.length; i++ ) {
				var bar = $this.bars[i];
				if ( bar.h >= bar.max ) {
					max_height = true;
					continue;
				}

				$this.bars[i].h = bar.h + ( ( bar.max - bar.h ) * 0.1 + 1 );
			}
			$this.drawBars( context );

			if ( max_height ) {
				$('#login-screen').removeClass('loading');
				callback();
			} else {
				setTimeout( resetBars, 10 );
			}
		};

		$this.drawBars( context );
		resetBars();

		callback();
	}

	this.shiftView = function() {
		$( '#chat-platform' ).toggleClass('shifted');
		$( '#mobile-menu-btn' ).toggleClass('fa-rotate-180');
	};

	this.switchTab = function( type ) {
		$( '#' + type + '-tab' ).tab('show');
	};

	this.colors = [ '#288542', '#329a43', '#5eb24c', '#7fc450', '#41b19d', '#388abf', '#2c68a6', '#205576', '#822330', '#be1a2e', '#d37527', '#d9b837' ];

	// UI LISTENERS =============

	$( '#create-chat-modal' ).on('hide.bs.modal', function(){
		$scope.cancelChat();
	});

}]);