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