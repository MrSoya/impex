/*
 * impexjs is a powerful web application engine to build 
 * reactive webUI system
 *
 *
 * Copyright 2015-2016 MrSoya and other contributors
 * Released under the MIT license
 *
 * website: http://impexjs.org
 * last build: 2016-11-14
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
            var comp = compiler.querySelector('script[type="javascript/impex-component"]').innerHTML;

            var cbks = requirements[this.url];
            cbks.forEach(function(cbk){
                var data = window.eval(comp);
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

				    	if(typeof v === 'object'){
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
			clearObserve(old);
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
							change.id = 
							
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
		var observedObjects = [],//用于保存监控对象
		observedArys = [];//用于保存监控数组

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
                if(VAR_EXP_START.test(l)){
                    var vo = Var();
                    var varLiteral = varParse(varMap,sentence.substr(i),true,vo);
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
                if((l === ']' || l === ')') && nested){
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
function Prop (subComp,name,segments,expWords,oldVal,fromPropKey) {
	this.subComp = subComp;
	this.name = name;
	this.segments = segments;
	this.expWords = expWords;
	this.oldVal = oldVal;
	this.fromPropKey = fromPropKey;//参数来自上级组件的参数
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
	this.scan = function(view,component){
		var scanNodes = view.__nodes?view.__nodes:[view.el];

        var startTag = null,
            nodes = [];
        
        for(var i=0,l=scanNodes.length;i<l;i++){
        	prescan(scanNodes[i]);
            if(startTag){
                nodes.push(scanNodes[i]);
                var endTag = DirectiveFactory.hasEndTag(startTag[0]);
                var tmp = scanNodes[i].getAttribute && scanNodes[i].getAttribute(CMD_PREFIX+endTag);
                if(Util.isString(tmp)){
                    DirectiveFactory.newInstanceOf(startTag[0],nodes,component,CMD_PREFIX+startTag[0],startTag[1]);
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
		if(selfComp.restrict)return selfComp;
		var p = selfComp.parent;
		while(p){
			if(p.name && p.restrict)return p;
			p = p.parent;
		};
		return null;
	}

	function scan(node,component){
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
						if(DirectiveFactory.isFinal(c) || DirectiveFactory.hasEndTag(c)){
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
						DirectiveFactory.newInstanceOf(c,node,component,attr[0],attr[1]);
						return;
					}
					if(DirectiveFactory.hasEndTag(c)){
						return [c,attr[1]];
					}
				}

				//解析组件
				if(ComponentFactory.hasTypeOf(tagName)){
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
					var instance = component.createSubComponentOf(tagName,node);

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
							DirectiveFactory.newInstanceOf(c,node,component,attName,attVal);
						}
					}else if(attName[0] === ':'){
						DirectiveFactory.newInstanceOf('on',node,component,attName,attVal);
					}else if(REG_EXP.test(attVal)){//只对value检测是否表达式，name不检测
				    	recordExpNode(attVal,component,node,attName);
					}
				}
			}

	    	if(node.childNodes.length>0){
	    		var startTag = null,
	    			nodes = [];
				for(var i=0,l=node.childNodes.length;i<l;i++){
					// if(i > node.childNodes.length-1)return;
					if(startTag){
						nodes.push(node.childNodes[i]);
						var endTag = DirectiveFactory.hasEndTag(startTag[0]);
						var tmp = node.childNodes[i].getAttribute && node.childNodes[i].getAttribute(CMD_PREFIX+endTag);
						if(Util.isString(tmp)){
							DirectiveFactory.newInstanceOf(startTag[0],nodes,component,CMD_PREFIX+startTag[0],startTag[1]);
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
			recordExpNode(node.nodeValue,component,node);
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
				var tmp = w.split('.');
				
				for(var k=1;k<tmp.length;k++){
					words.push([tmp[k]]);
				}
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
				case '.':
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
	function prelink(comp){
		//build expressions
		for(var i=comp.__expNodes.length;i--;){
			var expNode = comp.__expNodes[i];
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

 		//build parent props
 		if(varObj.segments[0]==='this' && varObj.segments[1]==='props'){
 			var k = varObj.segments[2];
 			if(!k)return;
 			if(k[0]==='['){
 				if(expNode instanceof ExpNode){
 					comp.__expWithProps['*'].push(expNode);
		 		}else if(expNode instanceof AttrObserveNode){
		 			comp.__directiveWithProps['*'].push(expNode);
		 		}else if(expNode instanceof Watch){
 					comp.__watchWithProps['*'].push(expNode);
 				}
 			}else{
 				if(expNode instanceof ExpNode){
 					if(!comp.__expWithProps[k])comp.__expWithProps[k] = [];
 					comp.__expWithProps[k].push(expNode);
		 		}else if(expNode instanceof AttrObserveNode){
		 			if(!comp.__directiveWithProps[k])comp.__directiveWithProps[k] = [];
 					comp.__directiveWithProps[k].push(expNode);
		 		}else if(expNode instanceof Watch){
 					if(!comp.__watchWithProps[k])comp.__watchWithProps[k] = [];
 					comp.__watchWithProps[k].push(expNode);
 				}
 				
 			}
 			return;
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
		prelink(component);
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

				for(var k in changeMap){
					changeMap[k].comp.__update(changeMap[k].changes);
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
	        	comp.data.__im__target[pc[1]] = newVal;
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

	function clone(obj){
		if(obj === null)return null;
		var rs = obj;
		if(obj instanceof Array){
			rs = obj.concat();
			for(var i=rs.length;i--;){
				rs[i] = clone(rs[i]);
			}
		}else if(Util.isObject(obj)){
			rs = {};
			var ks = Object.keys(obj);
            if(ks.length>0){
                for(var i=ks.length;i--;){
                    var k = ks[i],
                        v = obj[k];
                    if(k.indexOf('__im__')===0)continue;
                    rs[k] = typeof obj[k]==='object'? clone(obj[k]): obj[k];
                }
            }
		}
		return rs;
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
				if(rs && Util.isObject(rs)){
					rs = clone(rs);
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

 		var isDataType = varStr[varStr.length-1]===')'?false:true;
 		var searchPath = watchPath || fullPath;
 		if(isDataType){
 			searchPath = '.data' + searchPath;
 		}else{
 			searchPath = '.' + searchPath.substr(1);
 		}
 		component = varInComponent(component,searchPath);

 		if(component){
 			if(isDataType){
	 			fullPath = '.data' + fullPath;
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

		if(expNode.__lastView){
			//release
			expNode.__lastView.__destroy();
		}

		var target = document.createComment('-- [html] target --');
		expNode.__placeholder.parentNode.insertBefore(target,expNode.__placeholder);

		var nodes = DOMViewProvider.compile(val,target);
		var el = nodes.length===1 && nodes[0].nodeType===1?nodes[0]:null;

		var nView = null;
		if(nodes.length > 0){
			nView = new View(el,target,nodes);
			nView.__display();
		}

		expNode.__lastView = nView;
		expNode.__lastVal = val;

		if(nView)
			Scanner.scan(nView,component);
		Builder.build(component);
		Renderer.render(component);

		//init children
		for(var i = component.children.length;i--;){
			component.children[i].init();
		}
		for(var i = component.directives.length;i--;){
			component.directives[i].init();
		}

		//display children
		for(var i = 0;i<component.children.length;i++){
			if(!component.children[i].templateURL)
				component.children[i].display();
		}

		for(var i = component.directives.length;i--;){
			component.directives[i].active();
		}


		return true;
	}
}


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
 * 		<li>onInit：当组件初始化时，该事件被触发，系统会扫描组件中的所有表达式并建立数据模型</li>
 * 		<li>onDisplay：当组件被显示时，该事件被触发，此时组件以及完成数据构建和绑定</li>
 * 		<li>onDestroy：当组件被销毁时，该事件被触发</li>
 * 		<li>onSuspend: 当组件被挂起时，该事件被触发</li>
 * 	</ul>
 * </p>
 * 
 * @class 
 */
