'use strict'

// CREATE GLOBAL UTIL FUNCTIONS
const skunq = {
	// ADD AND REMOVE USER DATA TO LOCAL FOR QUICK LOGIN
	saveLocal: function( attrs ) {
		if ( attrs ) {
			localStorage.setItem( 'skunq_user', JSON.stringify( attrs ) );
		}
	},
	// REMOVE ON LOGOUT
	deleteLocal: function() {
		localStorage.removeItem( 'skunq_user' );
	},
	colors: [ '#288542', '#329a43', '#5eb24c', '#7fc450', '#41b19d', '#388abf', '#2c68a6', '#205576', '#822330', '#be1a2e', '#d37527', '#d9b837' ]
};
const BaseUrl = 'http://assignment.bunq.com';

// ===== MODELS =======================
// ====================================
// ====================================
// ====================================

var User = Backbone.Model.extend({
	defaults: {
		display_name: '',
		avatar: '',
		new_message: '',
		editable: false,
		active: false,
		selected: false
	}
});

var Chat = Backbone.Model.extend({
	defaults: {
		display_name: '',
		avatar: '',
		new_message: false,
		active: false,
		messages: []
	}
});



// ===== COLLECTIONS ==================
// ====================================
// ====================================
// ====================================

var Friends = Backbone.Collection.extend({
	model: User,
	url: BaseUrl + '/users',
	parse: function( response ) {
		var list = [];
		_.each( response, function( user ){
			list.push( new User( {
				id: user.id,
				display_name: user.name,
				// ADD AVATAR FOR NICER UI EFFECT
				avatar: 'assets/images/avatars/' + user.id + '.jpg'
			} ) );
		});
		return list;
	}
});

var Chats = Backbone.Collection.extend({
	model: Chat,
	url: function(){
		return BaseUrl + '/conversation/user/' + skunq.current_id;
	}
});



// ===== VIEWS ========================
// ====================================
// ====================================
// ====================================

// ==== USER INFO BLOCK

var UserView = Backbone.View.extend({
	tagName: 'div',
	className: 'user-block',
	events: {
		'click': 'openProfile'
	},
	initialize: function() {
		this.model.on( 'change', this.render, this );
	},
	render: function() {
		if ( !this.model || !this.model.has('id') ) return;
		var template = _.template( $('#userBlockTemplate').html() );
		var html = template( this.model.toJSON() );
		this.$el.html(html);

		return this;
	},
	openProfile: function() {
		setActiveProfile( this.model );
		__shiftView();
	}
});

// ==== FRIENDS LIST

var FriendView = Backbone.View.extend({
	tagName: 'li',
	className: 'friend-item list-item',
	events: {
		'click': 'openProfile'
	},
	initialize: function() {
		this.model.on( 'change', this.render, this );
	},
	render: function() {
		var template = _.template( $('#listItemTemplate' ).html() );
		var html = template( this.model.toJSON() );
		this.$el.html( html );

		// SET ACTIVE CLASS
		if ( this.model.get('active') ) $(this.$el).addClass('active');
		else $(this.$el).removeClass('active');

		return this;
	},
	openProfile: function() {
		setActiveProfile( this.model );
		__shiftView();
	}
});

var FriendsView = Backbone.View.extend({
	render: function() {
		var $this = this;
		var listEl = $( '<ul>', { class: 'friends-list' } );
		this.model.each( function( friend ) {
			var friendView = new FriendView( { model: friend } );
			listEl.append( friendView.render().$el );
		});
		this.$el.html( listEl );

		return this;
	}
});

// ==== CHATS LIST

