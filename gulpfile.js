// 引入 gulp
var gulp = require('gulp'),
	clean = require('gulp-clean'), //清理文件
	fileinclude = require('gulp-file-include'), //文件插入
	rev = require('gulp-rev'), //对文件名加MD5后缀
	path = require('path'), //环境
	plumber = require('gulp-plumber'),
	named = require('vinyl-named'),
	runSequence = require('run-sequence'),
	revReplace = require('gulp-rev-replace'),
	spritesmith = require('gulp.spritesmith'),
	webpackStream = require('webpack-stream');

var config = {
	'public': path.resolve("", __dirname + '/public'),
	'view': path.resolve("", __dirname + '/')
};

var tempdir = path.resolve("", __dirname + '/dest');

console.log("目录路径：" + __dirname);
console.log("配置路径：" + JSON.stringify(config));
console.log("临时目录：" + tempdir);

/*模块化管理的工具，使用webpack可实现模块按需加载，模块预处理，模块打包等功能*/
var webpackConfig = {
	devtool: "source-map",
	module: {
		loaders: [{
			test: /\.js$/,
			loader: 'babel-loader',
			exclude: /(node_modules|bower_components)/,
			query: {
				presets: ['es2015']
			}
		}, {
			test: /\.jsx$/,
			loader: 'babel-loader',
			exclude: /(node_modules|bower_components)/,
			query: {
				presets: ['es2015', 'react']
			}
		}]
	}
};

/**
 * 清理生成文件夹/文件
 */
gulp.task('clean', function() {
	return gulp.src([config.public, tempdir])
		.pipe(clean({
			force: true
		}));
});

/********************************************************************************
 * CSS文件处理
 ********************************************************************************/
var CssConfig = {
	'dirName': 'css', //生成目录名称
	'md5DirName': 'rev/css' //生成目录名称
}

var cssmin = require('gulp-cssmin'), //CSS压缩
	sass = require('gulp-sass'), //SASS编译
	cssspriter = require('gulp-css-spriter'); //CSS合并

gulp.task('build:css', function() {
	var timestamp = +new Date();
	return gulp.src(['css/*.css', 'css/*.scss'])
		.pipe(plumber())
		.pipe(rev()) //添加MD5
		.pipe(sass().on('error', sass.logError))
		.pipe(cssspriter({
			includeMode: 'implicit', //explicit：默认不加入雪碧图，，implicit：默认加入雪碧图/* @meta {"spritesheet": {"include": true}} */
			spriteSheet: config.public + '/img/spritesheet' + timestamp + '.png', //img保存路径
			pathToSpriteSheetFromCSS: '../img/spritesheet' + timestamp + '.png' //在css文件中img的路径
		}))
		.pipe(cssmin()) //压缩
		.pipe(gulp.dest(path.join(config.public, CssConfig.dirName)))
		.pipe(rev.manifest()) //追加MD5
		.pipe(gulp.dest(path.join(tempdir, CssConfig.md5DirName)));
});

/********************************************************************************
 * JS文件处理
 ********************************************************************************/
var jsuglify = require('gulp-uglify'); //JS压缩

var JsConfig = {
	'dirName': 'js', //生成目录名称
	'md5DirName': 'rev/js' //生成目录名称
}

gulp.task('build:js', function() {
	return gulp.src('js/*.js')
		.pipe(plumber())
		.pipe(named())
		.pipe(webpackStream(webpackConfig))
		/*.pipe(rev()) //添加MD5*/
		.pipe(jsuglify()) //压缩 混淆
		.pipe(gulp.dest(path.join(config.public, JsConfig.dirName)));
		/*
		.pipe(rev.manifest()) //
		.pipe(gulp.dest(path.join(tempdir, "")));*/
});
/********************************************************************************
 * Images图片处理
 ********************************************************************************/

//将图片拷贝到目标目录
gulp.task('copy:img', function() {
	return gulp.src('demo/style/images/**/*')
		.pipe(gulp.dest(path.join(config.public, 'images')));
});

/********************************************************************************
 * HTML文件处理
 ********************************************************************************/
var htmlmin = require('gulp-htmlmin'),
	htmlImport = require('gulp-html-import');

//用于在html文件中直接include文件  并保存到目标路径
gulp.task('fileinclude', function() {
	return gulp.src(['html/*.html'])
		.pipe(plumber())
		.pipe(fileinclude({
			prefix: '@@',
			basepath: '@file'
		}))
		.pipe(gulp.dest(config.view));
});

// 将html的css js 引用路径 替换为  修改(增加MD5)后的路径   并压缩
gulp.task("revreplace", function() {
	console.log("Run-->>revreplace：" + config.view + '/*.html');
	//noinspection JSUnusedGlobalSymbols
	//替换HTML内容规则
	var manifest = gulp.src(path.join(tempdir, 'rev/**/rev-manifest.json'));
	var revReplaceOptions = {
		manifest: manifest,
		replaceInExtensions: ['.js', '.css', '.html', '.scss'],
		modifyUnreved: (filename) => {
			if(filename.indexOf('.js') > -1) {
				return '../js/' + filename; //网页内容
			}
			if(filename.indexOf('.scss') > -1) {
				return '../css/' + filename; //网页内容
			}
		},
		modifyReved: (filename) => {
			if(filename.indexOf('.js') > -1) {
				return '../public/js/' + filename; //更换路径
			}
			if(filename.indexOf('.css') > -1) {
				return '../public/css/' + filename; //更换路径
			}
		}
	};
	return gulp.src(config.view + '/*.html')
		.pipe(revReplace(revReplaceOptions))
		.pipe(htmlmin({
			collapseWhitespace: true
		}))
		.pipe(gulp.dest(config.view));
});

/********************************************************************************
 * 监视文件变化
 ********************************************************************************/

var watchFiles = ['js/**/*.js', 'css/*.css', 'css/*.sass', 'css/**/*.scss', 'html/**/*.html'];

gulp.task('watch', function() {
	gulp.watch(watchFiles, function(event) {
		gulp.start('default', function() {
			console.log('File ' + event.path + ' was ' + event.type + ', build finished');
		});
	});
});

gulp.task('dev', ['default', 'watch']);

gulp.task('default', function(done) {
	runSequence('clean', ['fileinclude', 'copy:img', 'build:css', 'build:js'],
		'revreplace',
		done);
});

//
//gulp.task('import', function() {
//	gulp.src('./demo/index.html')
//		.pipe(htmlImport('./demo/components/'))
//		.pipe(gulp.dest('dist'));
//})

/* 提示：No gulpfile found，js名默认 "gulpfile.js"
 * cmd 命令： glup [task任务名称]*/