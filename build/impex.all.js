/*
 * impex is a powerful web application engine
 *
 *
 * Copyright 2015 MrSoya and other contributors
 * Released under the MIT license
 *
 * last build: 2015-12-23
 */

!function (global) {
	'use strict';
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
            if(from[k] !== undefined)to[k] = from[k];
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
        return typeof(obj) === 'object' && obj !== null;
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

    this.isUndefined = function(obj){
        return obj === undefined;
    }

    this.isFunction = function(obj){
        return obj instanceof Function;
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
        LOGGER.error('can not fetch remote data of : '+this.url);
    }
    function loadTimeout(){
        LOGGER.error('load timeout : '+this.url);
    }
    function onload(){
        if(this.status===0 || //native
        ((this.status >= 200 && this.status <300) || this.status === 304) ){
            if(!cache[this.url])cache[this.url] = this.responseText;
            this.cbk && this.cbk(this.responseText);
        }
    }

    var cache = {};
    this.loadTemplate = function(url,cbk,timeout){
        if(cache[url]){
            cbk && cbk(cache[url]);
            return;
        }
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
	//timer for dirty check
	var RAF = (function(w){
	    return  w.requestAnimationFrame       || 
	            w.webkitRequestAnimationFrame ||
	            w.msRequestAnimationFrame     ||
	            w.mozRequestAnimationFrame    ||
	            w.oRequestAnimationFrame      ||
	            function(callback) {
	                return w.setTimeout(function() {
	                    callback(Date.now());
	                },16.7);
	            };
	})(self);

	var fallback = Object.observe?false:true;

	var observedObjects = [],
		observedOldObjects = [],
		observedArys = [],
		observedOldArys = [];
	/**
	 * 降级处理observe不支持的情况
	 * @param  {Object} obj     需要监控的对象
	 * @param  {function} handler 回调函数
	 */
	var Object_observe = Object.observe || function(obj,handler){
		var copy = {};

		for(var prop in obj){
			var v = obj[prop];
			copy[prop] = v;
		}

		observedOldObjects.push(obj);

		observedObjects.push({
			oldVer:copy,
			newVer:obj,
			handler:handler
		});
	}

	var Object_unobserve = Object.unobserve || function(obj,handler){
		var i = observedOldObjects.indexOf(obj);
		if(i > -1){
			observedObjects.splice(i,1);
			observedOldObjects.splice(i,1);
		}
	}

	var Array_observe = Array.observe || function(ary,handler){
		var copy = [];

		if(!(ary instanceof Array)){
			throw new Error('Array.observe cannot observe non-array');
		}
		for(var i=ary.length;i--;){
			copy.unshift(ary[i]);
		}

		observedOldArys.push(ary);

		observedArys.push({
			oldVer:copy,
			newVer:ary,
			handler:handler
		});
	}

	var Array_unobserve = Array.unobserve || function(ary,handler){
		var i = observedOldArys.indexOf(ary);
		if(i > -1){
			observedArys.splice(i,1);
			observedOldArys.splice(i,1);
		}
	}

	//start up check
	fallback && function dirtyCheck(){
		RAF(function(){
			for(var i=observedObjects.length;i--;){
				var obj = observedObjects[i];

				var oldVer = obj.oldVer,
					newVer = obj.newVer,
					handler = obj.handler;

				var changes = [];
				for(var prop in oldVer){
					if(newVer[prop] === undefined){
						var change = {};
						change.name = prop;
						change.oldValue = oldVer[prop];
						change.object = newVer;
						change.type = 'delete';
						
						changes.push(change);
					}
					if(newVer[prop] !== oldVer[prop]){
						var change = {};
						change.name = prop;
						change.oldValue = oldVer[prop];
						change.object = newVer;
						change.type = 'update';
						
						changes.push(change);
					}
				}
				for(var prop in newVer){
					if(oldVer[prop] === undefined){
						var change = {};
						change.name = prop;
						change.oldValue = oldVer[prop];
						change.object = newVer;
						change.type = 'add';
						
						changes.push(change);
					}
				}
				if(changes.length>0){
					handler(changes);

					//refresh oldVer
					obj.oldVer = {};
					for(var prop in newVer){
						var v = newVer[prop];
						obj.oldVer[prop] = v;
					}
				}
			}

			for(var i=observedArys.length;i--;){
				var obj = observedArys[i];

				var oldVer = obj.oldVer,
					newVer = obj.newVer,
					handler = obj.handler;

				var change = null;

				if(oldVer.length === newVer.length){
					var len = oldVer.length;
					while(len--){
						if(newVer[len] !== oldVer[len]){
							change = {};
							change.type = 'update';
							break;
						}
					}
				}else if(oldVer.length > newVer.length){
					change = {};
					change.type = 'delete';
				}else{
					var change = {};
					change.type = 'add';
				}
				
				if(change){
					change.object = newVer;
					change.oldValue = oldVer;

					handler([change]);

					//refresh oldVer
					obj.oldVer = [];
					for(var j=0;j<newVer.length;j++){
						obj.oldVer.push(newVer[j]);
					}
				}
			}

			dirtyCheck();
		});
	}();
var lexer = (function(){

    var STR_EXP_START = /(['"])/,
        VAR_EXP_START = /[a-zA-Z$_]/,
        VAR_EXP_BODY = /[a-zA-Z$_0-9.]/;

    var keyWords = ['as','instanceof','typeof','in','true','false'];
    
    function Var(){
        return {
            subVars:{},
            words:[],
            segments:[],
            brakLength:0//记录顶级方括号的个数
        }
    }
    function typeDetect(l,sentence,varMap){
        if(VAR_EXP_START.test(l)){
            var rs = varParse(varMap,sentence);
            lastType = 'var';
            return rs;
        }else
        if(STR_EXP_START.test(l)){
            lastType = 'str';
            return strParse(sentence,RegExp.$1);
        }else{
            lastType = '';
            return l;
        }
    }
    function strParse(sentence,startTag){
        var escape = false;
        var literal = startTag;
        for(var i=1;i<sentence.length;i++){
            var l = sentence[i];
            if(l === '\\'){
                escape = true;
                literal += l;
                continue;
            }else
            if(!escape && l === startTag){
                return literal+startTag;
            }else{
                literal += l;
            }
            escape = false;
        }
    }
    function varParse(varMap,sentence,nested,parentVO){
        var literal = '';
        var stack = [];
        var stackBeginPos = -1;
        var lastWordPos = -1;
        var lastSegPos = -1;
        //记录当前变量信息
        var varObj = parentVO || Var();
        for(var i=0;i<sentence.length;i++){
            var l = sentence[i];
            if(stack.length>0){
                if(VAR_EXP_BODY.test(l)){
                    var vo = Var();
                    var varLiteral = varParse(varMap,sentence.substr(i),true,vo);
                    i = i + varLiteral.length - 1;

                    //words
                    var tmp = varLiteral;
                    if(VAR_EXP_START.test(varLiteral[0])){
                        varObj.subVars['.'+varLiteral] = vo;
                        //keywords check
                        if(keyWords.indexOf(tmp) < 0)
                            tmp = ['.'+tmp];
                    }
                    varObj.words.push(tmp);
                }else 
                if(l === ']' || l === ')'){
                    stack.pop();
                    if(stack.length === 0){
                        var part = sentence.substring(stackBeginPos,i+1);
                        literal += part;

                        varObj.segments.push(part);
                        lastSegPos = i;
                    }
                    //push words
                    varObj.words.push(l);
                    lastWordPos = i;

                }else{
                    //非var
                    var strLiteral = typeDetect(l,sentence.substr(i),varMap);
                    i = i + strLiteral.length - 1;
                    //push words
                    varObj.words.push(strLiteral);

                    lastWordPos = i;
                }
            }else{
                if(VAR_EXP_BODY.test(l)){
                    literal += l;

                    if(l==='.'){
                        var tmp = literal.substr(lastSegPos+1);
                        tmp = tmp.replace(/\./,'');
                        if(tmp){
                            varObj.segments.push(tmp);
                            lastSegPos = i;
                        }
                    }
                }else 
                if(l === '[' || l === '('){
                    stack.push(l);
                    stackBeginPos = i;

                    varObj.brakLength++;
  
                    //push words
                    var tmpStr = literal.substr(lastWordPos+1);
                    if(tmpStr){
                        var tmp = tmpStr;
                        if(keyWords.indexOf(tmpStr) < 0 && lastWordPos<0)
                         tmp = ['.'+tmpStr];
                        varObj.words.push(tmp);
                    }
                    varObj.words.push(l);

                    //segments
                    var closed = l==='['?']':')';
                    if(literal[i-1] !== closed){
                        var index = tmpStr.lastIndexOf('.');
                        if(index > -1){
                            tmpStr = tmpStr.substr(index);
                            varObj.segments.push(tmpStr);
                        }else{
                            varObj.segments.push(tmpStr);
                        }
                        lastSegPos = i;
                    }

                    lastWordPos = i;
                }else
                if((l === ']' || l === ')') && nested){
                    //push words
                    var tmp = literal;
                    //x.y ]
                    //x[...].y ]
                    //x[..] ]
                    if(tmp[tmp.length-1] !== l){
                        if(/[a-zA-Z0-9$_]+\[.+\]/.test(literal)){
                            tmp = tmp.replace(/[a-zA-Z0-9$_]+\[.+\]/,'');
                            varObj.words.push(tmp);
                        }else{
                            //keywords check
                            if(keyWords.indexOf(tmp) < 0)
                                varObj.words.push(['.'+tmp]);
                        }

                        //segments
                        var point = tmp.lastIndexOf('.');
                        if(point >0 ){
                            tmp = tmp.substr(point);
                        }
                        
                        varObj.segments.push(tmp);
                        lastSegPos = i;
                    }
                    lastWordPos = i;

                    return literal;
                }else{
                    
                    //push words
                    var tmp = literal.substr(lastWordPos+1);
                    if(tmp){
                        if(tmp[0] !== '.' && keyWords.indexOf(tmp) < 0)
                            tmp = ['.'+tmp];
                        varObj.words.push(tmp);
                    }

                    var segStr = literal.substr(lastSegPos+1);
                    if(segStr){
                        varObj.segments.push(segStr);
                        lastSegPos = i;
                    }
                    
                    if(!nested && keyWords.indexOf(tmp) < 0){
                        varMap['.'+literal] = varObj;
                    }
                    return literal;
                }
            }
        }

        var str1 = literal.substr(literal.lastIndexOf(']')+1);
        var str2 = literal.substr(literal.lastIndexOf(')')+1);
        if(str1 && str2){
            var str = str1.length < str2.length?str1:str2;
            var segStr = literal.substr(lastSegPos+1);
            varObj.segments.push(segStr);

            var tmp = (str[0]==='[' || str[0]==='(')?str:str[0]==='.'?str:'.'+str;
            if(varObj.words.length<1 && keyWords.indexOf(tmp) < 0){
                tmp = [tmp]
            }
            varObj.words.push(tmp);
        }
        
        if(!nested){
            varMap['.'+literal] = varObj;
        }
        
        return literal;
    }
    function parseWatchPath(map){
        for(var k in map){
            var varObj = map[k];
            var lastPart = null,
                watchPath = null;
            var i = k.lastIndexOf('.');
            if(k[k.length-1] === ']' || k[k.length-1] === ')'){
                i = brak(k,varObj.brakLength);

                var closed = k[k.length-1] === ']'?'[':'(';

                var brakLen = varObj.brakLength;
                varObj.watchPathWords = [];
                for(var j=0;j<varObj.words.length;j++){
                    var w = varObj.words[j];
                    if(w === closed){
                        if(--brakLen<1){
                            break;
                        }
                    }
                    varObj.watchPathWords.push(w);
                }
            }else{
                varObj.watchPathWords = varObj.words.concat();
                varObj.watchPathWords.splice(-1,1);
            }

            lastPart = k.substr(i);
            if(lastPart[0] === '('){
                varObj.lastVar = k;
            }else{
                varObj.lastVar = lastPart;
            }

            if(Object.keys(varObj.subVars).length<1){
                watchPath = k.substring(0,i).replace(/\.$/,'');
                varObj.watchPath = watchPath;
            }


            for(var j=varObj.segments.length;j--;){
                varObj.segments[j] = varObj.segments[j].replace(/^\.|\.$/g,'');
            }

            parseWatchPath(varObj.subVars);
        }
    }
    function brak(k,len){
        for(var i=0;i<k.length;i++){
            var l = k[i];

            if(l === '[' || l === '('){
                
                if(--len < 1){
                    return i;
                }
            }
        }
    }

    var lastType = '';

    var cache = {};
    return function(sentence){
        if(cache[sentence])return cache[sentence];


        var words = [],
            varMap = {};

        for(var i=0;i<sentence.length;i++){
            var l = sentence[i];
            lastType = '';
            var literal = typeDetect(l,sentence.substr(i),varMap);
            i = i + literal.length - 1;
            switch(lastType){
                case 'var':
                    words.push(keyWords.indexOf(literal)<0?['.'+literal]:literal);
                    break;
                case 'str':
                case '':
                    words.push(literal);
                    break;
            }
        }

        parseWatchPath(varMap);
        

        // console.log('输入',sentence);
        // console.log('校验',words.join(''));
        // console.log('分词',JSON.stringify(words));
        // //input--->a[b.x[c]].d
        // //a[b.x[c]].d ---> b.x[c]
        // //b.x[c] ---> c
        // console.log('变量tree',varMap);
        
        cache[sentence] = {
            words:words,
            varTree:varMap
        };
        return cache[sentence];
    }
})();
/**
 * 表达式映射
 */
function ExpProp (propName) {
	this.propName = propName;
	this.subProps = {};
	this.expNodes = [];
	this.attrObserveNodes = [];
	this.watchs = [];
}

/**
 * 表达式节点
 */
function ExpNode (node,attrName,origin,expMap,component,toHTML) {
	this.node = node;
	this.attrName = attrName;
	this.origin = origin;
	this.expMap = expMap;
	this.component = component;	
	this.toHTML = toHTML;
}

/**
 * 自定义observe节点
 */
function AttrObserveNode (directive,expObj) {
	this.directive = directive;
	this.expObj = expObj;
}

/**
 * watch
 */
function Watch (cbk,ctrlScope,segments) {
	this.cbk = cbk;
	this.ctrlScope = ctrlScope;	
	this.segments = segments;
}
/**
 * 扫描器
 */

var Scanner = new function() {
	//预扫描
	function prescan(node){
		var textNodeAry = [];
		var replacements = [];
		queryAllTextNode(node,textNodeAry);

		for(var ii=textNodeAry.length;ii--;){
			var node = textNodeAry[ii];
			var text = node.nodeValue;
			var segments = [];
			var lastPos = 0;
			text.replace(REG_EXP,function(fullTxt,modelExp,pos){				
				segments.push(text.substring(lastPos,pos));
				segments.push(fullTxt);

				lastPos = pos + fullTxt.length;
			});

			segments.push(text.substring(lastPos,text.length));

			var fragment = document.createDocumentFragment();
			for(var i=0;i<segments.length;i++){
				var tn = document.createTextNode(segments[i]);
				fragment.appendChild(tn);
			}
			replacements.unshift(fragment);
		}
		
		for(var i=textNodeAry.length;i--;){
			var n = textNodeAry[i];
			if(replacements[i].childNodes.length>1 && n.parentNode)
				n.parentNode.replaceChild(replacements[i],n);
		}
	}
	function queryAllTextNode(node,textAry){
		if(node.tagName === 'SCRIPT')return;
		if(node.attributes || node.nodeType === 11){
			if(node.childNodes.length>0){
				for(var i=0,l=node.childNodes.length;i<l;i++){
					queryAllTextNode(node.childNodes[i],textAry);
				}
			}
		}else
		if(node.nodeType === 3){
			if(node.nodeValue.replace(/\t|\r|\s/img,'').length<1)return;
			textAry.push(node);
		}
	}

	/**
	 * 扫描DOM节点
	 */
	this.scan = function(view,component){
		var scanNodes = view.elements?view.elements:[view.element];

        var startTag = null,
            nodes = [];
        
        for(var i=0,l=scanNodes.length;i<l;i++){
        	prescan(scanNodes[i]);
            if(startTag){
                nodes.push(scanNodes[i]);
                var endTag = DirectiveFactory.hasEndTag(startTag[0]);
                var tmp = scanNodes[i].getAttribute && scanNodes[i].getAttribute(CMD_PREFIX+endTag);
                if(Util.isString(tmp)){
                    var instance = DirectiveFactory.newInstanceOf(startTag[0],nodes,component,CMD_PREFIX+startTag[0],startTag[1]);
                    component.$__directives.push(instance);
                    startTag = null;
                    nodes = [];
                }
                continue;
            }
            
            startTag = scan(scanNodes[i],component);
            if(startTag){
                nodes.push(scanNodes[i]);
            }
        }
        if(startTag){
            LOGGER.error('can not find endTag of directive['+CMD_PREFIX+startTag[0]+']');
        }
	}

	function getRestrictParent(selfComp){
		if(selfComp.$restrict)return selfComp;
		var p = selfComp.$parent;
		while(p){
			if(p.$name && p.$restrict)return p;
			p = p.$parent;
		};
		return null;
	}

	//扫描算法
	//1. 如果发现是组件,记录，中断
	//2. 如果发现是指令，记录，查看是否final，如果是，中断
	//3. 如果发现是表达式，记录
	function scan(node,component){
		if(node.tagName === 'SCRIPT')return;

		if(node.attributes || node.nodeType === 11){
			if(node.tagName){
				var tagName = node.tagName.toLowerCase();
				//组件
				if(ComponentFactory.hasTypeOf(tagName)){
					var pr = getRestrictParent(component);
					if(pr && pr.$restrict.children){
						var children = pr.$restrict.children.split(',');
						if(children.indexOf(tagName) < 0)return;
					}
					var cr = ComponentFactory.getRestrictOf(tagName);
					if(cr && cr.parents){
						var parents = cr.parents.split(',');
						if(parents.indexOf(pr.$name) < 0)return;
					}
					component.createSubComponentOf(tagName,node);
					return;
				}

				var atts = node.attributes;
				//检测是否有子域属性，比如each
				for(var i=atts.length;i--;){
					var c = atts[i].name.replace(CMD_PREFIX,'');
					var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
					if(CPDI > -1)c = c.substring(0,CPDI);

					if(DirectiveFactory.hasTypeOf(c)){
						if(DirectiveFactory.isFinal(c)){
							var instance = DirectiveFactory.newInstanceOf(c,[node],component,atts[i].name,atts[i].value);
							component.$__directives.push(instance);
							return;
						}
						if(DirectiveFactory.hasEndTag(c)){
							return [c,atts[i].value];
						}
					}
				}
				for(var i=atts.length;i--;){
					var att = atts[i];
					var attName = att.name;
					var attVal = att.value;
					if(REG_CMD.test(attName)){
						var c = attName.replace(CMD_PREFIX,'');
						var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
						if(CPDI > -1)c = c.substring(0,CPDI);
						//如果有对应的处理器
						if(DirectiveFactory.hasTypeOf(c)){
							var instance = DirectiveFactory.newInstanceOf(c,[node],component,atts[i].name,attVal);
							component.$__directives.push(instance);
						}
					}else if(REG_EXP.test(attVal)){//只对value检测是否表达式，name不检测
				    	recordExpNode(attVal,node,component,attName);
					}
				}
			}

	    	if(node.childNodes.length>0){
	    		var startTag = null,
	    			nodes = [];
				for(var i=0,l=node.childNodes.length;i<l;i++){
					if(startTag){
						nodes.push(node.childNodes[i]);
						var endTag = DirectiveFactory.hasEndTag(startTag[0]);
						var tmp = node.childNodes[i].getAttribute && node.childNodes[i].getAttribute(CMD_PREFIX+endTag);
						if(Util.isString(tmp)){
							var instance = DirectiveFactory.newInstanceOf(startTag[0],nodes,component,CMD_PREFIX+startTag[0],startTag[1]);
							component.$__directives.push(instance);
							startTag = null;
							nodes = [];
						}
						continue;
					}
					startTag = scan(node.childNodes[i],component);
					if(startTag){
						nodes.push(node.childNodes[i]);
					}
				}

				if(startTag){
					LOGGER.error('can not find endTag of directive['+CMD_PREFIX+startTag[0]+']');
				}
			}
		}else if(node.nodeType === 3){
			if(node.nodeValue.replace(/\t|\r|\s/img,'').length<1)return;
			//文本节点处理
			recordExpNode(node.nodeValue,node,component);
		}
	}

	//表达式解析
	function recordExpNode(origin,node,component,attrName){
		//origin可能包括非表达式，所以需要记录原始value
		var exps = {};
		var toHTML = !attrName && origin.replace(/\s*/mg,'').indexOf(EXP_START_TAG + EXP2HTML_EXP_TAG)===0;
		if(toHTML){
			origin = origin.replace(EXP2HTML_EXP_TAG,'');
		}
		origin.replace(REG_EXP,function(a,modelExp){

			var filters = {};
			var i = 1;
			if(FILTER_EXP.test(modelExp)){
				parseFilters(RegExp.$1,filters,component);
				i = modelExp.indexOf(FILTER_EXP_START_TAG);
			}

			var expStr = modelExp;
			if(i > 1)
				expStr = modelExp.substring(0,i);
    		var tmp = lexer(expStr);
    		
    		//保存表达式
    		exps[modelExp] = {
    			words:tmp.words,
    			varTree:tmp.varTree,
    			filters:filters
    		};
    	});
		if(Object.keys(exps).length<1)return;

		var expNode = new ExpNode(node,attrName,origin,exps,component,toHTML);
		component.$__expNodes.push(expNode);
	}

	function parseFilters(expStr,filters,component){
		var inName = true,
			inParam,
			unknown;
		var currName = '',
			currParam = '',
			currParams = [];
		for(var i=0;i<expStr.length;i++){
			var l = expStr[i];
			switch(l){
				case ' ':case '\t':
					unknown = true;
					continue;
				case ':':
					inParam = true;
					inName = false;
					unknown = false;
					if(currParam){
						currParams.push(currParam);
						currParam = '';
					}
					continue;
				case '.':
					inParam = false;
					inName = true;
					unknown = false;
					if(currName && FilterFactory.hasTypeOf(currName)){
						filters[currName] = [FilterFactory.newInstanceOf(currName,component),currParams];
					}
					if(currParam){
						currParams.push(currParam);
					}
					currName = '';
					currParam = '';
					currParams = [];
					continue;
				default:
					if(unknown){
						if(currName){
							filters[currName] = [FilterFactory.newInstanceOf(currName,component),currParams];
						}
						if(currParam){
							currParams.push(currParam);
						}
						return i;
					}
			}

			if(inName)currName += l;
			else if(inParam){
				currParam += l;
			}
		}//over for

		if(currName && FilterFactory.hasTypeOf(currName)){
			filters[currName] = [FilterFactory.newInstanceOf(currName,component),currParams];
		}
		if(currParam){
			currParams.push(currParam);
		}
	}
}
/**
 * 构建器
 */

var Builder = new function() {
	//预链接
	function prelink(comp){
		//build expressions
		for(var i=comp.$__expNodes.length;i--;){
			var expNode = comp.$__expNodes[i];
			for(var expStr in expNode.expMap){
				var lexInfo = expNode.expMap[expStr];
				var varTree = lexInfo.varTree;

				//遍历表达式中的所有变量串
				for(var varStr in varTree){
					var varObj = varTree[varStr];

					//监控变量
					buildExpModel(comp,varObj,expNode);
				}
			}
		}

		//build components
		for(var i=comp.$__components.length;i--;){
			var subComp = comp.$__components[i];
			if(comp.$__directives.indexOf(subComp) > -1)continue;

			//激活组件
			subComp.init();
			subComp.display();
		}

		//build directives
		for(var i=comp.$__directives.length;i--;){
			var directive = comp.$__directives[i];

			directive.init();
		}
	}

 	function buildExpModel(ctrlScope,varObj,expNode){
 		for(var subV in varObj.subVars){
 			var subVar = varObj.subVars[subV];
 			buildExpModel(ctrlScope,subVar,expNode);
 		}

 		var prop = walkPropTree(ctrlScope.$__expPropRoot.subProps,varObj.segments[0],expNode);
 		
 		for(var i=1;i<varObj.segments.length;i++){
 			prop = walkPropTree(prop.subProps,varObj.segments[i],expNode);
 		}
 		
 	}

 	this.buildExpModel = buildExpModel;

 	function walkPropTree(parentProp,propName,expNode){
 		var prop = parentProp[propName];
 		if(!prop){
 			prop = parentProp[propName] = new ExpProp(propName);
 		}
 		if(expNode instanceof ExpNode){
 			if(prop.expNodes.indexOf(expNode) < 0)
 				prop.expNodes.push(expNode);
 		}else 
 		if(expNode instanceof AttrObserveNode){
 			if(prop.attrObserveNodes.indexOf(expNode) < 0)
 				prop.attrObserveNodes.push(expNode);
 		}else 
 		if(expNode instanceof Watch){
 			if(prop.watchs.indexOf(expNode) < 0)
 				prop.watchs.push(expNode);
 		}

 		return parentProp[propName];
 	}

	/**
	 * 构建组件
	 */
	this.build = function(component){
		prelink(component);
		
		observerProp(component,[],component);
	}

	function observerProp(model,propChain,component){
		var isArray = Util.isArray(model),
			isObject = Util.isObject(model);
		if(!model || !(isArray || isObject)){
            return;
        }

        if(model.$__impex__observer){
            var k = propChain.join('.');
            if(model.$__impex__propChains[k]){
            	var pck = model.$__impex__propChains[k];
            	for(var i=pck.length;i--;){
            		if(pck[i][1] === component)return;
            	}
                pck.push([propChain,component]);
                return;
            }
            model.$__impex__propChains[propChain.join('.')] = [[propChain,component]];
            return;
        }

    	function __observer(changes){
			if(component.$__state === Component.state.suspend)return;
			if(component.$__state === null)return;

			changeHandler(changes);
		}

		model.$__impex__observer = __observer;
		model.$__impex__propChains = {};
        model.$__impex__propChains[propChain.join('.')] = [[propChain,component]];

		if(isArray){
			model.$__impex__oldVal = model.concat();

			Array_observe(model,__observer);
		}else if(isObject){
			if(Util.isDOM(model))return;

			Object_observe(model,__observer);
		}

		//recursive
		var ks = Object.keys(model);
		for(var i=ks.length;i--;){
			var k = ks[i];
			if(k.indexOf('$')===0)continue;
			var pc = propChain.concat();
			pc.push(k);
			observerProp(model[k],pc,component);
		}
	}

	var __propStr = null,
		__lastMatch = undefined;
	function changeHandler(changes){
		if(Util.isString(changes))return;

		for(var i=changes.length;i--;){
			var change = changes[i];

			var propName = change.name;
			if(propName && propName.indexOf('$')===0)
				continue;

			var newObj = change.object[propName];
			//recursive
			var oldVal = change.oldValue;
			if(Util.isArray(change.object)){
				newObj = change.object;
				oldVal = change.object.$__impex__oldVal;
			}
			
			var pcs = change.object.$__impex__propChains;
            var pks = Object.keys(pcs);
            for(var pl=pks.length;pl--;){
                var k = pks[pl];
                var watchers = pcs[k];
                for(var wl=watchers.length;wl--;){
                    var propChain = watchers[wl][0];
                    var component = watchers[wl][1];
                    //查询控制域
                    var pc = propChain.concat();
                    if(propName && !Util.isArray(change.object))
                        pc.push(propName);

                    __propStr = null;
                    __lastMatch = undefined;
                    recurRender(component,pc,change.type,newObj,oldVal,0,component);
                    //reobserve
                    observerProp(newObj,pc,component);
                }
            }

			//unobserve
			if(!Util.isArray(change.object) && Util.isArray(change.oldValue)){
				Array_unobserve(change.oldValue,change.oldValue.$__impex__observer);
			}else if(Util.isArray(change.object)){
				change.object.$__impex__oldVal = change.object.concat();
				return;
			}else if(Util.isObject(change.oldValue)){
				var observer = change.oldValue.$__impex__observer;
				if(observer){
					Object_unobserve(change.oldValue,observer);
					change.oldValue.$__impex__observer = null;
					change.oldValue.$__impex__propChains = null;
				}
			}
		}
	}

	var sqbExp = /(^\[)|(,\[)/;
	function rerender(component,propChain,changeType,newVal,oldVal){
		var props = component.$__expPropRoot.subProps;
		var prop;
		var hasSqb = false;
		for(var i=0;i<propChain.length;i++){
			var p = propChain[i];
			if(sqbExp.test(Object.keys(props).join(','))){
				hasSqb = true;
				break;
			}
			if(props[p]){
				prop = props[p];
				props = props[p].subProps;
				continue;
			}
			break;
		}
		if(!prop)return;

        var matchs = [];
        if(hasSqb){
            var findLength = propChain.length - i - 1;
            var spks = Object.keys(prop.subProps);
            for(var i=spks.length;i--;){
                var k = spks[i];
                if(k[0] === '[' || k === p){
                    findMatchProps(prop.subProps[k],findLength,matchs);
                }
            }
        }else {
            if(i < propChain.length)return;
            matchs.push(prop);
        }
		
		var invokedWatchs = [];
		for(var i=matchs.length;i--;){
			//rerender matchs
			Renderer.renderExpNode(matchs[i].expNodes);
			//callback observe attrs
			for(var j=matchs[i].attrObserveNodes.length;j--;){
				var aon = matchs[i].attrObserveNodes[j];

				var rs = Renderer.evalExp(aon.directive,aon.expObj);
				aon.directive.observe(rs);
			}
			//callback watchs
			for(var j=matchs[i].watchs.length;j--;){
				var watch = matchs[i].watchs[j];

				if(watch.segments.length < propChain.length)continue;
				if(invokedWatchs.indexOf(watch) > -1)continue;

				//compare segs
				var canWatch = true;
				for(var k=0;k<watch.segments.length;k++){
					if(!propChain[k])break;

					if(watch.segments[k][0] !== '[' && 
						propChain[k][0] !== '[' && 
						watch.segments[k] !== propChain[k]){
						canWatch = false;
						break;
					}
						
				}

				if(canWatch){
					var nv = newVal,
					ov = oldVal;
					if(watch.segments.length > propChain.length){
						var findSegs = watch.segments.slice(k);
						var findStr = '$var';
						for(var k=0;k<findSegs.length;k++){
							var seg = findSegs[k];
							findStr += seg[0]==='['?seg:'.'+seg;
						}
						try{
							nv = new Function("$var","return "+findStr)(newVal);
							ov = new Function("$var","return "+findStr)(oldVal);
						}catch(e){
							LOGGER.debug('error on parse watch params');
							nv = null;
						}
					}
					watch.cbk && watch.cbk.call(watch.ctrlScope,changeType,nv,ov);
					invokedWatchs.push(watch);
				}
			}
		}
	}
	function findMatchProps(prop,findLength,matchs){
		if(findLength < 1){
			matchs.push(prop);
			return;
		}
		for(var k in prop.subProps){
			findMatchProps(prop.subProps[k],findLength-1,matchs);
		}
	}
	function recurRender(component,propChain,changeType,newVal,oldVal,depth,topComp){
		var toRender = true;
		if(depth > 0){
			if(!__propStr){
				__propStr = '';
				for(var k=0;k<propChain.length;k++){
					var seg = propChain[k];
					__propStr += seg[0]==='['?seg:'.'+seg;
				}
			}
			var prop = undefined;
            try{
                prop = eval('impex.__components["'+component.$__id+'"]'+__propStr);
            }catch(e){}
            if(!Util.isUndefined(prop)){
            	__lastMatch = component;
                toRender = false;
            }else 
            if(__lastMatch && __lastMatch !== topComp)toRender = false;
		}
		if(toRender){
			rerender(component,propChain,changeType,newVal,oldVal);
		}
		if(component.$isolate){
			var pc0 = propChain[0];
			for(var i=component.$isolate.length;i--;){
				var k = component.$isolate[i];
				if(k.indexOf('.')>0){
					var kc = k.split('.');
					var matchAll = true;
					for(var kci=0;kci<kc.length;kci++){
						if(kc[kci] !== propChain[kci]){
							matchAll = false;
						}
					}
					if(matchAll)return;
				}else if(k === pc0){
					return;
				}
			}
		}

		for(var j=component.$__components.length;j--;){
			var subCtrlr = component.$__components[j];
 			recurRender(subCtrlr,propChain,changeType,newVal,oldVal,depth+1,topComp);
 		}
	}
}
/**
 * 渲染器
 */

var Renderer = new function() {

	/**
	 * 渲染组件
	 */
	this.render = function(component){
		
 		renderExpNode(component.$__expNodes);

 		for(var j=component.$__components.length;j--;){
 			Renderer.render(component.$__components[j]);
 		}
	}

	//表达式节点渲染
	function renderExpNode(expNodes){
		var cache = {};
		for(var i=expNodes.length;i--;){
			var expNode = expNodes[i];
			if(expNode.node.nodeType !== 3 && //for ie compatible
				!DOC_BODY.contains(expNode.node) && !expNode.toHTML){
				continue;
			}

			var val = null;
			if(cache[expNode.origin] && cache[expNode.origin].comp === expNode.component){
				val = cache[expNode.origin].val;
			}else{
				val = calcExp(expNode.component,expNode.origin,expNode.expMap);
				cache[expNode.origin] = {
					comp:expNode.component,
					val:val
				}
			}
			
			if(expNode.toHTML){
				var rs = renderHTML(expNode,val,expNode.node,expNode.component);
				if(rs){
					continue;
				}
			}
			if(val !== null){
				updateDOM(expNode.node,expNode.attrName,val);
			}
		}//over for
		
	}
	this.renderExpNode = renderExpNode;

	var propMap = {
		value:['INPUT']
	};

	function updateDOM(node,attrName,val){
		if(node.setAttribute){
			node.setAttribute(attrName,val);
			var propOn = propMap[attrName];
			if(propOn && propOn.indexOf(node.tagName)>-1){
				node[attrName] = val;
			}
		}else{
			//文本节点
			node.nodeValue = val;
		}
	}

	//计算表达式的值，每次都使用从内到外的查找方式
	function calcExp(component,origin,expMap){
		//循环获取每个表达式的值
		var map = {};
		for(var exp in expMap){
			//表达式对象
			var expObj = expMap[exp];
			var rs = evalExp(component,expObj);

			var filters = expObj.filters;
			if(Object.keys(filters).length > 0){
				for(var k in filters){
					var c = filters[k][0];
					var params = filters[k][1];
					c.$value = rs;
					rs = c.to.apply(c,params);
				}
			}

			map[exp] = rs===undefined?'':rs;
		}

		//替换原始串中的表达式
		for(var k in map){
			origin = origin.replace(EXP_START_TAG +k+ EXP_END_TAG,map[k]);
		}
		return origin;
	}

	//计算表达式对象
	function evalExp(component,expObj){
		var evalExp = getExpEvalStr(component,expObj);
		var rs = '';
		try{
			rs = eval(evalExp);
		}catch(e){
			LOGGER.debug(e.message + ' when eval "' + evalExp+'"');
		}
		
		return rs;
	}

	this.evalExp = evalExp;

	function getExpEvalStr(component,expObj){
		var varTree = expObj.varTree;
		var expVarPath = {};
		for(var varStr in varTree){
			var varObj = varTree[varStr];

			var path = buildVarPath(component,varObj,varStr);
			expVarPath[varStr] = path;
		}

		var evalExp = joinExpStr(expObj.words,expVarPath);
		return evalExp;
	}
	this.getExpEvalStr = getExpEvalStr;

	//拼接表达式串
	function joinExpStr(words,vMap){
		var evalExp = '';
		for(var i=0;i<words.length;i++){
			var w = words[i];
			if(w instanceof Array){
 				evalExp += vMap[w[0]];
 			}else{
 				evalExp += w;
 			}
		}
		return evalExp;
	}

	function keyWordsMapping(str,component){
        if(str === 'this'){
            return component.__getPath();
        }
    }

	//提供通用的变量遍历方法 
 	//用于获取一个变量表达式的全路径
 	function buildVarPath(component,varObj,varStr){
 		var subVarPath = {};
 		for(var subV in varObj.subVars){
 			var subVar = varObj.subVars[subV];
 			var subPath = buildVarPath(component,subVar,subV);
 			subVarPath[subV] = subPath;
 		}

 		var isKeyword = false;
 		var fullPath = '';
 		for(var i=0;i<varObj.words.length;i++){
 			var w = varObj.words[i];
 			if(w instanceof Array){
 				var keywordPath = keyWordsMapping(varObj.segments[0],component);
                if(keywordPath){
                    isKeyword = true;
                    var exp = new RegExp('^\\.'+varObj.segments[0]);
                    fullPath += w[0].replace(exp,keywordPath);
                }else{
                    fullPath += subVarPath[w[0]] || w[0];
                }
 			}else{
 				fullPath += w;
 			}
 		}
 		var watchPath = '';
 		if(varObj.watchPath){
	 		watchPath = varObj.watchPath;
 		}else{
 			for(var i=0;i<varObj.watchPathWords.length;i++){
	 			var w = varObj.watchPathWords[i];
	 			if(w instanceof Array){
	 				watchPath += subVarPath[w[0]] || w[0];	
	 			}else{
	 				watchPath += w;
	 			}
	 		}
 		}

 		if(watchPath){
 			//watchPath为空时，使用全路径检测控制域
 			component = varInCtrlScope(component,watchPath);
 		}else{
 			component = varInCtrlScope(component,fullPath);
 		}

 		if(isKeyword)return fullPath;
 		return (component?component.__getPath():'self') + fullPath;
 	}

 	function varInCtrlScope(scope,v){
		var findScope = scope;
		while(findScope){
			if(getVarByPath(v,findScope.__getPath()) !== undefined){
				return findScope;
			}
			findScope = findScope.$parent;
		}
	}

	function getVarByPath(path,mPath){
		var varExp = mPath + path;
		var rs = undefined;
		try{
			rs = eval(varExp.replace(/^\./,''));
		}catch(e){}
		return rs;
	}

	function renderHTML(expNode,val,node,component){
		if(expNode.__lastVal === val)return;
		if(node.nodeType != 3)return;
		var nView = new View([node]);
		if(Util.isUndefined(expNode.__lastVal)){

			var ph = ViewManager.createPlaceholder('-- [html] placeholder --');
			ViewManager.insertBefore(ph,nView);
			expNode.__lastVal = val;
			expNode.__placeholder = ph;
		}

		if(expNode.__lastComp){
			//release
			expNode.__lastComp.destroy();

			nView = ViewManager.createPlaceholder('');
			ViewManager.insertAfter(nView,expNode.__placeholder);
		}

		if(!Util.isDOMStr(val)){
			val = val.replace(/</mg,'&lt;').replace(/>/mg,'&gt;');
		}

		var subComp = component.createSubComponent(val,nView);
		subComp.init();
		subComp.display();

		expNode.__lastComp = subComp;
		expNode.__lastVal = val;

		return true;
	}
}


/**
 * @classdesc 视图模型类，提供组件关联模型的操作
 * @class 
 */
function ViewModel () {
};
ViewModel.prototype = {
	/**
	 * 设置或者获取模型值，如果第二个参数为空就是获取模型值<br/>
	 * 设置模型值时，设置的是当前域的模型，如果当前模型不匹配表达式，则赋值无效<br/>
	 * 获取模型值时，会从当前域向上查找，直到找到匹配对象，如果都没找到返回null
	 * @param  {string} path 表达式路径
	 * @param  {var} val  值
	 * @return this
	 */
	data:function(path,val){
		var expObj = lexer(path);
		var evalStr = Renderer.getExpEvalStr(this,expObj);
		if(arguments.length > 1){
			if(Util.isObject(val) || Util.isArray(val)){
				val = JSON.stringify(val);
			}else 
			if(Util.isString(val)){
				val = '"'+val.replace(/\r\n|\n/mg,'\\n').replace(/"/mg,'\\"')+'"';
			}
			try{
				//fix \r\n on IE8
				eval(evalStr + '= '+ val);
			}catch(e){
				LOGGER.debug(e.message + 'eval error on data('+evalStr + '= '+ val +')');
			}
			
			return this;
		}else{
			try{
				return eval(evalStr);
			}catch(e){
				LOGGER.debug(e.message + 'eval error on data('+evalStr +')');
			}
			
		}
	},
	/**
	 * 查找拥有指定属性的最近的祖先组件
	 * @param  {string} path 表达式路径
	 * @return {Component}
	 */
	closest:function(path){
		var expObj = lexer(path);
		var evalStr = Renderer.getExpEvalStr(this,expObj);
		evalStr.replace(/^impex\.__components\["(C_[0-9]+)"\]/,'');
		return impex.__components[RegExp.$1];
	}
}
/**
 * @classdesc 组件类，包含视图、模型、控制器，表现为一个自定义标签。同内置标签样，
 * 组件也可以有属性。impex支持两种属性处理方式
 * <p>
 * <ol>
 * 		<li></li>
 * </ol>
 * </p>
 * <br/>
 * 组件可以设置事件或者修改视图样式等<br/>
 * 组件实例本身会作为视图的数据源，也就是说，实例上的属性、方法可以在视图中
 * 通过表达式访问，唯一例外的是以$开头的属性，这些属性不会被监控<br/>
 * 组件可以包含组件，所以子组件视图中的表达式可以访问到父组件模型中的值
 * <p>
 * 	组件生命周期
 * 	<ul>
 * 		<li>onCreate：当组件被创建时，该事件被触发，系统会把指定的服务注入到参数中</li>
 * 		<li>onInit：当组件初始化时，该事件被触发，系统会扫描组件中的所有表达式并建立数据模型</li>
 * 		<li>onDisplay：当组件被显示时，该事件被触发，此时组件以及完成数据构建和绑定</li>
 * 		<li>onDestroy：当组件被销毁时，该事件被触发</li>
 * 		<li>onSuspend: 当组件被挂起时，该事件被触发</li>
 * 	</ul>
 * </p>
 * 
 * @class 
 * @extends ViewModel
 */
function Component (view) {
	var id = 'C_' + im_counter++;
	this.$__id = id;
	this.$__state = Component.state.created;
	/**
	 * 组件绑定的视图对象，在创建时由系统自动注入
	 * 在DOM中，视图对象的所有操作都针对自定义标签的顶级元素，而不包括子元素
	 * @type {View}
	 */
	this.$view = view;
	/**
	 * 组件名，在创建时由系统自动注入
	 */
	this.$name;
	/**
	 * 对父组件的引用
	 * @type {Component}
	 */
	this.$parent;
	this.$__components = [];
	this.$__directives = [];
	this.$__expNodes = [];
	this.$__expPropRoot = new ExpProp();
	/**
	 * 组件模版，用于生成组件视图
	 * @type {string}
	 */
	this.$template;
	/**
	 * 组件模板url，动态加载组件模板
	 */
	this.$templateURL;
	/**
	 * 组件约束，用于定义组件的使用范围包括上级组件限制
	 * <p>
	 * {
	 * 	parents:'comp name' | 'comp name1,comp name2,comp name3...',
	 * 	children:'comp name' | 'comp name1,comp name2,comp name3...'
	 * }
	 * </p>
	 * 这些限制可以单个或者同时出现
	 * @type {Object}
	 */
	this.$restrict;
	/**
	 * 隔离列表，用于阻止组件属性变更时，自动广播子组件，如['x.y','a']。
	 * 
	 * @type {Array}
	 */
	this.$isolate;
	/**
	 * 构造函数，在组件被创建时调用
	 * 如果指定了注入服务，系统会在创建时传递被注入的服务
	 */
	this.onCreate;
	/**
	 * 组件初始化时调用,如果返回false，该组件中断初始化，并销毁
	 */
	this.onInit;
	/**
	 * 组件被显示时调用
	 */
	this.onDisplay;
	/**
	 * 组件被销毁时调用
	 */
	this.onDestroy;
};
Component.state = {
	created : 'created',
	inited : 'inited',
	displayed : 'displayed',
	suspend : 'suspend'
};
Util.inherits(Component,ViewModel);
Util.ext(Component.prototype,{
	/**
	 * 绑定事件到组件
	 * @param  {string} type 事件名
     * @param {string} exp 自定义函数表达式，比如 { fn(x+1) }
     * @param  {function} handler   事件处理回调，回调参数e
	 */
	on:function(type,exp,handler){
		this.$view.__on(this,type,exp,handler);
	},
	/**
	 * 从组件解绑事件
	 * @param  {string} type 事件名
     * @param {string} exp 自定义函数表达式，比如 { fn(x+1) }
	 */
	off:function(type,exp){
		this.$view.__off(this,type,exp);
	},
	/**
	 * 查找子组件，并返回符合条件的第一个实例。如果不开启递归查找，
	 * 该方法只会查询直接子节点集合
	 * @param  {String} name       组件名，可以使用通配符*
	 * @param  {Object} conditions 查询条件，JSON对象
	 * @param {Boolean} recur 是否开启递归查找，默认false
	 * @return {Component | null} 
	 */
	find:function(name,conditions,recur){
		name = name.toLowerCase();
		for(var i=this.$__components.length;i--;){
			var comp = this.$__components[i];
			if(name === '*' || comp.$name === name){
				var matchAll = true;
				if(conditions)
					for(var k in conditions){
						if(comp[k] !== conditions[k]){
							matchAll = false;
							break;
						}
					}
				if(matchAll){
					return comp;
				}
			}
			if(recur && comp.$__components.length>0){
				var rs = comp.find(name,conditions,true);
				if(rs)return rs;
			}
		}
		return null;
	},
	/**
	 * 查找组件内指令，并返回符合条件的第一个实例
	 * @param  {string} name       指令名，可以使用通配符*
	 * @param  {Object} conditions 查询条件，JSON对象
	 * @return {Directive | null} 
	 */
	findD:function(name,conditions){
		name = name.toLowerCase();
		for(var i=this.$__directives.length;i--;){
			var d = this.$__directives[i];
			if(name !== '*' && d.$name !== name)continue;

			var matchAll = true;
			if(conditions)
				for(var k in conditions){
					if(d[k] !== conditions[k]){
						matchAll = false;
						break;
					}
				}
			if(matchAll){
				return d;
			}
			
		}
		return null;
	},
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {string} expPath 属性路径，比如a.b.c
	 * @param  {function} cbk      回调函数，[变动类型add/delete/update,新值，旧值]
	 */
	watch:function(expPath,cbk){
		var expObj = lexer(expPath);
		var keys = Object.keys(expObj.varTree);
		if(keys.length < 1)return;
		if(keys.length > 1){
			LOGGER.warn('error on parsing watch expression['+expPath+'], only one property can be watched at the same time');
			return;
		}
		
		var varObj = expObj.varTree[keys[0]];
		var watch = new Watch(cbk,this,varObj.segments);
		//监控变量
		Builder.buildExpModel(this,varObj,watch);

		return this;
	},
	/**
	 * 添加子组件到父组件
	 * @param {Component} child 子组件
	 */
	add:function(child){
		this.$__components.push(child);
		child.$parent = this;
	},
	/**
	 * 创建一个未初始化的子组件
	 * @param  {string} type 组件名
	 * @param  {View} target 视图
	 * @return {Component} 子组件
	 */
	createSubComponentOf:function(type,target){
		var instance = ComponentFactory.newInstanceOf(type,target.elements?target.elements[0]:target);
		this.$__components.push(instance);
		instance.$parent = this;

		return instance;
	},
	/**
	 * 创建一个匿名子组件
	 * @param  {string | View} tmpl HTML模版字符串或视图对象
	 * @param  {View} target 视图
	 * @return {Component} 子组件
	 */
	createSubComponent:function(tmpl,target){
		var instance = ComponentFactory.newInstance(tmpl,target && target.elements[0]);
		this.$__components.push(instance);
		instance.$parent = this;

		return instance;
	},
	/**
	 * 初始化组件，该操作会生成用于显示的所有相关数据，包括表达式等，以做好显示准备
	 */
	init:function(){
		if(this.$__state !== Component.state.created)return;
		impex.__components[this.$__id] = this;

		if(this.$templateURL){
			var that = this;
			Util.loadTemplate(this.$templateURL,function(tmplStr){
				var rs = that.$view.__init(tmplStr,that);
				if(rs === false)return;
				that.__init(tmplStr);
				that.display();
			});
		}else{
			if(this.$template){
				var rs = this.$view.__init(this.$template,this);
				if(rs === false)return;
			}
			this.__init(this.$template);
		}
		return this;
	},
	__init:function(tmplStr){
		Scanner.scan(this.$view,this);

		LOGGER.log(this,'inited');
		
		var rs = null;
		this.onInit && (rs = this.onInit(tmplStr));
		if(rs === false){
			this.destroy();
			return;
		}

		this.$__state = Component.state.inited;
	},
	/**
	 * 显示组件到视图上
	 */
	display:function(){
		if(
			this.$__state !== Component.state.inited && 
			this.$__state !== Component.state.suspend
		)return;

		this.$view.__display();
		
		if(this.$__suspendParent){
			this.$__suspendParent.add(this);
			this.$__suspendParent = null;
		}

		Renderer.render(this);

		this.$__state = Component.state.displayed;

		Builder.build(this);

		LOGGER.log(this,'displayed');

		this.onDisplay && this.onDisplay();
	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	destroy:function(){
		if(this.$__state === null)return;

		LOGGER.log(this,'destroy');

		if(this.$parent){
			var i = this.$parent.$__components.indexOf(this);
			if(i > -1){
				this.$parent.$__components.splice(i,1);
			}
			i = this.$parent.$__directives.indexOf(this);
			if(i > -1){
				this.$parent.$__directives.splice(i,1);
			}
			this.$parent = null;
		}
		
		this.$view.__destroy(this);

		while(this.$__components.length > 0){
			this.$__components[0].destroy();
		}

		this.$view = 
		this.$__components = 
		this.$__directives = 
		this.$__expNodes = 
		this.$__expPropRoot = null;

		this.onDestroy && this.onDestroy();

		if(CACHEABLE && this.$name && !(this instanceof Directive)){
			var cache = im_compCache[this.$name];
			if(!cache)cache = im_compCache[this.$name] = [];

			this.$__state = Component.state.created;
			this.$__components = [];
			this.$__directives = [];
			this.$__expNodes = [];
			this.$__expPropRoot = new ExpProp();

			cache.push(this);
		}else{
			this.$__impex__observer = 
			this.$__impex__propChains = 
			this.$__state = 
			this.$__id = 
			this.$templateURL = 
			this.$template = 
			this.$restrict = 
			this.$isolate = 
			this.onCreate = 
			this.onInit = 
			this.onDisplay = 
			this.onSuspend = 
			this.onDestroy = null;
		}

		impex.__components[this.$__id] = null;
		delete impex.__components[this.$__id];
	},
	/**
	 * 挂起组件，组件视图会从文档流中脱离，组件模型会从组件树中脱离，组件模型不再响应数据变化，
	 * 但数据都不会销毁
	 * @param {boolean} hook 是否保留视图占位符，如果为true，再次调用display时，可以在原位置还原组件，
	 * 如果为false，则需要注入viewManager，手动插入视图
	 * @see ViewManager
	 */
	suspend:function(hook){
		if(!(this instanceof Directive) && this.$__state !== Component.state.displayed)return;

		LOGGER.log(this,'suspend');

		if(this.$parent){
			var i = this.$parent.$__components.indexOf(this);
			if(i > -1){
				this.$parent.$__components.splice(i,1);
			}
			this.$__suspendParent = this.$parent;

			this.$parent = null;
		}
		
		this.$view.__suspend(this,hook===false?false:true);

		this.onSuspend && this.onSuspend();

		this.$__state = Component.state.suspend;
	},
	__getPath:function(){
		return 'impex.__components["'+ this.$__id +'"]';
	}
});
/**
 * @classdesc 视图类，提供视图相关操作。所有影响显示效果的都属于视图操作，
 * 比如show/hide/css/animate等等
 * 无法直接创建实例，会被自动注入到组件或者指令中
 * 一个组件或者指令只会拥有一个视图
 * @class
 */
function View (elements,target) {
	/**
	 * 对可视元素的引用，在DOM中就是HTMLElement，
	 * 在绝大多数情况下，都不应该直接使用该属性
	 * @type {Array}
	 */
	this.elements = elements;

	this.__evMap = {};
	this.__target = target;
}
View.prototype = {
	__init:function(tmpl,component){
		//解析属性
		var propMap = this.__target.attributes;
		var innerHTML = this.__target.innerHTML;

		var compileStr = tmplExpFilter(tmpl,innerHTML,propMap);
		var els = DOMViewProvider.compile(compileStr);
		if(!els || els.length < 1){
			LOGGER.warn('invalid template "'+tmpl+'" of component['+component.$name+']');
			return false;
		}
		this.elements = els;

		if(propMap)
		for(var i=propMap.length;i--;){
			var k = propMap[i].name.toLowerCase();
			if(k.indexOf('-') > -1){
				k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});
			}
			var v = propMap[i].value;
			component[k] = v;
		}
	},
	__display:function(){
		if(!this.__target ||!this.__target.parentNode || (this.elements[0].parentNode && this.elements[0].parentNode.nodeType===1))return;

		var fragment = null;
		if(this.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<this.elements.length;i++){
				fragment.appendChild(this.elements[i]);
			}
		}else{
			fragment = this.elements[0];
		}

		this.__target.parentNode.replaceChild(fragment,this.__target);
		fragment = null;
		this.__target = null;
	},
	__destroy:function(component){
		for(var k in this.__evMap){
			var events = this.__evMap[k];
	        for(var i=events.length;i--;){
	            var pair = events[i];
	            var evHandler = pair[1];

	            for(var j=this.elements.length;j--;){
	            	if(this.elements[j].nodeType !== 1)continue;
	            	Util.off(k,this.elements[j],evHandler);
	            }
	        }
		}

		var p = this.elements[0].parentNode;
		if(p){
			if(this.elements[0].__impex__view)
				this.elements[0].__impex__view = null;
			for(var i=this.elements.length;i--;){
				p.removeChild(this.elements[i]);
			}
		}

		if(this.__target){
			this.__target.parentNode.removeChild(this.__target);
			this.__target = null;
		}
	},
	__suspend:function(component,hook){
		if(!this.elements[0].parentNode)return;
		if(hook){
			this.__target =  document.createComment("-- view suspended of ["+(component.$name||'anonymous')+"] --");
			this.elements[0].parentNode.insertBefore(this.__target,this.element);
		}

		var p = null;
		for(var i=this.elements.length;i--;){
			if(this.elements[i].parentNode){
				p = this.elements[i].parentNode;
				break;
			}
		}
		if(p)
		for(var i=this.elements.length;i--;){
			if(this.elements[i].parentNode)
				p.removeChild(this.elements[i]);
		}
	},
	__on:function(component,type,exp,handler){
		var originExp = exp;
		var comp = component;
		var tmpExpOutside = '';
		var fnOutside = null;
		var evHandler = function(e){
			var tmpExp = originExp;

			if(handler instanceof Function){
				tmpExp = handler.call(comp,e,originExp);
			}
			if(!tmpExp)return;
			if(tmpExpOutside != tmpExp){
				var expObj = lexer(tmpExp);

				var evalStr = Renderer.getExpEvalStr(comp,expObj);

				var tmp = evalStr.replace('self.$event','$event');
				fnOutside = new Function('$event',tmp);

				tmpExpOutside = tmpExp;
			}
			
			try{
				fnOutside(e);
			}catch(error){
				LOGGER.debug(error.message + ' on event '+type+'('+tmp +')');
			}
			
		};
		for(var j=this.elements.length;j--;){
			var el = this.elements[j];
        	if(el.nodeType !== 1)continue;
        	Util.on(type,el,evHandler);
        }
		
		if(!this.__evMap[type]){
			this.__evMap[type] = [];
		}
		this.__evMap[type].push([exp,evHandler]);
	},
	__off:function(component,type,exp){
		var events = this.__evMap[type];
        for(var i=events.length;i--;){
            var pair = events[i];
            var evExp = pair[0];
            var evHandler = pair[1];
            if(evExp == exp){
            	for(var j=this.elements.length;j--;){
	            	if(this.elements[j].nodeType !== 1)continue;
	            	Util.off(type,this.elements[j],evHandler);
	            }
            }
        }
	},
	/**
	 * 复制当前视图
	 * @return {View}
	 */
	clone:function(){
		var tmp = [];
		for(var i=this.elements.length;i--;){
			var c = this.elements[i].cloneNode(true);
			tmp.unshift(c);
		}
		
		var copy = new View(tmp);
		return copy;
	},
	/**
	 * 显示视图
	 */
	show:function(){
		for(var i=this.elements.length;i--;){
			if(this.elements[i].nodeType !== 1)continue;
			this.elements[i].style.display = '';
		}
		return this;
	},
	/**
	 * 隐藏视图
	 */
	hide:function(){
		for(var i=this.elements.length;i--;){
			if(this.elements[i].nodeType !== 1)continue;
			this.elements[i].style.display = 'none';
		}
		return this;
	},
	/**
	 * 获取或设置视图的样式
	 * @param  {String} name  样式名，如width/height
	 * @param  {var} value 样式值
	 */
	style:function(name,value){
		if(arguments.length > 1){
			for(var i=this.elements.length;i--;){
				if(this.elements[i].nodeType !== 1)continue;
				this.elements[i].style[name] = value;
			}
			return this;
		}else{
			for(var i=0;i<this.elements.length;i++){
				if(this.elements[i].nodeType === 1)break;
			}
			return this.elements[i].style[name];
		}
	},
	/**
	 * 获取或设置视图的属性值
	 * @param  {String} name  属性名
	 * @param  {String} value 属性值
	 */
	attr:function(name,value){
		if(arguments.length > 1){
			for(var i=this.elements.length;i--;){
				if(this.elements[i].nodeType !== 1)continue;
				this.elements[i].setAttribute(name,value);
			}
			return this;
		}else{
			for(var i=0;i<this.elements.length;i++){
				if(this.elements[i].nodeType === 1)break;
			}
			return this.elements[i].getAttribute(name);
		}
	},
	/**
	 * 删除视图属性
	 * @param  {String} name  属性名
	 */
	removeAttr:function(name){
		for(var i=this.elements.length;i--;){
			if(this.elements[i].nodeType !== 1)continue;
			this.elements[i].removeAttribute(name);
		}
		return this;
	},
	/**
	 * 视图是否包含指定样式
	 * @param  {String} name  样式名
	 */
	hasClass:function(name){
		for(var i=0;i<this.elements.length;i++){
			if(this.elements[i].nodeType === 1)break;
		}
		return this.elements[i].className.indexOf(name) > -1;
	},
	/**
	 * 添加样式到视图
	 * @param  {String} names  空格分隔多个样式名
	 */
	addClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');
		for(var i=0;i<this.elements.length;i++){
			if(this.elements[i].nodeType !== 1)continue;
			this.elements[i].className += ' '+names;
		}
	},
	/**
	 * 从视图删除指定样式
	 * @param  {String} names  空格分隔多个样式名
	 */
	removeClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');
		var clss = names.split(' ');
		for(var ci=clss.length;ci--;){
			var cname = clss[ci];

			var exp = new RegExp('^'+cname+'\s+|\s+'+cname+'$|\s+'+cname+'\s+','img');

			for(var i=0;i<this.elements.length;i++){
				if(this.elements[i].nodeType !== 1)continue;

				this.elements[i].className.replace(exp,'');
			}
		}
	},
	/**
	 * 从视图添加或移除指定样式
	 * @param  {String} names  空格分隔多个样式名
	 */
	toggleClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');
		var clss = names.split(' ');
		for(var i=0;i<this.elements.length;i++){
			if(this.elements[i].nodeType === 1)break;
		}
		var add = false;
		for(var ci=clss.length;ci--;){
			var cname = clss[ci];

			if(this.elements[i].className.indexOf(cname) < 0){
				add = true;
				break;
			}
		}
		for(var i=0;i<this.elements.length;i++){
			if(this.elements[i].nodeType !== 1)continue;
			if(add){
				this.elements[i].className += ' '+names;
			}else{
				for(var ci=clss.length;ci--;){
					var cname = clss[ci];
					var exp = new RegExp('^'+cname+'\s+|\s+'+cname+'$|\s+'+cname+'\s+','img');

					this.elements[i].className.replace(exp,'');
				}
			}
		}
	}//fn over
}

function tmplExpFilter(tmpl,bodyHTML,propMap){
	tmpl = tmpl.replace(REG_TMPL_EXP,function(a,attrName){
		var attrName = attrName.replace(/\s/mg,'');
		if(attrName === 'CONTENT'){
            return bodyHTML;
        }
        if(attrName === 'BINDPROPS'){
            var rs = '';
            var ks = Object.keys(propMap);
            for(var i=ks.length;i--;){
                rs += propMap[ks[i]].nodeName + '="'+propMap[ks[i]].nodeValue+'" ';
            }
            return rs;
        }

		var attrVal = propMap[attrName] && propMap[attrName].nodeValue;
		return attrVal || '';
	});
	return tmpl;
}
/**
 * DOM视图构建器
 */
var DOMViewProvider = new function(){
	var compiler = document.createElement('div');
		
	/**
	 * 构造一个视图实例
	 * @return this
	 */
	this.newInstance = function(template,target){
		if(template === ''){
			return new View([document.createTextNode('')],target);
		}
		compiler.innerHTML = template;
		if(!compiler.childNodes[0])return null;
		var nodes = [];
		while(compiler.childNodes.length>0){
			var tmp = compiler.removeChild(compiler.childNodes[0]);
			nodes.push(tmp);
		}

		var view = new View(nodes,target);

		return view;
	}

	var headEl = ['meta','title','base'];
	this.compile = function(template){
		compiler.innerHTML = template;
		if(!compiler.children[0])return null;
		var nodes = [];
		while(compiler.children.length>0){
			var tmp = compiler.removeChild(compiler.children[0]);
			var tn = tmp.nodeName.toLowerCase();
			if(headEl.indexOf(tn) > -1)continue;

			nodes.push(tmp);
		}
		return nodes;
	}
}
/**
 * 提供视图操作
 */
var ViewManager = new function (){
	this.$singleton = true;
    /**
     * 替换视图，会把目标视图更新为新视图
     * <br/>在DOM中表现为更新元素
     * @param  {View} newView 新视图
     * @param  {View} targetView 目标视图
     */
	this.replace = function(newView,targetView){
		var targetV = targetView.elements[0],
			newV = newView.elements[0],
			p = targetView.elements[0].parentNode;
		var fragment = newV;
		if(newView.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.elements.length;i++){
				fragment.appendChild(newView.elements[i]);
			}
		}
		if(targetView.elements.length > 1){
			p.insertBefore(fragment,targetV);
			
			for(var i=targetView.elements.length;i--;){
				p.removeChild(targetView.elements[i]);
			}
		}else{
			p.replaceChild(fragment,targetV);
		}
		
	}
	/**
	 * 在指定视图前插入视图
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.insertBefore = function(newView,targetView){
		var targetV = targetView.elements[0],
			newV = newView.elements[0],
			p = targetView.elements[0].parentNode;
		var fragment = newV;
		if(newView.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.elements.length;i++){
				fragment.appendChild(newView.elements[i]);
			}
		}
		if(p)
		p.insertBefore(fragment,targetV);
	}

	/**
	 * 在指定视图后插入视图
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.insertAfter = function(newView,targetView){
		var targetV = targetView.elements[0],
			newV = newView.elements[0],
			p = targetView.elements[0].parentNode;
		var last = p.lastChild;
		var fragment = newV;
		if(newView.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.elements.length;i++){
				fragment.appendChild(newView.elements[i]);
			}
		}

		if(last == targetV){
			p.appendChild(fragment);
		}else{
			var next = targetView.elements[targetView.elements.length-1].nextSibling;
			p.insertBefore(fragment,next);
		}
	}

	/**
	 * 创建一个占位视图
	 * <br/>在DOM中表现为注释元素
	 * @param  {string} content 占位内容
	 * @return {View} 新视图
	 */
	this.createPlaceholder = function(content){
		return new View([document.createComment(content)]);
	}
}
/**
 * @classdesc 指令类，继承自组件,表现为一个自定义属性。
 * <p>
 * 	指令继承自组件，所以生命周期也类似组件
 * 	<ul>
 * 		<li>onCreate：当指令被创建时，该事件被触发，系统会把指定的服务注入到参数中</li>
 * 		<li>onInit：当指令初始化时，该事件被触发，系统会监控指令中的所有表达式</li>
 * 		<li>onDestroy：当指令被销毁时，该事件被触发</li>
 * 	</ul>
 * </p>
 * @extends Component
 * @class 
 */
function Directive (name,value) {
	Component.call(this);
	/**
	 * 指令的字面值
	 */
	this.$value = value;
	/**
	 * 指令名称
	 */
	this.$name = name;
	/**
	 * 参数列表
	 * @type {Array}
	 */
	this.$params;
	/**
	 * 过滤函数
	 * @type {Function}
	 */
	this.$filter;

	/**
	 * 是否终结<br/>
	 * 终结指令会告诉扫描器不对该组件的内部进行扫描，包括表达式，指令，子组件都不会生成<br/>
	 * *该属性与$endTag冲突，并会优先匹配
	 * @type {Boolean}
	 * @default false
	 */
	this.$final = false;
	/**
	 * 范围结束标记，用来标识一个范围指令的终结属性名<br/>
	 * 如果设置了该标识，那么从当前指令开始到结束标识结束形成的范围，扫描器都不对内部进行扫描，包括表达式，指令，子组件都不会生成<br/>
	 * *该标记必须加在与当前指令同级别的元素上<br/>
	 * *该属性与$final冲突
	 * @type {String}
	 * @default null
	 */
	this.$endTag = null;
	/**
	 * 当指令表达式中对应模型的值发生变更时触发，回调参数为表达式计算结果
	 */
	this.observe;
}
Util.inherits(Directive,Component);
Util.ext(Directive.prototype,{
	init:function(){
		impex.__components[this.$__id] = this;
		//预处理自定义标签中的表达式
		var exps = {};
		var that = this;
		this.$value.replace(REG_EXP,function(a,modelExp){
    		var expObj = lexer(modelExp);

    		var val = Renderer.evalExp(that.$parent,expObj);
    		
    		//保存表达式
    		exps[modelExp] = {
    			val:val
    		};
    	});
    	var attrVal = this.$value;
    	for(var k in exps){
			attrVal = attrVal.replace(EXP_START_TAG +k+ EXP_END_TAG,exps[k].val);
		}
		if(this.$view)
		this.$view.elements[0].setAttribute(this.$name,attrVal);
		this.$value = attrVal;

		LOGGER.log(this,'inited');

		this.onInit && this.onInit();

		this.$__state = Component.state.inited;

		//do observe
		if(this.observe){
			var expObj = lexer(attrVal);
			for(var varStr in expObj.varTree){
				var varObj = expObj.varTree[varStr];

				var aon = new AttrObserveNode(this,expObj);

				//监控变量
				if(this.$parent)
				Builder.buildExpModel(this.$parent,varObj,aon);
			}
			
			var rs = Renderer.evalExp(this.$parent,expObj);
			this.observe(rs);
		}
	}
});
/**
 * @classdesc 过滤器类，提供对表达式结果的转换处理，比如
 * <p>
 * 	{{ exp... => cap}}
 * </p>
 * 过滤器可以连接使用，并以声明的顺序依次执行，比如
 * <p>
 * 	{{ exp... => lower|cap}}
 * </p>
 * 过滤器支持参数，比如
 * <p>
 * 	{{ exp... => currency:€:4}}
 * </p>
 * @class 
 */
function Filter (component) {
	/**
	 * 所在组件
	 */
	this.$component = component;
	/**
	 * 系统自动计算的表达式结果
	 */
	this.$value;
	/**
	 * 构造函数，在服务被创建时调用
	 * 如果指定了注入服务，系统会在创建时传递被注入的服务
	 */
	this.onCreate;
};
Filter.prototype = {
	/**
	 * 转变函数，该函数是实际进行转变的入口
	 * @param  {Object} args 可变参数，根据表达式中书写的参数决定
	 * @return {string | null} 返回结果会呈现在表达式上，如果没有返回结果，表达式则变为空
	 */
	to:function(){
		return null;
	}
}
/**
 * @classdesc 服务类，提供对系统内部访问的接口，处理组件无法处理的功能
 * 服务可以被注入到组件中，也可以注入其他服务
 * 服务本身和视图、模型都无关，但是可以传递视图、模型到服务中进行处理
 * @class 
 */
function Service () {
	/**
	 * 服务是否为单例模式，如果为true，该服务就不会在注入时被实例化，比如纯函数服务
	 * @type {Boolean}
	 * @default false
	 */
	this.$singleton;
	/**
	 * 服务被注入到的宿主，可能是组件，指令或者另一个服务
	 */
	this.$host;
	/**
	 * 构造函数，在服务被创建时调用
	 * 如果指定了注入服务，系统会在创建时传递被注入的服务
	 */
	this.onCreate;
}
/**
 * 工厂基类
 */
function Factory(clazz) {
	this.types = {};

	this.baseClass = clazz;//基类
};
Factory.prototype = {
	/**
	 * 注册子类
	 */
	register : function(type,model,services){
		type = type.toLowerCase();

		//keywords check
		if(this.baseClass === Component || this.baseClass === Directive ){
			var ks = Object.keys(model);
			for(var i=BUILD_IN_PROPS.length;i--;){
				if(ks.indexOf(BUILD_IN_PROPS[i])>-1){
					LOGGER.error('attempt to overwrite build-in property['+BUILD_IN_PROPS[i]+'] of Component['+type+']');
					return;
				}
			}
		}

		var clazz = new Function("clazz","var args=[];for(var i=1;i<arguments.length;i++)args.push(arguments[i]);clazz.apply(this,args)");

		var props = {};
		Util.extProp(props,model);

		Util.inherits(clazz,this.baseClass);

		Util.extMethod(clazz.prototype,model);

		this.types[type] = {clazz:clazz,props:props,services:services};
	},
	/**
	 * 是否存在指定类型
	 * @return {Boolean} 
	 */
	hasTypeOf : function(type){
		return type in this.types;
	}
}
/**
 * 组件工厂用于统一管理系统内所有组件实例
 */
function _ComponentFactory(viewProvider){
	Factory.call(this,Component);

	this.viewProvider = viewProvider;
}
Util.inherits(_ComponentFactory,Factory);
Util.ext(_ComponentFactory.prototype,{
	getRestrictOf : function(type){
		return this.types[type].props['$restrict'];
	},
	/**
	 * 创建指定基类实例
	 */
	newInstance : function(element){
		var view = null;
		if(arguments.length === 2){
			var tmpl = arguments[0];
			var target = arguments[1];
			view = tmpl;
			if(Util.isString(tmpl))
				view = this.viewProvider.newInstance(tmpl,target);
			else{
				view.__target = target;
			}
		}else{
			view = element;
			if(Util.isDOM(element)){
				view = new View([element]);
			}
		}
		
		var rs = new this.baseClass(view);

		var props = arguments[2];
		if(props){
			//keywords check
			var ks = Object.keys(props);
			for(var i=BUILD_IN_PROPS.length;i--;){
				if(ks.indexOf(BUILD_IN_PROPS[i])>-1){
					LOGGER.error('attempt to overwrite build-in property['+BUILD_IN_PROPS[i]+'] of Component');
					return;
				}
			}
			Util.ext(rs,props);
		}
		
		return rs;
	},
	/**
	 * 创建指定类型组件实例
	 */
	newInstanceOf : function(type,target){
		if(!this.types[type])return null;

		var rs = null;
		var cache = im_compCache[type];
		if(CACHEABLE && cache && cache.length>0){
			rs = cache.pop();
		}else{
			rs = new this.types[type].clazz(this.baseClass);
			Util.extProp(rs,this.types[type].props);
			rs.$name = type;
		}

		rs.$view = new View(null,target);
		
		if(rs.onCreate){
			//inject
			var services = null;
			if(this.types[type].services){
				services = [];
				for(var i=0;i<this.types[type].services.length;i++){
					var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],rs);
					services.push(serv);
				}
			}

			services ? rs.onCreate.apply(rs,services) : rs.onCreate();
		}

		return rs;
	}
});