var ChatView = Backbone.View.extend({
	tagName: 'li',
	className: 'chat-item list-item',
	events: {
		'click': 'openChat'
	},
	initialize: function() {
		var $this = this;
		this.model.on( 'change', this.render, this );
		this.loadMessages();
	},
	render: function() {
		var template = _.template( $('#listItemTemplate' ).html() );
		var html = template( this.model.toJSON() );
		this.$el.html( html );

		if ( this.model.get('active') ) $(this.$el).addClass('active');
		else $(this.$el).removeClass('active');

		return this;
	},
	openChat: function() {
		// SET MAIN WINDOW WITH CHAT
		setActiveChat( this.model.get('id') );
		__shiftView();
	},
	loadMessages: function() {
		var $this = this;

		if ( this.model && this.model.get('id') ) {
			$.ajax({
				method: 'GET',
				url: BaseUrl + '/conversation/' + this.model.get('id') + '/message/limited?limit=50&offset=0'
			}).then(
				function( response ) {
					if ( response.length ) {
						var messages = response.reverse();
						$this.model.set({
							messages: messages,
							last_message: _.last( messages ).id
						});
					}

					setTimeout( function(){
						$this.checkMessages();
					}, 3000 );
				},
				function( response ) {
					if ( $this.model.get( 'last_message' ) ) {
						$this.model.set({
							messages: $this.model.get('messages'),
						});
						setTimeout( function(){
							$this.checkMessages();
						}, 3000 );
					} else {
						console.log( '%cErrors', 'background:red;', response );
					}
				}
			);
		} else {
			setTimeout( function() { $this.loadMessages() }, 200 );
		}
	},
	checkMessages: function() {
		var $this = this;
		if ( !current_user || !current_user.get('id') ) return;
		if ( this.model && this.model.get('last_message') ) {
			$.ajax({
				method: 'GET',
				url: BaseUrl + '/conversation/' + $this.model.get('id') + '/new/' + $this.model.get('last_message' )
			}).then(
				function( response ) {
					if ( response && response.length ) {
						var attrs = {}
						if ( $this.model.get('active') ) {
							var messages = $this.model.get('messages').concat( response );
							var last_message = _.last(messages).id;
							attrs = {
								messages: messages,
								last_message: last_message
							}
						} else {
							attrs = {
								new_message: true
							}
						}

						$this.model.set( attrs );
					}
					setTimeout( function(){
						$this.checkMessages();
					}, 5000 );
				},
				function( response ) {
					setTimeout( function(){
						$this.checkMessages();
					}, 5000 );
				}
			);
		} else {
			setTimeout( function(){
				$this.checkMessages();
			}, 5000 );
		}
	}
});

var ChatsView = Backbone.View.extend({
	initialize: function() {
		this.model.on( 'update', this.render, this );
	},
	render: function() {
		var $this = this;

		if ( this.model.length ) {
			var listEl = $( '<ul>', { class: 'chats-list' } );
			this.model.each( function( chat ) {
				var chatView = new ChatView( { model: chat } );
				listEl.append( chatView.render().$el );
			});
			this.$el.html( listEl );
		} else {
			var emptyEl = $( '<div>', { class: 'empty-list' } );
			emptyEl.html(
				'<h1 class="text-center"><span class="glyphicon glyphicon-th-list"></span></h1>' +
				'<h6 class="text-center">No chats created yet.</h6>'
			);
			this.$el.html( emptyEl );
		}

		return this;
	}
});

// ==== CREATE GROUP MODAL

// ==== FRIENDS LIST

var SelectUserView = Backbone.View.extend({
	tagName: 'li',
	className: 'user-select-item',
	events: {
		'click': 'selectUser'
	},
	initialize: function() {
		this.model.on( 'change:selected', this.render, this );
	},
	render: function() {
		var template = _.template( $('#selectUserTemplate' ).html() );
		var html = template( this.model.toJSON() );
		this.$el.html( html );

		return this;
	},
	selectUser: function() {
		if ( this.model.has('selected') ) {
			this.model.set({ 
				selected: !this.model.get('selected') 
			});
		}
		$(this.$el).toggleClass('selected');
	}
});

