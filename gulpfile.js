var gulp = require("gulp");
var babel = require("gulp-babel");
var wrapCommonjs = require('gulp-wrap-commonjs');

gulp.task( "minify", function () {
	gulp.src("dist/app.js")
	    .pipe( babel() )
	    .pipe( gulp.dest("dist") );
});

gulp.task( "compile", function () {
	gulp.src([''])
});