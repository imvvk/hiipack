/**
 * @加载并缓存项目hii.config.js 
 * 如果是workspace 下 查找projects 属性建立对应关系
 * @author imvvk
 */

var fs = require("fs");
var path = require("path");

var projects_config = {};

