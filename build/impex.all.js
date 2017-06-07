/*
 * impexjs is a powerful web application engine to build 
 * reactive webUI system
 *
 *
 * Copyright 2015-2017 MrSoya and other contributors
 * Released under the MIT license
 *
 * website: http://impexjs.org
 * last build: 2017-06-07
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
        child.prototype._super = parent.prototype;
	}

    this.ext = function(to,from){
        var keys = Object.keys(from);
        for (var i=keys.length;i--;) {
            var k = keys[i];
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

    function loadError(){
        LOGGER.error('can not fetch remote data of : '+this.url);
    }
    function loadTimeout(){
        LOGGER.error('load timeout : '+this.url);
    }
    function onload(){
        if(this.status===0 || //native
        ((this.status >= 200 && this.status <300) || this.status === 304) ){
            var txt = this.responseText;
            compiler.innerHTML = txt;
            var tmpl = compiler.querySelector('template').innerHTML;
            var comp = compiler.querySelector('script#impex').innerHTML;
            var links = compiler.querySelectorAll('link[rel="impex"]');

            //register requires
            for(var i=links.length;i--;){
                var lk = links[i];
                var type = lk.getAttribute('type');
                var href = lk.getAttribute('href');
                impex.component(type,href);
            }

            var cbks = requirements[this.url];
            var url = this.url;
            cbks.forEach(function(cbk){
                var __impex_comp_eval = null;
                var evl = eval;
                evl('__impex_comp_eval = '+comp);//scope call
                if(!window.__impex_comp_eval)
                    LOGGER.error('can not find component defination of : '+url);
                var data = window.__impex_comp_eval();
                cbk([tmpl,data]);
            });
            requirements[this.url] = null;
        }
    }

    var requirements = {};
    this.loadComponent = function(url,cbk,timeout){
        if(!requirements[url]){
            requirements[url] = [];
            requirements[url].push(cbk);
        }else{
            requirements[url].push(cbk);
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
        // xhr.cbk = cbk;
        xhr.url = url;
        xhr.send(null);
    }

    this.immutable = function(v){
        if(typeof v === 'object'){
            var o = JSON.parse(JSON.stringify(v));
            return o;
        }
        return v;
    }


    this.compileViewOf = function(component,__nodes){
        var data = Scanner.scan(__nodes,component);
        //link exp & obj
        Builder.link(component,data.exps);
        //render exps
        Renderer.renderExpNodes(data.exps);
        //init children
        var children = data.comps;
        for(var i = children.length;i--;){
            children[i].init();
        }
        //init directs
        var directs = data.directs;
        for(var i = directs.length;i--;){
            directs[i].init();
        }
        //display children
        for(var i = 0;i<children.length;i++){
            if(!children[i].__url)
                children[i].mount();
        }
        //active directs
        for(var i = directs.length;i--;){
            directs[i].active();
        }
    }
}
	var Observer = null;
	window.Proxy && !function(){
		function setArray(ary,index,value){
			if(isNaN(index))return;

			ary[index>>0] = value;
		}
		function delArray(ary,index){
			if(isNaN(index))return;

			ary.splice(index,1);
		}
		function observeData(handler,propChains,data,component){
			if(data && data.__im__propChain)return data;

			var t = data instanceof Array?[]:{};
			for(var k in data){
				var o = data[k];
				if(typeof o === 'object'){
					var pcs = propChains.concat();
					pcs.push(k);
					var tmp = observeData(handler,pcs,o,component);
					t[k] = tmp;
				}else{
					t[k] = o;
				}
			}
			Object.defineProperty(t,'__im__propChain',{enumerable: false,writable: false,value:propChains});
			Object.defineProperty(t,'__im__extPropChain',{enumerable: false,writable: true,value:[]});
			
			var p = new Proxy(t, handler);
			Object.defineProperty(p,'__im__target',{enumerable: false,writable: false,value:t});
			var id = Date.now() + Math.random();
			Object.defineProperty(t,'__im__oid',{enumerable: false,writable: false,value:id});
			return p;
		}

		Observer = {
			observe:function(data,component){
				if(data && data.__im__propChain)return data;

				//build handler
				var handler = {
					comp:component,
				    // get: function(target, name){
				    //     return target[name];
				    // },
				    set: function(target,name,value) {
				    	var isAdd = !(name in target);

				    	var old = target[name];
				    	var v = value;
				    	if(old === v)return true;

				    	if(typeof v === 'object' && v !== null){
				    		var pcs = target.__im__propChain.concat();
							pcs.push(name);
				    		v = observeData(this,pcs,v,this.comp);
				    	}
				    	if(target instanceof Array){
				    		setArray(target,name,v);
				    	}else{
					    	target[name] = v;
				    	}

				    	var path = target.__im__propChain;//.concat();
				    	var xpath = target.__im__extPropChain;

				    	var changeObj = {object:target,name:name,pc:path,xpc:xpath,oldVal:old,newVal:v,comp:this.comp,type:isAdd?'add':'update'};

				    	ChangeHandler.handle(changeObj);
				    	
				    	return true;
				    },
				    deleteProperty: function (target, name) {
				    	var old = target[name];

					    if(target instanceof Array){
				    		delArray(target,name);
				    	}else{
				    		delete target[name];
				    	}

					    var path = target.__im__propChain;//.concat();
				    	var xpath = target.__im__extPropChain;

					    var changeObj = {object:target,name:name,pc:path,xpc:xpath,oldVal:old,comp:this.comp,type:'delete'};
				    	ChangeHandler.handle(changeObj);

					    return true;
					}
				};

				return observeData(handler,[],data,component);
			}
		};
	}();

	///////////////////////////////////////// fallback ///////////////////////////////////////////
	!window.Proxy && !function(){
		function getter(k){
			return this.__im__innerProps[k];
		}
		function setter(k,v){
			var old = this.__im__innerProps[k];
			if(old)clearObserve(old);
			if(typeof v === 'object'){
	    		var pcs = this.__im__propChain.concat();
				pcs.push(k);
	    		v = observeData(pcs,v,this.__im__comp);
	    	}
			this.__im__innerProps[k] = v;

			var path = this.__im__propChain;
	    	var xpath = this.__im__extPropChain;
	    	
	    	handler([{
	    		name:k,
	    		target:this,
	    		oldVal:old,
	    		newVal:v,
	    		type:'update'
	    	}],true);
		}
		function observeData(propChains,data,component){
			if(data && data.__im__propChain)return data;
			
			var t = data instanceof Array?[]:{};

			Object.defineProperty(t,'__im__innerProps',{enumerable: false,writable: true,value:{}});
			var props = {};

			var observeObj = {};
			for(var k in data){
				if(!data.hasOwnProperty(k))continue;

				var o = data[k];			
				if(typeof o === 'object'){
					var pcs = propChains.concat();
					pcs.push(k);
					var tmp = observeData(pcs,o,component);
					t.__im__innerProps[k] = tmp;
				}else{
					t.__im__innerProps[k] = o;
				}

				//设置监控属性
				observeObj[k] = o;

				!function(k){
					props[k] = {
						get:function(){return getter.call(this,k)},
						set:function(v){setter.call(this,k,v)},
						enumerable:true,
						configurable:true
					};
				}(k);
			}

			Object.defineProperties(t,props);
			Object.defineProperty(t,'__im__propChain',{enumerable: false,writable: false,value:propChains});
			Object.defineProperty(t,'__im__extPropChain',{enumerable: false,writable: true,value:[]});
			Object.defineProperty(t,'__im__target',{enumerable: false,writable: false,value:t.__im__innerProps});
			Object.defineProperty(t,'__im__comp',{enumerable: false,writable: false,value:component});

			var id = Date.now() + Math.random();
			Object.defineProperty(t,'__im__oid',{enumerable: false,writable: false,value:id});
			observedObjects.push({snap:observeObj,now:t,id:id});

			return t;
		}
		function dirtyCheck(){
			RAF(function(){
				for(var i=observedObjects.length;i--;){
					var obj = observedObjects[i];

					var oldVer = obj.snap,
						newVer = obj.now,
						id = obj.id;

					var changes = [];
					for(var prop in oldVer){
						if(!(prop in newVer)){
							var change = {};
							change.name = prop;
							change.target = newVer;
							change.oldVal = oldVer[prop];
							change.snap = oldVer;
							change.type = 'delete';
							
							changes.push(change);
						}
					}
					for(var prop in newVer){
						if(!(prop in oldVer)){
							var change = {};
							change.name = prop;
							change.target = newVer;
							change.newVal = newVer[prop];
							change.snap = oldVer;
							change.type = 'add';
							
							changes.push(change);
						}
					}
					if(changes.length>0){
						handler(changes);
					}
				}

				dirtyCheck();
			});
		}
		function clearObserve(obj){
			var oo = null;
			for(var i=observedObjects.length;i--;){
				oo = observedObjects[i];
				if(oo.id === obj.__im__oid)break;
			}
			if(i>-1){
				observedObjects.splice(i,1);
				if(typeof oo === 'object'){
					clearObserve(oo);
				}
			}
		}
		function handler(changes,fromSetter){
			for(var i=changes.length;i--;){
				var change = changes[i];

				// console.log(change);

				var name = change.name;
				var target = change.target;
				var path = target.__im__propChain;//.concat();
		    	var xpath = target.__im__extPropChain;
		    	var comp = target.__im__comp;
		    	var old = change.oldVal;
		    	var v = change.newVal;
		    	var type = change.type;
		    	var snap = change.snap;

		    	if(type === 'add'){
		    		snap[name] = v;
		    		target.__im__innerProps[name] = v;
		    		if(typeof v === 'object'){
		    			var pc = path.concat();
		    			pc.push(name);
		    			target.__im__innerProps[name] = observeData(pc,v,comp);
		    		}
		    		!function(name,target){
		    			Object.defineProperty(target,name,{
		    				get:function(){
		    					return getter.call(this,name)
		    				},
							set:function(v){
								setter.call(this,name,v)
							},
							enumerable:true,
							configurable:true
		    			});
		    		}(name,target);
		    		
		    	}else 
		    	if(type === 'delete'){
		    		var obj = snap[name];
		    		if(typeof obj === 'object'){
		    			clearObserve(obj);
		    		}
		    		delete snap[name];
		    	}else if(!fromSetter){
		    		console.log('无效update')
		    		continue;
		    	}

		    	var changeObj = {object:target,name:name,pc:path,xpc:xpath,oldVal:old,newVal:v,comp:comp,type:type};
		    	ChangeHandler.handle(changeObj);
		    }
		}
		var observedObjects = [];//用于保存监控对象

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

		Observer = {};
		Observer.observe = function(data,component){
			if(data && data.__im__propChain)return data;

			return observeData([],data,component);
		}

		dirtyCheck();
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
    function varParse(varMap,sentence,pair,parentVO){
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
                if(VAR_EXP_START.test(l)){
                    var vo = Var();
                    var varLiteral = varParse(varMap,sentence.substr(i),stack[0],vo);
                    i = i + varLiteral.length - 1;

                    //words
                    var tmp = varLiteral;
                    if(VAR_EXP_START.test(varLiteral[0]) && 
                        keyWords.indexOf(tmp)<0
                    ){
                        varObj.subVars['.'+varLiteral] = vo;
                        //keywords check
                        if(keyWords.indexOf(tmp) < 0)
                            tmp = ['.'+tmp];
                    }
                    varObj.words.push(tmp);
                }else 
                if(l === ']' || l === ')'){
                    if(l === ']' && stack[0] !== '[')continue;//x[(y)]
                    if(l === ')' && stack[0] !== '(')continue;

                    stack.pop();
                    if(stack.length === 0){
                        var part = sentence.substring(stackBeginPos,i+1);
                        literal += part;

                        varObj.segments.push(part);
                        lastSegPos = i;
                    }
                    if(l === ')'){
                        varObj.isFunc = true;
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
                            if(tmpStr)
                            varObj.segments.push(tmpStr);
                        }
                        lastSegPos = i;
                    }

                    lastWordPos = i;
                }else
                if((l === ']' && pair === '[') || (l === ')' && pair === '(')){
                    //push words
                    var tmp = literal;
                    //x.y ]
                    //x[...].y ]
                    //x[..] ]
                    if(tmp[tmp.length-1] !== l){
                        tmp = tmp.substring(lastWordPos+1,tmp.length);

                        if(tmp){//is var
                            if(sentence.indexOf(tmp) === 0){
                                varObj.words.push(['.'+tmp]);
                            }else{
                                varObj.words.push(tmp);
                            }
                        }

                        //segments
                        var point = tmp.lastIndexOf('.');
                        if(point > 0){
                            tmp = tmp.substr(point);
                        }
                        
                        if(tmp)
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
                    
                    if(!pair && keyWords.indexOf(tmp) < 0){
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
        
        if(!pair){
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
function ExpData (propName) {
	this.propName = propName;
	this.subProps = {};
	this.expNodes = [];
	this.attrObserveNodes = [];
	this.watchs = [];
}

/**
 * 变更信息
 */