function Component (view) {
	var id = 'C_' + im_counter++;
	this.__id = id;
	this.__state = Component.state.created;
	/**
	 * 组件绑定的视图对象，在创建时由系统自动注入
	 * 在DOM中，视图对象的所有操作都针对自定义标签的顶级元素，而不包括子元素
	 * @type {View}
	 */
	this.view = view;
	/**
	 * 对子组件的引用
	 * @type {Object}
	 */
	this.refs = {};
	/**
	 * 组件属性。在组件调用时写在组件上的所有属性,但不包括指令
	 * <p>
	 * <x-comp x-if="show" name="'impex'" value="obj" x-each="1 to 10 as i" :click="alert(343)">
            {{i}}
        </x-comp>
	 * </p>
	 * 上面的组件x-comp会有2个prop，name的值为常量字符串impex，value的值为上级组件的对象obj
	 * @type {Object}
	 */
	this.props = {};
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
	this.__expWithProps = {'*':[]};
	this.__watchWithProps = {'*':[]};
	this.__directiveWithProps = {'*':[]};
	this.__eventMap = {};
	this.__watchProps = [];
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
	this.data = {};
	/**
	 * 自定义事件接口
	 * @type {Object}
	 */
	this.events = {};

	impex._cs[this.__id] = this;
};
Component.state = {
	created : 'created',
	inited : 'inited',
	displayed : 'displayed',
	suspend : 'suspend'
};
function broadcast(comps,type,params){
	for(var i=0;i<comps.length;i++){
		var comp = comps[i];
		var evs = comp.__eventMap[type];
		var conti = true;
		if(evs){
			conti = false;
			for(var l=0;l<evs.length;l++){
				conti = evs[l].apply(comp,params);
			}
		}
		if(conti && comp.children.length>0){
			broadcast(comp.children,type,params);
		}
	}
}
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
				val = '"'+val.replace(/\r\n|\n/mg,'\\n').replace(/"/mg,'\\"')+'"';
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
	 * 绑定自定义事件到组件
	 * @param  {String} type 自定义事件名
     * @param  {Function} handler   事件处理回调，回调参数[target，arg1,...]
	 */
	on:function(type,handler){
		var evs = this.__eventMap[type];
		if(!evs){
			evs = this.__eventMap[type] = [];
		}
		evs.push(handler);
	},
	/**
	 * 触发组件自定义事件，进行冒泡
	 * @param  {String} type 自定义事件名
	 * @param  {...Object} [data...] 回调参数，可以是0-N个  
	 */
	emit:function(){
		var type = arguments[0];
		var params = [this];
		for (var i =1 ; i < arguments.length; i++) {
			params.push(arguments[i]);
		}
		var my = this.parent;
		setTimeout(function(){
			while(my){
				var evs = my.__eventMap[type];
				if(evs){
					var interrupt = true;
					for(var i=0;i<evs.length;i++){
						interrupt = !evs[i].apply(my,params);
					}
					if(interrupt)return;
				}

				my = my.parent;
			}
		},0);
	},
	/**
	 * 触发组件自定义事件，进行广播
	 * @param  {String} type 自定义事件名
	 * @param  {...Object} [data...] 回调参数，可以是0-N个  
	 */
	broadcast:function(){
		var type = arguments[0];
		var params = [this];
		for (var i =1 ; i < arguments.length; i++) {
			params.push(arguments[i]);
		}
		var my = this;
		setTimeout(function(){
			broadcast(my.children,type,params);
		},0);
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
	 * @param  {string} type 组件名
	 * @param  {View} target 视图
	 * @return {Component} 子组件
	 */
	createSubComponentOf:function(type,target,placeholder){
		var instance = ComponentFactory.newInstanceOf(type,
			target.__nodes?target.__nodes[0]:target,
			placeholder && placeholder.__nodes?placeholder.__nodes[0]:placeholder);
		this.children.push(instance);
		instance.parent = this;

		return instance;
	},
	/**
	 * 创建一个匿名子组件
	 * @param  {string | View} tmpl HTML模版字符串或视图对象
	 * @param  {View} target 视图
	 * @return {Component} 子组件
	 */
	createSubComponent:function(tmpl,target){
		var instance = ComponentFactory.newInstance(tmpl,target && target.__nodes[0]);
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

				//cache
				ComponentFactory.register(that.name,data[1]);
				that.template = tmpl;

				//init
				that.view.__init(tmpl,that);
				that.__url = null;
				that.__init(tmpl);
				that.display();
			});
			
		}else{
			if(this.template){
				var rs = this.view.__init(this.template,this);
				if(rs === false)return;
			}
			this.__init(this.template);
		}
		return this;
	},
	__init:function(tmplStr){
		Scanner.scan(this.view,this);

		LOGGER.log(this,'inited');

		ComponentFactory.initInstanceOf(this);

		//observe data
		this.data = Observer.observe(this.data,this);

		Builder.build(this);

		this.__state = Component.state.inited;

		if(this.onInit){
			this.onInit(tmplStr);
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
	 * 显示组件到视图上
	 */
	display:function(){
		if(this.__state === Component.state.displayed)return;
		if(this.__state === Component.state.created)return;

		this.view.__display(this);

		Renderer.render(this);

		//view ref
		this.view.__nodes.forEach(function(el){
			if(!el.querySelectorAll)return;
			var refs = el.querySelectorAll('*['+ATTR_REF_TAG+']');
			for(var i=refs.length;i--;){
				var node = refs[i];
				this.view.refs[node.getAttribute(ATTR_REF_TAG)] = node;
			}
		},this);
		

		this.__state = Component.state.displayed;
		LOGGER.log(this,'displayed');
		

		//display children
		for(var i = 0;i<this.children.length;i++){
			if(!this.children[i].templateURL)
				this.children[i].display();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].active();
		}

		this.onDisplay && this.onDisplay();
	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	destroy:function(){
		if(this.__state === null)return;

		LOGGER.log(this,'destroy');

		this.onDestroy && this.onDestroy();

		if(this.parent){
			var i = this.parent.children.indexOf(this);
			if(i > -1){
				this.parent.children.splice(i,1);
			}
			this.parent = null;
		}
		
		this.view.__destroy(this);

		while(this.children.length > 0){
			this.children[0].destroy();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].destroy();
		}


		this.view = 
		this.children = 
		this.directives = 
		this.__expNodes = 
		this.__expDataRoot = null;

		impex._cs[this.__id] = null;
		delete impex._cs[this.__id];

		this.__state = 
		this.__id = 
		this.templateURL = 
		this.template = 
		this.restrict = 
		this.events = 
		this.data = null;
	},
	/**
	 * 挂起组件，组件视图会从文档流中脱离，组件模型会从组件树中脱离，组件模型不再响应数据变化，
	 * 但数据都不会销毁
	 * @param {boolean} hook 是否保留视图占位符，如果为true，再次调用display时，可以在原位置还原组件，
	 * 如果为false，则需要注入viewManager，手动插入视图
	 * @see ViewManager
	 */
	suspend:function(hook){
		if(!(this instanceof Directive) && this.__state !== Component.state.displayed)return;

		LOGGER.log(this,'suspend');
		
		this.view.__suspend(this,hook===false?false:true);

		this.onSuspend && this.onSuspend();

		this.__state = Component.state.suspend;
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
				var isMatch = this.__isVarMatch(prop.segments,path);
				if(isMatch){
					if(!matchMap[prop.subComp.__id])
						matchMap[prop.subComp.__id] = [];
					var rs = Renderer.evalExp(this,prop.expWords);
					matchMap[prop.subComp.__id].push({
						name:prop.name,
						oldVal:prop.oldVal,
						newVal:rs
					});
					prop.oldVal = rs;
				}
			},this);
		}
		for(var k in matchMap){
			var cs = matchMap[k];
			impex._cs[k].__propChange && impex._cs[k].__propChange(cs);
		}
	},
	__isVarMatch:function(segments,changePath){
		if(segments.length < changePath.length)return false;
		for(var k=0;k<segments.length;k++){
			if(!changePath[k])break;

			if(segments[k][0] !== '[' && 
				changePath[k][0] !== '[' && 
				segments[k] !== changePath[k]){
				return false;
			}
		}
		return true;
	},
	__callWatchs:function (watchs){
		var invokedWatchs = [];
		for(var i=watchs.length;i--;){
			var change = watchs[i][1];
			var watch = watchs[i][0];

			var propChain = change.path;
			var newVal = change.newVal;
			var oldVal = change.oldVal;
			var name = change.name;
			var object = change.object;
			var changeType = change.type;

			if(watch.segments.length < propChain.length)continue;
			if(invokedWatchs.indexOf(watch) > -1)continue;

			//compare segs
			var canWatch = this.__isVarMatch(watch.segments,propChain);

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
						LOGGER.debug('error on parse watch params',e);
						nv = null;
					}
				}
				watch.cbk && watch.cbk.call(watch.ctrlScope,object,name,changeType,nv,ov,propChain);
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
			this.props[name] = c.newVal;
			//check children which refers to props
			this.__watchProps.forEach(function(prop){
				var k = prop.fromPropKey;
				if(!k)reutnr;
				if(k[0] === '[' || k === name){
					if(!matchMap[prop.subComp.__id])
						matchMap[prop.subComp.__id] = [];
					var rs = Renderer.evalExp(this,prop.expWords);
					matchMap[prop.subComp.__id].push({
						name:prop.name,
						oldVal:prop.oldVal,
						newVal:rs
					});
					prop.oldVal = rs;
				}
			},this);
		}

		var renderView = true;
		this.onPropUpdate && (renderView = this.onPropUpdate(changes));

		if(renderView !== false){
			var expNodeList = null;
			var directiveList = null;
			var watchList = null;
			var fuzzyE = false,
				fuzzyD = false,
				fuzzyW = false; 
			
			for(var i=changes.length;i--;){
				var c = changes[i];
				var name = c.name;
				if(this.__expWithProps[name]){
					expNodeList = this.__expWithProps[name].concat();
				}else{
					fuzzyE = true;
				}

				if(this.__directiveWithProps[name]){
					directiveList = this.__directiveWithProps[name].concat();
				}else{
					fuzzyD = true;
				}

				if(this.__watchWithProps[name]){
					watchList = this.__watchWithProps[name].concat();
				}else{
					fuzzyW = true;
				}
			}

			//expnodes
			if(fuzzyE && this.__expWithProps['*'].length > 0){
				expNodeList = expNodeList.concat(this.__expWithProps['*']);
			}
			expNodeList && Renderer.renderExpNodes(expNodeList);

			//directives
			if(fuzzyD && this.__directiveWithProps['*'].length > 0){
				directiveList = directiveList.concat(this.__directiveWithProps['*']);
			}
			directiveList && this.__updateDirective(directiveList);
			//watchs
			if(fuzzyW && this.__watchWithProps['*'].length > 0){
				watchList = watchList.concat(this.__watchWithProps['*']);
			}
			watchList && this.__callWatchs(watchList);
		}

		for(var k in matchMap){
			var cs = matchMap[k];
			impex._cs[k].__propChange && impex._cs[k].__propChange(cs);
		}
	}
});
/**
 * @classdesc 视图类，提供视图相关操作。所有影响显示效果的都属于视图操作，
 * 比如show/hide/css/animate等等
 * 无法直接创建实例，会被自动注入到组件或者指令中
 * 一个组件或者指令只会拥有一个视图
 * @class
 */
