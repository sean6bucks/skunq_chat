'use strict'

skunq.controller( 'ProfileController', [ '$scope', '$rootScope', '$state', '$stateParams', '$http', '$timeout', function( $scope, $rootScope, $state, $stateParams, $http, $timeout ) {
	var $this = this;
	this.status = {
		loading: true
	};
	this.baseUrl = 'http://assignment.bunq.com';

	// SCOPE BOUND FUNCTIONS ========

	$scope.logout = function() {
		$scope.$emit('logout');
	};

	//  LOAD DATA FUNCTIONS =========
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

	// SET PROFILE AS CURRENT USER IF IDs MATCH
	if ( $stateParams.id == $scope.current_user.id ) {
		this.profile = $scope.current_user;
		$this.status.loading = false;
	// ELSE IF GLOBAL FRIENDS ARRAY LOADED CHECK FRIENDS
	} else if ( $rootScope.friends && $rootScope.friends.length ) {
		this.profile = _.find( $rootScope.friends, { id: $stateParams.id } );
		$this.status.loading = false;
	// ELSE FETCH FRIENDS
	} else {
		this.loadFriends( function() {
			$this.profile = _.find( $rootScope.friends, { id: $stateParams.id } );
			$timeout(function(){
				$scope.$apply();
				$this.status.loading = false;
			});
		});
	}
}]);