function Change(name,newVal,oldVal,path,type,object){
	this.name = name;
	this.newVal = newVal;
	this.oldVal = oldVal;
	this.path = path;
	this.type = type;
	this.object = object;
	this.expProps = [];
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
	this.id = Math.random();
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
 * 参数信息
 */
function Prop (subComp,name,segments,expWords) {
	this.subComp = subComp;
	this.name = name;
	this.segments = segments;
	this.expWords = expWords;
}
/**
 * 扫描器
 */

var Scanner = new function() {
	//预扫描
	function prescan(node){
		if(!node)return;
		var textNodeAry = [];
		var replacements = [];
		queryAllTextNode(node,textNodeAry);

		for(var ii=textNodeAry.length;ii--;){
			var node = textNodeAry[ii];
			var text = node.nodeValue;
			var segments = [];
			var lastPos = 0;
			text.replace(REG_EXP,function(fullTxt,modelExp,pos){
				var txt = text.substring(lastPos,pos);
				if(txt)segments.push(txt);
				segments.push(fullTxt);

				lastPos = pos + fullTxt.length;
			});

			var txt = text.substring(lastPos,text.length);
			if(txt)segments.push(txt);

			if(segments.length<2){
				replacements.unshift(null);
				continue;
			}
			
			var fragment = document.createDocumentFragment();
			for(var i=0;i<segments.length;i++){
				var tn = document.createTextNode(segments[i]);
				fragment.appendChild(tn);
			}
			replacements.unshift(fragment);
		}
		
		for(var i=textNodeAry.length;i--;){
			var n = textNodeAry[i];
			if(replacements[i] && replacements[i].childNodes.length>1 && n.parentNode)
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
	this.scan = function(scanNodes,component){
		var direcs = [],subComps = [],exps = [];
        for(var i=0,l=scanNodes.length;i<l;i++){
        	prescan(scanNodes[i]);
            scan(scanNodes[i],component,direcs,subComps,exps);
        }
        return {directs:direcs,comps:subComps,exps:exps};
	}

	function getRestrictParent(selfComp){
		if(selfComp.restrict)return selfComp;
		var p = selfComp.parent;
		while(p){
			if(p.name && p.restrict)return p;
			p = p.parent;
		};
		return null;
	}

	function scan(node,component,direcs,subComps,exps){
		if(node.tagName === 'SCRIPT')return;

		if(node.attributes || node.nodeType === 11){
			if(node.tagName){
				var tagName = node.tagName.toLowerCase();
				
				var atts = [];
				for(var i=node.attributes.length;i--;){
					var tmp = node.attributes[i];
					atts.push([tmp.name,tmp.value]);
				}

				var scopeDirs = [];
				//检测是否有子域属性，比如each
				for(var i=atts.length;i--;){
					var name = atts[i][0];
					if(name.indexOf(CMD_PREFIX) !== 0)continue;
					
					var c = name.replace(CMD_PREFIX,'');
					var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
					if(CPDI > -1)c = c.substring(0,CPDI);

					if(DirectiveFactory.hasTypeOf(c)){
						if(DirectiveFactory.isFinal(c)){
							scopeDirs.push([c,atts[i],DirectiveFactory.priority(c) || 0]);
						}
					}
				}

				if(scopeDirs.length>0){
					scopeDirs.sort(function(a,b){
						return b[2] - a[2];
					});
					var c = scopeDirs[0][0],
						attr = scopeDirs[0][1];
					if(DirectiveFactory.isFinal(c)){
						var direct = DirectiveFactory.newInstanceOf(c,node,component,attr[0],attr[1]);
						direcs.push(direct);
						return;
					}
				}

				//解析组件
				if(component.name!==tagName && ComponentFactory.hasTypeOf(tagName)){
					var pr = getRestrictParent(component);
					if(pr && pr.restrict.children){
						var children = pr.restrict.children.split(',');
						if(children.indexOf(tagName) < 0)return;
					}
					var cr = ComponentFactory.getRestrictOf(tagName);
					if(cr && cr.parents){
						var parents = cr.parents.split(',');
						if(parents.indexOf(pr.name) < 0)return;
					}
					var instance = component.createSubComponentOf(node);
					subComps.push(instance);
					return;
				}
				

				//others
				for(var i=atts.length;i--;){
					var attName = atts[i][0];
					var attVal = atts[i][1];
					if(REG_CMD.test(attName)){
						var c = attName.replace(CMD_PREFIX,'');
						var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
						if(CPDI > -1)c = c.substring(0,CPDI);
						//如果有对应的处理器
						if(DirectiveFactory.hasTypeOf(c)){
							var direct = DirectiveFactory.newInstanceOf(c,node,component,attName,attVal);
							direcs.push(direct);
						}
					}else if(attName[0] === ':'){
						var direct = DirectiveFactory.newInstanceOf('on',node,component,attName,attVal);
						direcs.push(direct);
					}else if(REG_EXP.test(attVal)){//只对value检测是否表达式，name不检测
				    	var exp = recordExpNode(attVal,component,node,attName);
				    	if(exp)exps.push(exp);
					}
				}
			}

	    	if(node.childNodes.length>0){
				for(var i=0,l=node.childNodes.length;i<l;i++){
					scan(node.childNodes[i],component,direcs,subComps,exps);
				}
			}
		}else if(node.nodeType === 3){
			if(node.nodeValue.replace(/\t|\r|\s/img,'').length<1)return;
			//文本节点处理
			var exp = recordExpNode(node.nodeValue,component,node);
			if(exp)exps.push(exp);
		}
	}

	//表达式解析
	function recordExpNode(origin,component,node,attrName){
		//origin可能包括非表达式，所以需要记录原始value
		var expNode = getExpNode(origin,component,node,attrName);
		expNode && component.__expNodes.push(expNode);

		return expNode;
	}

	function getExpNode(origin,component,node,attrName){
		var exps = {};
		var toHTML = !attrName && origin.replace(/\s*/mg,'').indexOf(EXP_START_TAG + EXP2HTML_EXP_TAG)===0;
		if(toHTML){
			origin = origin.replace(EXP2HTML_EXP_TAG,'');
		}
		origin.replace(REG_EXP,function(a,modelExp){

			var filters = {};
			var i = 1;
			var varMap = null;
			if(FILTER_EXP.test(modelExp)){
				varMap = parseFilters(lexer(RegExp.$1),filters,component);
				i = modelExp.indexOf(FILTER_EXP_START_TAG);
			}

			var expStr = modelExp;
			if(i > 1)
				expStr = modelExp.substring(0,i);
    		var tmp = lexer(expStr);
    		
    		if(varMap)
    			Util.ext(tmp.varTree,varMap);
    		//保存表达式
    		exps[modelExp] = {
    			words:tmp.words,
    			varTree:tmp.varTree,
    			filters:filters
    		};
    	});
		if(Object.keys(exps).length<1)return;

		return new ExpNode(node,attrName,origin,exps,component,toHTML);
	}

	this.getExpNode = getExpNode;

	function parseFilters(expNode,filters,component){
		var currParams = [],
			currParam = null;
		var inParam = false;
		var varMap = {};

		var words = [];
		var wds = expNode.words;
		for(var i=0;i<wds.length;i++){
			if(wds[i] instanceof Array){
				var w = wds[i][0];
				var tmp = w.replace(/^\./,'');
				
				words.push([tmp]);
			}else{
				words.push(wds[i]);
			}
		}
		for(var i=0;i<words.length;i++){
			var w = words[i];
			switch(w){
				case ':':
					inParam = true;
					if(currParam !== null)
						currParams.push(currParam);
					currParam = '';
					break;
				case FILTER_EXP_SPLITTER:
					inParam = false;
					if(currParam !== null)
						currParams.push(currParam);
					currParam = '';
					currParams = [];
					break;
				default:
					if(w instanceof Array){
						var partName = w[0];
						var filterName = partName.toLowerCase();
						if(!inParam && filterName && FilterFactory.hasTypeOf(filterName)){
							currParam = null;
							filters[filterName] = [FilterFactory.newInstanceOf(filterName,component),currParams];
						}else{
							var tmp = lexer(partName);
							Util.ext(varMap,tmp.varTree);
							currParams.push(tmp);
							currParam = null;
						}
					}else{
						if(!inParam || !w.replace(/\s+/,''))continue;
						currParam += w.replace(/^['"]|['"]$/g,'');
					}
			}
		}

		if(currParam){
			currParams.push(currParam);
		}

		return varMap;
	}

	this.parseFilters = parseFilters;
}
/**
 * 构建器
 */

var Builder = new function() {
	//预链接
	this.link = function(comp,expNodes){
		//build expressions
		for(var i=expNodes.length;i--;){
			var expNode = expNodes[i];
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
	}

 	function buildExpModel(comp,varObj,expNode){
 		for(var subV in varObj.subVars){
 			var subVar = varObj.subVars[subV];
 			buildExpModel(comp,subVar,expNode);
 		}

 		var prop = walkDataTree(comp.__expDataRoot.subProps,varObj.segments[0],expNode);
 		
 		for(var i=1;i<varObj.segments.length;i++){
 			prop = walkDataTree(prop.subProps,varObj.segments[i],expNode);
 		}
 	}
 	this.buildExpModel = buildExpModel;

 	function walkDataTree(parentProp,propName,expNode){
 		var prop = parentProp[propName];
 		if(!prop){
 			prop = parentProp[propName] = new ExpData(propName);
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
		this.link(component,component.__expNodes);
	}

}
/**
 * 变更处理器，处理所有变量变更，并触发渲染
 */

var ChangeHandler = new function() {

	function mergeChange(change){
		for(var i=changeQ.length;i--;){
			var c = changeQ[i];
			if(c.object.__im__oid === change.object.__im__oid && c.name === change.name)break;
		}
		if(i > -1)
			changeQ.splice(i,1,change);
		else{
			changeQ.push(change);
		}
	}

	var combineChange = false;
	var changeQ = [];
	var changeMap = {};

	this.handle = function (change){
		if(combineChange){
			mergeChange(change);
		}else{
			changeQ = [];
			changeMap = {};
			combineChange = true;
			changeQ.push(change);
			setTimeout(function(){
				combineChange = false;

				changeQ.forEach(function(change){
					var newVal = change.newVal;
					var oldVal = change.oldVal;
					var pc = change.pc;
					var xpc = change.xpc;
					var comp = change.comp;
					var type = change.type;
					var name = change.name;
					var object = change.object;

					// console.log('处理变更',change);
					
					handlePath(newVal,oldVal,comp,type,name,object,pc);

					xpc.forEach(function(pc){
						handlePath(newVal,oldVal,comp,type,name,object,pc);
					});

				});//end for
				var tmp = changeMap;
				for(var k in tmp){
					tmp[k].comp.__update(tmp[k].changes);
				}
			},20);
		}
	}
	
	function handlePath(newVal,oldVal,comp,type,name,object,pc){
        var chains = [];
        if(pc[0] instanceof Directive){
        	var index = pc[2] === undefined?name:pc[2];

	        comp = pc[0].subComponents[parseInt(index)];
	        chains.push(pc[1]);
	        if(Util.isUndefined(pc[2]) && comp instanceof Component){
	        	comp.state.__im__target && (comp.state.__im__target[pc[1]] = newVal);
	        }
        }else{
        	chains = pc.concat();
			if(!Util.isArray(object))
	        chains.push(name);
        }
        
        if(!comp)return;

        if(!changeMap[comp.__id]){
        	changeMap[comp.__id] = {
        		changes:[],
        		comp:comp
        	};
        }
        var c = new Change(name,newVal,oldVal,chains,type,object);
        changeMap[comp.__id].changes.push(c);

        mergeExpProp(comp,chains,c);
	}

	var sqbExp = /(^\[)|(,\[)/;
	function mergeExpProp(component,propChain,changeObj){
		var props = component.__expDataRoot.subProps;
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
            matchs.push(prop);
        }

        
        //merge
        for(var i=matchs.length;i--;){
        	var prop = matchs[i];

        	changeObj.expProps.push(prop);
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

}
/**
 * 渲染器
 */

var Renderer = new function() {

	/**
	 * 渲染组件
	 */
	this.render = function(component){
 		renderExpNodes(component.__expNodes);
	}

	this.recurRender = function(component){
		
		var children = component.children;
 		renderExpNodes(component.__expNodes);

 		for(var j=children.length;j--;){
 			Renderer.render(children[j]);
 		}
	}

	//表达式节点渲染
	function renderExpNodes(expNodes){
		var cache = {};
		for(var i=expNodes.length;i--;){
			var expNode = expNodes[i];

			var val = null;
			if(cache[expNode.origin] && cache[expNode.origin].comp === expNode.component){
				val = cache[expNode.origin].val;
			}else{
				val = calcExpNode(expNode);
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
				// console.log('更新DOM');
				updateDOM(expNode.node,expNode.attrName,val);
			}
		}//over for
		
	}
	this.renderExpNodes = renderExpNodes;

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
			if(node.parentNode)//for IE11
			//文本节点
			node.nodeValue = val;
		}
	}

	//计算表达式的值，每次都使用从内到外的查找方式
	function calcExpNode(expNode){
		var component = expNode.component,
			origin = expNode.origin,
			expMap = expNode.expMap;
		//循环获取每个表达式的值
		var map = {};
		for(var exp in expMap){
			//表达式对象
			var expObj = expMap[exp];
			var rs = evalExp(component,expObj);

			var filters = expObj.filters;
			if(Object.keys(filters).length > 0){
                if(Util.isObject(rs)){
                	var tmp = rs;
                    rs = Util.isArray(rs)?[]:{};
                    Util.ext(rs,tmp);
                }

				for(var k in filters){
					var c = filters[k][0];
					var params = filters[k][1];
					var actParams = [];
					for(var i=params.length;i--;){
						var v = params[i];
						if(v.varTree && v.words){
							v = Renderer.evalExp(component,v);
						}
						actParams[i] = v;
					}
					c.value = rs;
					rs = c.to.apply(c,actParams);
				}
			}

			map[exp] = rs===undefined?'':rs;
		}

		//替换原始串中的表达式
		for(var k in map){
			origin = origin.replace(EXP_START_TAG +k+ EXP_END_TAG,map[k]+'');
		}
		return origin;
	}

	this.calcExpNode = calcExpNode;

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
        if(str.indexOf('.this')===0){
        	return str.replace('.this',component.__getPath());
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
 				if(subVarPath[w[0]]){
 					fullPath += subVarPath[w[0]];
 					continue;
 				}

				var keywordPath = keyWordsMapping(w[0],component);
                if(keywordPath){
                    isKeyword = true;
                    fullPath += keywordPath;
                }else{
                    fullPath += w[0];
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

 		if(isKeyword || fullPath.indexOf('impex._cs')===0)return fullPath;

 		var isDataType = true;
 		if(varStr[varStr.length-1]===')' 
 			&& /^\.[^(.]+?\(/.test(varStr) //fixed .xx.fn()
 			){
 			isDataType = false;
 		}
 		var searchPath = watchPath || fullPath;
 		if(isDataType){
 			searchPath = '.state' + searchPath;
 		}else{
 			searchPath = '.' + searchPath.substr(1);
 		}
 		component = varInComponent(component,searchPath);

 		if(component){
 			if(isDataType){
	 			fullPath = '.state' + fullPath;
	 		}else{
	 			fullPath = '.' + fullPath.substr(1);
	 		}
 			return component.__getPath() + fullPath;
 		}

 		return 'self' + fullPath;
 	}

 	function varInComponent(comp,v){
		if(getVarByPath(v,comp.__getPath()) !== undefined){
			return comp;
		}
		return null;
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
		if(!Util.isDOMStr(val)){
			val = val.replace(/</mg,'&lt;').replace(/>/mg,'&gt;');
		}
		if(expNode.__lastVal === val)return;
		if(node.nodeType != 3)return;
		if(!expNode.__placeholder){
			var ph = document.createComment('-- [html] placeholder --');
			node.parentNode.insertBefore(ph,node);
			expNode.__lastVal = val;
			expNode.__placeholder = ph;
			node.parentNode.removeChild(node);
		}

		if(expNode.__lastNodes){
			//release
			DOMHelper.detach(expNode.__lastNodes);
		}

		var target = document.createComment('-- [html] target --');
		expNode.__placeholder.parentNode.insertBefore(target,expNode.__placeholder);

		var nodes = DOMHelper.compile(val);
		if(nodes.length<1)return;
		DOMHelper.replace(target,nodes);

		expNode.__lastNodes = nodes;
		expNode.__lastVal = val;

		Util.compileViewOf(component,nodes);

		return true;
	}
}


/**
 * 信号类用来实现impex内部的消息系统
 * @class Signal
 */
function Signal(){
    this.__signalMap = {};
}
Signal.prototype = {
    /**
     * 监听信号。支持原生事件类型或自定义事件类型。<br/>
     * 如果同一个事件类型两者都有，自定义事件会优先绑定
     * @param  {String} type 信号类型,多个类型使用空格分割
     * @param {String | Function} exp 自定义函数表达式，比如  fn(x+1) 。或者回调函数，回调参数e
     * @param {Object} context 参数/回调函数所属上下文。可以是组件、指令或者任何对象
     * @see impex.events
     */
    on:function(type,exp,context){
        var ts = type.replace(/\s+/mg,' ').split(' ');
        for(var i=ts.length;i--;){
            var t = ts[i];
            var listeners = this.__signalMap[t];
            if(!listeners)listeners = this.__signalMap[t] = [];
            var comp = this instanceof Component?this:this.component;
            var meta = {
                id:Date.now() + Math.random(),
                el:this.el,
                exp:exp,
                comp:comp,
                context:context||this
            }
            listeners.push(meta);

            //查找
            var isDefault = true;
            for(var l=DISPATCHERS.length;l--;){
                var events = DISPATCHERS[l][0];
                if(events.indexOf(t) > -1){
                    isDefault = false;
                    break;
                }
            }

            if(isDefault){
                Handler.addDefaultEvent(t,meta);
            }else{
                DISPATCHERS[l][1].addEvent(t,meta);
                DISPATCHERS[l][1].onInit();
            }
        }//end for
        
    },
    /**
     * 解除信号监听<br/>
     * @param  {String} type 信号类型,多个类型使用空格分割
     * @param {String | Function} exp 自定义函数表达式，比如  fn(x+1) 。或者回调函数，回调参数e
     * @param {Object} context 参数/回调函数所属上下文。可以是组件、指令或者任何对象
     * @see impex.events
     */
    off:function(type,exp,context){
        context = context||this;

        var types = null;
        if(!type){
            types = Object.keys(this.__signalMap);
        }else{
            types = type.replace(/\s+/mg,' ').split(' ');
        }

        for(var i=types.length;i--;){
            var listeners = this.__signalMap[types[i]];
            if(listeners){
                var toDel = [];
                for(var j=listeners.length;j--;){
                    if(context === listeners[j].context && 
                        (exp?listeners[j].exp === exp:true)){
                        toDel.push(listeners[j]);
                    }
                }
                toDel.forEach(function(meta){
                    var index = listeners.indexOf(meta);
                    listeners.splice(index,1);

                    //del defautl
                    Handler.removeDefaultEvent(type,meta);

                    //del custom
                    if(meta.dispatcher)
                        meta.dispatcher._delEvent(type,meta);
                });
            }
        }
    },
    //type
    emit:function(){
        var type = arguments[0];
        var listeners = this.__signalMap[type];
        if(!listeners)return;

        var params = [];
        for(var i=1;i<arguments.length;i++){
            params.push(arguments[i]);
        }

        listeners.forEach(function(meta){
            Handler.emitEventExp(meta,type,params);
        });
    }
}
/**
 * @classdesc 事件分派器。用来定义原生或自定义事件，以代理方式高效的处理事件。
 * 
 * @class 
 * @param {data} 扩展数据
 */
var Handler = new function() {
	var EVENTS_MAP = {};

	this.evalEventExp = function(meta,e,type,extra){
		var originExp = meta.exp;
		var context = meta.context;
		var comp = meta.comp;
		if(originExp instanceof Function)
			meta.componentFn = originExp;
		var componentFn = meta.componentFn;

		var tmpExp = originExp;

		var ev = new Event(type,e,meta.el);

		if(extra)
			Util.ext(ev,extra);

		if(!meta.cache && componentFn){
			tmpExp = componentFn.call(context,ev);
		}

		if(typeof(tmpExp) == "string"){
			var expObj = lexer(tmpExp);

			var evalStr = Renderer.getExpEvalStr(comp,expObj);

			var tmp = evalStr.replace(/self\.\$event/mg,'$event');
			tmp = tmp.replace(/self\.arguments/mg,'arguments');
			componentFn = new Function('$event','arguments','return '+tmp);

			meta.componentFn = componentFn;//cache
			meta.cache = true;
		}
		
		try{
			return componentFn.call(context,ev,[ev]);
		}catch(error){
			LOGGER.debug("error in event '"+type +"'",error);
		}
	}

	this.emitEventExp = function(meta,type,params){
		var originExp = meta.exp;
		var context = meta.context;
		var comp = meta.comp || context;

		if(originExp instanceof Function){
			meta.componentFn = originExp;
			meta.isCbkFn = true;
		}
		var componentFn = meta.componentFn;

		var tmpExp = originExp;

		if(!meta.cache && componentFn){
			tmpExp = componentFn.apply(context,params);
		}

		if(typeof(tmpExp) == "string"){
			if(!(comp instanceof Component)){
				LOGGER.error("need a context to parse '"+originExp+"' of type '"+type +"'");
				return;
			}

			var expObj = lexer(tmpExp);

			var evalStr = Renderer.getExpEvalStr(comp,expObj);

			var tmp = evalStr.replace(/self\.arguments/mg,'arguments');
			componentFn = new Function('arguments',tmp);

			meta.componentFn = componentFn;//cache
			meta.cache = true;
		}


		try{
			if(meta.isCbkFn){
				componentFn.apply(context,params);
			}else{
				componentFn.call(context,params);
			}
		}catch(error){
			LOGGER.debug("error in event '"+type +"'",error);
		}
	}
	this.addDefaultEvent = function(type,meta){
		if(!EVENTS_MAP[type]){
			EVENTS_MAP[type] = [];
		}
		EVENTS_MAP[type].push(meta);
		var ref = this.__defaultEventHandler.bind(this);
		meta.ref = ref;

        if(meta.el)meta.el.addEventListener(type,ref,false);
	}

	this.removeDefaultEvent = function(type,meta){
		var metas = EVENTS_MAP[type];
		for(var i=metas.length;i--;){
			if(metas[i].id === meta.id){
				break;
			}
		}

		metas.splice(i,1);

        if(meta.el)meta.el.removeEventListener(type,meta.ref,false);
	}

	this.__defaultEventHandler = function(e){
		var type = e.type;
		var t = e.currentTarget;
		var metas = EVENTS_MAP[type];
		for(var i=metas.length;i--;){
			if(metas[i].el === t){
				break;
			}
		}
		this.evalEventExp(metas[i],e,type);
	}
}
/**
 * @classdesc 事件封装对象
 * 
 * @class 
 * 
 */
function Event(type,e,ct) {
	this.type = type;
	this.e = e;
	this.target = e && e.target;
	this.currentTarget = ct;
}
/**
 * @classdesc 事件分派器。用来定义原生或自定义事件，以代理方式高效的处理事件。
 * 
 * @class 
 * @param {data} 扩展数据
 */
function Dispatcher(data) {
	/**
	 * 用来存放在当前分派器上注册的事件，优化派发性能
	 * @type {Object}
	 */
	this.__eventMap = {};

	/**
	 * 初始化回调。由系统自动调用
	 * @type {Function}
	 */
	this.onInit = null;

	Util.ext(this,data);
};
Util.ext(Dispatcher.prototype,{
	/**
	 * 派发事件
	 * @param  {String} eventStr 事件名
	 * @param  {Object} e 事件对象
	 * @param {Object} extra 事件扩展属性，属性会被扩展到对象属性中
	 */
	dispatch:function(eventStr,e,extra){
		var t = e.target;
        var events = this.__eventMap[eventStr];
        if(!events)return;
        
        do{
            if(this.fireEvent(t,events,e,eventStr,extra) === false){
                break;
            }

            t = t.parentNode;
        }while(t.tagName && t.tagName != 'HTML');
	},
    fireEvent:function(target,events,e,type,extra){
        for(var i=events.length;i--;){
            if(events[i].el === target)break;
        }
        if(i < 0)return;

        //callback
        var bubbles = Handler.evalEventExp(events[i],e,type,extra);

        return bubbles;//是否冒泡
    },
	addEvent:function(type,meta){
		var events = this.__eventMap[type];
		if(!events)events = this.__eventMap[type] = [];
		events.push(meta);
		meta.dispatcher = this;
	},
	_delEvent:function(type,meta){
		var events = this.__eventMap[type];
		for(var i=events.length;i--;){
            if(events[i].id === meta.id)break;
        }
        events.splice(i,1);
	}
});

/**
 * @classdesc 组件类，包含视图、模型、控制器，表现为一个自定义标签。同内置标签样，
 * 组件也可以有属性。
 * <br/>
 * 组件可以设置事件或者修改视图样式等<br/>
 * 组件实例为组件视图提供了数据和控制
 * 组件可以包含组件，所以子组件视图中的表达式可以访问到父组件模型中的值
 * <p>
 * 	组件生命周期
 * 	<ul>
 * 		<li>onCreate：当组件被创建时，该事件被触发，系统会把指定的服务注入到参数中</li>
 * 		<li>onPropChange：当参数要绑定到组件时，该事件被触发，可以手动clone参数或者传递引用</li>
 * 		<li>onInit：当组件初始化时，该事件被触发，系统会扫描组件中的所有表达式并建立数据模型</li>
 * 		<li>onMount：当组件被挂载到组件树中时，该事件被触发，此时组件已经完成数据构建和绑定，DOM可用</li>
 * 		<li>onUnmount：当组件被卸载时，该事件被触发</li>
 * 		<li>onSuspend: 当组件被挂起时，该事件被触发</li>
 * 	</ul>
 * </p>
 * 
 * @class 
 */
function Component () {
	var id = 'C_' + im_counter++;
	this.__id = id;
	this.__state = Component.state.created;

	Signal.call(this);
	/**
	 * 对子组件的引用
	 * @type {Object}
	 */
	this.comps = {};
	/**
	 * 对组件内视图元素的引用
	 * @type {Object}
	 */
	this.els = {};
	/**
	 * 用于指定属性的类型，如果类型不符会报错
	 * @type {Object}
	 */
	this.propTypes = null;
	/**
	 * 组件名，在创建时由系统自动注入
	 */
	this.name;
	/**
	 * 对父组件的引用
	 * @type {Component}
	 */
	this.parent;
	/**
	 * 子组件列表
	 * @type {Array}
	 */
	this.children = [];
	this.__expNodes = [];
	this.__expDataRoot = new ExpData();
	this.__eventMap = {};
	this.__watchProps = [];
	this.__props = {};
	/**
	 * 组件域内的指令列表
	 * @type {Array}
	 */
	this.directives = [];
	/**
	 * 组件模版，用于生成组件视图
	 * @type {string}
	 */
	this.template;

	//组件url
	this.__url;
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
	this.restrict;

	/**
	 * 组件数据
	 * @type {Object}
	 */
	this.state = {};

	impex._cs[this.__id] = this;
};
Component.state = {
	created : 'created',
	inited : 'inited',
	mounted : 'mounted',
	suspend : 'suspend'
};
Util.inherits(Component,Signal);
Util.ext(Component.prototype,{
	/**
	 * 设置或者获取模型值，如果第二个参数为空就是获取模型值<br/>
	 * 设置模型值时，设置的是当前域的模型，如果当前模型不匹配表达式，则赋值无效<br/>
	 * @param  {string} path 表达式路径
	 * @param  {var} val  值
	 * @return this
	 */
	d:function(path,val){
		if(!path){
			LOGGER.warn('invalid path \''+ path +'\'');
			return;
		}
		var expObj = lexer(path);
		var evalStr = Renderer.getExpEvalStr(this,expObj);
		if(arguments.length > 1){
			if(Util.isObject(val) || Util.isArray(val)){
				val = JSON.stringify(val);
			}else 
			if(Util.isString(val)){
				val = '"'+val.replace(/\\/mg,'\\\\').replace(/\r\n|\n/mg,'\\n').replace(/"/mg,'\\"')+'"';
			}
			try{
				eval(evalStr + '= '+ val);
			}catch(e){
				LOGGER.debug("error in eval '"+evalStr + '= '+ val +"'",e);
			}
			
			return this;
		}else{
			try{
				return eval(evalStr);
			}catch(e){
				LOGGER.debug("error in eval '"+evalStr + '= '+ val +"'",e);
			}
			
		}
	},
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {string} expPath 属性路径，比如a.b.c
	 * @param  {function} cbk      回调函数，[object,name,变动类型add/delete/update,新值，旧值]
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
		this.children.push(child);
		child.parent = this;
	},
	/**
	 * 创建一个未初始化的子组件
	 * @param  {HTMLElement} el 视图
	 * @return {Component} 子组件
	 */
	createSubComponentOf:function(el){
		var instance = ComponentFactory.newInstanceOf(el.tagName.toLowerCase(),el);
		this.children.push(instance);
		instance.parent = this;

		return instance;
	},
	/**
	 * 创建一个匿名子组件
	 * @param  {Array<HTMLElement>} els 视图
	 * @return {Component} 子组件
	 */
	createSubComponent:function(els){
		var instance = ComponentFactory.newInstance(els);
		this.children.push(instance);
		instance.parent = this;

		return instance;
	},
	/**
	 * 初始化组件，该操作会生成用于显示的所有相关数据，包括表达式等，以做好显示准备
	 */
	init:function(){
		if(this.__state !== Component.state.created)return;

		if(this.__url){
			var that = this;
			Util.loadComponent(this.__url,function(data){
				var tmpl = data[0];
				that.template = tmpl;
				var model = data[1];
				model.template = tmpl;
				//cache
				ComponentFactory.register(that.name,model);
				ComponentFactory.initInstanceOf(that.name,that);

				//init
				ComponentFactory.parse(tmpl,that);
				that.__url = null;
				that.__init();
				that.mount();
			});
			
		}else{
			if(this.template){
				ComponentFactory.parse(this.template,this);
			}
			this.__init();
		}
		return this;
	},
	__init:function(){
		Scanner.scan(this.__nodes,this);

		LOGGER.log(this,'inited');

		//observe state
		this.state = Observer.observe(this.state,this);

		Builder.build(this);

		this.__state = Component.state.inited;

		if(this.onInit){
			var services = ComponentFactory.getServices(this,this.name);
			
			services ? this.onInit.apply(this,services) : this.onInit();
		}

		//init children
		for(var i = this.children.length;i--;){
			this.children[i].init();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].init();
		}
		
	},
	/**
	 * 挂载组件到组件树上
	 */
	mount:function(){
		if(this.__state === Component.state.mounted)return;
		if(this.__state === Component.state.created)return;

		Renderer.render(this);

		//els
		this.__nodes.forEach(function(el){
			if(!el.querySelectorAll)return;
			var els = el.querySelectorAll('*['+ATTR_REF_TAG+']');
			for(var i=els.length;i--;){
				var node = els[i];
				this.els[node.getAttribute(ATTR_REF_TAG)] = node;
			}
		},this);

		this.__state = Component.state.mounted;
		LOGGER.log(this,'mounted');
		

		//mount children
		for(var i = 0;i<this.children.length;i++){
			if(!this.children[i].templateURL)
				this.children[i].mount();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].active();
		}

		this.onMount && this.onMount();
	},
	/**
	 * 卸载组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	unmount:function(){
		if(this.__state === null)return;

		LOGGER.log(this,'unmount');

		this.onUnmount && this.onUnmount();

		if(this.parent){
			//check parent watchs
			var index = -1;
			for(var i=this.parent.__watchProps.length;i--;){
				var prop = this.parent.__watchProps[i];
				if(prop.subComp === this){
					index = i;
					break;
				}
			}
			if(index > -1){
				this.parent.__watchProps.splice(index,1);
			}


			index = this.parent.children.indexOf(this);
			if(index > -1){
				this.parent.children.splice(index,1);
			}
			this.parent = null;
		}
		
		DOMHelper.detach(this.__nodes);

		while(this.children.length > 0){
			this.children[0].unmount();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].unmount();
		}


		this.children = 
		this.directives = 
		this.__expNodes = 
		this.__expDataRoot = null;

		impex._cs[this.__id] = null;
		delete impex._cs[this.__id];

		this.__state = 
		this.__id = 
		this.__url = 
		this.template = 
		this.restrict = 
		this.state = null;
	},
	/**
	 * 挂起组件，组件视图会从文档流中脱离，组件模型会从组件树中脱离，组件模型不再响应数据变化，
	 * 但数据都不会销毁
	 * @param {boolean} hook 是否保留视图占位符，如果为true，再次调用mount时，可以在原位置还原组件，
	 * 如果为false，则需要注入viewManager，手动插入视图
	 */
	suspend:function(hook){
		if(this.__state !== Component.state.mounted)return;

		LOGGER.log(this,'suspend');
		
		this.__suspend(this,hook===false?false:true);

		this.onSuspend && this.onSuspend();

		this.__state = Component.state.suspend;
	},
	__suspend:function(component,hook){
		var p = this.__nodes[0].parentNode;
		if(!p)return;
		if(hook){
			this.__target =  document.createComment("-- view suspended of ["+(component.name||'anonymous')+"] --");
			p.insertBefore(this.__target,this.__nodes[0]);
		}

		for(var i=this.__nodes.length;i--;){
			if(this.__nodes[i].parentNode)
				p.removeChild(this.__nodes[i]);
		}
	},
	__getPath:function(){
		return 'impex._cs["'+ this.__id +'"]';
	},
	__update:function(changes){
		var renderable = true;
		var changeList = [];
		var expNodes = [];
		var watchs = [];
		var attrObserveNodes = [];
		for(var i=changes.length;i--;){
			var c = changes[i];
			var changeParam = {
				name:c.name,
				newVal:c.newVal,
				oldVal:c.oldVal,
				type:c.type,
				path:c.path,
				object:c.object
			};
			changeList.push(changeParam);
			var expProps = c.expProps;
			for(var k=expProps.length;k--;){
				var ens = expProps[k].expNodes;
				for(var j=ens.length;j--;){
					var en = ens[j];
					if(expNodes.indexOf(en) < 0)expNodes.push(en);
				}
				var aons = expProps[k].attrObserveNodes;
				for(var j=aons.length;j--;){
					var aon = aons[j];
					if(attrObserveNodes.indexOf(aon) < 0)attrObserveNodes.push(aon);
				}
				var ws = expProps[k].watchs;
				for(var j=ws.length;j--;){
					var w = ws[j];
					if(watchs.indexOf(w) < 0)watchs.push([w,changeParam]);
				}
			}
		}
		if(this.onUpdate){
			renderable = this.onUpdate(changeList);
		}
		//render view
		if(renderable !== false){
			Renderer.renderExpNodes(expNodes);
		}
		
		this.__updateDirective(attrObserveNodes);

		this.__callWatchs(watchs);

		//update children props
		this.__updateChildrenProps(changeList);
	},
	__updateChildrenProps:function(changes){
		var matchMap = {};
		for(var i=changes.length;i--;){
			var change = changes[i];
			var path = change.path;
			this.__watchProps.forEach(function(prop){
				var k = this.__isVarMatch(prop.segments,path);
				if(k<0)return;
				if(!matchMap[prop.subComp.__id])
					matchMap[prop.subComp.__id] = [];
				var rs = Renderer.evalExp(this,prop.expWords);
				matchMap[prop.subComp.__id].push({
					name:prop.name,
					val:rs,
					path:path
				});
			},this);
		}
		for(var k in matchMap){
			var cs = matchMap[k];
			impex._cs[k].__propChange && impex._cs[k].__propChange(cs);
		}
	},
	__isVarMatch:function(segments,changePath){
		for(var k=0;k<segments.length;k++){
			if(!changePath[k])break;

			if(segments[k][0] !== '[' && 
				changePath[k][0] !== '[' && 
				segments[k] !== changePath[k]){
				return -1;
			}
		}
		return k;
	},
	__callWatchs:function (watchs){
		var invokedWatchs = [];
		for(var i=watchs.length;i--;){
			var change = watchs[i][1];
			var watch = watchs[i][0];

			var newVal = change.newVal;
			var oldVal = change.oldVal;
			var name = change.name;
			var object = change.object;
			var propChain = change.path.concat();
			if(!Util.isArray(object))
				change.path.pop();
			var changeType = change.type;

			if(watch.segments.length < propChain.length)continue;
			if(invokedWatchs.indexOf(watch) > -1)continue;

			//compare segs
			var k = this.__isVarMatch(watch.segments,propChain);

			if(k > -1){
				var matchLevel = change.path.length+1 - watch.segments.length;
				watch.cbk && watch.cbk.call(watch.ctrlScope,object,name,changeType,newVal,oldVal,change.path,matchLevel);
				invokedWatchs.push(watch);
			}
		}
	},
	__updateDirective:function (attrObserveNodes){
		for(var j=attrObserveNodes.length;j--;){
			var aon = attrObserveNodes[j];

			var rs = Renderer.evalExp(aon.directive.component,aon.expObj);
			aon.directive.onUpdate(rs);
		}
	},
	__propChange:function(changes){
		var matchMap = {};
		//update props
		for(var i=changes.length;i--;){
			var c = changes[i];
			var name = c.name;
			var path = c.path;
			this.__props[name] = c.newVal;
			//check children which refers to props
			this.__watchProps.forEach(function(prop){
				var k = this.__isVarMatch(prop.segments,path);
				if(k<0)return;
				if(!matchMap[prop.subComp.__id])
					matchMap[prop.subComp.__id] = [];
				var rs = Renderer.evalExp(this,prop.expWords);
				matchMap[prop.subComp.__id].push({
					name:prop.name,
					val:rs
				});
			},this);
		}

		this.onPropChange && this.onPropChange(changes);

		for(var k in matchMap){
			var cs = matchMap[k];
			impex._cs[k].__propChange && impex._cs[k].__propChange(cs);
		}
	}
});

/**
 * DOM助手
 */
var DOMHelper = new function(){
	this.singleton = true;
	var compiler = document.createElement('div');

	this.compile = function(template){
		var nodes = [];
		compiler.innerHTML = template;

		while(compiler.childNodes.length>0){
			var tmp = compiler.removeChild(compiler.childNodes[0]);
			nodes.push(tmp);
		}

		return nodes;
	}

	this.detach = function(nodes){
		var p = nodes[0].parentNode;
		if(p){
			for(var i=nodes.length;i--;){
				nodes[i].parentNode && p.removeChild(nodes[i]);
			}
		}
	}

	this.attach = function(target,nodes){
		var fragment = null;
		if(nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<nodes.length;i++){
				fragment.appendChild(nodes[i]);
			}
		}else{
			fragment = nodes[0];
		}
		
		target.appendChild(fragment);
		fragment = null;
	}

	this.replace = function(target,nodes){
		var fragment = null;
		if(nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<nodes.length;i++){
				fragment.appendChild(nodes[i]);
			}
		}else{
			fragment = nodes[0];
		}
		
		target.parentNode.replaceChild(fragment,target);
		fragment = null;
	}

	this.insertBefore = function(nodes,target){
		var p = target.parentNode;
		var fragment = nodes[0];
		if(nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<nodes.length;i++){
				fragment.appendChild(nodes[i]);
			}
		}
		if(p)
		p.insertBefore(fragment,target);
	}
}
/**
 * @classdesc 指令存在于某个组件域中,表现为一个自定义属性。
 * 组件的生命周期：
 * <p>
 * 	<ul>
 * 		<li>onCreate：当指令被创建时触发</li>
 * 		<li>onInit：当指令初始化时触发</li>
 * 		<li>onActive: 当指令激活时触发</li>
 * 		<li>onUpdate: 当指令条件变更时触发</li>
 * 		<li>onUnmount：当指令被卸载时触发</li>
 * 	</ul>
 * </p>
 * @class 
 */
function Directive (name,value) {
	Signal.call(this);
	/**
	 * 指令的字面值
	 */
	this.value = value;
	/**
	 * 指令名称
	 */
	this.name = name;
	/**
	 * 参数列表
	 * @type {Array}
	 */
	this.params;
	/**
	 * 过滤函数
	 * @type {Function}
	 */
	this.filter;
	/**
	 * 指令所在的组件
	 */
	this.component;

	/**
	 * 是否终结<br/>
	 * 终结指令会告诉扫描器不对该组件的内部进行扫描，包括表达式，指令，子组件都不会生成
	 * @type {Boolean}
	 * @default false
	 */
	this.final = false;
	/**
	 * 指令优先级用于定义同类指令的执行顺序。最大999
	 * @type {Number}
	 */
	this.priority = 0;
}
Util.inherits(Directive,Signal);
Util.ext(Directive.prototype,{
	init:function(){
		if(this.__state == Component.state.inited){
			return;
		}
		//预处理自定义标签中的表达式
		var expNode = Scanner.getExpNode(this.value,this.component);
		var calcVal = expNode && Renderer.calcExpNode(expNode);
		if(calcVal !== undefined)this.value = calcVal;

		LOGGER.log(this,'inited');

		if(this.onInit){
			this.onInit();
		}

		this.__state = Component.state.inited;
	},
	//component invoke only
	active:function(){
		//do observe
		if(this.onUpdate){
			var expObj = lexer(this.value);
			for(var varStr in expObj.varTree){
				var varObj = expObj.varTree[varStr];

				var aon = new AttrObserveNode(this,expObj);

				//监控变量
				if(this.component)
				Builder.buildExpModel(this.component,varObj,aon);
			}
			
			var rs = Renderer.evalExp(this.component,expObj);
			this.onUpdate(rs);
		}

		this.onActive && this.onActive(rs);

	},
	/**
	 * 销毁指令
	 */
	unmount:function(){
		LOGGER.log(this,'unmount');

		DOMHelper.detach(this.__nodes);

		this.component = 
		this.params = 
		this.filter = 
		this.onUpdate = null;

		this.onUnmount && this.onUnmount();
	}
});
/**
 * @classdesc 过滤器类，提供对表达式结果的转换处理，比如
 * <p>
 * 	{{ exp... => cap}}
 * </p>
 * 过滤器可以连接使用，并以声明的顺序依次执行，比如
 * <p>
 * 	{{ exp... => lower.cap}}
 * </p>
 * 过滤器支持参数，比如
 * <p>
 * 	{{ exp... => currency:'€':4}}
 * </p>
 * @class 
 */
function Filter (component) {
	/**
	 * 所在组件
	 */
	this.component = component;
	/**
	 * 系统自动计算的表达式结果
	 */
	this.value;
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
	this.singleton;
	/**
	 * 服务被注入到的宿主，可能是组件，指令或者另一个服务
	 */
	this.host;
	/**
	 * 构造函数，在服务被创建时调用
	 * 如果指定了注入服务，系统会在创建时传递被注入的服务
	 */
	this.onCreate;
}
/**
 * @classdesc 过渡类。用于提供CSS3动画转换或js动画过渡回调接口
 * @class 
 */
var TRANSITIONS = {
    "transition"      : "transitionend",
    "OTransition"     : "oTransitionEnd",
    "MozTransition"   : "mozTransitionend",
    "WebkitTransition": "webkitTransitionEnd"
};

function getStyle(cs,style){
    var rs = '';

    for(var i=PREFIX.length;i--;){
        rs = cs[PREFIX[i]+style];
        if(rs)return rs;
    }
}
var PREFIX = ['-webkit-','-moz-','-o-','-ms-',''];
var TESTNODE;
function Transition (type,target,hook) {
    if(!TESTNODE){
        TESTNODE = document.createElement('div');
        document.body.appendChild(TESTNODE);
    }
    var v = target;
    if(!hook || hook.css !== false){
        TESTNODE.className = (type + '-transition');
        TESTNODE.style.left = '-9999px';
        var cs = window.getComputedStyle(TESTNODE,null);
        var durations = getStyle(cs,'transition-duration').split(',');
        var delay = getStyle(cs,'transition-delay').split(',');
        var max = -1;
        for(var i=durations.length;i--;){
            var du = parseFloat(durations[i]);
            var de = parseFloat(delay[i]);
            if(du+de > max)max = du+de;
        }

        if(max > 0){
            var expNodes = null;
            var comp = null;
            if(target instanceof Directive){
                expNodes = target.component.__expNodes;
                comp = target.component;
            }else{
                expNodes = target.__expNodes;
                comp = target;
            }
            if(expNodes.length<1 && comp.parent){
                expNodes = comp.parent.__expNodes;
            }
            for(var i=expNodes.length;i--;){
                var expNode = expNodes[i];
                if(expNode.attrName === 'class'){
                    expNode.origin += ' '+ type + '-transition';
                }
            }
            v.el.className += ' ' +type + '-transition';

            this.__longest = max;

            var te = null;
            for (var t in TRANSITIONS){
                if (v.el.style[t] !== undefined){
                    te = TRANSITIONS[t];
                    break;
                }
            }
            v.el.addEventListener(te,this.__done.bind(this),false);

            this.__css = true;
        }
    }else{
    	this.__css = false;
    }

    this.__direct = target;
    this.__view = v;
    this.__hook = hook || {};
    this.__type = type;
    
}
Transition.prototype = {
	enter:function(){
		this.__start = 'enter';

        var clsName = this.__view.el.className.replace(this.__type + '-leave','');
        this.__view.el.className = clsName;

		if(this.__css){
            clsName += ' ' +this.__type + '-enter';
            this.__view.el.className = clsName;
        }

        //exec...
        if(this.__direct.enter){
        	this.__direct.enter();
        }
        if(this.__hook.enter){
        	this.__hook.enter.call(this.__direct,this.__done.bind(this));
        }

        if(this.__css){
            this.__view.el.offsetHeight;
            var clsName = this.__view.el.className.replace(this.__type + '-enter','');
            this.__view.el.className = clsName;
        }
        
	},
	__enterDone:function(){
		if(this.__direct.postEnter){
            this.__direct.postEnter();
        }
        if(this.__hook.postEnter){
            this.__hook.postEnter.call(this.__direct,this.__done.bind(this));
        }
	},
	leave:function(){
		this.__start = 'leave';

        var clsName = this.__view.el.className.replace(this.__type + '-leave','');
        this.__view.el.className = clsName;

		if(this.__css){
            clsName += ' ' +this.__type + '-leave';
            this.__view.el.className = clsName;
        }
        //exec...
        if(this.__direct.leave){
            this.__direct.leave();
        }
        if(this.__hook.leave){
        	this.__hook.leave.call(this.__direct,this.__done.bind(this));
        }
        
	},
	__leaveDone:function(){
		if(this.__direct.postLeave){
            this.__direct.postLeave();
        }
        if(this.__hook.postLeave){
            this.__hook.postLeave.call(this.__direct,this.__done.bind(this));
        }
        if(this.__css){
            this.__view.el.offsetHeight;
            var clsName = this.__view.el.className.replace(this.__type + '-leave','');
            this.__view.el.className = clsName;
        }
	},
	__done:function(e){
		if(e && e.elapsedTime < this.__longest)return;
        if(!this.__start)return;

        switch(this.__start){
        	case 'enter':
        		this.__enterDone();
        		break;
        	case 'leave':
        		this.__leaveDone();
        		break;
        }

        this.__start = '';
	}
};
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
	register : function(type,param,services){
		type = type.toLowerCase();

		var state = param.state;
		delete param.state;

		var props = {};
		
		if(typeof param == 'string'){
			state = param;
		}else{
			Util.ext(props,param);
		}

		//re register
		if(this.types[type]){
			this.types[type].state = state;
			this.types[type].props = props;
			return;
		}
		var clazz = new Function("clazz","var args=[];for(var i=1;i<arguments.length;i++)args.push(arguments[i]);clazz.apply(this,args)");
		Util.inherits(clazz,this.baseClass);

		this.types[type] = {clazz:clazz,props:props,services:services,state:state};
	},
	/**
	 * 是否存在指定类型
	 * @return {Boolean} 
	 */
	hasTypeOf : function(type){
		return type in this.types;
	},
	getServices : function(comp,type){
		var services = null;
		if(this.types[type] && this.types[type].services){
			services = [];
			for(var i=0;i<this.types[type].services.length;i++){
				var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],comp);
				services.push(serv);
			}
		}

		return services;
	},
	//子类调用
	createCbk : function(comp,type){
		if(comp.onCreate){
			//inject
			var services = this.getServices(comp,type);
			
			services ? comp.onCreate.apply(comp,services) : comp.onCreate();
		}
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
		return this.types[type].props['restrict'];
	},
	//parse component
	parse:function(tmpl,component){
		var el = component.el;
		//解析属性
		var propMap = el.attributes;
		var innerHTML = el.innerHTML;

		var cssStr = null,compileStr = null;
		if(!this.types[component.name].tmplCache){
			var tmp = peelCSS(tmpl);
			compileStr = tmp[1];
			cssStr = tmp[0];
			cssStr = cssHandler(component.name,cssStr);

			this.types[component.name].tmplCache = compileStr;
			
			//attach style
			if(cssStr.trim().length>0){
				var target = document.head.children[0];
				if(target){
					var nodes = DOMHelper.compile(cssStr);
					DOMHelper.insertBefore(nodes,target);
				}else{
					document.head.innerHTML = cssStr;
				}
			}			
		}else{
			compileStr = this.types[component.name].tmplCache;
		}
		compileStr = slotHandler(compileStr,innerHTML);

		if(component.onBeforeCompile)
            compileStr = component.onBeforeCompile(compileStr);

		var nodes = DOMHelper.compile(compileStr);

		el.innerHTML = '';
		DOMHelper.attach(el,nodes);

		//check props
		var requires = {};
		var propTypes = component.propTypes;
		if(propTypes){
			for(var k in propTypes){
				var type = propTypes[k];
				if(type.require){
					requires[k] = type;
				}
			}
		}

		if(propMap){
			//bind props
			for(var i=propMap.length;i--;){
				var k = propMap[i].name.toLowerCase();
				var v = propMap[i].value;
				if(k == ATTR_REF_TAG){
					var expNode = Scanner.getExpNode(v,component);
					var calcVal = expNode && Renderer.calcExpNode(expNode);
					component.parent.comps[calcVal || v] = component;
					continue;
				}

				var instance = null;
				if(REG_CMD.test(k)){
					var c = k.replace(CMD_PREFIX,'');
					var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
					if(CPDI > -1)c = c.substring(0,CPDI);
					//如果有对应的处理器
					if(DirectiveFactory.hasTypeOf(c)){
						instance = DirectiveFactory.newInstanceOf(c,component.el,component,k,v);
					}
				}else if(k.indexOf(CMD_PARAM_DELIMITER) === 0){
					instance = DirectiveFactory.newInstanceOf('on',component.el,component,k,v);
				}else{
					handleProps(k,v,requires,propTypes,component);
				}

				if(instance){
					instance.init();
				}
			}
		}

		//check requires
		var ks = Object.keys(requires);
		if(ks.length > 0){
			LOGGER.error("props ["+ks.join(',')+"] of component["+component.name+"] are required");
			return;
		}
	},
	/**
	 * 创建指定基类实例
	 */
	newInstance : function(els,param){
		var el = null;
		if(els.length===1){
			el = els[0];
		}
		
		var rs = new this.baseClass();
		rs.el = el;
		rs.__nodes = els;

		if(param){
			Util.ext(rs,param);

			if(param.state instanceof Function){
				rs.state = param.state.call(rs);
			}
		}
		
		return rs;
	},
	/**
	 * 创建指定类型组件实例
	 * @param  {String} type       		组件类型
	 * @param  {HTMLElement} target  	组件应用节点
	 * @return {Component}
	 */
	newInstanceOf : function(type,target){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass);
		rs.name = type;
		rs.el = target;
		rs.__nodes = [target];

		var state = this.types[type].state;
		if(typeof state == 'string'){
			rs.__url = state;
		}else{
			this.initInstanceOf(type,rs);
		}

		this._super.createCbk.call(this,rs,type);

		return rs;
	},
	initInstanceOf : function(type,ins){
		if(!this.types[type])return null;
		
		Util.ext(ins,this.types[type].props);
		var state = this.types[type].state;
		if(state){
			if(state instanceof Function){
				state = state.call(ins);
			}
			Util.ext(ins.state,state);
		}
	}
});

var ComponentFactory = new _ComponentFactory(DOMHelper);

function slotHandler(tmpl,innerHTML){
	var slotMap = {};
	var findMap = {};
    innerHTML.replace(/<(?:\s+)?([a-z](?:.+)?)[^<>]+slot(?:\s+)?=(?:\s+)?['"]([^<>]+?)?['"](?:[^<>]+)?>/img,function(a,tag,slot,i){
    	findMap[tag] = [slot,i];
    });
    for(var tag in findMap){
    	var startPos = findMap[tag][1];
    	var slot = findMap[tag][0];
    	var stack = 0;
    	var endPos = -1;
    	var reg = new RegExp("<(?:(?:\s+)?\/)?(?:\s+)?"+tag+"[^>]*?>",'img');
        innerHTML.replace(reg,function(tag,i){
        	if(i <= startPos)return;

        	if(/<(?:(?:\s+)?\/)/.test(tag)){
        		stack--;
        		if(stack < 0){
        			endPos = i;
        		}
        	}else{
        		stack++;
        	}
        });
        var tmp = innerHTML.substring(startPos,endPos);
        slotMap[slot] = tmp+'</'+tag+'>';
    }

    if(innerHTML.trim().length>0)
    tmpl = tmpl.replace(/<(?:\s+)?slot(?:\s+)?>(?:[^<>]+)?<\/(?:\s+)?slot(?:\s+)?>/img,function(str){
    	return innerHTML;
    });

    tmpl = tmpl.replace(/<(?:\s+)?slot\s+name(?:\s+)?=(?:\s+)?['"]([^<>]+?)?['"](?:[^<>]+)?>(?:[^<>]+)?<\/(?:\s+)?slot(?:\s+)?>/img,function(str,name){
    	return slotMap[name] || str;
    });

    return tmpl;
}

function peelCSS(tmpl){
	var rs = '';
	tmpl = tmpl.replace(/<(?:\s+)?style(?:.+)?>([^<]+)?<\/(?:\s+)?style(?:\s+)?>/img,function(str){
        rs += str;
        return '';
    });

    return [rs,tmpl];
}

function cssHandler(name,tmpl){
	tmpl = tmpl.replace(/<(?:\s+)?style(?:.+)?>([^<]+)?<\/(?:\s+)?style(?:\s+)?>/img,function(str,style){
        return '<style>'+filterStyle(name,style)+'</style>';
    });
    return tmpl;
}

function filterStyle(host,style){
	style = style.replace(/\n/img,'').trim();
	style = style.replace(/(^|})(?:\s+)?[a-z:_$.>~+](?:[^{]+)?\{/img,function(name){
		var rs = name.trim();
		if(!/(^|}|((?:\s+)?,))(?:\s+)?:host/.test(rs)){
			if(rs[0]==='}'){
				rs = rs.substr(1);
				rs = '}'+host + ' ' +rs;
			}else{
				rs = host + ' ' +rs;
			}
			
		}
		rs = rs.replace(/:host/img,host);
		return rs;
	});
	return style;
}

function checkPropType(k,v,propTypes,component){
	if(!propTypes[k] || !propTypes[k].type)return;
	var checkType = propTypes[k].type;
	checkType = checkType instanceof Array?checkType:[checkType];
	var vType = typeof v;
	if(v instanceof Array){
		vType = 'array';
	}
	if(vType !== 'undefined' && checkType.indexOf(vType) < 0){
		LOGGER.error("invalid type ["+vType+"] of prop ["+k+"] of component["+component.name+"];should be ["+checkType.join(',')+"]");
	}
}

function handleProps(k,v,requires,propTypes,component){
	k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});

	// xxxx
	if(k[0] !== PROP_TYPE_PRIFX){
		if(propTypes && k in propTypes){
			delete requires[k];
			checkPropType(k,v,propTypes,component);
		}
		component.state[k] = v;
		return;
	}

	// .xxxx
	var n = k.substr(1);
	var tmp = lexer(v);
	var rs = Renderer.evalExp(component.parent,tmp);

	//call onPropBind
	if(Util.isObject(rs) && component.onPropBind)
		rs = component.onPropBind(n,rs);

	//check sync
	if(PROP_SYNC_SUFX_EXP.test(n)){
		n = n.replace(PROP_SYNC_SUFX_EXP,'');

		var keys = Object.keys(tmp.varTree);
		//watch props
		keys.forEach(function(key){
			if(tmp.varTree[key].isFunc)return;

			var prop = new Prop(component,n,tmp.varTree[key].segments,tmp);
			component.parent.__watchProps.push(prop);
		});
	}
	if(propTypes && n in propTypes){
		delete requires[n];
		checkPropType(n,rs,propTypes,component);
	}
	if(rs instanceof Function){
		component[n] = rs;
		return;
	}	

	component.state[n] = rs;
}
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
		return !!this.types[type].props.final;
	},
	priority : function(type){
		return this.types[type].props.priority;
	},
	/**
	 * 创建一个指令实例，并把实例放入指定的域中
	 * @param  {String} type      指令类型
	 * @param  {HTMLElement} node 指令作用的元素对象
	 * @param  {Component} component 指令所在域
	 * @param  {String} attrName  完整属性名
	 * @param  {String} attrValue 指令的字面value
	 * @return {Directive}  指令实例
	 */
	newInstanceOf : function(type,node,component,attrName,attrValue){
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
		Util.ext(rs,this.types[type].props);

		rs.el = node,rs.__nodes = [node];
		if(node.tagName === 'TEMPLATE'){
			var c = [];
			var p = node,children = node.childNodes;
			if(node.content && node.content.nodeType===11){
				p = node.content;
				children = p.childNodes;
			}
			while(children.length){
				var child = p.removeChild(children[0]);
				if(child.nodeType===3 && child.nodeValue.trim().length<1)continue;
				
				c.push(child);
			}
			rs.__nodes = c;
		}

		if(params){
			rs.params = params;
		}
		if(filter){
			rs.filter = filter;
		}

		component.directives.push(rs);
		rs.component = component;

		if(node.tagName !== 'TEMPLATE')
			rs.__nodes[0].removeAttribute(rs.name);
		
		this._super.createCbk.call(this,rs,type);

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
		Util.ext(rs,this.types[type].props);

		this._super.createCbk.call(this,rs,type);

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
		if(this.types[type].props.singleton){
			if(!this.types[type].singleton){
				this.types[type].singleton = new this.types[type].clazz(this.baseClass);
			}
			rs = this.types[type].singleton;
		}else{
			rs = new this.types[type].clazz(this.baseClass);
		}
		Util.ext(rs,this.types[type].props);

		rs.host = host;

		this._super.createCbk.call(this,rs,type);	

		return rs;
	}
});

