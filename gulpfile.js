var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    header = require('gulp-header'),
    removeCode = require('gulp-remove-code'),
    del = require('del'),
    stripDebug = require('gulp-strip-debug');


    var banner = [
        '/*'
        ,' * impexjs is a powerful web application engine to build '
        ,' * reactive webUI system'
        ,' *'
        ,' *'
        ,' * Copyright 2015-'+ new Date().getFullYear() +' MrSoya and other contributors'
        ,' * Released under the MIT license'
        ,' *'
        ,' * website: http://impexjs.org'
        ,' * last build: '+new Date().toLocaleDateString()
        ,' */'
    ].join('\n') + '\n';

    var libs = [
        'src/shellStart.js',
        'src/core/basic.js',
        'src/core/util.js',
        'src/core/parser.js',
        'src/core/compiler.js',
        'src/core/event.js',

        'src/observe/Change.js',
        'src/observe/Watcher.js',
        'src/observe/Monitor.js',
        'src/observe/observer.js',

        'src/vdom/vnode.js',
        'src/vdom/builder.js',
        'src/vdom/transform.js',
        'src/vdom/comparer.js',

        'src/component/EventEmitter.js',
        'src/component/Component.js',

        'src/impex.js',

        'src/directive/build-in.js',
        'src/filter/build-in.js',

        'src/shellEnd.js'
    ];

	gulp.task('build-dev', ['clean'], function() {
        return gulp.src(libs)
            .pipe(concat('impex.dev.all.js'))
            .pipe(header(banner))
            .pipe(gulp.dest('build'))
            .pipe(gulp.dest('examples/lib/impex'))
            .pipe(rename({suffix: '.min'}))
            .pipe(uglify())
            .pipe(header(banner))
            .pipe(gulp.dest('build'));
    });
    gulp.task('build-prod', ['clean'], function() {
        return gulp.src(libs)
            .pipe(concat('impex.prod.all.js'))
            .pipe(header(banner))
            .pipe(removeCode({ production: true }))
            .pipe(stripDebug())
            .pipe(gulp.dest('build'))
            .pipe(gulp.dest('examples/lib/impex'))
            .pipe(rename({suffix: '.min'}))
            .pipe(uglify())
            .pipe(header(banner))
            .pipe(gulp.dest('build'));
    });

	gulp.task('clean', function(cb) {
	    del(['build'], cb)
	});

	gulp.task('default', ['build-dev','build-prod']);