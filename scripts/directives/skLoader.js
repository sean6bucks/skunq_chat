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