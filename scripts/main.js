'use strict'

// TODO: MOVE TO A MODULE SYSTEM
// CREATE GLOBAL UTIL FUNCTIONS
const skunq = {
	saveLocal: function( attrs ) {
		if ( attrs ) {
			localStorage.setItem( 'skunq_user', JSON.stringify( attrs ) );
			console.log( 'Saved Local', attrs );
		}
	}
};
const BaseUrl = 'http://assignment.bunq.com/';

// ===== MODELS =======================
// ====================================
// ====================================
// ====================================

var User = Backbone.Model.extend({
	defaults: {
		display_name: '',
		avatar: ''
	}
});

var Chat = Backbone.Model.extend({});







// ===== COLLECTIONS ==================
// ====================================
// ====================================
// ====================================

var Users = Backbone.Collection.extend({
	model: User,
	url: BaseUrl + 'users',
	parse: function( response ) {
		var list = [];
		_.each( response, function( user ){
			list.push( new User( {
				id: user.id,
				display_name: user.name
			} ) );
		});
		return list;
	}
});

var Chats = Backbone.Collection.extend({
	model: Chat,
	url: function(){
		return BaseUrl + 'conversation/user/' + skunq.current_id;
	}
});









// ===== VIEWS ========================
// ====================================
// ====================================
// ====================================


var FriendView = Backbone.View.extend({
	tagName: 'li',
	className: 'friend-item',
	events: {
		'dblclick': 'openChat'
	},
	render: function() {
		this.$el.html( this.model.get('display_name') );
		return this;
	},
	openChat: function() {
		var $this = this;
		// TODO: CREATE LOADING SHADE ON CHATS
		// __attachChatLoader();

		// CHECK IF ANY CHAT WITH THAT USER & CURRENT ID
		if ( this.model.has('personal_chat_id') ) {
		// IF CHAT FOUND SET AS ACTIVE CHAT WINDOW
			setActiveChat( this.model.get( 'personal_chat_id' ) );
		} else {
		// IF NOT CREATE NEW CHAT IN BACKEND
			var users = [ this.model.get('id'), skunq.current_id ];
			$.ajax({
				method: 'POST',
				url: BaseUrl + '/conversation/personal',
				data: {
					users: users.join(',')
				}
			}).then(
				function( response ) {
					console.log( response );
					$this.model.set({ personal_chat_id: response.id });
					setActiveChat( $this.model.get( 'personal_chat_id' ) );
				},
				function( response ) {
					console.log('ERROR: ', response );
				}
			)
		}

		// SWITCH TO CHATS TAB & SET CHAT LIST ITEM AS ACTIVE
	}
});

var FriendsView = Backbone.View.extend({
	tagName: 'ul',
	className: 'friends-list',
	render: function() {
		var $this = this;
		this.model.each( function(friend) {
			var friendView = new FriendView( { model: friend } );
			$this.$el.append(friendView.render().$el);
		});
	}
});

var ChatWindow = Backbone.View.extend({
	tagName: 'div',
	className: 'chat-window',
	initialize: function() {
		this.model.on( 'change', this.render, this );
	},
	render: function() {
		var template = _.template($('#chatTemplate').html());
		var html = template(this.model.toJSON());
		this.$el.html(html);

		return this;
	}
});

var ChatWindows = Backbone.View.extend({
	tagName: 'div',
	className: 'chat-windows',
	render: function() {
		var $this = this;
		return this;
	}
});



// ===== UTILS ========================
// ====================================
// ====================================
// ====================================


// UTIL TO HANDLE AJAX CALLS WITH SIMPLE OPTIONS OBJ
// { url: *http://assignment.bunq.com/ url endpoint*, options }
// const baseUrl = 'http://assignment.bunq.com/';
// var http = {
// 	get: function( options ) {
// 		return $.ajax({
// 			method: 'GET',
// 			url: baseUrl + options.endpoint
// 		});
// 	}
// };



// ===== App Functions ================
// ====================================
// ====================================
// ====================================

var current_user;
function init() {
	current_user = new User();
	// ADD EVENT LISTERS MODULE TO CURRENT USER
	_.extend( current_user, Backbone.Events );

	// ADD CAHNGE LISTENER > ON CURRENT USER CHANGES, UPDATE LOCAL STORAGE VALUE 
	current_user.on( 'change', function(){
		if ( this.attributes ) skunq.saveLocal( this.attributes );
	}, current_user);

	// CHECK FOR EXISTING USERS AND CHATS DATA TO DETERMINE BLOCKING DATA FETCH
	var local_user = localStorage.getItem( 'skunq_user' );
	if ( local_user ) {
		local_user = JSON.parse( local_user );
		current_user.set( local_user, { silent: true } );
		skunq.current_id = current_user.get('id');
		loadUserData();
	}
};

function setUser() {
	var display_name = $('#login-input').val();
	if ( !display_name ) {
		// SHOW ERROR
		console.log('no display name given');
	} else {
		// USE CURRENT TIMESTAMP AS A SUMPLE UNQIUE ID
		current_user.set({ 
			display_name: display_name,
			id: Date.now()
		});
		// SET CURRENT ID GLOBALLY
		skunq.current_id = current_user.get('id');
		loadUserData();
	}
}

var friends, chats, active_chat;
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
		$('#login-screen').remove();
	});
};
function loadFriends(callback) {
	friends = new Users();
	friends.fetch({
		success: function( response ){
			// CREATE FRIENDS LIST VIEW FOR COLLECTION
			var friendsView = new FriendsView({
				model: friends
			});
			friendsView.render();
			$('#friends-tab').html( friendsView.$el );
			
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
function loadChatData(callback) {
	chats = new Chats();
	chats.fetch({
		success: function( response ){
			// CREATE FRIENDS LIST VIEW FOR COLLECTION
			// var chatWindow = new FriendsView({
			// 	model: friends
			// });
			// friendsView.render();
			// $('#friends-tab').html( friendsView.$el );
			
			if ( response.length ) {
				var firstConvo = chats.at(0).get('conversation');
				setActiveChat( firstConvo.id );
			}
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

function setActiveChat( chatId ) {
	var target_chat = _.find( chats.models, function(chat) {
		var conversation = chat.get('conversation');
		if ( conversation && conversation.id == chatId )
			return true;
	});
	if ( target_chat ) {
		// ADD FALLBACK INCASE CHAT CREATED BY ACTIVE CHAT NOT CREATED YET
		if ( active_chat )
			active_chat.set( target_chat.attributes );
		else
			active_chat = new Chat( target_chat.attributes );
	} else {
		active_chat = new Chat({ id: chatId });
		var chatWindow = new ChatWindow({
			el: '#main',
			model: active_chat
		});
		chatWindow.render();
	}
};



// EVENT LISTENERS
$( '#login-btn' ).on( 'click', setUser );

// $('.friend-item').on( 'dblclick', new )

$( document ).ready( function() {
	init();
});