var ComponentFactory = new _ComponentFactory(DOMViewProvider);
/**
 * 指令工厂
 */
function _DirectiveFactory(){
	Factory.call(this,Directive);
}
Util.inherits(_DirectiveFactory,Factory);
Util.ext(_DirectiveFactory.prototype,{
	/**
	 * 检查指定类型指令是否为终结指令
	 * @param  {string}  type 指令名
	 * @return {Boolean} 
	 */
	isFinal : function(type){
		return !!this.types[type].props.$final;
	},
	/**
	 * 获取指定类型指令的范围结束标记
	 * @param  {[type]}  type 指令名
	 * @return {string} 
	 */
	hasEndTag : function(type){
		return this.types[type].props.$endTag;
	},
	newInstanceOf : function(type,nodes,component,attrName,attrValue){
		if(!this.types[type])return null;

		var params = null;
		var filter = null;
		var i = attrName.indexOf(CMD_PARAM_DELIMITER);
		if(i > -1){
			params = attrName.substr(i+1);
			var fi = params.indexOf(CMD_FILTER_DELIMITER);
			if(fi > -1){
				filter = params.substr(fi+1);
				params = params.substring(0,fi);
			}

			params = params.split(CMD_PARAM_DELIMITER);
		}

		var rs = new this.types[type].clazz(this.baseClass,attrName,attrValue,component);
		Util.extProp(rs,this.types[type].props);

		if(nodes[0].__impex__view){
			rs.$view = nodes[0].__impex__view;
		}else{
			rs.$view = new View(nodes);
			nodes[0].__impex__view = rs.$view;
		}

		if(params){
			rs.$params = params;
		}
		if(filter){
			rs.$filter = filter;
		}

		component.add(rs);
		
		if(rs.onCreate){
			//inject
			var services = null;
			if(this.types[type].services){
				services = [];
				for(var i=0;i<this.types[type].services.length;i++){
					var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],rs);
					services.push(serv);
				}
			}

			services ? rs.onCreate.apply(rs,services) : rs.onCreate();
		}

		return rs;
	}
});