var CreateChatView = Backbone.View.extend({
	events: {
		'click #create-chat-btn': 'createChat',
		'keydown': 'keyPress'
	},
	initialize: function() {
		var $this = this;
		$('#create-chat-modal').on('hide.bs.modal', function(){
			$this.cancelChat();
		});
	},
	render: function() {
		var $this = this;
		var html = $('<div>').html(
			'<h3>Create New Chat</h3>' +
			'<div class="user-select">' +
				'<ul></ul>' +
				'<p class="text-center text-secondary">Select users to add to group</p>' +
				'<div id="create-chat-name" class="text-center">' +
					'<p>Chat Name</p>' +
					'<input class="form-control" />' +
				'</div>' +
				'<button id="create-chat-btn" class="btn btn-primary"><i class="fa fa-comments-o"></i> Create Chat</button>' +
			'</div>'
		);
		var listEl = $(html).find('ul');
		this.model.each( function( friend ) {
			var selectUserView = new SelectUserView( { model: friend } );
			listEl.append( selectUserView.render().$el );
		});
		this.$el.html( html );

		return this;
	},
	keyPress: function(e){
		if ( e.which === 13 ) {
			this.createChat();
		}
	},
	createChat: function() {
		var $this = this;
		$('#create-chat-name').removeClass('has-error');
		// CREATE GROUP CHAT WITH SELECTED USERS
		__attachLoader( '#main' );

		// ATTACH USER IDS
		var data = {
			users: [],
			name: $('#create-chat-name input').val()
		};
		_.each( this.model.models, function( friend ) {
			if ( friend.get( 'selected' ) ) {
				data.users.push( friend.get('id') );
			}
		});
		// CHECK REQUIRED VALUES > RETURN IF NOT FOUND
		if ( !data.users.length || ( data.users.length > 1 && !data.name ) ) {
			if ( !data.name ) $('#create-chat-name').addClass('has-error');
			// TODO: ADD BETTER ERROR HANDLING
			if ( !data.users.length ) alert( 'Please select at least one user' );

			__removeLoader();
			return;
		}

		// CHECK IF PERSONAL CHAT > IF PERSONAL CHECK IF CHAT EXISTS
		var personal_chat = false, chat_friend;
		if ( data.users.length == 1 ) {
			personal_chat = true;
			var friend_id = _.find( data.users, function( user ) {
				return user != current_user.id;
			});
			chat_friend = this.model.get( friend_id );
			// IF CHAT FOUND SET AS ACTIVE CHAT WINDOW
			if ( chat_friend.has( 'personal_chat_id' ) ) {
				$('#create-chat-modal').modal('hide');
				setActiveChat( chat_friend.get('personal_chat_id') );
				__shiftView();
				__removeLoader();
				return;
			}
		}

		// IF NOT CHAT EXISTS > CREATE NEW
		// ADD CURRENT USER ID TO USERS ARRAY
		data.users.push( skunq.current_id );
		// FORMAT USER IDS TO STRING 
		data.users = data.users.join(',');
		// SET CORRECT CHAT ENDPOINT
		var endpoint = personal_chat ? '/conversation/personal' : '/conversation/group';
		$.ajax({
			method: 'POST',
			url: BaseUrl + endpoint,
			data: data
		}).then(
			function( response ) {
				var attrs = { id: response.id, new_message: false };
				$.ajax({
					method: 'GET',
					url: BaseUrl + '/conversation/' + response.id
				}).then(
					function( response ) {
						if ( personal_chat ) {
							chat_friend.set({ personal_chat_id: response.id });
							_.extend( attrs, {
								display_name: chat_friend.get( 'display_name' ),
								avatar: chat_friend.get( 'avatar' ),
							}, response );
						} else {
							_.extend( attrs, {
								display_name: data.name,
								avatar: 'assets/images/group_avatar.png',
							}, response );
						}

						chats.add( attrs );
						$('#create-chat-modal').modal('hide');
						setActiveChat( attrs.id );
						__shiftView();
					},
					function() {
						console.log('ERROR: ', response );
					}
				);
			},
			function( response ) {
				console.log('ERROR: ', response );
			}
		);
	},
	cancelChat: function() {
		_.each( this.model.models, function( friend ){
			friend.set({ selected: false });
		});
		$('.user-select-item').removeClass('selected');
		$('#create-chat-name').removeClass('has-error');
		$('#create-chat-name input').val('');
	}
});


// ==== MAIN CHAT WINDOW