function View (el,target,nodes,placeholder) {
	/**
	 * 对可视元素的引用，在DOM中就是HTMLElement，
	 * 在绝大多数情况下，都不应该直接使用该属性
	 * @type {Object}
	 */
	this.el = el;

	this.__nodes = nodes;
	this.__evMap = {};
	this.__target = target;
	this.__placeholder = placeholder || target;
	/**
	 * 对视图范围内可视元素的引用，在DOM中就是HTMLElement
	 * @type {Object}
	 */
	this.refs = {};
}
View.prototype = {
	__init:function(tmpl,component){
		//解析属性
		var propMap = this.__target.attributes;
		var innerHTML = this.__target.innerHTML;

		var compileStr = tmplExpFilter(tmpl,innerHTML,propMap);

		if(component.onBeforeCompile){
            compileStr = component.onBeforeCompile(compileStr);
        }

		var nodes = DOMViewProvider.compile(compileStr,this.__placeholder);

		this.__nodes = nodes;
		this.el = nodes.length===1 && nodes[0].nodeType===1?nodes[0]:null;

		if(!nodes || nodes.length < 1){
			LOGGER.error('invalid template "'+tmpl+'" of component['+component.name+']');
			return false;
		}
		if(nodes.length > 1){
			LOGGER.warn('more than 1 root node of component['+component.name+']');
		}

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
					component.parent.refs[calcVal || v] = component;
					continue;
				}

				var instance = null;
				if(REG_CMD.test(k)){
					var c = k.replace(CMD_PREFIX,'');
					var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
					if(CPDI > -1)c = c.substring(0,CPDI);
					//如果有对应的处理器
					if(DirectiveFactory.hasTypeOf(c)){
						instance = DirectiveFactory.newInstanceOf(c,this.el,component,k,v);
					}
				}else if(k.indexOf(CMD_PARAM_DELIMITER) === 0){
					instance = DirectiveFactory.newInstanceOf('on',this.el,component,k,v);
				}else{
					if(!component.parent)continue;
					//如果是属性，给props
					var tmp = lexer(v);
					var rs = Renderer.evalExp(component.parent,tmp);
					var keys = Object.keys(tmp.varTree);
					//watch props
					keys.forEach(function(key){
						if(tmp.varTree[key].isFunc)return;
						
						var prop = new Prop(component,k,tmp.varTree[key].segments,tmp,rs);
						component.parent.__watchProps.push(prop);
					});

					if(propTypes){
						delete requires[k];
						this.__checkPropType(k,rs,propTypes,component);
					}

					component.props[k] = rs;
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

		//组件已经直接插入DOM中
		this.__placeholder = null;
	},
	__checkPropType:function(k,v,propTypes,component){
		if(!propTypes[k])return;
		var checkType = propTypes[k].type;
		checkType = checkType instanceof Array?checkType:[checkType];
		var vType = typeof v;
		if(checkType.indexOf(vType) < 0){
			LOGGER.error("invalid type ["+vType+"] of prop ["+k+"] of component["+component.name+"];should be ["+checkType.join(',')+"]");
		}
	},
	__display:function(component){
		if(!this.__placeholder ||!this.__placeholder.parentNode)return;

		var fragment = null;
		if(this.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<this.__nodes.length;i++){
				fragment.appendChild(this.__nodes[i]);
			}
		}else{
			fragment = this.__nodes[0];
		}

		this.__placeholder.parentNode.replaceChild(fragment,this.__placeholder);

		fragment = null;
		this.__placeholder = null;
	},
	__destroy:function(component){
		for(var k in this.__evMap){
			var events = this.__evMap[k];
	        for(var i=events.length;i--;){
	            var pair = events[i];
	            var evHandler = pair[1];

	            for(var j=this.__nodes.length;j--;){
	            	if(this.__nodes[j].nodeType !== 1)continue;
	            	this.__nodes[j].removeEventListener(k,evHandler,false);
	            }
	        }
		}

		var p = this.__nodes[0].parentNode;
		if(p){
			if(this.__nodes[0].__impex__view)
				this.__nodes[0].__impex__view = null;
			for(var i=this.__nodes.length;i--;){
				this.__nodes[i].parentNode && p.removeChild(this.__nodes[i]);
			}
		}

		if(this.__target){
			if(this.__target.parentNode)
				this.__target.parentNode.removeChild(this.__target);
			this.__target = null;
		}
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
	/**
	 * 绑定事件到视图
	 * @param  {string} type 事件名，标准DOM事件名，比如click / mousedown
     * @param {string} exp 自定义函数表达式，比如  fn(x+1) 
     * @param  {function} handler   事件处理回调，回调参数e
	 */
	on:function(type,exp,handler){
		if(!this.el)return;

		var originExp = exp;
		var comp = this.__comp;
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
				LOGGER.debug("error in event '"+type +"'",error);
			}
		};

        this.el.addEventListener(type,evHandler,false);
		
		if(!this.__evMap[type]){
			this.__evMap[type] = [];
		}
		this.__evMap[type].push([exp,evHandler]);
	},
	/**
	 * 从视图解绑事件
	 * @param  {string} type 事件名
     * @param {string} exp 自定义函数表达式，比如 { fn(x+1) }
	 */
	off:function(type,exp){
		if(!this.el)return;

		var events = this.__evMap[type];
        for(var i=events.length;i--;){
            var pair = events[i];
            var evExp = pair[0];
            var evHandler = pair[1];
            if(evExp == exp){
	            this.el.removeEventListener(type,evHandler,false);
            }
        }
	},
	/**
	 * 复制当前视图
	 * @return {View}
	 */
	clone:function(){
		var tmp = [];
		for(var i=this.__nodes.length;i--;){
			var c = this.__nodes[i].cloneNode(true);
			tmp.unshift(c);
		}
		
		var copy = new View(tmp.length===1&&tmp[0].nodeType===1?tmp[0]:null,null,tmp);
		return copy;
	},
	/**
	 * 显示视图
	 */
	show:function(){
		this.el.style.display = '';

		return this;
	},
	/**
	 * 隐藏视图
	 */
	hide:function(){
		this.el.style.display = 'none';

		return this;
	},
	/**
	 * 获取或设置视图的样式
	 * @param  {String} name  样式名，如width/height
	 * @param  {var} value 样式值
	 */
	style:function(name,value){
		if(arguments.length > 1){
			this.el.style[name] = value;

			return this;
		}else{
			return this.el.style[name];
		}
	},
	/**
	 * 获取或设置视图的属性值
	 * @param  {String} name  属性名
	 * @param  {String} value 属性值
	 */
	attr:function(name,value){
		if(arguments.length > 1){
			this.el.setAttribute(name,value);

			return this;
		}else{
			return this.el.getAttribute(name);
		}
	},
	/**
	 * 删除视图属性
	 * @param  {String} name  属性名
	 */
	removeAttr:function(name){
		this.el.removeAttribute(name);
		
		return this;
	},
	/**
	 * 视图是否包含指定样式
	 * @param  {String} name  样式名
	 */
	hasClass:function(name){
		return this.el.className.indexOf(name) > -1;
	},
	/**
	 * 添加样式到视图
	 * @param  {String} names  空格分隔多个样式名
	 */
	addClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');

		names = names.split(' ');
		var cls = this.el.className.split(' ');
		var rs = '';
		for(var n=names.length;n--;){
			if(cls.indexOf(names[n]) < 0){
				rs += names[n]+' ';
			}
		}
		this.el.className += ' '+rs;
		
		return this;
	},
	/**
	 * 从视图删除指定样式
	 * @param  {String} names  空格分隔多个样式名
	 */
	removeClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');
		var clss = names.split(' ');
		var clsName = this.el.className;
		if(clsName){
			for(var ci=clss.length;ci--;){
				var cname = clss[ci];

				var exp = new RegExp('^'+cname+'\\s+|\\s+'+cname+'$|\\s+'+cname+'\\s+','img');
				clsName = clsName.replace(exp,'');
			}

			this.el.className = clsName;
		}
		
		return this;
	},
	/**
	 * 从视图添加或移除指定样式
	 * @param  {String} names  空格分隔多个样式名
	 */
	toggleClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');

		var clss = names.split(' ');
		var add = false;
		var clsName = this.el.className;
		for(var ci=clss.length;ci--;){
			var cname = clss[ci];

			if(clsName.indexOf(cname) < 0){
				add = true;
				break;
			}
		}
		if(add){
			this.addClass(names);
		}else{
			this.removeClass(names);
		}
	}//fn over
}