var DirectiveFactory = new _DirectiveFactory();
/**
 * 过滤器工厂
 */
function _FilterFactory(){
	Factory.call(this,Filter);
}
Util.inherits(_FilterFactory,Factory);
Util.ext(_FilterFactory.prototype,{
	newInstanceOf : function(type,component){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass,component);
		Util.extProp(rs,this.types[type].props);

		if(rs.onCreate){
			//inject
			var services = null;
			if(this.types[type].services){
				services = [];
				for(var i=0;i<this.types[type].services.length;i++){
					var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],rs);
					services.push(serv);
				}
			}
			
			services ? rs.onCreate.apply(rs,services) : rs.onCreate();
		}

		return rs;
	}
});

var FilterFactory = new _FilterFactory();
/**
 * 服务工厂
 */
function _ServiceFactory(){
	Factory.call(this,Service);
}
Util.inherits(_ServiceFactory,Factory);
Util.ext(_ServiceFactory.prototype,{
	newInstanceOf : function(type,host){
		type = type.toLowerCase();
		if(!this.types[type])return null;

		var rs = null;
		if(this.types[type].props.$singleton){
			if(!this.types[type].singleton){
				this.types[type].singleton = new this.types[type].clazz(this.baseClass);
			}
			rs = this.types[type].singleton;
		}else{
			rs = new this.types[type].clazz(this.baseClass);
			Util.extProp(rs,this.types[type].props);
		}

		rs.$host = host;

		if(rs.onCreate){
			//inject
			var services = null;
			if(this.types[type].services){
				services = [];
				for(var i=0;i<this.types[type].services.length;i++){
					var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],rs);
					services.push(serv);
				}
			}
			
			services ? rs.onCreate.apply(rs,services) : rs.onCreate();
		}		

		return rs;
	}
});