var ChatWindowView = Backbone.View.extend({
	tagName: 'div',
	className: 'chat-window',
	events: {
		"click .send-btn": "sendMessage",
		"keydown": "keyPress"
	},
	initialize: function() {
		var $this = this;
		this.render = _.wrap( this.render, function( render ) {
			render.apply(this);						
			$this.afterRender();
		});
		this.render();

		this.model.on( 'change:messages change:active', this.render, this );
	},
	render: function() {
		if ( !this.model.get('active') ) return;
		var $this = this;
		var template = _.template( $('#chatWindowTemplate').html() );

		var users = this.model.get('users');
		var user_info = {};
		if ( !users || !users.length ){
			user_info[current_user.get('id')] = current_user.attributes;
		// SET USER INFO OBJECT FOR ALL USERS IN MESSAGE
		} else {
			_.each( users, function( user ){
				if ( user.userid == current_user.get('id') ) {
					user_info[ user.userid ] = current_user.attributes;
				} else {
					var friend = friends.get( user.userid );
					user_info[ user.userid ] = friend.attributes;
				}
			});
		}
		var html = template( _.extend( { user_info: user_info }, $this.model.attributes ) );
		this.$el.html( html );
		return this;
	},
	afterRender: function() {
		// SET MAX HEIGHT WITH SCROLL FOR BOTTOM SET CHAT EFFECT
		var height = $('.conversation').height();
		var max_height = $('.chat-window').height();
		if ( height > 0 && height >= max_height - 78 ) {
			$('.conversation').height( max_height - 118 ); /* bottom + padding */
			$('.conversation').scrollTop( $('.conversation')[0].scrollHeight );
		}
	},
	keyPress: function(e){
		if ( e.which === 13 ) {
			this.sendMessage();
		}
	},
	sendMessage: function(e){
		var $this = this;
		// GET TEXT
		var text = $('.message-input').val();
		// IF EMPTY STOP EVENT
		if (!text) return;

		var conversation_id = this.model.get('id');
		var temp_id = Date.now();
		var new_message = {
			tempId: temp_id,
			message: text,
			senderId: current_user.get('id'),
			conversationId: conversation_id,
			status: 'sending'
		};
		// ADD NEW MESSAGES INTUITIVELY > UPDATE STATUS ON BACKEND RESPONSE
		this.model.set({
			messages: $this.model.get('messages').concat([ new_message ])
		});
		// SEND (POST) MESSAGE
		$.ajax({
			method: 'POST',
			url: BaseUrl + '/conversation/' + conversation_id + '/message/send',
			data: new_message
		}).then(
			function( response ) {
				$('.message-input').val('')
				var messages = _.clone( $this.model.get('messages') );
				var msgIndex = _.indexOf( messages, new_message );

				_.extend( messages[msgIndex], {
					id: response.id,
					status: 'sent',
					timestamp:  __timestampString()
				});
				$this.model.set({ 
					messages: messages,
					last_message: response.id
				});
				$this.model.trigger('change', $this.model);

				__sendFakeResponse( $this.model );
			},
			function( response ) {
				console.log( '%cErrors', 'background:red;', response );
			}
		);
	},
	cleanup: function() {
		this.undelegateEvents();
		$(this.el).empty();
	}
});

// ==== MAIN PROFILE WINDOW

