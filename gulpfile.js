var gulp = require('gulp'),
  connect = require('gulp-connect');
  //jasmine     = require('gulp-jasmine'),
  //jasminePhantomJs = require('gulp-jasmine2-phantomjs');
 
gulp.task('webserver', function() {
  connect.server({
    livereload: true,
    port: 8000,
    root: ['.']
  });
});
 
// Test JS
//gulp.task('specs1', function () {
//    return gulp.src('spec/*.js')
//        .pipe(jasmine());
//});
//
//gulp.task('specs', function() {
//    return gulp.src('./index.html')
//        .pipe(jasminePhantomJs());
//});
    
gulp.task('live', function() {
  gulp.src(['src/*.js','spec/*.js','*.html'])
    .pipe(connect.reload());
});
 
gulp.task('watch', function () {
  gulp.watch(['src/*.js','spec/*.js','*.html'], ['live']);
});

gulp.task('default', ['webserver', 'watch']);