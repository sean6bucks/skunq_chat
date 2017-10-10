var gulp = require('gulp');
var concat = require('gulp-concat');
var minify = require('gulp-minify');

gulp.task( "libraries", function () {
	return gulp.src([
		'node_modules/jquery/dist/jquery.min.js',
		'node_modules/lodash/lodash.min.js',
		'node_modules/bootstrap/dist/js/bootstrap.min.js',
		'node_modules/async/dist/async.min.js',
		'node_modules/angular/angular.js',
		'node_modules/@uirouter/angularjs/release/angular-ui-router.min.js'
	])
	.pipe( concat( 'libraries.js') )
	.pipe( gulp.dest( './dist/'));
});

gulp.task( "scripts", function () {
	return gulp.src([
		'app.js',
		'scripts/services/LocalService.js',
		'scripts/controllers/MainController.js',
		'scripts/controllers/ChatController.js',
		'scripts/controllers/ProfileController.js',
		'scripts/directives/skLoader.js'
	])
	.pipe( concat( 'app.js') )
	.pipe( gulp.dest( './dist/'));
});

gulp.task( "minify", function () {
	gulp.src('dist/app.js')
	.pipe( minify({
		ext:{
			src:'.min',
			min:'.js'
		}
	}))
	.pipe( gulp.dest('dist') )
});

gulp.task( "build", [ 'libraries', 'scripts', 'minify' ]);