function tmplExpFilter(tmpl,bodyHTML,propMap){
	tmpl = tmpl.replace(REG_TMPL_EXP,function(a,attrName){
		var attrName = attrName.replace(/\s/mg,'');
		if(attrName === 'CONTENT'){
            return bodyHTML||'';
        }
		return '';
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
			return new View(null,target,[document.createTextNode('')]);
		}
		compiler.innerHTML = template;
		if(!compiler.childNodes[0])return null;
		var nodes = [];
		while(compiler.childNodes.length>0){
			var tmp = compiler.removeChild(compiler.childNodes[0]);
			nodes.push(tmp);
		}

		var view = new View(null,target,nodes);

		return view;
	}

	this.compile = function(template,target){
		var nodes = [];
		if(!target.insertAdjacentHTML){
			var span = document.createElement('span');
			span.style.display = 'none';
			target.parentNode.insertBefore(span,target);
			target.parentNode.removeChild(target);
			target = span;
		}
		target.insertAdjacentHTML('beforebegin', '<!-- c -->');
		var start = target.previousSibling;
		target.insertAdjacentHTML('afterend', '<!-- c -->');
		var end = target.nextSibling;
		target.insertAdjacentHTML('afterend', template);

		target.parentNode.removeChild(target);

		var next = start.nextSibling;
		while(next !== end){
			if(next.nodeType === 3){
				var v = next.nodeValue.replace(/\s/mg,'');
				if(v === ''){
					next = next.nextSibling;
					continue;
				}
			}
			nodes.push(next);
			next = next.nextSibling;
		}
		start.parentNode.removeChild(start);
		end.parentNode.removeChild(end);

		return nodes;
	}
}
/**
 * 提供视图操作
 */
