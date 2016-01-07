var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    del = require('del');

	gulp.task('build', function() {
    return gulp.src([
    		'src/shellStart.js',
            'src/tool/Util.js',
            'src/tool/observe.js',
    		'src/tool/lexer.js',
            'src/tool/model.js',
            'src/tool/Scanner.js',
            'src/tool/Builder.js',
            'src/tool/Renderer.js',

    		'src/component/ViewModel.js',
            'src/component/Component.js',
            'src/component/view/View.js',
            'src/component/view/DOMViewProvider.js',
            'src/component/view/ViewManager.js',
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

    		'src/shellEnd.js'
    	])
        .pipe(concat('impex.all.js'))
        .pipe(gulp.dest('build'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('build'));
	});

	gulp.task('clean', function(cb) {
	    del(['build'], cb)
	});

	gulp.task('default', ['clean'], function() {
	    gulp.start('build');
	});