var ServiceFactory = new _ServiceFactory();

 	
	var CMD_PREFIX = 'x-';//指令前缀
	var CMD_PARAM_DELIMITER = ':';
	var CMD_FILTER_DELIMITER = '.';

	var EXP_START_TAG = '{{',
		EXP_END_TAG = '}}';
	var REG_EXP = /\{\{(.*?)\}\}/img,
		REG_TMPL_EXP = /\{\{=(.*?)\}\}/img,
		REG_CMD = /x-.*/;

	var EXP2HTML_EXP_TAG = '#';
	var EXP2HTML_START_EXP = /^\s*#/;
	var FILTER_EXP = /=>\s*(.+?)$/;
	var FILTER_EXP_START_TAG = '=>';
	var LOGGER = new function(){
	    this.log = function(){}
	    this.debug = function(){}
	    this.error = function(){}
	    this.warn = function(){}
	};

	var CACHEABLE = false;

	var im_compCache = {};
	var im_counter = 0;
	var DOC_BODY = null;

	var BUILD_IN_PROPS = ['data','closest','add','on','off','find','watch','init','display','destroy','suspend'];

	/**
	 * impex是一个用于开发web应用的组件式开发引擎，impex可以运行在桌面或移动端
	 * 让你的web程序更好维护，更好开发。
	 * impex的目标是让开发者基于web技术以最低的学习成本获得最大的收益，所以impex会尽量简单。
	 * impex由组件、指令、过滤器和服务这几个概念构成
	 * @namespace 
	 * @author {@link https://github.com/MrSoya MrSoya}
	 */
	var impex = new function(){

		/**
	     * 版本信息
	     * @type {Object}
	     * @property {Array} v 版本号
	     * @property {string} state
	     * @property {function} toString 返回版本
	     */
		this.version = {
	        v:[0,7,2],
	        state:'beta',
	        toString:function(){
	            return impex.version.v.join('.') + ' ' + impex.version.state;
	        }
	    };
	    /**
	     * 官网地址
	     * @type {String}
	     * @constant
	     */
		this.website = 'http://mrsoya.github.io/impex';

		/**
		 * 设置impex参数
		 * @param  {Object} cfg 参数选项
		 * @param  {String} cfg.delimiters 表达式分隔符，默认{{ }}
		 * @param {Boolean} cfg.cacheable 是否缓存组件，如果开启该配置，所有被destroy的组件不会被释放，而是被缓存起来
		 * @param  {int} cfg.logger 日志器对象，至少实现warn/log/debug/error 4个接口，
		 * 并至少实现 0 none 1 error 2 warn 3 debug 4 log 5个级别控制
		 */
		this.config = function(cfg){
			var delimiters = cfg.delimiters || [];
			EXP_START_TAG = delimiters[0] || '{{';
			EXP_END_TAG = delimiters[1] || '}}';

			REG_EXP = new RegExp(EXP_START_TAG+'(.*?)'+EXP_END_TAG,'img');
			REG_TMPL_EXP = new RegExp(EXP_START_TAG+'=(.*?)'+EXP_END_TAG,'img');

			LOGGER = cfg.logger || new function(){
			    this.log = function(){}
			    this.debug = function(){}
			    this.error = function(){}
			    this.warn = function(){}
			};

			CACHEABLE = cfg.cacheable || false;
		};

		/**
		 * 定义组件<br/>
		 * 定义的组件实质是创建了一个组件类的子类，该类的行为和属性由model属性
		 * 指定，当impex解析对应指令时，会动态创建子类实例<br/>
		 * @param  {string} name  组件名，全小写，必须是ns-name格式，至少包含一个"-"
		 * @param  {Object} model 组件模型，用来定义新组件模版。<br/>
		 * *模型属性是共享的，比如数组是所有实例公用。如果模型中的某些属性不想
		 * 被表达式访问，只需要在名字前加上"$"符号<br/>
		 * *模型方法会绑定到组件原型中，以节省内存
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.component = function(name,model,services){
			if(!model.$template && !model.$templateURL){
				LOGGER.error("can not find property '$template' or '$templateURL' of component '"+name+"'");
				return;
			}
			ComponentFactory.register(name,model,services);
			return this;
		}

		/**
		 * 定义指令
		 * @param  {string} name  指令名，不带前缀
		 * @param  {Object} model 指令模型，用来定义新指令模版
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.directive = function(name,model,services){
			DirectiveFactory.register(name,model,services);
			return this;
		}

		/**
		 * 定义服务
		 * @param  {string} name  服务名，注入时必须和创建时名称相同
		 * @param  {Object} model 服务模型，用来定义新指令模版
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.service = function(name,model,services){
			ServiceFactory.register(name,model,services);
			return this;
		}

		/**
		 * 定义过滤器
		 * @param  {string} name  过滤器名
		 * @param  {Object} model 过滤器模型，用来定义新过滤器模版
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.filter = function(name,model,services){
			FilterFactory.register(name,model,services);
			return this;
		}

		/**
		 * 渲染一个组件，比如
		 * <pre>
		 * 	<x-stage id="entry"><x-stage>
		 * 	...
		 * 	impex.render(document.getElementById('entry')...)
		 * </pre>
		 * 如果DOM元素本身并不是组件,系统会创建一个虚拟组件，也就是说
		 * impex总会从渲染一个组件作为一切的开始
		 * @param  {HTMLElement} element DOM节点，可以是组件节点
		 * @param  {Object} model 模型，用来给组件提供数据支持，如果节点本身已经是组件，
		 * 该模型所包含参数会附加到模型中 
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 */
		this.render = function(element,model,services){
			if(!DOC_BODY){
				DOC_BODY = document.body;
			}
			var name = element.tagName.toLowerCase();
			if(elementRendered(element)){
				LOGGER.warn('element ['+name+'] has been rendered');
				return;
			}
			var comp = ComponentFactory.newInstanceOf(name,element);
			if(!comp){
				topComponentNodes.push(element);
				comp = ComponentFactory.newInstance(element,null,model);
			}

			if(comp.onCreate){
				var svs = null;
				if(Util.isArray(services)){
					//inject
					svs = [];
					for(var i=0;i<services.length;i++){
						var serv = ServiceFactory.newInstanceOf(services[i],comp);
						svs.push(serv);
					}
				}
				svs ? comp.onCreate.apply(comp,svs) : comp.onCreate();
			}			
			
			comp.init();
			comp.display();

			return comp;
		}

		var topComponentNodes = [];
		function elementRendered(element){
			var p = element;
			do{
				if(topComponentNodes.indexOf(p) > -1)return true;
				p = p.parentNode;
			}while(p);
			return false;
		}

		this.__components = {};

		/**
		 * 查找组件实例，并返回符合条件的所有实例
		 * @param  {string} name       组件名，可以使用通配符*
		 * @param  {Object} conditions 查询条件，JSON对象
		 * @return {Array}  
		 */
		this.findAll = function(name,conditions){
			name = name.toLowerCase();
			var rs = [];
			var ks = Object.keys(this.__components);
			for(var i=ks.length;i--;){
				var comp = this.__components[ks[i]];
				if(name !== '*' && comp.$name !== name)continue;

				var matchAll = true;
				if(conditions)
					for(var k in conditions){
						if(comp[k] !== conditions[k]){
							matchAll = false;
							break;
						}
					}
				if(matchAll){
					rs.push(comp);
				}
				
			}
			return rs;
		}
	}