var ProfileWindowView = Backbone.View.extend({
	tagName: 'div',
	className: 'profile-window',
	events: {
		"click #profile-new-chat-btn": "createChat",
		"click #profile-logout-btn": "logout"
	},
	initialize: function() {
		this.model.on( 'change', this.render, this );
	},
	render: function() {
		if ( !this.model.get('id') ) return;
		var $this = this;
		var template = _.template( $('#profileWindowTemplate').html() );
		var html = template( $this.model.attributes );
		this.$el.html( html );

		return this;
	},
	createChat: function() {
		var $this = this;

		function getConversation( id ) {
			$.ajax({
				method: 'GET',
				url: BaseUrl + '/conversation/' + id
			}).then(
				function( response ) {
					var attrs = { 
						id: id, 
						new_message: false,
						messages: []
					};
					$this.model.set({ 
						personal_chat_id: id 
					});
					_.extend( attrs, {
						display_name: $this.model.get( 'display_name' ),
						avatar: $this.model.get( 'avatar' ),
					}, response );
					
					chats.add( attrs );
					setActiveChat( attrs.id );
				},
				function() {
					console.log('ERROR: ', response );
				}
			);
		};
		// CHECK IF ANY CHAT WITH THAT USER & CURRENT ID
		if ( this.model.has('personal_chat_id' ) ) {
		// IF CHAT FOUND SET AS ACTIVE CHAT WINDOW
			getConversation( this.model.get('personal_chat_id') )
			// setActiveChat( this.model.get('personal_chat_id') );
		} else {
		// IF NOT CREATE NEW PERSONAL CHAT IN BACKEND
			__attachLoader( '#main' );

			var users = [ this.model.get('id'), skunq.current_id ];
			$.ajax({
				method: 'POST',
				url: BaseUrl + '/conversation/personal',
				data: {
					users: users.join(',')
				}
			}).then(
				function( response ) {
					getConversation( response.id );
				},
				function( response ) {
					console.log('ERROR: ', response );
				}
			);
		}
	},
	cleanup: function() {
		this.undelegateEvents();
		$(this.el).empty();
	},
	logout: function() {
		var $this = this;
		__resetLoginShade( function() {
			current_user.clear();
			skunq.deleteLocal();
		});
	}
});



// ===== UTILS ========================
// ====================================
// ====================================
// ====================================

function __timestampString() {
	var date = new Date(),
		year = date.getFullYear(),
		month = date.getMonth() + 1,
		day = date.getDate(),
		hour = date.getHours(),
		minute = date.getMinutes(),
		second = date.getSeconds();

	var timestamp = year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
	return timestamp;
}


// ===== App Functions ================
// ====================================
// ====================================
// ====================================

var current_user, userView;
function init() {
	// SET USER MODEL
	current_user = new User();
	// ADD EVENT LISTERS MODULE TO CURRENT USER
	_.extend( current_user, Backbone.Events );
	// ADD CAHNGE LISTENER > ON CURRENT USER CHANGES, UPDATE LOCAL STORAGE VALUE 
	current_user.on( 'change', function(){
		// IF ATTRIBUTES UPDATE/SAVE LOCAL ITEM
		if ( this.attributes && Object.keys(this.attributes).length ) {
			skunq.saveLocal( this.attributes );
		// OTHERWISE DELETE LOCAL ITEM ( LOGOUT )
		} else {
			skunq.deleteLocal();
		}
	}, current_user);

	// SET NAV MENU USER BLOCK VIEW
	userView = new UserView({
		el: '#user-block',
		model: current_user
	});
	userView.render();

	// CHECK FOR EXISTING USERS AND CHATS DATA TO DETERMINE BLOCKING DATA FETCH
	var local_user = localStorage.getItem( 'skunq_user' );
	if ( local_user ) {
		local_user = JSON.parse( local_user );
		current_user.set( local_user );
		skunq.current_id = current_user.get('id');
		loadUserData();
	} else {
		setTimeout(function(){
			__removeLoader();
			$('#login-screen').removeClass('loading');
		}, 2000);
	}
};

// ========= USER FUNCTIONS ==========
// ===================================

function login() {
	$('#login-panel .input-group').removeClass('has-error');
	var display_name = $('#login-input').val();
	if ( !display_name ) {
		$('#login-panel .input-group').addClass('has-error');
		console.log('no display name given');
	} else {
		__attachLoader( '#login-screen' );
		// USE CURRENT TIMESTAMP AS A SIMPLE UNQIUE ID
		current_user.set({ 
			display_name: display_name,
			id: Date.now(),
			editable: true,
			avatar: ''
		});
		// SET CURRENT ID GLOBALLY
		skunq.current_id = current_user.get('id');
		$('#login-screen').addClass('loading');
		$('#login-input').val('');
		loadUserData();

		// TODO: TEST IF CREATE USER ENDPOINT AVAILABLE
	}
}

