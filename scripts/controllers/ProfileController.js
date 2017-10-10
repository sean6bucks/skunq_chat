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