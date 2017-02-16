/**
 * @file 请求预处理
 * @author zdying
 */

'use strict';

//分析资源类型 
function anaylseReq(req, res) {
    var heder = req.headers;
}


module.exports = function(req, res, next){
    req.url = req.url.replace(/[\?\#].*$/, '');
    req._startTime = Date.now();
    anaylseReq(req);
    log.debug('request -', req.url);
    log.detail('request -', req.url, JSON.stringify(req.headers));
    next();
};