/**
 * 内建服务，提供基础操作接口
 */

/**
 * 视图管理服务提供额外的视图操作，可以用在指令或组件中。
 * 使用该服务，只需要注入即可
 */
impex.service('ViewManager',ViewManager);


/**
 * 组件管理服务提供对组件的额外操作
 * 使用该服务，只需要注入即可
 */
impex.service('ComponentManager',new function(){
	/**
	 * 是否存在指定类型的组件
	 * @return {Boolean} 
	 */
    this.hasTypeOf = function(type){
    	return ComponentFactory.hasTypeOf(type);
    }
});
/**
 * 内建指令
 */
!function(impex){
    ///////////////////// 视图控制指令 /////////////////////
    /**
     * impex会忽略指令所在的视图，视图不会被impex解析
     * <br/>使用方式：<div x-ignore >{{ignore prop}}</div>
     */
    impex.directive('ignore',{
        $final:true
    });
    /**
     * 绑定视图属性，并用表达式的值设置属性
     * <br/>使用方式：<img x-bind:src="exp">
     */
    impex.directive('bind',{
        onInit:function(){
            if(!this.$params || this.$params.length < 1){
                LOGGER.warn('at least one attribute be binded');
            }
        },
        observe : function(rs){
            if(!this.$params || this.$params.length < 1)return;

            var filter = null;
            if(this.$filter){
                var owner = this.closest(this.$filter);
                if(owner){
                    filter = owner[this.$filter];
                }
            }

            if(filter){
                var allowed = filter(rs);
                if(!Util.isUndefined(allowed) && !allowed){
                    return;
                }
            }

            for(var i=this.$params.length;i--;){
                var p = this.$params[i];
                this.$view.attr(p,rs);
            }
            
        }
    });
    /**
     * 控制视图显示指令，根据表达式计算结果控制
     * <br/>使用方式：<div x-show="exp"></div>
     */
    impex.directive('show',{
        observe : function(rs){
            if(rs){
                //显示
                this.$view.show();
            }else{
                // 隐藏
                this.$view.hide();
            }
        }
    });
    /**
     * x-show的范围版本
     */
    impex.directive('show-start',{
        $endTag : 'show-end',
        onCreate : function(){
            this.$view.removeAttr('x-show-start');

            //更新视图
            this.__init();
            this.display();
        },
        observe : function(rs){
            if(rs){
                //显示
                this.$view.show();
            }else{
                // 隐藏
                this.$view.hide();
            }
        }
    });

    /**
     * 效果与show相同，但是会移除视图
     * <br/>使用方式：<div x-if="exp"></div>
     */
    impex.directive('if',{
        onCreate : function(viewManager){
            this.viewManager = viewManager;
            this.placeholder = viewManager.createPlaceholder('-- directive [if] placeholder --');
        },
        observe : function(rs){
            if(rs){
                if(this.$view.elements[0].parentNode)return;
                //添加
                this.viewManager.replace(this.$view,this.placeholder);
            }else{
                if(!this.$view.elements[0].parentNode)return;
                //删除
                this.viewManager.replace(this.placeholder,this.$view);
            }
        }
    },['ViewManager']);

    /**
     * x-if的范围版本
     * <br/>使用方式：<div x-if-start="exp"></div>...<div x-if-end></div>
     */
    impex.directive('if-start',{
        $endTag : 'if-end',
        onCreate : function(viewManager){
            this.viewManager = viewManager;
            this.placeholder = viewManager.createPlaceholder('-- directive [if] placeholder --');
            this.$view.removeAttr('x-if-start');

            //更新视图
            this.__init();
            this.display();
        },
        observe : function(rs){
            if(rs){
                if(this.$view.elements[0].parentNode)return;
                //添加
                this.viewManager.replace(this.$view,this.placeholder);
            }else{
                if(!this.$view.elements[0].parentNode)return;
                //删除
                this.viewManager.replace(this.placeholder,this.$view);
            }
        }
    },['ViewManager']);

    /**
     * 用于屏蔽视图初始时的表达式原始样式，需要配合class使用
     */
    impex.directive('cloak',{
        onCreate:function(){
            var className = this.$view.attr('class');
            if(!className){
                LOGGER.warn("can not find attribute[class] of element["+this.$view.name+"] which directive[cloak] on");
                return;
            }
            className = className.replace('x-cloak','');
            this.$view.attr('class',className);
            updateCloakAttr(this.$parent,this.$view.elements[0],className);
        }
    });

    function updateCloakAttr(component,node,newOrigin){
        for(var i=component.$__expNodes.length;i--;){
            var expNode = component.$__expNodes[i];
            if(expNode.node == node && expNode.attrName === 'class'){
                expNode.origin = newOrigin;
            }
        }

        for(var j=component.$__components.length;j--;){
            updateCloakAttr(component.$__components[j],node,newOrigin);
        }
    }


    ///////////////////// 模型控制指令 /////////////////////
    /**
     * 绑定模型属性，当控件修改值后，模型值也会修改
     * <br/>使用方式：<input x-model="model.prop">
     */
    impex.directive('model',{
        onCreate : function(){
            switch(this.$view.elements[0].nodeName.toLowerCase()){
                case 'textarea':
                case 'input':
                    var type = this.$view.attr('type');
                    switch(type){
                        case 'radio':
                            this.on('click','changeModel($event)');
                            break;
                        case 'checkbox':
                            this.on('click','changeModelCheck($event)');
                            break;
                        default:
                            var hack = document.body.onpropertychange===null?'propertychange':'input';
                            this.on(hack,'changeModel($event)');
                    }
                    
                    break;
                case 'select':
                    this.on('change','changeModel($event)');
                    break;
            }
        },
        changeModelCheck : function(e){
            var t = e.target || e.srcElement;
            var val = t.value;
            var parts = this.$parent.data(this.$value);
            if(!(parts instanceof Array)){
                parts = [parts];
            }
            if(t.checked){
                parts.push(val);
            }else{
                var i = parts.indexOf(val);
                if(i > -1){
                    parts.splice(i,1);
                }
            }
            this.$parent.data(this.$value,parts);
        },
        changeModel : function(e){
            this.$parent.data(this.$value,(e.target || e.srcElement).value);
        }
    });

    function eachModel(){
        this.onCreate = function(viewManager){
            this.$eachExp = /(.+?)\s+as\s+((?:[a-zA-Z0-9_$]+?\s*=>\s*[a-zA-Z0-9_$]+?)|(?:[a-zA-Z0-9_$]+?))$/;
            this.$viewManager = viewManager;
            this.$expInfo = this.parseExp(this.$value);
            this.$parentComp = this.$parent;
            this.$__view = this.$view;
            this.$cache = [];
            
            this.$subComponents = [];//子组件，用于快速更新each视图，提高性能

            this.$cacheSize = 20;
        }
        this.onInit = function(){
            if(this.$__state === Component.state.inited)return;
            //获取数据源
            this.$ds = this.$parent.data(this.$expInfo.ds);
            
            this.$placeholder = this.$viewManager.createPlaceholder('-- directive [each] placeholder --');
            this.$viewManager.insertBefore(this.$placeholder,this.$view);

            this.build(this.$ds,this.$expInfo.k,this.$expInfo.v);
            //更新视图
            this.destroy();

            var that = this;
            this.$parentComp.watch(this.$expInfo.ds,function(type,newVal,oldVal){

                var newKeysSize = 0;
                var oldKeysSize = 0;

                for(var k in newVal){
                    if(!newVal.hasOwnProperty(k) || k.indexOf('$')===0)continue;
                    newKeysSize++;
                }
                if(newKeysSize === 0){
                    oldKeysSize = that.$subComponents.length;
                }else{
                    for(var k in oldVal){
                        if(!oldVal.hasOwnProperty(k) || k.indexOf('$')===0)continue;
                        oldKeysSize++;
                    }
                }
                
                that.rebuild(newVal,newKeysSize - oldKeysSize,that.$expInfo.k,that.$expInfo.v);
            });
        }
        this.rebuild = function(ds,diffSize,ki,vi){
            if(diffSize < 0){
                var tmp = this.$subComponents.splice(0,diffSize*-1);
                if(this.$cache.length < this.$cacheSize){
                    for(var i=tmp.length;i--;){
                        this.$cache.push(tmp[i]);
                    }
                    for(var i=this.$cache.length;i--;){
                        this.$cache[i].suspend(false);
                    }
                }else{
                    for(var i=tmp.length;i--;){
                        tmp[i].destroy();
                    }
                }
            }else if(diffSize > 0){
                var tmp = this.$cache.splice(0,diffSize);
                for(var i=0;i<tmp.length;i++){
                    this.$subComponents.push(tmp[i]);
                    this.$viewManager.insertBefore(tmp[i].$view,this.$placeholder);
                }
                var restSize = diffSize - tmp.length;
                while(restSize--){
                    this.createSubComp();
                }
            }

            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;
                if(k.indexOf('$__')===0)continue;

                var subComp = this.$subComponents[index];
                //模型
                subComp[vi] = ds[k];
                subComp['$index'] = index++;
                if(ki)subComp[ki] = isIntK?k>>0:k;

                subComp.init();
                subComp.display();
            }
        }
        this.createSubComp = function(){
            var parent = this.$parentComp;
            var target = this.$viewManager.createPlaceholder('');
            this.$viewManager.insertBefore(target,this.$placeholder);
            //视图
            var copy = this.$__view.clone().removeAttr(this.$name);
            //创建子组件
            var subComp = parent.createSubComponent(copy,target);
            this.$subComponents.push(subComp);
            return subComp;
        }
        this.build = function(ds,ki,vi){            
            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;
                if(k.indexOf('$__')===0)continue;

                var subComp = this.createSubComp();
                
                //模型
                subComp[vi] = ds[k];
                subComp['$index'] = index++;
                if(ki)subComp[ki] = isIntK?k>>0:k;
            }

            //初始化组件
            for(var i=this.$subComponents.length;i--;){
                this.$subComponents[i].init();
                this.$subComponents[i].display();
            }
        }
        this.parseExp = function(exp){
            var ds,k,v;
            exp.replace(this.$eachExp,function(a,attrName,subAttr){
                ds = attrName;
                var tmp = subAttr.replace(/\s/mg,'');
                var kv = tmp.split('=>');
                if(kv.length>1){
                    k = kv[0];
                    v = kv[1];
                }else{
                    v = kv[0];
                }
                
            });
            if(!ds){
                //each语法错误
                LOGGER.error('invalid each expression : '+exp);
                return;
            }

            return {
                ds:ds,
                k:k,
                v:v
            };
        }
    };
    var each = new eachModel();
    each.$final = true;
    /**
     * each指令用于根据数据源，动态生成列表视图。数据源可以是数组或者对象
     * <br/>使用方式：
     * <br/> &lt;li x-each="datasource as k => v"&gt;{{k}} {{v}}&lt;/li&gt;
     * <br/> &lt;li x-each="datasource as v"&gt;{{v}}&lt;/li&gt;
     * 
     * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
     */
    impex.directive('each',each,['ViewManager']);


    var eachStart = new eachModel();
    eachStart.$endTag = 'each-end';
    /**
     * each-start/end指令类似each，但是可以循环范围内的所有节点。数据源可以是数组或者对象
     * <br/>使用方式：
     * <br/> &lt;a x-each-start="datasource as k => v"&gt;{{k}} {{v}}&lt;/a&gt;
     * <br/> &lt;b x-each-end&gt;{{v}}&lt;/b&gt;
     * 
     * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
     */
    impex.directive('each-start',eachStart,['ViewManager']);
}(impex);

 	if ( typeof module === "object" && typeof module.exports === "object" ) {
 		module.exports = impex;
 	}else{
 		global.impex = impex;
 	}

 }(window||this);