// ============ LOAD DATA ============
// ===================================

var friends, chats;
function loadUserData() {
	async.parallel([
		function(done){
			loadFriends( function(){
				done();
			});
		},
		function(done) {
			loadChatData( function(){
				done();
			});
		}
	], function() {
		// UPDATE ANY PERSONAL CHATS WITH USER INFORMATION
		if ( chats.models.length ) {
			_.each( chats.models, function( chat ) {
				// SET VALUES FOR PERSONAL CHATS
				var users = chat.get('users');
				if ( users && users.length == 2 ) {
					// FIND USER ID THAT ISNT CURRENT USER'S
					var user_id = _.find( users, function( user ) {
						return user.userid != current_user.id;
					}).userid;

					var user = friends.get(user_id);
					// UPDATE CHAT WITH OTHER USER'S DISPLAY NAME AND AVATAR
					if ( user ) {
						chat.set({
							id: chat.get( 'conversation' ).id,
							display_name: user.get( 'display_name' ),
							avatar: user.get( 'avatar' )
						});
						// UPDATE USER WITH PERSONAL CHAT ID
						user.set({
							personal_chat_id: chat.get('conversation').id
						});
					} else {
						chat.set({
							display_name: 'DELETED USER',
						});
					}
				} else if ( users && users.length > 2 ) {
					chat.set({
						id: chat.get( 'conversation' ).id,
						avatar: 'assets/images/group_avatar.png',
						display_name: chat.get( 'conversation' ).name
					});
				}
			});

			// SET LATEST AS ACTIVE CHAT
			setActiveChat( chats.at(0).get('id') );
		} else {
			// IF NO CHATS YET DEFAULT OPEN FRIENDS LIST AND CURRENT USER PROFILE
			__switchPanes( 'friends' );
			setActiveProfile( current_user );
		}

		__removeLoginShade();
	});
};
function loadFriends(callback) {
	friends = new Friends();
	friends.fetch({
		success: function( response ){
			// RENDER AND ATTACH FRIENDS VIEW
			var friendsView = new FriendsView({
				el: '#friends-nav',
				model: friends
			});
			friendsView.render();

			// ATTACH FRIENDS TO CREATE CHAT MODAL VIEW
			var createChatView = new CreateChatView({
				el: '#create-chat-modal .panel-body',
				model: friends
			});
			createChatView.render();
			
			if ( _.isFunction(callback) ) {
				callback();
			}
		},
		error: function( response ) {
			console.log( '%cErrors', 'background:red;', response );
			if ( _.isFunction(callback) ) {
				callback();
			}
		}
	});
};
function loadChatData( callback ) {
	chats = new Chats();
	chats.fetch({
		success: function( response ) {
			// RENDER AND ATTACH CHATS VIEW
			var chatsView = new ChatsView({
				el: '#chats-nav',
				model: chats
			});
			chatsView.render();

			if ( _.isFunction(callback) ) {
				callback();
			}
		},
		error: function(response){
			console.log( '%cErrors', 'background:red;', response );
			if ( _.isFunction(callback) ) {
				callback();
			}
		}
	});
};


// ========== CHAT FUNCTIONS =========
// ===================================

