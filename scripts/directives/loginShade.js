'use strict'

skunq.directive( 'loginShade', function() {
	return {
		restrict: 'E',
		replace: true,
		scope: {
			ngModel: 		  '=',
			initFunction: 	  '&',
			completeFunction: '&',
			whiteLoader: 	  '='
		},
		templateUrl: './assets/templates/directives/login-shade.html',
		controller: function( $scope ) {
			$scope.buildLoginShade = function( callback ) {
				$(element).show();
				var canvas = document.getElementById( "login-bars" );
				var context = canvas.getContext( "2d" );
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
						color: $scope.colors[i]
					});
				}


				drawBars( context );
				$('#login-bars').css({ opacity: 1 });

				callback();
			};

			var bars = [];
			var drawBars = function( context ) {
				var canvas = context.canvas;
				context.clearRect(0, 0, canvas.width, canvas.height);
				for ( var i = 0; i < bars.length; i++ ) {
					var bar = bars[i];

					context.fillStyle = bar.color;
					context.fillRect( bar.x, 0, bar.w, bar.h );
				}
			};

			$scope.buildLoginShade = function( callback ) {
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
						color: $scope.colors[i]
					});
				}


				drawBars( context );
				$('#login-bars').css({ opacity: 1 });

				callback();
			};

			var removeLoginShade = function() {
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

				removeBars();
			};


			$scope.resetLoginShade = function( callback ) {
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
						color: $scope.colors[i]
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
			};

			$scope.colors = [ '#288542', '#329a43', '#5eb24c', '#7fc450', '#41b19d', '#388abf', '#2c68a6', '#205576', '#822330', '#be1a2e', '#d37527', '#d9b837' ];
		},
		link: function( scope, element, attr ) {

			// $scope.init = function() {
			// 	main.loading_user = true;
			// 	// CHECK FOR EXISTING USERS AND CHATS DATA TO DETERMINE BLOCKING DATA FETCH
			// 	var local_user = localStorage.getItem( 'skunq_user' );
			// 	if ( local_user ) {
			// 		local_user = JSON.parse( local_user );
			// 		// UPDATE CURRENT USER WITH LOCAL INFO
			// 		_.extend( $scope.current_user, local_user );
			// 		loadUserData();
			// 	} else {
			// 		setTimeout(function(){
			// 			__removeLoader();
			// 			$( '#login-screen' ).removeClass('loading');
			// 		}, 2000 );
			// 	}

			// 	// ADD CHANGE LISTENER > ON CURRENT USER CHANGES, UPDATE LOCAL STORAGE VALUE 
			// 	$scope.$watch( 'current_user', function( newVal, oldVal ) {
			// 		console.log('USER CHANGE: ', newVal );
			// 		if ( newVal && Object.keys(newVal).length ) {
			// 			LocalService.saveLocal( newVal );
			// 		} else {
			// 			localStorage.deleteLocal();
			// 		}
			// 	});
			// };

			scope.buildLoginShade( scope.initFunction );
		}
	};
});