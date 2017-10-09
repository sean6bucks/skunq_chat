'use strict'

skunq.controller( 'ChatController', [ '$scope', '$state', '$stateParams', '$http', function( $scope, $state, $stateParams, $http ) {
	var $this = this;
	this.status = {
		loading: true
	};
	this.baseUrl = 'http://assignment.bunq.com';

	this.loadChat = function() {
		$this.status.loading = true;
		$http.get( $this.baseUrl + '/conversation/' + $stateParams.id )
			.then(
				function( response ) {
					$this.chat = _.extend( {
						id: $stateParams.id,
						name: response.conversation.name
					}, response );

					if ( $rootScope.friends && $rootScope.friends.length ) {
						_.each( $this.chat.users, function( friend ) {
							_.find( $rootScope.friends, { id: friend });
						});
					} else {
						$this.loadFriends(function(){
							_.each( $this.chat.users, function( friend ) {
								_.find( $rootScope.friends, { id: friend });
							});
						});
					}
				},
				function(response){
					console.log( '%cErrors', 'background:red;', response );
				}
			);
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

	this.loadChat();
	console.log('LOAD CHAT');
}]);