/**
 * @file
 * @author zdying
 */
var colors = require('colors');
var replace = require('replace');
var webpack = require('webpack');
var child_process = require('child_process');
var exec = child_process.exec;
var execSync = child_process.execSync;

var configUtil = require('../webpackConfig');

var steps = require('../helpers/steps');
var log = require('../helpers/log');

var fse = require('fs-extra');
var fs = require('fs');

module.exports = {
    /**
     * 初始化一个项目
     * @param argv
     */
    init: function(projName, type, registry){
        var path = require('path');
        var templatePath = path.resolve(__dirname, '..', '..', 'tmpl', type);
        var targetPath = process.cwd() + '/' + projName;

        steps.printTitle('copy template files');

        fse.copy(templatePath, targetPath, function(err){
            if(err){
                steps.printErrorIcon();
                log.error(err);
                return
            }
            steps.printSuccessIcon();
            this._replaceProjectName(projName, targetPath, registry);
        }.bind(this));
    },

    _build: function(config, callback){
        var createCompiler = function(config, cbk){
            var compiler = webpack(config);
            var entry = Object.keys(config.entry);

            var oldCwd = process.cwd();

            process.chdir(__hii__.root);

            compiler.plugin("compile", function(){
                // this.isCompiling = true;
                log.info('compile', '-', 'compiling [' + entry.join('.js, ') + '.js]', '...');
            }.bind(this));

            compiler.plugin("done", function(stat){
                process.chdir(oldCwd);
                log.info('compile', '-', 'compile finished (', (stat.endTime - stat.startTime) + 'ms', ')');
                log.debug('compile result: \n' + stat.toString({
                    colors: false,
                    timings: true,
                    chunks: false,
                    children: false
                }));
            });

            compiler.run(function(err, state){
                if(err){
                    log.error(err);
                }else{
                    cbk && cbk(state)
                }
            });

            return compiler
        };

        createCompiler(config, callback)
    },

    /**
     * 打包压缩线上版本代码
     * @param cbk
     */
    build: function(cbk){
        var workPath = process.cwd();
        var dllConfig = configUtil.getPrdDLLConfig(workPath);

        log.info('clean', '[prd/*, ver/*]'.bold, '...');

        try{
            execSync('rm -rdf ./prd ./ver');
            this._build(dllConfig, function(){
                var config = configUtil.getPrdConfig(workPath);
                this._build(config, cbk)
            }.bind(this))
        }catch(e){
            log.error(e);
        }
    },

    /**
     * 打包dev版本代码
     * @param callback
     */
    pack: function(callback){
        var workPath = process.cwd();
        var dllConfig = configUtil.getDevDLLConfig(workPath);
        //TODO userConfig 可以直接作为参数传进去
        var userConfig = require(workPath + '/config');
        var hasLib = userConfig.library && Object.keys(userConfig.library).length > 0;

        log.info('clean', '[dev/*]'.bold, '...');

        try{
            execSync('rm -rdf ./dev');

            if(hasLib){
                this._build(dllConfig, function(){
                    var config = configUtil.getDevConfig(workPath);
                    this._build(config)
                }.bind(this))
            }else{
                var config = configUtil.getDevConfig(workPath);
                this._build(config)
            }
        }catch(e){
            log.error(e);
        }
    },

    /**
     * 上传文件到开发机
     */
    sync: function(){
        var root = process.cwd();
        var rsync = require('./rsync');
        var isExist = fs.existsSync(root + '/dev');

        if(!isExist){
            this.pack(rsync.sync)
        }else{
            rsync.sync();
        }
    },

    /**
     * 跑自动化测试
     */
    test: function(){
        // try{
        //     child_process.execSync('mocha')
        // }catch(e){
        //     console.log('[warn]'.yellow, 'mocha not install.');
        //     console.log('[test]'.green, 'install mocha.');
        //     child_process.execSync('npm install -g mocha');

            // var isExist = fs.existsSync(__hii__.globalRoot + '/' + 'mocha');
            //
            // if(isExist){
            // }else{
            //     console.log('[test]'.yellow, 'exec', 'npm i -g mocha expect assert'.bold);
            //     child_process.execSync('npm i -g mocha expect assert')
            // }
            //TODO 判断前端工程里面有没有`assert`|`expect`, 如果没有自动安装

            var cmd = __hii__.root + "/node_modules/.bin/mocha --colors --compilers js:" + __hii__.resolve('babel-register');
            // var cmd = "mocha --compilers js:" + __hii__.resolve('babel-register');
            var rcFile = __hii__.cwd + '/.babelrc';
            //TODO resolve时,如果不存在对应的依赖包, 自动安装
            //TODO 解决上面的问题后, 去除hiipack内置依赖`babel-preset-es2015`
            fs.writeFileSync(
                rcFile,
                JSON.stringify({
                    "presets": [__hii__.resolve("babel-preset-es2015")]
                }, null, 4)
            );
            log.debug('test', '-', 'exec command:', cmd.yellow);
            child_process.exec(cmd, {stdio: [0,1,2]}, function(err, stdout, stderr){
                console.log(stdout);
                console.log(stderr);
                fs.unlink(rcFile);
            });
        // }
    },

    /**
     * 替换项目文件中的`项目名称`字段
     * @param projName
     * @param root
     * @param registry
     * @private
     */
    _replaceProjectName: function(projName, root, registry){
        var items = []; // files, directories, symlinks, etc
        steps.printTitle('setup project');
        steps.printSuccessIcon();
        steps.printTitle('rename template files');
        fse.walk(root)
            .on('data', function(item){
                items.push(item.path);
            })
            .on('end', function(){
                var count = 0;
                var len = items.length;
                var finish = function(){
                    if(count === len){
                        steps.printSuccessIcon();

                        var cmd = 'cd ' + projName + ' && npm install' + (registry ? ' --registry ' + registry : '');

                        // steps.printTitle('setup project (installing dependencies)');
                        steps.hideCusror();

                        var _count = 1;
                        var timer = setInterval(function(){
                            var count = _count++;
                            var points = (new Array(count % 5)).join('.');
                            steps.clearLine();
                            steps.printTitle('installing dependencies ' + points);
                        }, 500);

                        exec(cmd, function(err, stdout, stderr){
                            if(err){
                                steps.printErrorIcon();
                                log.error(err);
                                return
                            }
                            clearInterval(timer);
                            steps.clearLine();
                            steps.printTitle('installing dependencies');
                            steps.printSuccessIcon();
                            steps.showCursor();
                            console.log();
                            console.log('init success :)'.bold.green);
                            console.log('Now you may need to exec `'.bold + 'hii start'.yellow.bold + '` to start a service '.bold);
                            console.log();
                        });
                    }
                };

                items.forEach(function(file){
                    var stat = fs.statSync(file);

                    if(stat.isFile()){
                        fs.readFile(file, function(err, data){
                            if(err){
                                return log.error(err);
                            }
                            var fileContent = data.toString();

                            fileContent = fileContent.replace(/\$PROJECT_NAME\$/gm, projName);

                            fs.writeFile(file, fileContent, function(err){
                                count++;
                                // if(!err){
                                //     console.log(logPrex, 'write file: '.green, file.bold);
                                // }else{
                                //     console.log(errPrex, 'write error: '.red, file.bold);
                                //     console.log(err);
                                // }
                                finish();
                            });
                        })
                    }else if(stat.isDirectory()){
                        // console.log(logPrex, 'copy directory: '.blue, file.bold);
                        count++;
                        finish();
                    }
                });
            })
    }
};
