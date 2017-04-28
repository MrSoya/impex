var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    header = require('gulp-header'),
    del = require('del');

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

	gulp.task('build', ['clean'], function() {
    return gulp.src([
    		'src/shellStart.js',
            'src/tool/Util.js',
            'src/tool/observe.js',
    		'src/tool/lexer.js',
            'src/tool/model.js',
            'src/tool/Scanner.js',
            'src/tool/Builder.js',
            'src/tool/ChangeHandler.js',
            'src/tool/Renderer.js',

            'src/component/events/Signal.js',
            'src/component/events/Handler.js',
            'src/component/events/Event.js',
            'src/component/events/Dispatcher.js',
            
            'src/component/Component.js',
            'src/component/view/DOMHelper.js',
    		'src/directive/Directive.js',
            'src/filter/Filter.js',
            'src/service/Service.js',
            'src/transition/Transition.js',

            'src/factory/Factory.js',
            'src/factory/ComponentFactory.js',
            'src/factory/DirectiveFactory.js',
            'src/factory/FilterFactory.js',
            'src/factory/ServiceFactory.js',
            'src/factory/TransitionFactory.js',

    		'src/impex.js',

    		'src/service/build-in.js',
            'src/directive/build-in.js',
            'src/filter/build-in.js',
            'src/component/events/build-in.js',

    		'src/shellEnd.js'
    	])
        .pipe(concat('impex.all.js'))
        .pipe(header(banner))
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

	gulp.task('default', ['build']);