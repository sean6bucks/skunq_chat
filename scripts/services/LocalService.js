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