var chatWindowView;
function setActiveChat( chatId ) {
	if ( !chatId ) return;
	if ( skunq.current_window && skunq.current_window == chatId + 'c' ) return;

	// SET CURRENT ACTIVE CHAT ID GLOBAL
	skunq.current_window = chatId + 'c';
	// ADD LOADER ICON
	__attachLoader( '#main' );

	// IF CHAT CURRENTLY ACTIVE UNDELEGATE EVENTS AND CLEAR EL
	if ( chatWindowView )chatWindowView.cleanup();
	// RENDER CHAT WINDOW
	// TODO: REMOVE AND THEN SAVE NEW?
	chatWindowView = new ChatWindowView({
		el: '#chat-pane',
		model: chats.get( chatId )
	});
	chatWindowView.render();

	// RESET ALL LIST ITEMS ACTIVE STATUS
	_.each( chats.models, function( chat ) {
		chat.set({ active: false });
	});
	_.each( friends.models, function( friend ) { 
		friend.set({ active: false }); 
	});
	
	// GET CHATS LATEST MESSAGES OR ALL MESSAGES
	var last_message = chatWindowView.model.get('last_message');
	chatWindowView.model.set({ active: true });
	if ( chatWindowView.model.get('last_message') ) {
		$.ajax({
			method: 'GET',
			url: BaseUrl + '/conversation/' + chatWindowView.model.get('id') + '/new/' + chatWindowView.model.get('last_message' )
		}).then(
			function( response ) {
				if ( response && response.length ) {
					var messages = chatWindowView.model.get('messages').concat( response );
					var last_message = _.last(messages).id;
					chatWindowView.model.set({
						new_message: false,
						messages: messages,
						last_message: last_message
					});
				}

				__switchPanes( 'chat' );
				__removeLoader();
			},
			function( response ) {
				if ( last_message ) {
					chatWindowView.model.set({
						new_message: false
					});
				} else {
					console.log( '%cErrors', 'background:red;', response );
				}
				__switchPanes( 'chat' );
				__removeLoader();
			}
		);
	} else {
		__switchPanes( 'chat' );
		__removeLoader();
	}
};

// FUNCTION TO FAKE RESPONSE MESSAGE AFTER YOU MESSAGE SOMEONE
function __sendFakeResponse( chat ) {
	var friend_id = _.find( chat.get('users'), function( user ) {
		return user != current_user.id;
	}).userid;

	$.ajax({
		method: 'POST',
		url: BaseUrl + '/conversation/' + chat.get('id') + '/message/send',
		data: {
			message: 'OK, sure.' + Date.now(),
			senderId: friend_id
		}
	});

};


// ======== PROFILE FUNCTIONS ========
// ===================================

var profileWindowView;
function setActiveProfile( user ) {
	if ( !user.has('id') ) return;
	var friend_id = user.get('id');
	if ( skunq.current_window && skunq.current_window == friend_id + 'p' ) return;

	// SET CURRENT ACTIVE CHAT ID GLOBAL
	skunq.current_window = friend_id + 'p';
	// ADD LOADER ICON
	__attachLoader( '#main' );
	__switchPanes( 'friends' );

	// RESET ALL LIST ITEMS ACTIVE STATUS
	_.each( friends.models, function( friend ) { 
		friend.set({ active: false }); 
	});
	_.each( chats.models, function( chat ) {
		chat.set({ active: false });
	});

	// IF CHAT CURRENTLY ACTIVE UNDELEGATE EVENTS AND CLEAR EL
	if ( profileWindowView ) profileWindowView.cleanup();
	// RENDER CHAT WINDOW
	profileWindowView = new ProfileWindowView({
		el: '#profile-pane',
		model: user
	});
	profileWindowView.render();

	profileWindowView.model.set({ active: true });
	
	// GET CHATS LATEST MESSAGES OR ALL MESSAGES
	var last_message = profileWindowView.model.get('last_message');
	
	__removeLoader();
};


// =========== UI FUNCTIONS ==========
// ===================================
var bars = [];
function drawBars( context ) {
	var canvas = context.canvas;
	context.clearRect(0, 0, canvas.width, canvas.height);
	for ( var i = 0; i < bars.length; i++ ) {
		var bar = bars[i];

		context.fillStyle = bar.color;
		context.fillRect( bar.x, 0, bar.w, bar.h );
	}
};

function __buildLoginShade( callback ) {
	$('#login-screen').show();
	var canvas = document.getElementById( "login-bars" );
	var context = canvas.getContext("2d");
	// TODO: SET CANVAS TO ADJUST ON WINDOW RESIZE
	context.canvas.height = window.innerHeight;
	context.canvas.width = window.innerWidth;

	for ( var i = 0; i < 12; i++ ) {
		var width =  context.canvas.width / 12,
			height = context.canvas.height,
			x = width * i;

		bars.push({
			w: width,
			h: height,
			x: x,
			color: skunq.colors[i]
		});
	}


	drawBars( context );
	$('#login-bars').css({ opacity: 1 });

	callback();
};