var ServiceFactory = new _ServiceFactory();
/**
 * 过渡工厂
 */

var TransitionFactory = {
	hooks:{},
	register:function(type,hook){
		this.hooks[type] = hook;
	},
	transitions:{},
	get:function(type,directive){
		var tmp = new Transition(type,directive,this.hooks[type]);
		
		return tmp;
	}
}

 	
	var CMD_PREFIX = 'x-';//指令前缀
	var CMD_PARAM_DELIMITER = ':';
	var CMD_FILTER_DELIMITER = '.';

	var EXP_START_TAG = '{{',
		EXP_END_TAG = '}}';
	var REG_EXP = /\{\{#?(.*?)\}\}/img,
		REG_CMD = /x-.*/;
	var ATTR_REF_TAG = 'ref';
	var PROP_TYPE_PRIFX = '.';
	var PROP_SYNC_SUFX = ':sync';
	var PROP_SYNC_SUFX_EXP = /:sync$/;

	var EXP2HTML_EXP_TAG = '#';
	var EXP2HTML_START_EXP = /^\s*#/;
	var FILTER_EXP = /=>\s*(.+?)$/;
	var FILTER_EXP_START_TAG = '=>';
	var FILTER_EXP_SPLITTER = '|';
	var LOGGER = {
	    log : function(){},
	    debug : function(){},
	    error : function(){},
	    warn : function(){}
	};

	var im_counter = 0;

	var DISPATCHERS = [];


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
		 * 保存注册过的全局组件实例引用。注册全局组件可以使用x-global指令.
		 * <p>
		 * 		<x-panel x-global="xPanel" >...</x-panel>
		 * </p>
		 * <p>
		 * 		impex.global.xPanel.todo();
		 * </p>
		 * @type {Object}
		 */
		this.global = {};

		/**
		 * impex事件管理接口
		 * @type {Object}
		 */
		this.events = {
			/**
			 * 注册一个事件分派器
			 * @param  {String | Array} events 支持的事件列表。数组或者以空格分割的字符串
			 * @param  {Dispatcher} dispatcher 分派器
			 */
			registerDispatcher:function(events,dispatcher){
				if(typeof(events) == 'string'){
					events = events.split(' ');
				}
				DISPATCHERS.push([events,dispatcher]);
			}
		}

		/**
	     * 版本信息
	     * @type {Object}
	     * @property {Array} v 版本号
	     * @property {string} state
	     * @property {function} toString 返回版本
	     */
		this.version = {
	        v:[0,51,0],
	        state:'',
	        toString:function(){
	            return impex.version.v.join('.') + ' ' + impex.version.state;
	        }
	    };
	    /**
	     * 官网地址
	     * @type {String}
	     * @constant
	     */
		this.website = 'http://impexjs.org';

		/**
		 * 设置impex参数
		 * @param  {Object} cfg 参数选项
		 * @param  {String} cfg.delimiters 表达式分隔符，默认{{ }}
		 * @param  {int} cfg.logger 日志器对象，至少实现warn/log/debug/error 4个接口
		 */
		this.config = function(cfg){
			var delimiters = cfg.delimiters || [];
			EXP_START_TAG = delimiters[0] || '{{';
			EXP_END_TAG = delimiters[1] || '}}';

			REG_EXP = new RegExp(EXP_START_TAG+'(.*?)'+EXP_END_TAG,'img');

			LOGGER = cfg.logger || new function(){
			    this.log = function(){}
			    this.debug = function(){}
			    this.error = function(){}
			    this.warn = function(){}
			};
			this.logger = LOGGER;
		};

		/**
		 * 定义组件<br/>
		 * 定义的组件实质是创建了一个组件类的子类，该类的行为和属性由model属性
		 * 指定，当impex解析对应指令时，会动态创建子类实例<br/>
		 * @param  {string} name  组件名，全小写，必须是ns-name格式，至少包含一个"-"
		 * @param  {Object} param 组件参数<br/>
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.component = function(name,param,services){
			if(typeof(param)!='string' && !param.template){
				LOGGER.warn("can not find property 'template' of component '"+name+"'");
			}
			ComponentFactory.register(name,param,services);
			return this;
		}

		/**
		 * 定义指令
		 * @param  {string} name  指令名，不带前缀
		 * @param  {Object} param 指令参数
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.directive = function(name,param,services){
			DirectiveFactory.register(name,param,services);
			return this;
		}

		/**
		 * 定义服务
		 * @param  {string} name  服务名，注入时必须和创建时名称相同
		 * @param  {Object} param 服务参数
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.service = function(name,param,services){
			ServiceFactory.register(name,param,services);
			return this;
		}

		/**
		 * 定义过滤器
		 * @param  {string} name  过滤器名
		 * @param  {Object} param 过滤器参数
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.filter = function(name,param,services){
			FilterFactory.register(name,param,services);
			return this;
		}

		/**
		 * 定义过渡器
		 * @param  {string} name  过渡器名
		 * @param  {Object} hook 过渡器钩子，可以在过渡的各个周期进行调用
		 * @return this
		 */
		this.transition = function(name,hook){
			TransitionFactory.register(name,hook);
			return this;
		}

		/**
		 * 对单个组件进行测试渲染
		 */
		this.unitTest = function(compName,entry,model){
			window.onload = function(){
	            'use strict';
	            
                var subModel = component();
                var tmpl = document.querySelector('template');
                subModel.template = tmpl.innerHTML;
	            //register
	            impex.component(compName,subModel);

	            //register requires
	            var links = document.querySelectorAll('link[rel="impex"]');
	            for(var i=links.length;i--;){
	                var lk = links[i];
	                var type = lk.getAttribute('type');
	                var href = lk.getAttribute('href');
	                var services = lk.getAttribute('services');
	                if(services)
	                	services = services.split(',');
	                impex.component(type,href,services);
	            }

	            //render
	            impex.render(document.querySelector(entry),model);
	        }
		}

		/**
		 * 渲染一个组件，比如
		 * <pre>
		 * 	<x-stage id="entry"><x-stage>
		 * 	...
		 * 	impex.render(document.getElementById('entry')...)
		 * </pre>
		 * 如果DOM元素本身并不是组件,系统会创建一个匿名组件，也就是说
		 * impex总会从渲染一个组件作为一切的开始
		 * @param  {HTMLElement} element DOM节点，可以是组件节点
		 * @param  {Object} param 组件参数，如果节点本身已经是组件，该参数会覆盖原有参数 
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 */
		this.render = function(element,param,services){
			if(!element){
				LOGGER.error('invalid element, can not render');
				return;
			}
			var name = element.tagName.toLowerCase();
			if(elementRendered(element)){
				LOGGER.warn('element ['+name+'] has been rendered');
				return;
			}
			//link comps
			var links = document.querySelectorAll('link[rel="impex"]');

            //register requires
            for(var i=links.length;i--;){
                var lk = links[i];
                var type = lk.getAttribute('type');
                var href = lk.getAttribute('href');
                var services = lk.getAttribute('services');
                if(services)
	                	services = services.split(',');
                impex.component(type,href,services);
            }

			var comp = ComponentFactory.newInstanceOf(name,element);
			if(!comp){
				topComponentNodes.push(element);
				comp = ComponentFactory.newInstance([element],param);
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
			comp.mount();

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

		Object.defineProperty(this,'_cs',{enumerable: false,writable: true,value:{}});


		this.logger = LOGGER;
		this.util = Util;


		//for prototype API
		this.Component = Component;

		this.Signal = Signal;
		/**
		 * 开启基础渲染。用于自动更新父组件参数变更导致的变化
		 */
		this.useBasicRender = function(){
			Util.ext(Component.prototype,{
				onPropChange : function(changes){
			        changes.forEach(function(c){
			            var val = this.state[c.name];
			            if(c.val !== val){
			                this.state[c.name] = c.val;
			            }
			        },this);
			    }
			});
		}
	}


/**
 * 内建服务，提供基础操作接口
 */

/**
 * 视图管理服务提供额外的视图操作，可以用在指令或组件中。
 * 使用该服务，只需要注入即可
 */
impex.service('DOMHelper',DOMHelper);


/**
 * 组件管理服务提供对组件的额外操作
 * 使用该服务，只需要注入即可
 */
impex.service('ComponentManager',{
	/**
	 * 是否存在指定类型的组件
	 * @return {Boolean} 
	 */
    hasTypeOf : function(type){
    	return ComponentFactory.hasTypeOf(type);
    }
});

/**
 * 组件管理服务提供对组件的额外操作
 * 使用该服务，只需要注入即可
 */
impex.service('Transitions',new function(){
	var transitionObjs = [];
	this.get = function(type,component){
		type = type||'x';
		return TransitionFactory.get(type,component);
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
        final:true,
        priority:999
    })
    /**
     * 注册全局组件指令
     * <br/>使用方式：<x-panel x-global="xPanel" >...</x-panel>
     */
    impex.directive('global',{
        onCreate:function(){
            var k = this.value;
            if(impex.global[k]){
                LOGGER.warn('duplicate name "'+k+'" exists in global');
                return;
            }
            impex.global[k] = this.component;
        }
    })
    /**
     * 内联样式指令
     * <br/>使用方式：
     * <div x-style="{'font-size': valExp}" >...</div>
     * <div x-style="{'fontSize': valExp}" >...</div>
     * <div x-style="'color:red;font-size:20px;'" >...</div>
     * <div x-style="obj" >...</div>
     */
    .directive('style',{
        onCreate:function(){
            if(this.value.trim()[0]==='{'){
                this.value = '('+this.value+')';
            }
        },
        onUpdate:function(map){
            if(typeof map === 'string'){
                var rs = {};
                var tmp = map.split(';');
                for(var i=tmp.length;i--;){
                    var pair = tmp[i].split(':');
                    rs[pair[0]] = pair[1];
                }
                map = rs;
            }
            var style = this.el.style;
            for(var k in map){
                var n = this.filterName(k);
                var v = map[k];
                style[n] = v;
            }
        },
        filterName:function(k){
            return k.replace(/-([a-z])/img,function(a,b){
                return b.toUpperCase();
            });
        }
    })
    /**
     * 外部样式指令
     * <br/>使用方式：
     * <div x-class="'cls1 cls2 cls3 ...'" >...</div>
     * <div x-class="['cls1','cls2','cls3']" >...</div>
     * <div x-class="{cls1:boolExp,cls2:boolExp,cls3:boolExp}" >...</div>
     */
    .directive('class',{
        onCreate:function(){
            if(this.value.trim()[0]==='{'){
                this.value = '('+this.value+')';
            }
        },
        onUpdate:function(map){
            var str = '';
            if(map instanceof Array){
                map.forEach(function(cls){
                    str += ' '+ cls;
                });
            }else if(typeof map === 'string'){
                str = map;
            }else{
                for(var k in map){
                    var v = map[k];
                    if(v){
                        str += ' '+ k;
                    }
                }
            }

            if(this.lastClassStr){
                this.el.className = this.el.className.replace(this.lastClassStr,'');
            }

            this.el.className += ' '+str;
            this.lastClassStr = str;
        }
    })
    /**
     * 绑定视图事件，以参数指定事件类型，用于减少单一事件指令书写
     * <br/>使用方式1：<img x-on:load:mousedown:touchstart="hi()" x-on:dblclick="hello()">
     * <br/>使用方式2：<img :load:mousedown:touchstart="hi()" :dblclick="hello()">
     */
    .directive('on',{
        onInit:function(){
            for(var i=this.params.length;i--;){
                this.on(this.params[i],this.value);
            }
        }
    })
    /**
     * 文本指令，用于防止表达式被渲染前出现在页面上的边界符
     * <br/>使用方式1：<span x-text="msg"></span>
     */
    .directive('text',{
        onUpdate:function(rs){
            this.el.innerText = rs;
        }
    })
    /**
     * 绑定视图属性，并用表达式的值设置属性
     * <br/>使用方式：<img x-bind:src="exp">
     */
    .directive('bind',{
        onInit:function(){
            if(!this.params || this.params.length < 1){
                LOGGER.warn('at least one attribute be binded');
            }
        },
        onUpdate : function(rs){
            if(!this.params || this.params.length < 1)return;

            var filter = null;
            if(this.filter){
                filter = this.component[this.filter];
            }

            if(filter){
                var allowed = filter(rs);
                if(!Util.isUndefined(allowed) && !allowed){
                    return;
                }
            }

            for(var i=this.params.length;i--;){
                var p = this.params[i];
                this.el.setAttribute(p,rs);
            }
            
        }
    })
    /**
     * 控制视图显示指令，根据表达式计算结果控制
     * <br/>使用方式：<div x-show="exp"></div>
     */
    .directive('show',{
        onCreate:function(ts,DOMHelper){
            if(this.el.tagName === 'TEMPLATE'){
                DOMHelper.replace(this.el,this.__nodes);
            }

            var transition = this.el.getAttribute('transition');
            if(transition !== null && this.el.tagName !== 'TEMPLATE'){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = true;
            this.compiled = false;
        },
        onUpdate : function(rs){
            if(this.component.__state === Component.state.suspend)return;
            if(rs === this.lastRs)return;
            this.lastRs = rs;

            if(this.transition){
                if(rs){
                    this.transition.enter();
                }else{
                    this.transition.leave();
                }
            }else{
                this.exec(rs);
            }
        },
        enter:function(){
            this.exec(this.lastRs);
        },
        postLeave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                //显示
                for(var i=this.__nodes.length;i--;){
                    this.__nodes[i].style.display = '';
                }
            }else{
                // 隐藏
                for(var i=this.__nodes.length;i--;){
                    this.__nodes[i].style.display = 'none';
                }
            }
        }
    },['Transitions','DOMHelper'])
    /**
     * 效果与show相同，但是会移除视图
     * <br/>使用方式：<div x-if="exp"></div>
     */
    .directive('if',{
        final:true,
        onCreate:function(ts,DOMHelper){
            this.DOMHelper = DOMHelper;
            this.placeholder = document.createComment('-- directive [if] placeholder --');         

            var transition = this.el.getAttribute('transition');
            if(transition !== null && this.el.tagName !== 'TEMPLATE'){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.compiled = false;
            //default false
            if(this.el.parentNode)
            this.el.parentNode.replaceChild(this.placeholder,this.el);
        },
        onUpdate : function(rs){
            if(rs && !this.compiled){
                Util.compileViewOf(this.component,this.__nodes);
                this.compiled = true;
            }
            if(this.elseD){
                this.elseD.doUpdate(!rs);
            }
            if(this.component.__state === Component.state.suspend)return;
            if(rs === this.lastRs && !this.el.parentNode)return;
            this.lastRs = rs;

            if(this.transition){
                if(rs){
                    this.transition.enter();
                }else{
                    this.transition.leave();
                }
            }else{
                this.exec(rs);
            }
        },
        enter:function(){
            this.exec(this.lastRs);
        },
        postLeave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                if(this.__nodes[0].parentNode)return;
                //添加
                this.DOMHelper.replace(this.placeholder,this.__nodes);
            }else{
                if(!this.__nodes[0].parentNode)return;
                //删除
                var p = this.__nodes[0].parentNode;
                p.insertBefore(this.placeholder,this.__nodes[0]);
                this.DOMHelper.detach(this.__nodes);
            }
        }
    },['Transitions','DOMHelper'])
    /**
     * 和x-if成对出现，单独出现无效。并且只匹配前一个if
     * <br/>使用方式：<div x-if="exp"></div><div x-else></div>
     */
    .directive('else',{
        onCreate:function(ts,DOMHelper){
            this.DOMHelper = DOMHelper;
            this.placeholder = document.createComment('-- directive [else] placeholder --');

            //default false
            this.el.parentNode.replaceChild(this.placeholder,this.el);

            //find if
            var xif = this.component.directives[this.component.directives.length-2];
            if(xif.name !== 'x-if'){
                LOGGER.warn("can not find directive[x-if] to make a pair");
                return;
            }

            xif.elseD = this;

            var transition = this.el.getAttribute('transition');
            if(transition !== null && this.el.tagName !== 'TEMPLATE'){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.compiled = false;
        },
        doUpdate : function(rs){
            if(rs && !this.compiled){
                Util.compileViewOf(this.component,this.__nodes);
                this.compiled = true;
            }
            if(this.component.__state === Component.state.suspend)return;
            if(rs === this.lastRs && !this.el.parentNode)return;
            this.lastRs = rs;

            if(this.transition){
                if(rs){
                    this.transition.enter();
                }else{
                    this.transition.leave();
                }
            }else{
                this.exec(rs);
            }
        },
        enter:function(){
            this.exec(this.lastRs);
        },
        postLeave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                if(this.__nodes[0].parentNode)return;
                //添加
                this.DOMHelper.replace(this.placeholder,this.__nodes);
            }else{
                if(!this.__nodes[0].parentNode)return;
                //删除
                var p = this.__nodes[0].parentNode;
                p.insertBefore(this.placeholder,this.__nodes[0]);
                this.DOMHelper.detach(this.__nodes);
            }
        }
    },['Transitions','DOMHelper'])
    /**
     * 用于屏蔽视图初始时的表达式原始样式，需要配合class使用
     */
    .directive('cloak',{
        onCreate:function(){
            var className = this.el.getAttribute('class');
            if(!className){
                LOGGER.warn("can not find attribute[class] of element["+this.el.tagName+"] which directive[cloak] on");
                return;
            }
            className = className.replace('x-cloak','');
            
            this.__cn = className;
        },
        onActive:function(){
            updateCloakAttr(this.component,this.el,this.__cn);
            var curr = this.el.getAttribute('class').replace('x-cloak','');
            this.el.setAttribute('class',curr);
        }
    })

    ///////////////////// 模型控制指令 /////////////////////
    /**
     * 绑定模型属性，当控件修改值后，模型值也会修改
     * <br/>使用方式：<input x-model="model.prop">
     */
    .directive('model',{
        onActive:function(){
            var el = this.el;
            this.toNum = el.getAttribute('number');
            this.debounce = el.getAttribute('debounce')>>0;

            switch(el.nodeName.toLowerCase()){
                case 'textarea':
                case 'input':
                    var type = el.getAttribute('type');
                    switch(type){
                        case 'radio':
                            this.on('change',this.changeModel);
                            break;
                        case 'checkbox':
                            this.on('change',this.changeModelCheck);
                            break;
                        default:
                            var hack = document.body.onpropertychange===null?'propertychange':'input';
                            this.on(hack,this.changeModel);
                    }
                    
                    break;
                case 'select':
                    var mul = el.getAttribute('multiple');
                    if(mul !== null){
                        this.on('change',this.changeModelSelect);
                    }else{
                        this.on('change',this.changeModel);
                    }
                    
                    break;
            }
        },
        changeModelSelect : function(e){
            var t = e.target || e.srcElement;
            var val = t.value;
            var parts = [];
            for(var i=t.options.length;i--;){
                var opt = t.options[i];
                if(opt.selected){
                    parts.push(opt.value);
                }
            }            
            this.component.d(this.value,parts);
        },
        changeModelCheck : function(e){
            var t = e.target || e.srcElement;
            var val = t.value;
            var parts = this.component.d(this.value);
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
        },
        changeModel : function(e){
            if(this.debounce){
                if(this.debounceTimer){
                    clearTimeout(this.debounceTimer);
                    this.debounceTimer = null;
                }
                var that = this;
                this.debounceTimer = setTimeout(function(){
                    clearTimeout(that.debounceTimer);
                    that.debounceTimer = null;
                    
                    that.setVal(e);
                },this.debounce);
            }else{
                this.setVal(e);
            }
        },
        setVal:function(e){
            var v = (e.target || e.srcElement).value;
            if(this.toNum !== null){
                v = parseFloat(v);
            }
            this.component.d(this.value,v);
        }
    });

    function updateCloakAttr(component,node,newOrigin){
        for(var i=component.__expNodes.length;i--;){
            var expNode = component.__expNodes[i];
            if(expNode.node == node && expNode.attrName === 'class'){
                expNode.origin = newOrigin;
            }
        }

        for(var j=component.children.length;j--;){
            updateCloakAttr(component.children[j],node,newOrigin);
        }
    }
    function eachModel(){
        this.onCreate = function(DOMHelper,ts){
            this.eachExp = /^(.+?)\s+as\s+((?:[a-zA-Z0-9_$]+?\s*,)?\s*[a-zA-Z0-9_$]+?)\s*(?:=>\s*(.+?))?$/;
            this.forExp = /^\s*(\d+|[a-zA-Z_$](.+)?)\s+to\s+(\d+|[a-zA-Z_$](.+)?)\s*$/;
            this.DOMHelper = DOMHelper;
            this.expInfo = this.parseExp(this.value);
            this.cache = [];
            this.__comp = this.component;

            this.placeholder = document.createComment('-- directive [each] placeholder --');
            this.el.parentNode.replaceChild(this.placeholder,this.el);

            if(this.el.tagName !== 'TEMPLATE'){
                this.__tagName = this.el.tagName.toLowerCase();
                this.__isComp = ComponentFactory.hasTypeOf(this.__tagName);
            }

            this.subComponents = [];

            this.cacheSize = 20;

            this.step = this.el?this.el.getAttribute('step'):this.__nodes[0].getAttribute('step');

            this.over = this.el?this.el.getAttribute('over'):this.__nodes[0].getAttribute('over');

            var transition = this.el.tagName !== 'TEMPLATE'?this.el.getAttribute('transition'):this.__nodes[0].getAttribute('transition');
            if(transition !== null){
                this.trans = transition;
                this.ts = ts;
            }
        }
        this.onInit = function(){
            var that = this;
            //获取数据源
            if(this.forExp.test(this.expInfo.ds)){
                var begin = RegExp.$1,
                    end = RegExp.$3,
                    step = parseFloat(this.step);
                if(step < 0){
                    LOGGER.error('step <= 0 : '+step);
                    return;
                }
                step = step || 1;
                if(isNaN(begin)){
                    var path = begin;
                    this.component.watch(begin,function(object,name,type,newVal,oldVal){
                        if(isNaN(newVal)){
                            newVal = this.d(path);
                        }
                        var ds = getForDs(newVal>>0,end,step);
                        that.lastDS = ds;
                        that.rebuild(ds,that.expInfo.k,that.expInfo.v);
                    });
                    begin = this.component.d(begin);
                }
                if(isNaN(end)){
                    var path = end;
                    this.component.watch(end,function(object,name,type,newVal,oldVal){
                        if(isNaN(newVal)){
                            newVal = this.d(path);
                        }
                        var ds = getForDs(begin,newVal>>0,step);
                        that.lastDS = ds;
                        that.rebuild(ds,that.expInfo.k,that.expInfo.v);
                    });
                    end = this.component.d(end);
                }
                begin = parseFloat(begin);
                end = parseFloat(end);
                
                this.ds = getForDs(begin,end,step);
            }else{
                this.ds = this.component.d(this.expInfo.ds);
                this.component.watch(this.expInfo.ds,
                    function(object,name,type,newVal,oldVal,propChain,matchLevel){
                    if(!that.ds){
                        that.ds = that.__comp.d(that.expInfo.ds);
                        that.lastDS = that.ds;
                        that.build(that.ds,that.expInfo.k,that.expInfo.v);
                        return;
                    }

                    var ds = that.__comp.d(that.expInfo.ds);
                    
                    that.lastDS = ds;
                    that.rebuild(that.lastDS,that.expInfo.k,that.expInfo.v);
                });
            }

            if(this.over){
                var tmp = lexer(this.over);
                var rs = Renderer.evalExp(this.__comp,tmp);
                this.over = rs;
            }            
            
            this.lastDS = this.ds;

            //parse props
            this.__props = parseProps(this.el,this.component);

            if(this.ds)
                this.build(this.ds,this.expInfo.k,this.expInfo.v);
            //更新视图
            this.unmount();
        }
        function parseProps(el,comp){
            var props = {
                str:{},
                type:{},
                sync:{}
            };
            var ks = ['cache','over','step','transition'];
            for(var i=el.attributes.length;i--;){
                var attr = el.attributes[i];
                var k = attr.nodeName;
                if(ks.indexOf(k) > -1)continue;
                k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});
                
                var v = attr.nodeValue;

                if(k[0] === PROP_TYPE_PRIFX){
                    var tmp = lexer(v);
                    var rs = Renderer.evalExp(comp,tmp);
                    var n = k.substr(1);
                    
                    if(PROP_SYNC_SUFX_EXP.test(n)){
                        var keys = Object.keys(tmp.varTree);
                        var propName = n.replace(PROP_SYNC_SUFX_EXP,'');
                        props.sync[propName] = [tmp,rs,keys];
                    }else{
                        props.type[n] = rs;
                    }
                }else{
                    props.str[k] = v;
                }
            }
            return props;
        }
        function getForDs(begin,end,step){
            var dir = end - begin < 0?-1:1;
            var ds = [];
            for(var i=begin;i<=end;i+=step){
                ds.push(i);
            }
            return ds;
        }
        this.rebuild = function(ds,ki,vi){
            ds = this.doFilter(ds);

            var newSize = ds instanceof Array?ds.length:Object.keys(ds).length;
            
            var diffSize = newSize - this.subComponents.length;

            //resort
            // this.subComponents.sort(function(a,b){return a.state.$index - b.state.$index})

            var compMap = {};
            if(diffSize < 0){
                var len = diffSize*-1;
                var tmp = this.subComponents.splice(this.subComponents.length-len,len);
                if(this.cache.length < this.cacheSize){
                    for(var i=tmp.length;i--;){
                        this.cache.push(tmp[i]);
                    }
                    for(var i=this.cache.length;i--;){
                        if(this.trans && !this.cache[i].__leaving && this.cache[i].__state === Component.state.mounted){
                            this.cache[i].__leaving = true;
                            this.cache[i].transition.leave();
                        }else{
                            this.cache[i].suspend(false);
                        }
                    }
                }else{
                    for(var i=tmp.length;i--;){
                        tmp[i].unmount();
                    }
                }
            }else if(diffSize > 0){
                var restSize = diffSize;                
                while(restSize--){
                    var pair = this.createSubComp();
                    compMap[pair[0].__id] = pair;
                }
            }

            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            var updateQ = [];
            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;

                var subComp = this.subComponents[index];

                //模型
                var v = ds[k];

                //k,index,each
                if(typeof v === 'object'){
                    for(var i=v.__im__extPropChain.length;i--;){
                        if(v.__im__extPropChain[i][0] === this){
                            break;
                        }
                    }
                    v.__im__extPropChain.splice(i,1);
                    v.__im__extPropChain.push([this,vi,index]);
                }
                
                var data = subComp.state;

                data[vi] = v;
                data['$index'] = index++;
                if(ki)data[ki] = isIntK?k>>0:k;

                if(compMap[subComp.__id]){
                    updateQ.push(compMap[subComp.__id]);
                }
                
            }

            renderEach(updateQ,this,true);
        }

        this.createSubComp = function(){
            var comp = this.__comp;
            var subComp = null;
            var p = this.placeholder.parentNode;
            var placeholder = document.createComment('-- directive [each] component --');
            //视图
            var copyNodes = [];
            for(var i=this.__nodes.length;i--;){
                var c = this.__nodes[i].cloneNode(true);
                copyNodes.unshift(c);
            }
            p.insertBefore(placeholder,this.placeholder);

            //创建子组件
            if(this.__isComp){
                subComp = comp.createSubComponentOf(copyNodes[0]);
            }else{
                subComp = comp.createSubComponent(copyNodes);
            }

            this.subComponents.push(subComp);

            //bind callback first
            for(var n in this.__props.type){
                var v = this.__props.type[n];
                if(v instanceof Function){
                    subComp[n] = v;
                }
            }

            //bind props
            for(var n in this.__props.sync){
                var prop = this.__props.sync[n];
                var tmp = prop[0];
                var rs = prop[1];
                //call onPropBind
                if(Util.isObject(rs) && subComp.onPropBind)
                    rs = subComp.onPropBind(n,rs);

                var keys = prop[2];
                //watch props
                keys.forEach(function(key){
                    if(tmp.varTree[key].isFunc)return;

                    var prop = new Prop(subComp,n,tmp.varTree[key].segments,tmp);
                    comp.__watchProps.push(prop);
                });
                subComp.state[n] = rs;
            }
            //bind state
            for(var n in this.__props.str){
                subComp.state[n] = this.__props.str[n];
            }
            for(var n in this.__props.type){
                var v = this.__props.type[n];
                if(!(v instanceof Function)){
                    //call onPropBind
                    if(Util.isObject(v) && subComp.onPropBind)
                        v = subComp.onPropBind(n,v);
                    subComp.state[n] = v;
                }
            }
            
            if(this.trans){
                var that = this;
                
                subComp.onInit = function(){
                    if(!this.transition){
                        this.transition = that.ts.get(that.trans,this);
                    }
                };
                subComp.onMount = function(){
                    this.transition.enter();
                };
                subComp.postLeave = function(){
                    this.suspend(false);
                    this.__leaving = false;
                }
            }
                
            return [subComp,placeholder];
        }
        this.doFilter = function(ds){
            if(!this.filters)return ds;
            var filters = this.filters;
            if(Object.keys(filters).length > 0 && ds){
                var rs = ds;
                if(Util.isObject(ds)){
                    rs = Util.isArray(ds)?[]:{};
                    Util.ext(rs,ds);
                }

                for(var k in filters){
                    var c = filters[k][0];
                    var params = filters[k][1];
                    var actParams = [];
                    for(var i=params.length;i--;){
                        var v = params[i];
                        if(v.varTree && v.words){
                            v = Renderer.evalExp(this.__comp,v);
                        }
                        actParams[i] = v;
                    }
                    c.value = rs;
                    rs = c.to.apply(c,actParams);
                }
                return rs;
            }
        }
        this.build = function(ds,ki,vi){
            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            
            ds = this.doFilter(ds);
            //bind each
            if(ds.__im__extPropChain)
                ds.__im__extPropChain.push([this,vi]);

            var queue = [];

            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;

                var subCompPair = this.createSubComp();
                queue.push(subCompPair);
                
                //模型
                var v = ds[k];

                //k,index,each
                if(typeof v === 'object'){
                    v.__im__extPropChain.push([this,vi,index]);
                }

                var data = subCompPair[0].state.__im__target || subCompPair[0].state;

                data[vi] = v;
                data['$index'] = index++;
                if(ki)data[ki] = isIntK?k>>0:k;
            }

            renderEach(queue,this);
        }
        function renderEach(queue,eachObj,deep){
            if(queue.length<1)return;
            setTimeout(function(){
                var list = queue.splice(0,50);
                for(var i=0;i<list.length;i++){
                    var pair = list[i];
                    var comp = pair[0];
                    var holder = pair[1];
                    if(comp.__state === Component.state.suspend)continue;
                    //attach DOM
                    eachObj.DOMHelper.replace(holder,comp.__nodes);
                    comp.init();
                    comp.mount();

                    if(deep){
                        if(comp.__state === Component.state.mounted){
                            Renderer.recurRender(comp);
                        }
                    }
                }

                if(queue.length > 0){
                    renderEach(queue,eachObj);
                }else{
                    //complete callback
                    if(eachObj.over)
                    eachObj.over();
                }
            },0);
        }
        this.parseExp = function(exp){
            var ds,k,v;
            var that = this;
            exp.replace(this.eachExp,function(a,attrName,subAttr,filterExp){
                ds = attrName;
                var tmp = subAttr.replace(/\s/mg,'');
                var kv = tmp.split(',');
                if(kv.length>1){
                    k = kv[0];
                    v = kv[1];
                }else{
                    v = kv[0];
                }

                if(filterExp){
                    var filters = {};
                    var varMap = Scanner.parseFilters(lexer(filterExp),filters,that.parent);
                    that.filters = filters;

                    for(var i in varMap){
                        that.component.watch(i,function(){
                            if(that.lastDS)
                            that.rebuild(that.lastDS,that.expInfo.k,that.expInfo.v);
                        });
                    }
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
    each.final = true;
    each.priority = 998;
    /**
     * each指令用于根据数据源，动态生成列表视图。数据源可以是数组或者对象
     * <br/>使用方式：
     * <br/> &lt;li x-each="datasource as k , v"&gt;{{k}} {{v}}&lt;/li&gt;
     * <br/> &lt;li x-each="datasource as v"&gt;{{v}}&lt;/li&gt;
     * 
     * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
     */
    impex.directive('each',each,['DOMHelper','Transitions']);

}(impex);
impex.filter('json',{
    to:function(){
        return JSON.stringify(this.value);
    }
})

//filterBy:'xxx'
//filterBy:'xxx':'name'
//filterBy:filter
.filter('filterBy',{
    to:function(key,inName){
        var ary = this.value;
        if(!(ary instanceof Array)){
            LOGGER.warn('can only filter array');
            return this.value;
        }
        var rs = [];
        if(key instanceof Function){
            for(var i=ary.length;i--;){
                var need = key.call(this,ary[i]);
                if(need){
                    rs.unshift(ary[i]);
                }
            }
        }else{
            for(var i=ary.length;i--;){
                var item = ary[i];
                if(inName){
                    if(!key || (item[inName]+'').indexOf(key) > -1){
                        rs.unshift(item);
                    }
                }else{
                    if(!key || item.indexOf && item.indexOf(key) > -1){
                        rs.unshift(item);
                    }
                }
            }
        }
        return rs;
    }
})

//[1,2,3,4,5] => limitBy:3:1   ----> [2,3,4]
.filter('limitBy',{
    to:function(count,start){
        if(!(this.value instanceof Array)){
            LOGGER.warn('can only filter array');
            return this.value;
        }
        if(!count)return this.value;
        return this.value.splice(start||0,count);
    }
})

//[1,2,3,4,5] => orderBy:'':'desc'   ----> [5,4,3,2,1]
.filter('orderBy',{
    to:function(key,dir){
        if(!key && !dir)return this.value;
        if(!(this.value instanceof Array)){
            LOGGER.warn('can only filter array');
            return this.value;
        }
        this.value.sort(function(a,b){
            var x = key?a[key]:a,
                y = key?b[key]:b;

            if(typeof x === "string"){
                return x.localeCompare(y);
            }else if(typeof x === "number"){
                return x - y;
            }else{
                return (x+'').localeCompare(y);
            }
        });
        if(dir === 'desc'){
            this.value.reverse();
        }
        return this.value;
    }
});
/**
 * 内建分派器
 */
!function(impex){
    ///////////////////// 鼠标事件分派器 /////////////////////
    var mouseDispatcher = new Dispatcher({
        listeningEventMap:{},
        onInit:function() {
            if(this.inited)return;

            document.addEventListener('mousedown',this.doMousedown.bind(this),true);
            document.addEventListener('mousemove',this.doMousemove.bind(this),true);
            document.addEventListener('mouseup',this.doMouseup.bind(this),true);

            var type = document.body.onmousewheel == null?'mousewheel':'DOMMouseScroll';
            document.addEventListener(type,this.doMousewheel.bind(this),true);

            document.addEventListener('mouseout',this.doMouseout.bind(this),true);

            this.inited = true;
            this.lastClickTime = 0;
        },
        doMousedown:function(e){
            this.dispatch('mousedown',e);
        },
        doMousemove:function(e){
            this.dispatch('mousemove',e);
        },
        doMouseup:function(e){
            this.dispatch('mouseup',e);

            if(e.button === 0){
                this.dispatch('click',e);
                if(Date.now() - this.lastClickTime < 300){
                    this.dispatch('dblclick',e);
                }

                this.lastClickTime = Date.now();
            }
            
        },
        doMouseout:function(e){
            this.dispatch('mouseout',e);

            //check leave
            var t = e.target;
            var events = this.__eventMap['mouseleave'];
            if(!events)return;
            
            do{
                if(this.fireMouseleave(t,events,e) === false){
                    break;
                }

                t = t.parentNode;
            }while(t.tagName && t.tagName != 'HTML');
        },
        fireMouseleave:function(t,events,e){
            for(var i=events.length;i--;){
                if(events[i].el === t){
                    break;
                }
            }
            if(i < 0)return;

            var currentTarget = t;
            var target = e.target;

            if(!this.contains(currentTarget,target))return;

            var toElement = e.toElement || e.relatedTarget;
            if(this.contains(currentTarget,toElement))return;
            
            return this.fireEvent(t,events,e,'mouseleave');
        },
        contains:function(a,b){
            if(a.contains){
                return a.contains(b);
            }
            do{
                if(a == b)return true;
                b = b.parentNode;
            }while(b && b.tagName != 'BODY');
            return false;
        },
        doMousewheel:function(e){
            this.dispatch('mousewheel',e);
        }
    });

    impex.events.
    registerDispatcher('mousedown mouseup click dblclick mousemove mousewheel mouseout mouseleave',mouseDispatcher);

    ///////////////////// 触摸事件分派器 /////////////////////
    var touchDispatcher = new Dispatcher({
        onInit:function() {
            if(this.inited)return;

            document.addEventListener('touchstart',this.doStart.bind(this),true);
            document.addEventListener('touchmove',this.doMove.bind(this),true);
            document.addEventListener('touchend',this.doEnd.bind(this),true);
            document.addEventListener('touchcancel',this.doCancel.bind(this),true);

            this.inited = true;
            this.lastTapTime = 0;

            this.FLING_INTERVAL = 200;
        },
        doStart:function(e){
            this.dispatch('touchstart',e);

            //start timer
            var that = this;
            this.timer = setTimeout(function(){
                that.dispatch('press',e);
            },800);

            this.hasMoved = false;
            this.canceled = false;

            //handle fling
            var touch = e.touches[0];
            this.fling_data = {
                x:touch.clientX,
                y:touch.clientY,
                t:Date.now()
            };
        },
        doMove:function(e){
            clearTimeout(this.timer);

            this.dispatch('touchmove',e);

            this.hasMoved = true;
        },
        doCancel:function(e){
            clearTimeout(this.timer);

            this.canceled = true;
            this.dispatch('touchcancel',e);
        },
        doEnd:function(e){
            clearTimeout(this.timer);
            
            this.dispatch('touchend',e);

            if(this.canceled)return;

            if(!this.hasMoved){
                this.dispatch('tap',e);

                if(Date.now() - this.lastTapTime < 300){
                    this.dispatch('dbltap',e);
                }

                this.lastTapTime = Date.now();
            }else{
                var touch = e.changedTouches[0];
                var dx = touch.clientX,
                    dy = touch.clientY;

                var data = this.fling_data;
                var sx = data.x,
                    sy = data.y,
                    st = data.t;

                var long = Date.now() - st;
                var s = Math.sqrt((dx-sx)*(dx-sx)+(dy-sy)*(dy-sy)) >> 0;
                //时间小于interval并且位移大于20px才触发fling
                if(long <= this.FLING_INTERVAL && s > 20){
                    var r = Math.atan2(dy-sy,dx-sx);

                    var extra = {
                        slope:r,
                        interval:long,
                        distance:s
                    }

                    this.dispatch('fling',e,extra);
                }
            }
        }
    });

    impex.events.
    registerDispatcher('touchstart touchend touchcancel press tap dbltap touchmove fling',touchDispatcher);

}(impex);

 	if ( typeof module === "object" && typeof module.exports === "object" ) {
 		module.exports = impex;
 	}else{
 		global.impex = impex;
 	}

 }(window||this);