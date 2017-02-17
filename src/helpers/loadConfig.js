/**
 * @加载并缓存项目hii.config.js 
 * 如果是workspace 下 查找projects 属性建立对应关系
 * @author imvvk
 */

var fs = require("fs");
var path = require("path");

var PROJECTS_CONFIG = {};

var log = global.log;

module.exports = {
    
    init : function () {
        var cwd = process.cwd;
        var config = _load(cwd);
        var projects;

        if (config) {
            projects = config.projects;

            if (projects) {
                PROJECTS_CONFIG.__isWorkspace = true;
                var pc = PROJECTS_CONFIG.projects ={};
                var prefixPathRegs = PROJECTS_CONFIG.regs = [];
                Object.keys(projects_config).forEach(function (key) {
                    pc[key] = _resolve(_load(path.join(cwd, projects[key])));
                    prefixPathRegs.push(new RegExp("^/"+key+"/"));
                });
                console.log("regx=", prefixPathRegs);
            } else {
                PROJECTS_CONFIG.__isWorkspace = false;
                PROJECTS_CONFIG.__default = _resolve(config);
            }
        }

        function _load(p) {
            var content, config;
            try {
                content = fs.readFileSync(path.join(p, "./hii.config.js"), "utf-8");
                config = JSON.parse(content);
            } catch(e) {
                log.error("load config fail in ", p );
                log.error("error : ", e);
            }
            return config;
        }

        function _resolve(config) {
            if (!config) {
                return null;
            }
             
        }
    }


}