var ViewManager = new function (){
	this.singleton = true;
    /**
     * 替换视图，会把目标视图更新为新视图
     * <br/>在DOM中表现为更新元素
     * @param  {View} newView 新视图
     * @param  {View} targetView 目标视图
     */
	this.replace = function(newView,targetView){
		var targetV = targetView.__nodes[0],
			newV = newView.__nodes[0],
			p = targetView.__nodes[0].parentNode;
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}
		if(targetView.__nodes.length > 1){
			p.insertBefore(fragment,targetV);
			
			for(var i=targetView.__nodes.length;i--;){
				p.removeChild(targetView.__nodes[i]);
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
		var targetV = targetView.__nodes[0],
			newV = newView.__nodes[0],
			p = targetView.__nodes[0].parentNode;
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
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
		var targetV = targetView.__nodes[0],
			newV = newView.__nodes[0],
			p = targetView.__nodes[0].parentNode;
		var last = p.lastChild;
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}

		if(last == targetV){
			p.appendChild(fragment);
		}else{
			var next = targetView.__nodes[targetView.__nodes.length-1].nextSibling;
			p.insertBefore(fragment,next);
		}
	}

	/**
	 * 在指定视图内插入视图，并插入到最后位置
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.append = function(newView,targetView){
		var newV = newView.__nodes[0],
			p = targetView.__nodes[0];
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}

		p.appendChild(fragment);
	}

	/**
	 * 在指定视图内插入视图，并插入到最前位置
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.prepend = function(newView,targetView){
		var newV = newView.__nodes[0],
			p = targetView.__nodes[0];
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}

		p.insertBefore(fragment,p.firstChild);
	}

	/**
	 * 创建一个占位视图
	 * <br/>在DOM中表现为注释元素
	 * @param  {string} content 占位内容
	 * @return {View} 新视图
	 */
	this.createPlaceholder = function(content){
		return new View(null,null,[document.createComment(content)]);
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
 * 		<li>onDestroy：当指令被销毁时触发</li>
 * 	</ul>
 * </p>
 * @class 
 */
function Directive (name,value) {
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
	 * 指令所在的目标视图
	 */
	this.view;

	/**
	 * 是否终结<br/>
	 * 终结指令会告诉扫描器不对该组件的内部进行扫描，包括表达式，指令，子组件都不会生成<br/>
	 * *该属性与$endTag冲突，并会优先匹配
	 * @type {Boolean}
	 * @default false
	 */
	this.final = false;
	/**
	 * 范围结束标记，用来标识一个范围指令的终结属性名<br/>
	 * 如果设置了该标识，那么从当前指令开始到结束标识结束形成的范围，扫描器都不对内部进行扫描，包括表达式，指令，子组件都不会生成<br/>
	 * *该标记必须加在与当前指令同级别的元素上<br/>
	 * *该属性与$final冲突
	 * @type {String}
	 * @default null
	 */
	this.endTag = null;
	/**
	 * 指令优先级用于定义同类指令的执行顺序。最大999
	 * @type {Number}
	 */
	this.priority = 0;
}
Util.ext(Directive.prototype,{
	init:function(){
		if(this.__state == Component.state.inited){
			return;
		}
		//预处理自定义标签中的表达式
		var expNode = Scanner.getExpNode(this.value,this.component);
		var calcVal = expNode && Renderer.calcExpNode(expNode);
		if(calcVal)this.value = calcVal;

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

		this.onActive && this.onActive();

	},
	/**
	 * 销毁指令
	 */
	destroy:function(){
		LOGGER.log(this,'destroy');

		this.view.__destroy(this);

		this.view = 
		this.component = 
		this.params = 
		this.filter = 
		this.onUpdate = null;

		this.onDestroy && this.onDestroy();
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
}
var TESTNODE;
function Transition (type,target,hook) {
    if(!TESTNODE){
        TESTNODE = document.createElement('div');
        document.body.appendChild(TESTNODE);
    }

    if(!hook || hook.css !== false){
        TESTNODE.className = (type + '-transition');
        TESTNODE.style.left = '-9999px';
        var cs = window.getComputedStyle(TESTNODE,null);
        var durations = cs['transition-duration'].split(',');
        var delay = cs['transition-delay'].split(',');
        var max = -1;
        for(var i=durations.length;i--;){
            var du = parseFloat(durations[i]);
            var de = parseFloat(delay[i]);
            if(du+de > max)max = du+de;
        }

        if(max > 0){
            var v = target.view;
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
            v.addClass(type + '-transition');
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

		if(this.__css)
        	this.__view.addClass(this.__type + '-enter');
        //exec...
        if(this.__direct.enter){
        	this.__direct.enter();
        }
        if(this.__hook.enter){
        	this.__hook.enter.call(this.__direct,this.__enterDone.bind(this));
        }
        if(this.__css){
        	this.__view.el.offsetHeight;
        	this.__view.removeClass(this.__type + '-enter');
        }
	},
	__enterDone:function(){
		
	},
	leave:function(){
		this.__start = 'leave';

		if(this.__css)
        	this.__view.addClass(this.__type + '-leave');
        //exec...
        if(this.__hook.leave){
        	this.__leaveDone.__trans = this;
        	this.__hook.leave.call(this.__direct,this.__leaveDone.bind(this));
        }
	},
	__leaveDone:function(){
		if(this.__direct.leave){
        	this.__direct.leave();
        }
	},
	__done:function(e){
		if(e.elapsedTime < this.__longest)return;
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
        this.__view.removeClass(this.__type + '-leave');
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

		var data = param.data;
		delete param.data;

		var props = {};
		
		if(typeof param == 'string'){
			data = param;
		}else{
			Util.ext(props,param);
		}

		//re register
		if(this.types[type]){
			this.types[type].data = data;
			this.types[type].props = props;
			return;
		}
		var clazz = new Function("clazz","var args=[];for(var i=1;i<arguments.length;i++)args.push(arguments[i]);clazz.apply(this,args)");
		Util.inherits(clazz,this.baseClass);

		this.types[type] = {clazz:clazz,props:props,services:services,data:data};
	},
	/**
	 * 是否存在指定类型
	 * @return {Boolean} 
	 */
	hasTypeOf : function(type){
		return type in this.types;
	},
	//子类调用
	createCbk : function(comp,type){
		if(comp.onCreate){
			//inject
			var services = null;
			if(this.types[type].services){
				services = [];
				for(var i=0;i<this.types[type].services.length;i++){
					var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],comp);
					services.push(serv);
				}
			}
			
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
				view.__placeholder = view.__target = target;
			}
		}else{
			view = element;
			if(Util.isDOM(element)){
				view = new View(element,null,[element]);
			}
		}
		
		var rs = new this.baseClass(view);

		var props = arguments[2];
		if(props){
			Util.ext(rs,props);
		}

		if(rs.events){
			for(var k in rs.events){
				rs.on(k,rs.events[k]);
			}
		}
		rs.view.__comp = rs;
		
		return rs;
	},
	/**
	 * 创建指定类型组件实例
	 * @param  {String} type       		组件类型
	 * @param  {HTMLElement} target  	组件应用节点
	 * @param  {HTMLElement} placeholder 用于替换组件的占位符
	 * @return {Component}            
	 */
	newInstanceOf : function(type,target,placeholder){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass);
		rs.name = type;
		rs.view = new View(null,target,null,placeholder);
		var data = this.types[type].data;
		if(typeof data == 'string'){
			rs.__url = data;
		}
		rs.view.__comp = rs;

		this._super.createCbk.call(this,rs,type);

		return rs;
	},
	initInstanceOf : function(ins){
		var type = ins.name;
		if(!this.types[type])return null;
		
		Util.ext(ins,this.types[type].props);
		var data = this.types[type].data;
		if(data){
			Util.ext(ins.data,data);
		}

		if(ins.events){
			for(var k in ins.events){
				ins.on(k,ins.events[k]);
			}
		}
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
		return !!this.types[type].props.final;
	},
	/**
	 * 获取指定类型指令的范围结束标记
	 * @param  {[type]}  type 指令名
	 * @return {string} 
	 */
	hasEndTag : function(type){
		return this.types[type].props.endTag;
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

		if(node.__impex__view){
			rs.view = node.__impex__view;
		}else{
			var el = node,nodes = [node];
			if(Util.isArray(node)){
				nodes = node;
				el = node.length>1?null:node[0];
			}
			rs.view = new View(el,null,nodes);
			node.__impex__view = rs.view;
		}

		if(params){
			rs.params = params;
		}
		if(filter){
			rs.filter = filter;
		}

		rs.view.__comp = component;

		component.directives.push(rs);
		rs.component = component;

		if(rs.view){
			rs.view.__nodes[0].removeAttribute(rs.name);
			if(rs.endTag){
                var lastNode = rs.view.__nodes[rs.view.__nodes.length-1];
                lastNode.removeAttribute(CMD_PREFIX+rs.endTag);
            }
		}

		if(rs.events){
			for(var k in rs.events){
				rs.on(k,rs.events[k]);
			}
		}
		
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
		REG_TMPL_EXP = /\{\{=(.*?)\}\}/img,
		REG_CMD = /x-.*/;
	var ATTR_REF_TAG = 'ref';
	var ATTR_ANONY_COMP_PROP_PREFIX = 'props:';

	var EXP2HTML_EXP_TAG = '#';
	var EXP2HTML_START_EXP = /^\s*#/;
	var FILTER_EXP = /=>\s*(.+?)$/;
	var FILTER_EXP_START_TAG = '=>';
	var LOGGER = {
	    log : function(){},
	    debug : function(){},
	    error : function(){},
	    warn : function(){}
	};

	var im_counter = 0;

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
	        v:[0,30,0],
	        state:'beta2',
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
			REG_TMPL_EXP = new RegExp(EXP_START_TAG+'=(.*?)'+EXP_END_TAG,'img');

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
			if(typeof(param)!='string' && !param.template && !param.templateURL){
				LOGGER.error("can not find property 'template' or 'templateURL' of component '"+name+"'");
				return;
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
		 * @param  {String} viewId template id
		 */
		this.unitTest = function(viewId){
			window.onload = function(){
	            'use strict';
	            var model = document.querySelector('script[type="javascript/impex-component"]');
	            model = window.eval(model.innerText);
	            var test = document.getElementById(viewId);
	            document.body.innerHTML += test.innerHTML;
	            impex.render(document.body,model);
	        }
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
			var comp = ComponentFactory.newInstanceOf(name,element);
			if(!comp){
				topComponentNodes.push(element);
				comp = ComponentFactory.newInstance(element,null,param);
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

		Object.defineProperty(this,'_cs',{enumerable: false,writable: true,value:{}});


		this.logger = LOGGER;
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
        final:true
    })
    /**
     * 绑定视图事件，以参数指定事件类型，用于减少单一事件指令书写
     * <br/>使用方式1：<img x-on:load:mousedown:touchstart="hi()" x-on:dblclick="hello()">
     * <br/>使用方式2：<img :load:mousedown:touchstart="hi()" :dblclick="hello()">
     */
    .directive('on',{
        onInit:function(){
            for(var i=this.params.length;i--;){
                this.view.on(this.params[i],this.value);
            }
        }
    })
    /**
     * 文本指令，用于防止表达式被渲染前出现在页面上的边界符
     * <br/>使用方式1：<span x-text="msg"></span>
     */
    .directive('text',{
        onUpdate:function(rs){
            this.view.el.innerText = rs;
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
                this.view.attr(p,rs);
            }
            
        }
    })
    /**
     * 控制视图显示指令，根据表达式计算结果控制
     * <br/>使用方式：<div x-show="exp"></div>
     */
    .directive('show',{
        onCreate:function(ts){
            var transition = this.view.attr('transition');
            if(transition !== null){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.exec(false);
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
        leave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                //显示
                this.view.show();
            }else{
                // 隐藏
                this.view.hide();
            }
        }
    },['Transitions'])
    /**
     * x-show的范围版本
     */
    .directive('show-start',{
        endTag : 'show-end',
        onInit:function(){
            //更新视图
            Scanner.scan(this.view,this.component);
        },
        onUpdate : function(rs){
            if(this.component.__state === Component.state.suspend)return;
            var nodes = this.view.__nodes;
            if(rs){
                //显示
                for(var i=nodes.length;i--;){
                    if(nodes[i].style)nodes[i].style.display = '';
                }
            }else{
                // 隐藏
                for(var i=nodes.length;i--;){
                    if(nodes[i].style)nodes[i].style.display = 'none';
                }
            }
        }
    })
    /**
     * 效果与show相同，但是会移除视图
     * <br/>使用方式：<div x-if="exp"></div>
     */
    .directive('if',{
        onCreate:function(viewManager,ts){
            this.viewManager = viewManager;
            this.placeholder = viewManager.createPlaceholder('-- directive [if] placeholder --');

            var transition = this.view.attr('transition');
            if(transition !== null){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.exec(false);
        },
        onUpdate : function(rs){
            if(this.component.__state === Component.state.suspend)return;
            if(rs === this.lastRs && !this.view.el.parentNode)return;
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
        leave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                if(this.view.el.parentNode)return;
                //添加
                this.viewManager.replace(this.view,this.placeholder);
            }else{
                if(!this.view.el.parentNode)return;
                //删除
                this.viewManager.replace(this.placeholder,this.view);
            }
        }
    },['ViewManager','Transitions'])
    /**
     * x-if的范围版本
     * <br/>使用方式：<div x-if-start="exp"></div>...<div x-if-end></div>
     */
    .directive('if-start',{
        endTag : 'if-end',
        onCreate:function(viewManager){
            this.viewManager = viewManager;
            this.placeholder = viewManager.createPlaceholder('-- directive [if] placeholder --');
        },
        onInit:function(){
            Scanner.scan(this.view,this.component);
        },
        onUpdate : function(rs){
            if(this.component.__state === Component.state.suspend)return;
            if(rs){
                if(this.view.__nodes[0].parentNode)return;
                //添加
                this.viewManager.replace(this.view,this.placeholder);
            }else{
                if(!this.view.__nodes[0].parentNode)return;
                //删除
                this.viewManager.replace(this.placeholder,this.view);
            }
        }
    },['ViewManager'])
    /**
     * 用于屏蔽视图初始时的表达式原始样式，需要配合class使用
     */
    .directive('cloak',{
        onCreate:function(){
            var className = this.view.attr('class');
            if(!className){
                LOGGER.warn("can not find attribute[class] of element["+this.view.name+"] which directive[cloak] on");
                return;
            }
            className = className.replace('x-cloak','');
            
            this.__cn = className;
        },
        onActive:function(){
            updateCloakAttr(this.component,this.view.el,this.__cn);
            var curr = this.view.attr('class').replace('x-cloak','');
            this.view.attr('class',curr);
        }
    })

    ///////////////////// 模型控制指令 /////////////////////
    /**
     * 绑定模型属性，当控件修改值后，模型值也会修改
     * <br/>使用方式：<input x-model="model.prop">
     */
    .directive('model',{
        onCreate:function(){
            var el = this.view.el;
            this.toNum = el.getAttribute('number');
            this.debounce = el.getAttribute('debounce')>>0;

            switch(el.nodeName.toLowerCase()){
                case 'textarea':
                case 'input':
                    var type = this.view.attr('type');
                    switch(type){
                        case 'radio':
                            this.view.on('click',null,this.changeModel.bind(this));
                            break;
                        case 'checkbox':
                            this.view.on('click',null,this.changeModelCheck.bind(this));
                            break;
                        default:
                            var hack = document.body.onpropertychange===null?'propertychange':'input';
                            this.view.on(hack,null,this.changeModel.bind(this));
                    }
                    
                    break;
                case 'select':
                    var mul = el.getAttribute('multiple');
                    if(mul !== null){
                        this.view.on('change',null,this.changeModelSelect.bind(this));
                    }else{
                        this.view.on('change',null,this.changeModel.bind(this));
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
            this.component.d(this.value,parts);
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
        this.onCreate = function(viewManager,ts){
            this.eachExp = /^(.+?)\s+as\s+((?:[a-zA-Z0-9_$]+?\s*,)?\s*[a-zA-Z0-9_$]+?)\s*(?:=>\s*(.+?))?$/;
            this.forExp = /^\s*(\d+|[a-zA-Z_$](.+)?)\s+to\s+(\d+|[a-zA-Z_$](.+)?)\s*$/;
            this.viewManager = viewManager;
            this.fragment = document.createDocumentFragment();
            this.expInfo = this.parseExp(this.value);
            this.__view = this.view;
            this.cache = [];
            this.__comp = this.component;

            if(this.view.el){
                this.__tagName = this.view.el.tagName.toLowerCase();
                this.__isComp = ComponentFactory.hasTypeOf(this.__tagName);
                this.cacheable = this.view.attr('cache')==='false'?false:true;
            }else{
                this.cacheable = this.view.__nodes[0].getAttribute('cache')==='false'?false:true;
            }

            this.subComponents = [];//子组件，用于快速更新each视图，提高性能

            this.cacheSize = 20;

            this.step = this.view.el?this.view.attr('step'):this.view.__nodes[0].getAttribute('step');

            this.over = this.view.el?this.view.attr('over'):this.view.__nodes[0].getAttribute('over');

            var transition = this.view.el?this.view.attr('transition'):this.view.__nodes[0].getAttribute('transition');
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
                    this.component.watch(begin,function(object,name,type,newVal,oldVal){
                        var ds = getForDs(newVal>>0,end,step);
                        that.lastDS = ds;
                        that.rebuild(ds,that.expInfo.k,that.expInfo.v);
                    });
                    begin = this.component.d(begin);
                }
                if(isNaN(end)){
                    this.component.watch(end,function(object,name,type,newVal,oldVal){
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
                this.component.watch(this.expInfo.ds,function(object,name,type,newVal){
                    if(!that.ds){
                        that.ds = that.component.d(that.expInfo.ds);
                        that.lastDS = that.ds;
                        that.build(that.ds,that.expInfo.k,that.expInfo.v);
                        return;
                    }

                    that.lastDS = Util.isArray(newVal)?newVal:object;
                    that.rebuild(that.lastDS,that.expInfo.k,that.expInfo.v);
                });
            }

            if(this.over){
                var tmp = lexer(this.over);
                var rs = Renderer.evalExp(this.__comp,tmp);
                this.over = rs;
            }            
            
            this.lastDS = this.ds;
            
            this.placeholder = this.viewManager.createPlaceholder('-- directive [each] placeholder --');
            this.viewManager.insertBefore(this.placeholder,this.view);

            this.fragmentPlaceholder = this.viewManager.createPlaceholder('-- fragment placeholder --');
            
            this.fragment.appendChild(this.fragmentPlaceholder.__nodes[0]);

            //parse props
            this.__props = parseProps(this.__view,this.component);

            if(this.ds)
                this.build(this.ds,this.expInfo.k,this.expInfo.v);
            //更新视图
            this.destroy();
        }
        function parseProps(view,comp){
            var props = {};
            var el = view.__nodes[0];
            for(var i=el.attributes.length;i--;){
                var attr = el.attributes[i];
                var k = attr.nodeName;
                var v = attr.nodeValue;
                if(k.indexOf(ATTR_ANONY_COMP_PROP_PREFIX)===0){
                    var propName = k.replace(ATTR_ANONY_COMP_PROP_PREFIX,'');
                    var tmp = lexer(v);
                    var rs = Renderer.evalExp(comp,tmp);
                    var keys = Object.keys(tmp.varTree);

                    props[propName] = [tmp,rs,keys];
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
            
            var diffSize = ds.length - this.subComponents.length;

            if(diffSize < 0){
                var tmp = this.subComponents.splice(0,diffSize*-1);
                if(this.cache.length < this.cacheSize){
                    for(var i=tmp.length;i--;){
                        this.cache.push(tmp[i]);
                    }
                    for(var i=this.cache.length;i--;){
                        if(this.trans && !this.cache[i].__leaving && this.cache[i].__state === 'displayed'){
                            this.cache[i].__leaving = true;
                            this.cache[i].transition.leave();
                        }else{
                            this.cache[i].suspend(false);
                        }
                    }
                }else{
                    for(var i=tmp.length;i--;){
                        tmp[i].destroy();
                    }
                }
            }else if(diffSize > 0){
                var restSize = diffSize;
                if(this.cacheable){
                    var tmp = this.cache.splice(0,diffSize);
                    for(var i=0;i<tmp.length;i++){
                        this.subComponents.push(tmp[i]);
                        this.viewManager.insertBefore(tmp[i].view,this.placeholder);
                    }
                    var restSize = diffSize - tmp.length;
                }
                
                while(restSize--){
                    this.createSubComp();
                }
            }

            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;

                var subComp = this.subComponents[index];

                //模型
                var v = ds[k];
                if(ds[k] && ds[k].__im__origin){
                    v = ds[k].__im__origin;

                    ds[k].__im__origin = null;
                    delete ds[k].__im__origin;
                }

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
                
                var data = subComp.data.__im__target || subComp.data;

                data[vi] = v;
                data['$index'] = index++;
                if(ki)data[ki] = isIntK?k>>0:k;

                // var isSuspend = subComp.__state === "suspend"?true:false;
                if(subComp.__state === Component.state.created){
                    subComp.init();
                }
                subComp.display();
                if(subComp.__state === "displayed")
                    Renderer.recurRender(subComp);
                
                // isSuspend &&　Builder.build(subComp);
                onDisplay(subComp);
            }
        }
        function onDisplay(comp){
            for(var i=0;i<comp.children.length;i++){
                var sub = comp.children[i];
                if(sub.onDisplay)
                    sub.onDisplay();
                if(sub.children.length > 0){
                    onDisplay(sub);
                }
            }
        }
        this.createSubComp = function(){
            var comp = this.__comp;
            var subComp = null;
            var target = this.viewManager.createPlaceholder('');
            this.viewManager.insertBefore(target,this.placeholder);
            //视图
            var copy = this.__view.clone();

            //创建子组件
            if(this.__isComp){
                subComp = comp.createSubComponentOf(this.__tagName,copy,target);
            }else{
                subComp = comp.createSubComponent(copy,target);
            }
            this.subComponents.push(subComp);

            //bind props
            for(var n in this.__props){
                var prop = this.__props[n];
                var tmp = prop[0];
                var rs = prop[1];
                var keys = prop[2];
                //watch props
                keys.forEach(function(key){
                    if(tmp.varTree[key].isFunc)return;
                    var fromPropKey = false;
                    if(key.indexOf('.this.props')===0){
                        fromPropKey = key.replace(/^\.this\.props\.?/,'');
                    }

                    
                    var prop = new Prop(subComp,n,tmp.varTree[key].segments,tmp,rs,fromPropKey);
                    comp.__watchProps.push(prop);
                });
                subComp.props[n] = rs;
            }
            
            if(this.trans){
                var that = this;
                
                subComp.onInit = function(){
                    if(!this.transition){
                        this.transition = that.ts.get(that.trans,this);
                    }
                };
                subComp.onDisplay = function(){
                    this.transition.enter();
                };
                subComp.leave = function(){
                    this.suspend(false);
                    this.__leaving = false;
                }
            }
                
            return subComp;
        }
        function clone(obj,ref){
            if(obj === null)return null;
            var rs = obj;
            if(obj instanceof Array){
                rs = obj.concat();
                for(var i=rs.length;i--;){
                    rs[i] = clone(rs[i],ref);
                }
            }else if(Util.isObject(obj)){
                rs = {};
                var ks = Object.keys(obj);
                if(ks.length>0){
                    var r = ref ===false ? false : !obj.__im__origin;
                    for(var i=ks.length;i--;){
                        var k = ks[i],
                            v = obj[k];
                        if(k.indexOf('__im__')===0)continue;
                        rs[k] = typeof obj[k]==='object'? clone(obj[k],r): obj[k];
                    }
                }

                if(ref !== false && !rs.__im__origin)
                    rs.__im__origin = obj;
            }
            return rs;
        }
        this.doFilter = function(rs){
            if(!this.filters)return rs;
            var filters = this.filters;
            if(Object.keys(filters).length > 0){
                if(rs && Util.isObject(rs)){
                    rs = clone(rs);
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

            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;

                var subComp = this.createSubComp();
                
                //模型
                var v = ds[k];
                if(ds[k] && ds[k].__im__origin){
                    v = ds[k].__im__origin;

                    ds[k].__im__origin = null;
                    delete ds[k].__im__origin;
                }

                //k,index,each
                if(typeof v === 'object'){
                    v.__im__extPropChain.push([this,vi,index]);
                }

                var data = subComp.data.__im__target || subComp.data;

                data[vi] = v;
                data['$index'] = index++;
                if(ki)data[ki] = isIntK?k>>0:k;
            }

            //初始化组件
            for(var i=this.subComponents.length;i--;){
                this.subComponents[i].init();
                this.subComponents[i].__state = Component.state.displayed;
            }

            var queue = this.subComponents.concat();
            renderEach(queue,this);
        }
        function renderEach(queue,eachObj){
            setTimeout(function(){
                var list = queue.splice(0,50);
                for(var i=0;i<list.length;i++){
                    if(list[i].__state === Component.state.suspend)continue;
                    list[i].__state = Component.state.inited;
                    list[i].display();
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
        this.over = function(){
            alert('sdfdsf')
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
    each.priority = 999;
    /**
     * each指令用于根据数据源，动态生成列表视图。数据源可以是数组或者对象
     * <br/>使用方式：
     * <br/> &lt;li x-each="datasource as k , v"&gt;{{k}} {{v}}&lt;/li&gt;
     * <br/> &lt;li x-each="datasource as v"&gt;{{v}}&lt;/li&gt;
     * 
     * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
     */
    impex.directive('each',each,['ViewManager','Transitions']);


    var eachStart = new eachModel();
    eachStart.endTag = 'each-end';
    eachStart.priority = 999;
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

 	if ( typeof module === "object" && typeof module.exports === "object" ) {
 		module.exports = impex;
 	}else{
 		global.impex = impex;
 	}

 }(window||this);