function __removeLoginShade() {
	$('#chat-platform').removeClass('hide');

	var canvas = document.getElementById("login-bars");
	var context = canvas.getContext("2d");

	var triggerIndex = 0;
	function removeBars() {
		for ( var i = 0; i < bars.length; i++ ) {
			if ( i <= triggerIndex ) {
				var bar = bars[i];
				if ( bar.h <= 0 ) {
					bars.splice( i, 1 );
					continue;
				}

				bars[i].h = bar.h - ( bar.h * 0.1 ) - 1;
				if ( bars[i].h < ( canvas.height * 0.8 ) ) {
					triggerIndex = i + 1;
				}
			}
		}
		drawBars( context );

		if ( !bars.length ) {
			$( '#login-screen' ).hide();
			return
		} else {
			setTimeout( removeBars, 10 );
		}
	}

	__removeLoader();
	removeBars();
};

function __resetLoginShade( callback ) {
	$('#chat-platform').addClass('hide');
	$('#login-screen').show().addClass('loading');

	var canvas = document.getElementById("login-bars");
	var context = canvas.getContext("2d");

	// SET NEW BARS
	bars = [];
	for ( var i = 0; i < 12; i++ ) {
		var width =  context.canvas.width / 12,
			x = width * i;
		bars.push({
			w: width,
			h: 0,
			x: x,
			max: context.canvas.height,
			color: skunq.colors[i]
		});
	}

	var max_height = false;
	function resetBars() {
		for ( var i = 0; i < bars.length; i++ ) {
			var bar = bars[i];
			if ( bar.h >= bar.max ) {
				max_height = true;
				continue;
			}

			bars[i].h = bar.h + ( ( bar.max - bar.h ) * 0.1 + 1 );
		}
		drawBars( context );

		if ( max_height ) {
			$('#login-screen').removeClass('loading');
			callback();
		} else {
			setTimeout( resetBars, 10 );
		}
	};

	drawBars( context );
	resetBars();

	callback();
}

// APPEND OR REMOVE LOADER SHADE
function __attachLoader( container ) {
	if ( !container ) container = 'body';
	// DONT CREATE IF LOADER ALREADY EXISTS ON CONTAINER
	if ( $('#sk_loader')[0] ) return;

	var loaderEl = $("<div>", { id: 'sk_loader', class: 'shade' });
	loaderEl.html('<div class="loader"></div>');

	$(container).append(loaderEl);
};
function __removeLoader() {
	// ADD HALF A SECOND TO PREVENT ANY INSTANT ADD/REMOVE FLICKER
	setTimeout( function(){ 
		$( '#sk_loader' ).remove();
	}, 500);
};

function __switchPanes( type ) {
	var tabSelector, paneSelector;
	if ( type == 'chat' ) {
		tabSelector = '#chats-tab';
		paneSelector = '#chat-pane';
	} else if ( type =='friends' ) {
		tabSelector = '#friends-tab';
		paneSelector = '#profile-pane';
	} else {
		return;
	}

	// SWITCH NAV TAB
	$( tabSelector ).tab('show');

	// DONT TRIGGER IF ALREADY ACTIVE
	if ( $(paneSelector).hasClass('active') ) return;
	// HANDLE MAIN PANE SWITCH WITHOUT NAV TAB ELEMENTS
	$('#main .tab-pane').removeClass('active');
	$( paneSelector ).addClass('active');
};

function __shiftView() {
	$( '#chat-platform' ).toggleClass('shifted');
	$( '#mobile-menu-btn' ).toggleClass('fa-rotate-180');
};


// ========= EVENT LISTENERS =========
// ===================================

$( document ).ready( function() {
	// BUILD LOADER SHADE THEN INIT APP
	__buildLoginShade( init );
	$( '#login-btn' ).on( 'click', login );
	$( '#mobile-menu-btn' ).on( 'click', __shiftView );

});