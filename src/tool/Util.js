/**
 * 工具类，为系统提供基础服务
 * 该类来自于soya2d.js
 */
var Util = new function () {
	/**
     * 继承
     * @param {function} child 子类
     * @param {function} parent 父类
     */
	this.inherits = function(child,parent){
        child.prototype = Object.create(parent.prototype);
        child.prototype.constructor = child;
	}

    this.ext = function(to,from){
        var keys = Object.keys(from);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            to[k] = from[k];
        }
    }

	/**
     * 扩展属性到对象
     * @param {Object} to 
     * @param {Object} from 
     */
	this.extProp = function(to,from){
        var keys = Object.keys(from);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            if(from[k] instanceof Function)continue;
            if(from[k])to[k] = from[k];
        }
    }

    this.extMethod = function(to,from){
        var keys = Object.keys(from);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            if(from[k] instanceof Function)
                to[k] = from[k];
        }
    }

    this.isObject = function(obj){
        return typeof(obj) === 'object';
    }

    /**
     * 验证对象是不是数组
     * @param  {Object}  obj 
     * @return {Boolean}
     */
    this.isArray = function(obj){
        return obj instanceof Array;
    }

    this.isString = function(obj){
        return typeof(obj) === 'string';
    }

    this.isWindow = function(obj){
        return 'Array' in obj &&
                'XMLHttpRequest' in obj &&
                'XMLDocument' in obj &&
                'JSON' in obj;
    }

    var compiler = document.createElement('div');

    this.isDOMStr = function(template){
        compiler.innerHTML = template;
        if(compiler.children[0])return true;
        return false;
    }

    /**
     * 验证对象是不是DOM节点
     * @param  {Object}  obj 
     * @type {Boolean}
     */
    this.isDOM = typeof HTMLElement === 'object' ?
                function(obj){
                    return obj instanceof HTMLElement;
                } :
                function(obj){
                    return obj && typeof obj === 'object' && obj.nodeType && typeof obj.nodeName === 'string';
                }

    /**
     * 绑定事件到DOM上
     */
    this.on = function(type,element,cbk){
        if(element.addEventListener){
            element.addEventListener(type,cbk,false);
        }else{
            if(type.indexOf('on') < 0){
                type = 'on'+type;
            }
            element.attachEvent(type,cbk);
        }
    }

    this.off = function(type,element,cbk){
        if(element.removeEventListener){
            element.removeEventListener(type,cbk,false);
        }else{
            if(type.indexOf('on') < 0){
                type = 'on'+type;
            }
            element.detachEvent(type,cbk);
        }
    }

    function loadError(){
        impex.console.error('无法获取远程数据 : '+this.url);
    }
    function loadTimeout(){
        impex.console.error('请求超时 : '+this.url);
    }
    function onload(){
        if(this.status===0 || //native
        ((this.status >= 200 && this.status <300) || this.status === 304) ){
            this.cbk && this.cbk(this.responseText);
        }
    }

    this.loadTemplate = function(url,cbk,timeout){
        var xhr = new XMLHttpRequest();
        xhr.open('get',url,true);
        xhr.timeout = timeout || 5000;
        xhr.ontimeout = loadTimeout;
        xhr.onerror = loadError;
        if(xhr.onload === null){
            xhr.onload = onload;
        }else{
            xhr.onreadystatechange = onload;
        }
        xhr.cbk = cbk;
        xhr.url = url;
        xhr.send(null);
    }
}