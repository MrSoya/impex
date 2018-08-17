/*
 * impexjs is a powerful web application engine to build 
 * reactive webUI system
 *
 *
 * Copyright 2015-2018 MrSoya and other contributors
 * Released under the MIT license
 *
 * website: http://impexjs.org
 * last build: 2018-8-16
 */
!function (global) {
	'use strict';
/**
 * utils
 */
    function ext(from,to){
        var keys = Object.keys(from);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            to[k] = from[k];
        }
    }
    function isObject(obj){
        return typeof(obj) === 'object' && obj !== null;
    }
    function isArray(obj){
        return obj instanceof Array;
    }
    function isString(obj){
        return typeof obj === 'string';
    }
    function isUndefined(obj){
        return obj === undefined;
    }
    function isFunction(obj){
        return obj instanceof Function;
    }
    function onload(){
        if(this.status===0 || //local
        ((this.status >= 200 && this.status <300) || this.status === 304) ){
            var txt = this.responseText;
            var obj = requirements[this.url];
            var cbks = obj.cbks;
            var name = obj.name;

            txt.match(/<\s*template[^<>]*>([\s\S]*)<\s*\/\s*template\s*>/img)[0];
            var tmpl = RegExp.$1;
            var css = '';
            tmpl = tmpl.replace(/<\s*style[^<>]*>([\s\S]*?)<\s*\/\s*style\s*>/img,function(a,b){
                css += b;
                return '';
            });

            txt.match(/<\s*script[^<>]*>([\s\S]*?)<\s*\/\s*script\s*>/img)[0];
            var modelStr = RegExp.$1;
            
            var model = new Function('return ('+modelStr+')')();
            model = model();
            model.template = tmpl.trim();
            
            var url = this.url;
            cbks.forEach(function(cbk){
                cbk(model,css.trim());
            });
            requirements[this.url] = null;
        }
    }

    var requirements = {};
    function loadComponent(name,url,cbk,timeout){
        if(!requirements[url]){
            requirements[url] = {name:name,cbks:[]};
            requirements[url].cbks.push(cbk);
        }else{
            requirements[url].cbks.push(cbk);
            return;
        }        

        var xhr = new XMLHttpRequest();
        xhr.open('get',url,true);
        if(xhr.onload === null){
            xhr.onload = onload;
        }else{
            xhr.onreadystatechange = onload;
        }
        xhr.url = url;
        xhr.send(null);
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

			var t = isArray(data)?[]:{};
			for(var k in data){
				var o = data[k];
				if(isObject(o)){
					var pcs = propChains.concat();
					pcs.push(k);
					var tmp = observeData(handler,pcs,o,component);
					t[k] = tmp;
				}else{
					t[k] = o;
				}
			}
			Object.defineProperty(t,'__im__propChain',{enumerable: false,writable: false,value:propChains});
			
			var p = new Proxy(t, handler);
			
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
				    get: function(target, name){
				    	if(g_computedState){
				    		var comp = this.comp;
				    		if(comp instanceof Component){
				    			var deps = comp.__dependence[name];
					    		if(!deps){
					    			deps = comp.__dependence[name] = [];
					    		}
					    		if(deps instanceof Array)deps.push(g_computedState);
				    		}else 	    		
				    		//store
				    		if(impex.Store){
				    			var notices = comp.__noticeMap[name];
				    			if(!notices){
				    				notices = comp.__noticeMap[name] = [];
				    			}
				    			notices.push([g_computedComp,g_computedState]);
				    		}
				    	}
				        return target[name];
				    },
				    set: function(target,name,value) {
				    	var isAdd = !(name in target);

				    	var old = target[name];
				    	var v = value;
				    	if(old === v)return true;

				    	var comp = this.comp;

				    	//computedState setter
				    	if(comp.computedState && comp.computedState[name]){
				    		var setter = comp.computedState[name].set;
				    		if(setter instanceof Function){
				    			setter.call(comp,v);
				    		}
				    	}

				    	if(isObject(v)){
				    		var pcs = target.__im__propChain.concat();
							pcs.push(name);
				    		v = observeData(this,pcs,v,comp);
				    	}
				    	if(isArray(target)){
				    		setArray(target,name,v);
				    	}else{
					    	target[name] = v;
				    	}

				    	//check computedstate
				    	if(comp.__dependence && comp.__dependence[name]){
				    		comp.__dependence[name].forEach(function(k) {
				    			var nv = comp.computedState[k].call(comp);
				    			comp.state[k] = nv;
				    		});
				    	}else 
				    	//store
			    		if(impex.Store && comp.__noticeMap && comp.__noticeMap[name]){
			    			comp.__noticeMap[name].forEach(function(pair) {
			    				var target = pair[0];
			    				var k = pair[1];
			    				var getter = target.computedState[k].get || target.computedState[k];
				    			var nv = getter.call(target);
				    			target.state[k] = nv;
				    		});
			    		}

				    	var path = target.__im__propChain;

				    	var changeObj = {action:comp.__action,object:target,name:name,pc:path,oldVal:old,newVal:v,comp:this.comp,type:isAdd?'add':'update'};

				    	ChangeHandler.handle(changeObj);
				    	
				    	return true;
				    },
				    deleteProperty: function (target, name) {
				    	var old = target[name];

					    if(isArray(target)){
				    		delArray(target,name);
				    	}else{
				    		delete target[name];
				    	}

					    var path = target.__im__propChain;

					    var changeObj = {object:target,name:name,pc:path,oldVal:old,comp:this.comp,type:'delete'};
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
			if(isObject(v)){
	    		var pcs = this.__im__propChain.concat();
				pcs.push(k);
	    		v = observeData(pcs,v,this.__im__comp);
	    	}
			this.__im__innerProps[k] = v;

			var path = this.__im__propChain;
	    	
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
			
			var t = isArray(data)?[]:{};

			Object.defineProperty(t,'__im__innerProps',{enumerable: false,writable: true,value:{}});
			var props = {};

			var observeObj = {};
			for(var k in data){
				if(!data.hasOwnProperty(k))continue;

				var o = data[k];			
				if(isObject(o)){
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
				if(isObject(oo)){
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
		    	var comp = target.__im__comp;
		    	var old = change.oldVal;
		    	var v = change.newVal;
		    	var type = change.type;
		    	var snap = change.snap;

		    	if(type === 'add'){
		    		snap[name] = v;
		    		target.__im__innerProps[name] = v;
		    		if(isObject(v)){
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
		    		if(isObject(obj)){
		    			clearObserve(obj);
		    		}
		    		delete snap[name];
		    	}else if(!fromSetter){
		    		console.log('无效update')
		    		continue;
		    	}

		    	var changeObj = {object:target,name:name,pc:path,oldVal:old,newVal:v,comp:comp,type:type};
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
function pNode(type,tag,txtQ){
    this.type = type;//1 node 3 text
    this.tag = tag;
    this.txtQ = txtQ;
    this.children = [];
    this.attrNodes = {};
    this.slotMap = {};
}
function pNodeAttr(name,directive){
    this.value;
    this.name = name;
    this.directive = directive;
}

var vn_counter = 0;
/**
 * 虚拟节点
 */
function VNode(tag,attrNodes,directives){
    this.tag = tag;
    this.txt;
    this.children;
    this.vid = vn_counter++;
    this.attrNodes = attrNodes;
    this._directives = directives;
    this._comp;//组件
    this.dom;
    this._forScopeQ;
    this._slotMap;
    this._hasEvent;
}
VNode.prototype = {
    /**
     * 绑定事件到该节点
     * @param {String} type 事件类型
     * @param {String|Function} exp 表达式或回调函数
     */
    on:function(type,exp){
        var evMap = EVENT_MAP[type];
        if(!evMap){
            evMap = EVENT_MAP[type] = {};
        }
        var fn = false;
        if(isFunction(exp)){
            fn = true;
        }
        if(fn){
            evMap[this.vid] = [this,exp,this._cid,fn];
        }else{
            var declare = this.getAttribute('var');
            if(declare){
                var list = declare.replace(/^{|}$/mg,'').split(',');
                var str = '';
                list.forEach(function(de) {
                    var pair = de.split(':');
                    str += 'var '+ pair[0] +'='+pair[1]+';';
                });
                declare = str;
            }            
            var forScopeStart = '',forScopeEnd = '';
            if(this._forScopeQ)
                for(var i=0;i<this._forScopeQ.length;i++){
                    forScopeStart += 'with(arguments['+(4/* Delegator.js line 29 */+i)+']){';
                    forScopeEnd += '}';
                }
            evMap[this.vid] = [this,new Function('comp,state,$event,$vnode','with(comp){with(state){'+forScopeStart+declare+";"+exp+forScopeEnd+'}}'),this._cid];
        }

        this._hasEvent = true;
    },
    /**
     * 卸载事件
     * @param {String} [type] 事件类型。为空时，卸载所有事件
     */
    off:function(type){
        var evMap = EVENT_MAP[type];
        if(evMap){
            evMap[this.vid] = null;
        }else if(!type){
            for(var k in EVENT_MAP){
                evMap = EVENT_MAP[k];
                if(evMap)evMap[this.vid] = null;
            }
        }
    },
    setAttribute:function(k,v){
        this.attrNodes[k] = v;
        return this;
    },
    getAttribute:function(k){
        return this.attrNodes[k];
    }
};


/**
 * funcs for build VNode
 */
function createElement(comp,tag,props,directives,children,html,forScopeAry){
    var rs = new VNode(tag,props,directives);
    rs._isEl = true;
    if(forScopeAry.length>0)
        rs._forScopeQ = forScopeAry;
    if (COMP_MAP[tag] || tag == 'component') {
        rs._comp = true;
        var slotData = children[0];
        if(slotData){
            rs._slots = slotData[0];
            rs._slotMap = slotData[1];     
        }
        return rs;
    }
    if(html != null){
        var forScopeStart = '',forScopeEnd = '';
        var root,str;
        var args = [comp,comp.state,createElement,createTemplate,createText,createElementList,doFilter];
        //build for scope
        var scopeAry = [];
        var argCount = args.length;
        if(rs._forScopeQ)
            for(var i=0;i<rs._forScopeQ.length;i++){
                var tmp = 'forScope'+FORSCOPE_COUNT++;
                forScopeStart += 'with('+tmp+'){';
                forScopeEnd += '}';
                args.push(rs._forScopeQ[i]);
                scopeAry.push(tmp);
            }

        str = compileVDOMStr('<'+tag+'>'+html+'</'+tag+'>',comp,scopeAry);

        var argStr = scopeAry.length>0?','+scopeAry.toString():'';
        
        var fn = new Function('comp,state,_ce,_tmp,_ct,_li,_fi'+argStr,'with(comp){with(state){'+forScopeStart+'return '+str+';'+forScopeEnd+'}}');
        root = fn.apply(comp,args);
        children = root.children || [];
    }
    
    if(children.length>0){
        rs.children = [];
        children.forEach(function(node){
            if(node){
                if(node instanceof Array){
                    node.forEach(function(c){
                        c.parent = rs;
                        rs.children.push(c);
                    });
                }else{
                    node.parent = rs;
                    rs.children.push(node);
                }//end if
            }//end if
        });
    }
    
    return rs;
}
function createTemplate(children,forScope){
    var fsq = null;
    if(forScope)
        fsq = [forScope];
    var rs = [];
    if(children.length>0){
        children.forEach(function(node){
            if(node){
                if(node instanceof Array){
                    node.forEach(function(c){
                        rs.push(c);
                        if(fsq){
                            var cfsq = c._forScopeQ;
                            if(cfsq){
                                c._forScopeQ = fsq.concat(cfsq);
                            }else{
                                c._forScopeQ = fsq;
                            }
                        }
                    });
                }else{
                    rs.push(node);
                    if(fsq){
                        var cfsq = node._forScopeQ;
                        if(cfsq){
                            node._forScopeQ = fsq.concat(cfsq);
                        }else{
                            node._forScopeQ = fsq;
                        }
                    }
                }//end if
            }//end if
        });
    }
    
    return rs;
}
function createText(txt){
    var rs = new VNode();
    rs.txt = txt && txt.toString?txt.toString():txt;
    return rs;
}
function createElementList(ds,iterator,scope,k,v){
    var rs = [];
    ds.forEach(function(item,i){
        var forScope = {$index:i};
        
        if(k)forScope[k] = i;
        forScope[v] = item;
        var tmp = iterator.call(scope,forScope);
        if(tmp){
            if(isArray(tmp)){
                rs = rs.concat(tmp);
            }else{
                rs.push(tmp);
            }
        }
    });
    return rs;
}
function doFilter(v,filters,comp){
    for(var i=0;i<filters.length;i++){
        var f = filters[i];
        var ins = FILTER_MAP[f[0]];
        var params = f[1];
        params.unshift(v);
        v = ins.apply(ins,params);
    }
    return v;
}
var VDOM_CACHE = [];
//解析属性名，如果是指令，返回指令name,参数
function isDirectiveVNode(attrName,comp,isCompNode){
    var rs = null;
    var params = null;
    var filter = null;
    if(REG_CMD.test(attrName)){
        var c = attrName.replace(CMD_PREFIX,'');
        var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
        if(CPDI > -1)c = c.substring(0,CPDI);
        rs = c;

        var i = attrName.indexOf(CMD_PARAM_DELIMITER);
        if(i > -1){
            params = attrName.substr(i+1);
        }

        switch(c){
            case 'if':case 'else':case 'for':case 'html':return c;
        }

        }else if(attrName[0] === EV_AB_PRIFX){
        rs = 'on';
        params = attrName.substr(1);
    }else if(attrName[0] === BIND_AB_PRIFX && !isCompNode){/* 区分指令参数和bind */
        rs = 'bind';
        params = attrName.substr(1);
    }

    if(params){
        var fi = params.indexOf(CMD_FILTER_DELIMITER);
        if(fi > -1){
            filter = params.substr(fi+1);
            params = params.substring(0,fi);
        }

        params = params.split(CMD_PARAM_DELIMITER);
    }

    return rs?[rs,params,filter]:rs;
}
//解析for语句：datasource，alias
//包括to和普通语法
function parseDirectFor(name,attrNode,compNode){
    if(name !== 'for')return false;

    var rs = null;//k,v,filters,ds1,ds2;
    var forExpStr = attrNode.exp[0];
    var filters = attrNode.exp[1];
    var alias = RegExp.$2;
    var kv = alias.split(',');
    var k = kv.length>1?kv[0]:null;
    var v = kv.length>1?kv[1]:kv[0];
    var ds = RegExp.$1;
    if(ds.match(/^([\s\S]*?)\s+to\s+([\s\S]*?)$/)){ 
        rs = [k,v,filters,RegExp.$1,RegExp.$2];
    }else{
        rs = [k,v,filters,ds];
    }
    return rs;
}
function parseDirectIf(name,attrNode){
    if(name !== 'if')return false;

    return attrNode.exp[0];
}
function parseDirectHTML(name,attrNode){
    if(name !== 'html')return false;

    return attrNode.exp[0];
}
function replaceGtLt(str){
    return str.replace(/&gt;/img,'>').replace(/&lt;/img,'<');
}

//https://www.w3.org/TR/html5/syntax.html#void-elements
var VOIDELS = ['br','hr','img','input','link','meta','area','base','col','embed','keygen','param','source','track','wbr'];
// var TAG_START_EXP = /^<([-a-z0-9]+)((?:\s+[a-zA-Z_:.][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(?:\/?)>/im;
var TAG_START_EXP = /<([-a-z0-9]+)((?:\s+[-a-zA-Z0-9_:.]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')))?)*)\s*(?:\/?)>/im;
var TAG_ATTR_EXP = /[a-zA-Z_:.][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?/img;
var TAG_END_EXP = /<\/([-a-z0-9]+)>/im;
var TAG_END_EXP_G = /<\/([-a-z0-9]+)>/img;

function parseHTML(str){
    var startNodeData = null;
    var endNodeData;
    var stack = [];
    var compStack = [];
    var roots = [];
    var slotList = [];
    var compNode;
    while(str.length>0){
        if(!startNodeData){
            startNodeData = TAG_START_EXP.exec(str);
            var index = startNodeData.index + startNodeData[0].length;
            str = str.substr(index);
        }
        //build pNode
        var tagName = startNodeData[1];
        var node = new pNode(1,tagName);
        var parentNode = stack[stack.length-1];
        if(parentNode){
            parentNode.children.push(node);
        }else{
            roots.push(node);
        }
        if(COMP_MAP[tagName]){
            compNode = node;
            compStack.push(node);
        }
        var attrStr = startNodeData[2].trim();
        var attrAry = attrStr.match(TAG_ATTR_EXP);
        if(attrAry)parseHTML_attrs(attrAry,node,compNode);

        //handle void el root
        if(str.length<1)break;

        //handle slot
        if(tagName === SLOT){
            slotList.push([parentNode,node,node.attrNodes.name?node.attrNodes.name.value:null]);
        }else if(node.attrNodes.slot){
            if(compNode)compNode.slotMap[node.attrNodes.slot.value] = node;
        }

        if(VOIDELS.indexOf(tagName)<0)stack.push(node);

        //check
        var nextNodeData = TAG_START_EXP.exec(str);
        if(nextNodeData){
            startNodeData = nextNodeData;
        }
        endNodeData = TAG_END_EXP.exec(str);
        var endIndex = endNodeData?endNodeData.index:-1;
        var nextIndex = nextNodeData?nextNodeData.index:-1;
        parentNode = stack[stack.length-1];
        if(nextIndex>-1 && nextIndex < endIndex){
            parseHTML_txt(str.substr(0,nextIndex),parentNode);

            str = str.substr(nextIndex + nextNodeData[0].length);
        }else{
            parseHTML_txt(str.substr(0,endIndex),parentNode);

            var lastEndIndex = endIndex + endNodeData[0].length;
            TAG_END_EXP_G.lastIndex = 0;
            TAG_END_EXP_G.exec(str);
            do{
                var tmp = stack.pop();
                if(tmp === compNode){
                    compStack.pop();
                    compNode = compStack[compStack.length-1];
                }
                if(stack.length<1)break;
                endNodeData = TAG_END_EXP_G.exec(str);
                endIndex = endNodeData.index;
                var txt = str.substring(lastEndIndex,endNodeData.index);
                if(txt.trim()){
                    if(endIndex>nextIndex){
                        var tmp = TAG_START_EXP.exec(txt);
                        if(tmp){
                            txt = txt.substr(0,tmp.index).trim();
                        }
                    }
                    if(txt.trim()){
                        node = stack[stack.length-1];
                        parseHTML_txt(txt,node);
                    }                    
                }
                lastEndIndex = endIndex + endNodeData[0].length;
            }while(endIndex < nextIndex);
            
            if(!nextNodeData)break;

            str = str.substr(nextIndex + nextNodeData[0].length);
        }
    }

    return [roots,slotList];
}
function parseHTML_attrs(attrs,node,compNode){
    for(var i=attrs.length;i--;){
        var attrStr = attrs[i];
        var splitIndex = attrStr.indexOf('=');
        var value=null,aName;
        if(splitIndex<0){
            aName = attrStr;
        }else{
            aName = attrStr.substring(0,splitIndex);
            value = attrStr.substring(splitIndex+2,attrStr.length-1);
        }
        var attrNode = new pNodeAttr(aName,isDirectiveVNode(aName,node,compNode && node == compNode));
        node.attrNodes[aName] = attrNode;
        attrNode.value = value;
        if(attrNode.directive){
            if(value){
                //convert
                value = value.replace(/&amp;/mg,'&');
                //handle filter
                var splitIndex = value.indexOf('=>');
                var expStr,filterStr;
                if(splitIndex<0){
                    expStr = value;
                }else{
                    expStr = value.substring(0,splitIndex);
                    filterStr = value.substring(splitIndex+2,value.length);
                }
                attrNode.exp = parseHTML_exp(expStr,filterStr);    
            }
            
            var tmp = null;
            var dName = attrNode.directive;
            if(dName === 'for' || dName === 'if' || dName === 'else' || dName === 'html'){
                if(tmp = parseDirectFor(dName,attrNode,compNode)){
                    node.for = tmp;
                }
                if(tmp = parseDirectIf(dName,attrNode)){
                    node.if = tmp;
                }
                if(tmp = parseDirectHTML(dName,attrNode)){
                    node.html = tmp;
                }
                if(dName === 'else'){
                    node.else = true;
                }
                node.attrNodes[attrNode.name] = null;
                delete node.attrNodes[attrNode.name];
            }
        }
    }
}
function parseHTML_txt(txt,node){
    txt = txt.trim();
    var txtQ = [];
    if(txt){
        var expData = null;
        var lastIndex = 0;
        while(expData = EXP_EXP.exec(txt)){
            var t = txt.substring(lastIndex,expData.index);
            if(t)txtQ.push(t);
            txtQ.push(parseHTML_exp(expData[1],expData[2],true));
            lastIndex = expData.index + expData[0].length;
        }
        if(lastIndex < txt.length){
            txtQ.push(txt.substr(lastIndex));
        }
        if(txtQ.length<1)txtQ.push(txt);
        var tn = new pNode(3,null,txtQ);
        node.children.push(tn);
    }
}
function parseHTML_exp(expStr,filterStr,isTxt){
    var rs = [];
    rs[0] = expStr.trim();
    if(isTxt)rs[0] = '('+rs[0]+')';
    var filterAry = [];
    if(filterStr){
        var filters = filterStr.split('|');
        for(var i=0;i<filters.length;i++){
            var parts = filters[i].split(':');
            filterAry.push({
                name:parts[0].trim(),
                param:parts.slice(1)
            });
        }
    }
    rs[1] = filterAry;
    return rs;
}

var FORSCOPE_COUNT = 0;
function buildEvalStr(pm,prevIfStr,forScopeAry){
    var str = '';
    if(pm.type === 1){
        var forScopeStr,forScopeChainStr;
        if(pm.for){
            forScopeStr = 'forScope'+FORSCOPE_COUNT++;
            forScopeAry = forScopeAry.concat(forScopeStr);
        }
        forScopeChainStr = '['+forScopeAry.toString()+']';

        var children = '';
        if(COMP_MAP[pm.tag]){
            children = JSON.stringify([pm.children,pm.slotMap]);
        }else{
            for(var i=0;i<pm.children.length;i++){
                var prevPm = pm.children[i-1];
                children += ','+buildEvalStr(pm.children[i],prevPm?prevPm.if:null,forScopeAry);
            }
            if(children.length>0)children = children.substr(1);
        }            
        var pair = buildAttrs(pm.attrNodes);
        var attrStr = pair[0];
        var dirStr = pair[1];
        var ifStr = pm.if || 'true';
        ifStr = '('+ifStr+')';
        if(prevIfStr && pm.else){
            ifStr = '!('+prevIfStr+')'
        }
        var innerHTML = pm.html || 'null';
        var nodeStr = ifStr+'?_ce(this,"'+pm.tag+'",'+attrStr+','+dirStr+',['+children+'],'+innerHTML;
        if(pm.tag == 'template'){
            nodeStr = ifStr+'?_tmp(['+children+']';
        }
        if(pm.for){
            var k = (pm.for[0]||'').trim();
            var v = pm.for[1].trim();
            var filter = pm.for[2];
            var ds1 = pm.for[3];
            var ds2 = pm.for[4];
            var dsStr = ds1;
            var declare = "";
            if(pm.attrNodes.var){
                declare = pm.attrNodes.var.value;
                var list = declare.replace(/^{|}$/mg,'').split(',');
                var s = '';
                list.forEach(function(de) {
                    var pair = de.split(':');
                    s += 'var '+ pair[0] +'='+pair[1]+';';
                });
                declare = s;
            }
            if(ds2){
                dsStr = "(function(){var rs=[];for(var i="+ds1+";i<="+ds2+";i++)rs.push(i);return rs;}).call(this)"
            }
            if(filter){
                dsStr = "_fi("+dsStr+","+buildFilterStr(filter)+",comp)";
            }
            str += '_li('+dsStr+',function('+forScopeStr+'){with('+forScopeStr+'){'+declare+' return '+nodeStr+','+forScopeChainStr+'):null}},this,"'+k+'","'+v+'")';
        }else{
            str += nodeStr+','+forScopeChainStr+'):null';
        }
    }else{
        var tmp = buildTxtStr(pm.txtQ);
        str += '_ct('+tmp+')';
    }

    return str;
}
function buildAttrs(map){
    var rs = {};
    var dirStr = '';
    for(var k in map){
        var attr = map[k];
        if(attr.directive){
            var exp = attr.value;
            var calcExp = attr.directive[0] === 'on'||attr.directive[0] === 'model'?JSON.stringify(exp):exp;
            dirStr += ",['"+k+"',"+JSON.stringify(attr.directive)+","+(calcExp)+","+JSON.stringify(exp)+"]";
        }else{
            rs[k] = attr.value;
        }
    }//end for
    return [JSON.stringify(rs),'['+dirStr.substr(1)+']'];
}
function buildTxtStr(q){
    var rs = '';
    q.forEach(function(item){
        if(item instanceof Array){
            var exp = item[0];
            var filter = item[1];
            if(filter.length>0){
                rs += "+_fi("+exp+","+buildFilterStr(filter)+",comp)";
            }else{
                rs += "+"+exp;
            }
        }else if(item){
            rs += "+"+JSON.stringify(item);
        }
    });
    rs = rs.replace(/\n/mg,'');
    if(rs.length>0)rs = rs.substr(1);
    return rs;
}
function buildFilterStr(filters){
    var rs = '';
    filters.forEach(function(f){
        var tmp = '["'+f.name+'",['+f.param.toString()+']]';
        rs += ','+tmp;
    });
    return '['+rs.substr(1)+']';
}
function compileVDOM(str,comp){
    if(VDOM_CACHE[str] && !comp.__slots && !comp.__slotMap)return VDOM_CACHE[str];

    var rs = 'with(comp){with(state){return '+compileVDOMStr(str,comp,[])+'}}';
    rs = new Function('comp,state,_ce,_tmp,_ct,_li,_fi',rs);
    VDOM_CACHE[str] = rs;
    return rs;
}
function compileVDOMStr(str,comp,forScopeAry){
    var pair = parseHTML(str);
    var roots = pair[0];
    var rs = roots[0];
    //doslot
    doSlot(pair[1],comp.__slots,comp.__slotMap);
    var str = buildEvalStr(rs,null,forScopeAry);
    return str;
}
/**
 * get vdom tree for component
 */
function buildVDOMTree(comp){
    var root = null;
    var fn = compileVDOM(comp.compiledTmp,comp);
    root = fn.call(comp,comp,comp.state,createElement,createTemplate,createText,createElementList,doFilter);
    return root;
}
var forScopeQ = null;
function compareVDOM(newVNode,oldVNode,comp){
    forScopeQ = {};
    if(isSameVNode(newVNode,oldVNode)){
        compareSame(newVNode,oldVNode,comp);
    }else{
        //remove old,insert new
        insertBefore(newVNode,oldVNode,oldVNode.parent?oldVNode.parent.children:null,oldVNode.parent,comp);
        removeVNode(oldVNode);
    }
    return forScopeQ;
}
function isSameComponent(nv,ov) {
    var c = impex._cs[ov._cid];
    //compare attrs
    var nas = nv.attrNodes;
    var oas = c.__attrs;
    if(Object.keys(nas).length !== Object.keys(oas).length)return false;
    for(var k in nas){
        if(isUndefined(oas[k]))return false;
    }
    //compare slots
    return JSON.stringify(nv._slots) == JSON.stringify(c.__slots)
            && JSON.stringify(nv._slotMap) == JSON.stringify(c.__slotMap);
}

function compareSame(newVNode,oldVNode,comp){
    if(newVNode._comp){
        forScopeQ[oldVNode._cid] = newVNode._forScopeQ;
        return;
    }

    if(newVNode.tag){
        //update events forscope
        oldVNode._forScopeQ = newVNode._forScopeQ;
        
        var allOldAttrs = oldVNode.attrNodes;
        var nvdis = newVNode._directives,
            ovdis = oldVNode._directives;
        var nvDiMap = getDirectiveMap(nvdis),
            ovDiMap = getDirectiveMap(ovdis);
        var add=[],del=[];
        //compare dirs
        for(var i=ovdis.length;i--;){
            var odi = ovdis[i];
            var odiStr = odi[0]+odi[3];
            if(!nvDiMap[odiStr]){
                del.push(odi);
            }
        }
        for(var i=nvdis.length;i--;){
            var ndi = nvdis[i];
            var ndiStr = ndi[0]+ndi[3];
            if(ovDiMap[ndiStr]){
                ovDiMap[ndiStr][2] = ndi[2];
            }else{
                add.push(ndi);
            }
        }
        //reset attrs
        oldVNode.attrNodes = newVNode.attrNodes;
        //do del
        for(var i=del.length;i--;){
            var index = oldVNode._directives.indexOf(del[i]);
            oldVNode._directives.splice(index,1);

            var params = del[i][1][1];
            var v = del[i][2];
            var exp = del[i][3];
            del[i].onDestroy && del[i].onDestroy(oldVNode,{value:v,args:params,exp:exp});
        }
        //add
        for(var i=add.length;i--;){
            oldVNode._directives.push(add[i]);
        }
        //unbind old events
        oldVNode.off();
        //do bind
        oldVNode._directives.forEach(function(di){
            var dName = di[1][0];
            var d = DIRECT_MAP[dName];
            if(!d)return;
            
            var params = di[1][1];
            var v = di[2];
            var exp = di[3];

            d.onBind && d.onBind(oldVNode,{value:v,args:params,exp:exp});
        });

        //for unstated change like x-html
        updateAttr(oldVNode.attrNodes,allOldAttrs,oldVNode.dom,oldVNode.tag);
    }else{
        if(newVNode.txt !== oldVNode.txt){
            updateTxt(newVNode,oldVNode);
        }
    }

    if(newVNode.children && oldVNode.children){
        compareChildren(newVNode.children,oldVNode.children,oldVNode,comp);
    }else if(newVNode.children){
        //插入新的整个子树
        insertChildren(oldVNode,newVNode.children,comp);
    }else if(oldVNode.children && oldVNode.children.length>0){
        //删除旧的整个子树
        removeVNode(oldVNode.children);
    }
}

function getDirectiveMap(directives){
    var map = {};
    for(var i=directives.length;i--;){
        var di = directives[i];
        var diStr = di[0]+di[3];
        map[diStr] = di;
    }
    return map;
}

function compareChildren(nc,oc,op,comp){
    if(nc.length<1){
        if(oc.length>0)
            removeVNode(oc);
        return;
    }
    var osp = 0,oep = oc.length-1,
        nsp = 0,nep = nc.length-1,
        os = oc[0],oe = oc[oep],
        ns = nc[0],ne = nc[nep];

    while(osp <= oep && nsp <= nep){
        if(isSameVNode(ns,os)){
            compareSame(ns,os,comp);
            os = oc[++osp],
            ns = nc[++nsp];
            continue;
        }else if(isSameVNode(ne,oe)){
            compareSame(ne,oe,comp);
            oe = oc[--oep],
            ne = nc[--nep];
            continue;
        }else if(isSameVNode(ne,os)){
            insertBefore(os,next(oe),oc,op,comp);
            os = oc[osp];oep--;
            ne = nc[--nep];
            continue;
        }else if(isSameVNode(ns,oe)){
            insertBefore(oe,os,oc,op,comp);
            oe = oc[oep];osp++;
            ns = nc[++nsp];
            continue;
        }else{
            //todo xid
            
            //插入ov之前，并删除ov
            insertBefore(ns,os,oc,op,comp);
            removeVNode(os);
            os = oc[++osp],
            ns = nc[++nsp];
        }
    }
    //在osp位置，插入剩余的newlist，删除剩余的oldlist
    if(osp <= oep && oep>0){
        var toDelList = oc.splice(osp,oep-osp+1);
        if(toDelList.length>0){
            removeVNode(toDelList);
        }
    }
    if(nsp <= nep){
        var toAddList = nsp==nep?[nc[nsp]]:nc.splice(nsp,nep-nsp+1);
        if(toAddList.length>0){
            insertBefore(toAddList,oc[osp],oc,op,comp);
        }
    }
}

function insertBefore(nv,target,list,targetParent,comp){
    if(list){
        //处理vdom
        if(nv.dom){//删除ov
            var i = list.indexOf(nv);
            if(i>-1)list.splice(i,1);
        }
        var p = targetParent;
        if(target){
            i = list.indexOf(target);
            p = p || target.parent;
            if(isArray(nv)){
                for(var l=nv.length;l--;){
                    nv[l].parent = p;
                }
                var args = [i,0].concat(nv);
                list.splice.apply(list,args);
            }else{
                nv.parent = p;
                list.splice(i,0,nv);
            }//end if
        }else{
            if(isArray(nv)){
                nv.forEach(function(n){
                    list.push(n);
                    n.parent = p;
                });
            }else{
                nv.parent = p;
                list.push(nv);
            }//end if
        }
    }
    //处理dom
    var dom = nv.dom;
    var compAry = [];
    if(!dom){
        if(isArray(nv)){
            var fragment = document.createDocumentFragment();
            for(var i=0;i<nv.length;i++){
                var vn = nv[i];
                var tmp = buildOffscreenDOM(vn,comp);

                fragment.appendChild(tmp);
            }
            dom = fragment;
        }else{
            dom = buildOffscreenDOM(nv,comp);
        }
    }else{
        dom.parentNode.removeChild(dom);
    }
    // if(dom.parentNode)dom.parentNode.removeChild(dom);
    if(target){
        var tdom = target.dom;
        tdom.parentNode.insertBefore(dom,tdom);
    }else{
        targetParent.dom.appendChild(dom);
    }
}
function next(nv){
    var p = nv.parent;
    var i = p.children.indexOf(nv);
    return p.children[i+1];
}
function removeVNode(vnodes){
    if(!isArray(vnodes))vnodes = [vnodes];
    var parent = vnodes[0].parent;
    for(var i=vnodes.length;i--;){
        var vnode = vnodes[i];
        var k = parent.children.indexOf(vnode);
        if(k>-1){
            parent.children.splice(k,1);
        }
        var p = vnode.dom.parentNode;
        p && p.removeChild(vnode.dom);

        //todo...   release other resource
        if(impex._cs[vnode._cid] && vnode.getAttribute(DOM_COMP_ATTR)){
            impex._cs[vnode._cid].destroy();
        }
    }
}
function insertChildren(parent,children,comp){
    parent.children = children;
    var fragment = document.createDocumentFragment();
    var compAry = [];
    for(var i=0;i<children.length;i++){
        var vn = children[i];
        var dom = buildOffscreenDOM(vn,comp);
        //bind vdom
        if(vn._comp){
            parseComponent(vn._comp);
            compAry.push(vn._comp);
        }
        fragment.appendChild(dom);
    }
    parent.dom.appendChild(fragment);

    for(var i=0;i<compAry.length;i++){
        var tmp = compAry[i];
        mountComponent(tmp,parent);
    }
}
function isSameVNode(nv,ov){
    if(nv._comp){
        if(ov.getAttribute(DOM_COMP_ATTR) != nv.tag)return false;
        return isSameComponent(nv,ov);
    }
    return ov.tag === nv.tag;
}
function updateTxt(nv,ov){
    ov.txt = nv.txt;
    var dom = ov.dom;
    dom.textContent = nv.txt;
}
function updateAttr(newAttrs,oldAttrs,dom,tag){
    //比较节点属性
    var nvas = newAttrs;
    var ovas = oldAttrs;
    var nvasKs = Object.keys(nvas);
    var ovasKs = Object.keys(ovas);
    var isInputNode = tag === 'input'; 
    for(var i=nvasKs.length;i--;){
        var k = nvasKs[i];
        var index = ovasKs.indexOf(k);
        if(index<0){
            dom.setAttribute(k,nvas[k]);
            if(isInputNode && k === 'value'){
                dom.value = nvas[k];
            }
        }else{
            if(nvas[k] != ovas[k]){
                dom.setAttribute(k,nvas[k]);
                if(isInputNode && k === 'value'){
                    dom.value = nvas[k];
                }
            }
            ovasKs.splice(index,1);
        }
    }
    for(var i=ovasKs.length;i--;){
        if(ovasKs[i] === DOM_COMP_ATTR)continue;
        dom.removeAttribute(ovasKs[i]);
    }

    //update new attrs
    var comp_attr = oldAttrs[DOM_COMP_ATTR];
    if(comp_attr)newAttrs[DOM_COMP_ATTR] = comp_attr;

}



/**
 * for DOM event delegation，support mouseEvent , touchEvent and pointerEvent
 */
function dispatch(type,e) {
    var p = e.target;
    var canceled = false;
    do{
        var uid = p._vid;
        if(uid === undefined)continue;
        var evMap = EVENT_MAP[type];
        if(!evMap)continue;
        var tmp = evMap[uid];
        if(!tmp)continue;

        var vnode = tmp[0];
        if(type == 'mouseleave'){
            var t = e.target;
            if(!contains(vnode.dom,t))return;
            var toElement = e.toElement || e.relatedTarget;
            if(contains(vnode.dom,toElement))return;
        }
        if(type == 'mouseenter'){
            var t = e.target;
            var fromElement = e.relatedTarget;
            if(contains(vnode.dom,t) && vnode.dom != t)return;
            if(fromElement && contains(vnode.dom,fromElement))return;
        }

        var fn = tmp[1];
        var cid = tmp[2];
        var isFn = tmp[3];
        var comp = impex._cs[cid];
        if(isFn){
            fn.call(comp,e,vnode);
        }else{
            var args = [comp,comp.state,e,vnode];
            if(vnode._forScopeQ)
                for(var i=0;i<vnode._forScopeQ.length;i++){
                    args.push(vnode._forScopeQ[i]);
                }
            fn.apply(comp,args);
        }

        canceled = e.cancelBubble;
        
    }while((p = p.parentNode) && p.tagName != 'BODY' && !canceled);
}
function contains(a,b){
    if(a.contains){
        return a.contains(b);
    }
    do{
        if(a == b)return true;
        b = b.parentNode;
    }while(b && b.tagName != 'BODY');
    return false;
}
//touch/mouse/pointer events
var userAgent = self.navigator.userAgent.toLowerCase();
var isAndroid = userAgent.indexOf('android')>0?true:false;
var isIphone = userAgent.indexOf('iphone')>0?true:false;
var isIpad = userAgent.indexOf('ipad')>0?true:false;
var isWphone = userAgent.indexOf('windows phone')>0?true:false;
var isMobile = isIphone || isIpad || isAndroid || isWphone;
if(isMobile){
    var FLING_INTERVAL = 200;
    var lastTapTime = 0;
    var timer;
    var hasMoved = false;
    var canceled = false;
    var fling_data;
    ///////////////////// touch events /////////////////////
    document.addEventListener('touchstart',doStart,true);
    document.addEventListener('touchmove',doMove,true);
    document.addEventListener('touchend',doEnd,true);
    document.addEventListener('touchcancel',doCancel,true);
    function doStart(e){
        dispatch('touchstart',e);
        dispatch('pointerdown',e);

        //start timer
        timer = setTimeout(function(){
            dispatch('press',e);
        },800);

        hasMoved = false;
        canceled = false;

        //handle fling
        var touch = e.touches[0];
        fling_data = {
            x:touch.clientX,
            y:touch.clientY,
            t:Date.now()
        };
    }
    function doMove(e){
        clearTimeout(timer);

        dispatch('touchmove',e);
        dispatch('pointermove',e);

        hasMoved = true;
    }
    function doCancel(e){
        clearTimeout(timer);

        canceled = true;
        dispatch('touchcancel',e);
        dispatch('pointercancel',e);
    }
    function doEnd(e){
        clearTimeout(timer);
        
        dispatch('touchend',e);
        dispatch('pointerup',e);

        if(canceled)return;

        if(!hasMoved){
            dispatch('tap',e);

            if(Date.now() - lastTapTime < 300){
                dispatch('dbltap',e);
            }

            lastTapTime = Date.now();
        }else{
            var touch = e.changedTouches[0];
            var dx = touch.clientX,
                dy = touch.clientY;

            var data = fling_data;
            var sx = data.x,
                sy = data.y,
                st = data.t;

            var long = Date.now() - st;
            var s = Math.sqrt((dx-sx)*(dx-sx)+(dy-sy)*(dy-sy)) >> 0;
            //时间小于interval并且位移大于20px才触发fling
            if(long <= FLING_INTERVAL && s > 20){
                var r = Math.atan2(dy-sy,dx-sx);

                var extra = {
                    slope:r,
                    interval:long,
                    distance:s
                }

                dispatch('fling',e,extra);
            }
        }
    }
}else{
    ///////////////////// 鼠标事件分派器 /////////////////////
    document.addEventListener('mousedown',doMousedown,true);
    document.addEventListener('mousemove',doMousemove,true);
    document.addEventListener('mouseup',doMouseup,true);
    window.addEventListener('blur',doMouseCancel,true);
    var type = self.onmousewheel == null?'mousewheel':'DOMMouseScroll';
    document.addEventListener(type,doMousewheel,true);

    document.addEventListener('mouseout',doMouseout,true);
    document.addEventListener('mouseover',doMouseover,true);

    var inited = true;
    var lastClickTime = 0;
    var timer;
        
    function doMousedown(e){
        dispatch('mousedown',e);
        dispatch('pointerdown',e);

        //start timer
        timer = setTimeout(function(){
            dispatch('press',e);
        },800);
    }
    function doMousemove(e){
        clearTimeout(timer);

        dispatch('mousemove',e);
        dispatch('pointermove',e);
    }
    function doMouseup(e){
        clearTimeout(timer);

        dispatch('mouseup',e);
        dispatch('pointerup',e);

        if(e.button === 0){
            dispatch('click',e);
            dispatch('tap',e);
            if(Date.now() - lastClickTime < 300){
                dispatch('dblclick',e);
                dispatch('dbltap',e);
            }

            lastClickTime = Date.now();
        }
    }
    function doMouseCancel(e){
        clearTimeout(timer);

        dispatch('pointercancel',e);                
    }
    function doMouseout(e){
        dispatch('mouseout',e);
        dispatch('mouseleave',e);
    }
    function doMouseover(e){
        dispatch('mouseover',e);
        dispatch('mouseenter',e);
    }
    function doMousewheel(e){
        dispatch('mousewheel',e);
    }
}

//model events
document.addEventListener('input',function(e){
    dispatch('input',e);
},true);
document.addEventListener('change',function(e){
    dispatch('change',e);
},true);

//keyboard events
document.addEventListener('keydown',function(e){
    dispatch('keydown',e);
},true);
document.addEventListener('keypress',function(e){
    dispatch('keypress',e);
},true);
document.addEventListener('keyup',function(e){
    dispatch('keyup',e);
},true);

//focus events
document.addEventListener('focus',function(e){
    dispatch('focus',e);
},true);
document.addEventListener('blur',function(e){
    dispatch('blur',e);
},true);

//mousewheel
var mousewheel = self.onwheel==null?'wheel':'mousewheel';
document.addEventListener(mousewheel,function(e){
    dispatch('wheel',e);
},true);

//scroll
document.addEventListener('scroll',function(e){
    dispatch('scroll',e);
},true);
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
					var comp = change.comp;

					var newVal = change.newVal;
					var oldVal = change.oldVal;
					var pc = change.pc;
					var type = change.type;
					var name = change.name;
					var object = change.object;
					
					handlePath(newVal,oldVal,comp,type,name,object,pc,change.action);
				});//end for
				var tmp = changeMap;
				for(var k in tmp){
					if(tmp[k].comp instanceof Component){
						updateComponent(tmp[k].comp,tmp[k].change);
					}else{
						tmp[k].comp.__update(tmp[k].change);
					}					
				}
			},20);
		}
	}
	
	function handlePath(newVal,oldVal,comp,type,name,object,pc,action){
        var chains = [];
    	chains = pc.concat();
		if(!isArray(object))
        	chains.push(name);
        
        if(!comp)return;

        if(!changeMap[comp._uid]){
        	changeMap[comp._uid] = {
        		change:{},
        		comp:comp
        	};
        }
        var c = new Change(name,newVal,oldVal,chains,type,object);
        if(action){
        	changeMap[comp._uid].change[name] = [c,action];
        }else{
        	changeMap[comp._uid].change[name] = c;
        }
        
	}
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
}
/**
 * @classdesc 事件类，为所有组件提供自定义事件接口
 * 
 * @class 
 */
function EventEmitter(){
	this.__eeMap = {};
}
EventEmitter.prototype = {
	/**
	 * 事件注册不支持队列。相同类型的事件注册会被覆盖
	 * @param  {String} type   事件类型
	 * @param  {Function} handler 回调函数
	 * @param  {Object} [context] 上下文
	 * @return {Object}   返回事件函数返回值
	 */
	on:function(type,handler,context) {
		this.__eeMap[type] = [handler,context||this];
		return this;
	},
	emit:function(type){
		var pair = this.__eeMap[type];
		if(!pair)return;
		var fn = pair[0],
			ctx = pair[1];
		if(!fn)return;

		var args = [];
		for(var i=1;i<arguments.length;i++){
			args.push(arguments[i]);
		}
		return fn.apply(ctx,args);
	}
}
/**
 * @classdesc 组件类，包含视图、模型、控制器，表现为一个自定义标签。同内置标签样，
 * 组件也可以有属性。
 * <br/>
 * 组件可以设置事件或者修改视图样式等<br/>
 * 组件实例为组件视图提供了数据和控制
 * 组件可以包含组件，所以子组件视图中的表达式可以访问到父组件模型中的值
 * 
 * @class 
 */
function Component (el) {
	EventEmitter.call(this);

	this._uid = 'C_' + im_counter++;

	/**
	 * 对顶级元素的引用
	 * @type {HTMLElement}
	 */
	this.el = el;
	/**
	 * 对子组件/dom的引用
	 * @type {Object}
	 */
	this.refs = {};
	/**
	 * 组件标签引用
	 * @type {Object}
	 */
	this.compTags = {};
	/**
	 * 用于指定输入参数的限制
	 * @type {Object}
	 */
	this.input = null;
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
	//watchs
	this.__watchMap = {};
	this.__watchFn;
	this.__watchOldVal;
	this.__watchPaths = [];
	//syncs
	this.__syncFn = {};
	this.__syncOldVal = {};
	this.__syncFnForScope = {};
	//computedstate
	this.__dependence = {};

	/**
	 * 组件数据
	 * @type {Object}
	 */
	this.state = {};

	impex._cs[this._uid] = this;
};
function F(){}
F.prototype = EventEmitter.prototype;  
Component.prototype = new F();  
Component.prototype.constructor = Component.constructor; 
ext({
	/**
	 * 设置组件状态值
	 * @param {String} path 状态路径
	 * @param {Object} v  
	 */
	setState:function(path,v){
		v = JSON.stringify(v);
		var str = 'with(scope){'+path+'='+v+'}';
		var fn = new Function('scope',str);
		fn(this.state);
		
		return this;
	},
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {String} path 属性路径，比如a.b.c
	 * @param  {Function} cbk      回调函数，[newVal,oldVal]
	 */
	watch:function(path,cbk){
		this.__watchPaths.push(path);
		var str = '';
		for(var i=this.__watchPaths.length;i--;){
			var p = this.__watchPaths[i];
			str += ','+JSON.stringify(p)+':'+p;
		}
		str = str.substr(1);
		var fn = this.__watchFn = new Function('scope','with(scope){return {'+str+'}}');
		this.__watchOldVal = fn(this.state);
		this.__watchMap[path] = cbk;

		return this;
	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	destroy:function(){
		this.onDestroy && this.onDestroy();

		if(this.parent){
			this.parent.__syncFn[this._uid] = null;
			this.parent.__syncOldVal[this._uid] = null;
			this.parent.__syncFnForScope[this._uid] = null;
			delete this.parent.__syncFn[this._uid];
			delete this.parent.__syncOldVal[this._uid];
			delete this.parent.__syncFnForScope[this._uid];
			var index = this.parent.children.indexOf(this);
			if(index > -1){
				this.parent.children.splice(index,1);
			}
			this.parent = null;
		}

		while(this.children.length > 0){
			this.children[0].destroy();
		}

		this.children = 
		impex._cs[this._uid] = null;
		delete impex._cs[this._uid];

		destroyDirective(this.vnode,this);

		this.vnode = 
		this.el = 
		this.compTags = 
		this.root = 
		this.__dependence = 

		this.refs = 
		this.__nodes = 
		this.__syncFn = 
		this._uid = 

		this.__url = 
		this.template = 
		this.state = null;
	},
	/**
	 * 如果一个引用参数发生了改变，那么子组件必须重载该方法，
	 * 并自行判断是否真的修改了。但是更好的方案是，调用子组件的某个方法比如刷新之类
	 */
	onPropChange : function(newProps,oldProps){
		for(var k in newProps){
			var v = newProps[k];
			if(v !== this.state[k]){
				this.state[k] = v;
			}
		}
    }
},Component.prototype);

/*********	component handlers	*********/
//////	init flow
function buildOffscreenDOM(vnode,comp){
	var n,cid = comp._uid;
	if(vnode._isEl){
		n = document.createElement(vnode.tag);
		n._vid = vnode.vid;
		vnode._cid = cid;

		if(!vnode._comp){//component dosen't exec directive
			//directive init
			var dircts = vnode._directives;
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var dName = di[1][0];
					var d = DIRECT_MAP[dName];
					if(!d)return;
					
					var params = di[1][1];
					var v = di[2];
					var exp = di[3];

					d.onBind && d.onBind(vnode,{comp:comp,value:v,args:params,exp:exp});
				});
			}
		}

		for(var k in vnode.attrNodes){
			if(k[0] === BIND_AB_PRIFX)continue;
			n.setAttribute(k,vnode.attrNodes[k]);
		}

		if(vnode.attrNodes[ATTR_REF_TAG]){
			comp.refs[vnode.attrNodes[ATTR_REF_TAG]] = n;
		}
		
		if(vnode._comp){
			var c = newComponentOf(vnode,vnode.tag,n,comp,vnode._slots,vnode._slotMap,vnode.attrNodes);
			vnode._comp = c;
		}else{
			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					var c = buildOffscreenDOM(vnode.children[i],comp);
					n.appendChild(c);
				}
			}
		}
		
	}else{
		n = document.createTextNode(filterEntity(vnode.txt));
	}
	vnode.dom = n;
	return n;
}
function filterEntity(str){
	return str && str.replace?str
	.replace(/&lt;/img,'<')
	.replace(/&gt;/img,'>')
	.replace(/&nbsp;/img,'\u00a0')
	.replace(/&amp;/img,'&'):str;
}

function callDirective(vnode,comp,type){
	if(isUndefined(vnode.txt)){
		if(!vnode._comp){//component dosen't exec directive
			//directive init
			var dircts = vnode._directives;
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var dName = di[1][0];
					var d = DIRECT_MAP[dName];
					if(!d)return;
					
					var params = di[1][1];
					var v = di[2];
					var exp = di[3];
					
					if(type == 0){
						d.onActive && d.onActive(vnode,{comp:comp,value:v,args:params,exp:exp},vnode.dom);
					}else{
						d.onUpdate && d.onUpdate(vnode,{comp:comp,value:v,args:params,exp:exp},vnode.dom);
					}
				});
			}

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					callDirective(vnode.children[i],comp,type);
				}
			}//end if
		}//end if
	}
}

function destroyDirective(vnode,comp){
	if(isUndefined(vnode.txt)){
		if(!vnode._comp){//component dosen't exec directive
			//directive init
			var dircts = vnode._directives;
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var dName = di[1][0];
					var d = DIRECT_MAP[dName];
					if(!d)return;
					
					var params = di[1][1];
					var v = di[2];
					var exp = di[3];
					
					d.onDestroy && d.onDestroy(vnode,{comp:comp,value:v,args:params,exp:exp});
				});
			}

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					destroyDirective(vnode.children[i],comp);
				}
			}//end if
		}//end if
	}
}
function bindScopeStyle(name,css){
	if(!css)return;
	var cssStr = scopeStyle(name,css);
	if(!COMP_CSS_MAP[name]){
		//attach style
		if(cssStr.trim().length>0){
			var target = document.head.children[0];
			if(target){
				target.insertAdjacentHTML('afterend','<style>'+cssStr+'</style>');
			}else{
				document.head.innerHTML = '<style>'+cssStr+'</style>';
			}
		}
		COMP_CSS_MAP[name] = true;	
	}
}
/**
 * parse component template & to create vdom
 */
function parseComponent(comp){
	if(comp.__url){
		loadComponent(comp.name,comp.__url,function(model,css){
			COMP_MAP[comp.name] = model;
			ext(model,comp);
			if(isFunction(model.state)){
				comp.state = model.state.call(comp);
			}else if(model.state){
				comp.state = {};
				ext(model.state,comp.state);
			}

			preCompile(comp.template,comp);


			comp.onCreate && comp.onCreate();

			//同步父组件变量
			bindProps(comp,comp.parent,comp.__attrs);

			//css
			bindScopeStyle(comp.name,css);
			comp.__url = null;
			compileComponent(comp);
			mountComponent(comp,comp.parent?comp.parent.vnode:null);
		});
	}else{
		if(comp.template){
			preCompile(comp.template,comp);
		}
		compileComponent(comp);
	}
}
function preCompile(tmpl,comp){
	if(comp.onBeforeCompile)
        tmpl = comp.onBeforeCompile(tmpl);
    
    comp.compiledTmp = 
    tmpl.trim()
    .replace(/<!--[\s\S]*?-->/mg,'')
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/mg,'')
    .replace(/^\s+|\s+$/img,' ')
    .replace(/>\s([^<]*)\s</,function(a,b){
            return '>'+b+'<';
    });
}
function doSlot(slotList,slots,slotMap){
	if(slots || slotMap)
		slotList.forEach(function(slot){
			var parent = slot[0];
			var node = slot[1];
			var name = slot[2];
			//update slot position everytime
			var pos = parent.children.indexOf(node);
			var params = [pos,1];
			
			if(name){
				if(slotMap[name])
					params.push(slotMap[name]);
			}else{
				params = params.concat(slots);
			}
			parent.children.splice.apply(parent.children,params);
		});
}
function scopeStyle(host,style){
	style = style.replace(/\n/img,'').trim()//.replace(/:host/img,host);
	var isBody = false;
	var selector = '';
	var body = '';
	var lastStyle = {};
	var styles = [];
	for(var i=0;i<style.length;i++){
		var c = style[i];
		if(isBody){
			if(c === '}'){
				isBody = false;
				lastStyle.body = body.trim();
				selector = '';
				styles.push(lastStyle);
				lastStyle = {};
			}
			body += c;
		}else{
			if(c === '{'){
				isBody = true;
				lastStyle.selector = selector.trim();
				body = '';
				continue;
			}
			selector += c;
		}
	}

	var css = '';
	host = '['+DOM_COMP_ATTR+'="'+host+'"]';
	styles.forEach(function(style){
		var parts = style.selector.split(',');
		var tmp = '';
		for(var i=0;i<parts.length;i++){
			var name = parts[i].trim();
			
			if(name.indexOf(':host')===0){
				tmp += ','+name.replace(/:host/,host);
			}else{
				tmp += ','+host + ' ' + name;
			}
		}
		tmp = tmp.substr(1);
		css += tmp + '{'+style.body+'}';
	});

	return css;
}

var g_computedState,
	g_computedComp;
function compileComponent(comp){
	//init computedstate to state
	for(var k in comp.computedState){
		var cs = comp.computedState[k];
		var fn = cs.get || cs;
		comp.state[k] = cs;
		}

	var vnode = buildVDOMTree(comp);
	var pv = null;
	if(comp.vnode){
		pv = comp.vnode.parent;
		var cs = pv.children;
		var i = cs.indexOf(comp.vnode);
		if(i>-1){
			cs.splice(i,1,vnode);
		}
	}
	comp.vnode = vnode;
	vnode.parent = pv;

	//observe state
	comp.state = Observer.observe(comp.state,comp);

	//compute state
	for(var k in comp.computedState){
		var cs = comp.computedState[k];
		var fn = cs.get || cs;
		g_computedState = k;
		g_computedComp = comp;
		if(fn instanceof Function){
			var v = fn.call(comp);
			comp.state[k] = v;
		}
	}
	g_computedComp = g_computedState = null;

	comp.onCompile && comp.onCompile(comp.vnode);//must handle slots before this callback 
}
/**
 * 准备挂载组件到页面
 */
function mountComponent(comp,parentVNode){
	var dom = buildOffscreenDOM(comp.vnode,comp);

	//beforemount
	comp.onBeforeMount && comp.onBeforeMount(dom);
	comp.el.parentNode.replaceChild(dom,comp.el);
	comp.el = dom;

	//init children
	for(var i = comp.children.length;i--;){
		parseComponent(comp.children[i]);
	}
	//mount children
	for(var i = 0;i<comp.children.length;i++){
		if(!comp.children[i].__url)
			mountComponent(comp.children[i],comp.vnode);
	}
	if(comp.name){
		comp.el.setAttribute(DOM_COMP_ATTR,comp.name);
		comp.vnode.setAttribute(DOM_COMP_ATTR,comp.name);
	}
	comp.onMount && comp.onMount(comp.el);

	comp.vnode.parent = parentVNode;

	callDirective(comp.vnode,comp,0);
}

//////	update flow
function updateComponent(comp,changeMap){
	var renderable = true;
	var syncPropMap = {};
	
	if(comp.onBeforeUpdate){
		renderable = comp.onBeforeUpdate(changeMap);
	}
	if(renderable === false)return;

	//rebuild VDOM tree
	var vnode = buildVDOMTree(comp);

	//diffing
	var forScopeQ = compareVDOM(vnode,comp.vnode,comp,forScopeQ);

	//mount subcomponents which created by VDOM 
	for(var i = 0;i<comp.children.length;i++){
		var c = comp.children[i];
		if(!c.compiledTmp){
			parseComponent(c);
			if(!c.__url)
				mountComponent(c,c.vnode.parent);
		}
	}

	//call watchs
	if(comp.__watchFn){
		var newVal = comp.__watchFn(comp.state);
		for(var k in newVal){
			var nv = newVal[k];
			var ov = comp.__watchOldVal[k];
			if(nv !== ov || isObject(nv)){
				comp.__watchMap[k].call(comp,nv,ov,k);
			}
		}
		comp.__watchOldVal = newVal;
	}	

	//update children props
	for(var uid in comp.__syncFn){
		var changeProps = {};
		var args = [comp.state];
		if(forScopeQ[uid])comp.__syncFnForScope[uid] = forScopeQ[uid];
		var sfs = comp.__syncFnForScope[uid];
	    if(sfs)
	        for(var i=0;i<sfs.length;i++){
	            args.push(sfs[i]);
	        }
		var rs = comp.__syncFn[uid].apply(comp,args);
		impex._cs[uid].onPropChange && impex._cs[uid].onPropChange(rs,comp.__syncOldVal[uid]);
		comp.__syncOldVal[uid] = rs;
	}

	comp.onUpdate && comp.onUpdate(changeMap);

	callDirective(comp.vnode,comp);
}



function newComponent(tmpl,el,param){
	var c = new Component(el);
	c.template = tmpl;
	c.name = 'ROOT';
	if(param){
		ext(param,c);

		if(isFunction(param.state)){
			c.state = param.state.call(c);
		}
	}

	c.onCreate && c.onCreate();
	
	return c;
}
function newComponentOf(vnode,type,el,parent,slots,slotMap,attrs){
	//handle component
	if(type == 'component'){
		type = attrs.is;
		if(attrs['.is']){//'.is' value can only be a var
			type = attrs['.is'];
			type = new Function('scope',"with(scope){return "+type+"}")(parent.state);
		}
	}
	var param = COMP_MAP[type];
	if(!param)return;
	var c = new Component(el);
	c.name = type;
	//bind parent
	parent.children.push(c);
	c.parent = parent;
	c.root = parent.root;
	c.store = c.root.store;
	c.vnode = vnode;
	//ref
	if(attrs[ATTR_REF_TAG]){
		parent.refs[attrs[ATTR_REF_TAG]] = c;
	}
	//global
	if(attrs[ATTR_ID_TAG]){
		impex.id[attrs[ATTR_ID_TAG]] = c;
	}
	//custome even
	vnode._directives.forEach(function(di){
		var dName = di[1][0];
		if(dName !== 'on')return;
		
		var type = di[1][1][0];
		var exp = di[2];
		exp.match(/(?:^|this\.)([a-zA-Z_][a-zA-Z0-9_$]*)(?:\(|$)/);
		var fnName = RegExp.$1;
		

        var fn = parent[fnName];
        if(fn)
			c.on(type,fn.bind(parent));
	});

	c.__attrs = attrs;
	c.__slots = slots;
	c.__slotMap = slotMap;
	
	if(isString(param)){
		c.__url = param;
		return c;
	}
	if(param){
		ext(param,c);
		
		if(isFunction(param.state)){
			c.state = param.state.call(c);
		}else if(param.state){
			c.state = {};
			ext(param.state,c.state);
		}
	}
	
	c.onCreate && c.onCreate();

	bindProps(c,parent,attrs);
	
	return c;
}

function bindProps(comp,parent,parentAttrs){
	//check props
	var requires = {};
	var input = comp.input;
	if(input){
		for(var k in input){
			var arg = input[k];
			if(arg.require){
				requires[k] = type;
			}
			if(!isUndefined(arg.value) && isUndefined(comp.state[k])){
				comp.state[k] = arg.value;
			}
		}
	}

	if(parentAttrs){
		handleProps(parentAttrs,comp,parent,input,requires);
	}

	}
function handleProps(parentAttrs,comp,parent,input,requires){
	var str = '';
	var strMap = {};
	var computedState = {};
	for(var k in parentAttrs){
		var v = parentAttrs[k];
		if(k == ATTR_REF_TAG){
			continue;
		}
		k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});
		// xxxx
		if(k[0] !== PROP_TYPE_PRIFX){
			strMap[k] = v;
			continue;
		}

		// .xxxx
		var n = k.substr(1);
		if(parent[v] instanceof Function){
			v = 'this.'+v;
		}
		str += ','+JSON.stringify(n)+':'+v;
	}//end for
	str = str.substr(1);
	var rs = {};
	if(str){
		var forScopeStart = '',forScopeEnd = '';
		var vn = comp.vnode;
		var args = [parent.state];
		var sfs = parent.__syncFnForScope[comp._uid] = [];
	    if(vn._forScopeQ)
	        for(var i=0;i<vn._forScopeQ.length;i++){
	            forScopeStart += 'with(arguments['+(1+i)+']){';
	            forScopeEnd += '}';
	            args.push(vn._forScopeQ[i]);
	            sfs.push(vn._forScopeQ[i]);
	        }
		var fn = parent.__syncFn[comp._uid] = new Function('scope','with(scope){'+forScopeStart+'return {'+str+'}'+forScopeEnd+'}');
		rs = parent.__syncOldVal[comp._uid] = fn.apply(parent,args);
	}	
	var objs = [];
	ext(strMap,rs);

	//compute state
	if(!isUndefined(strMap['store'])){
		var states = null;
		if(strMap['store']){
			states = strMap['store'].split(' ');
		}else{
			states = Object.keys(comp.store.state);
		}		
		if(!comp.computedState)comp.computedState = {};
		states.forEach(function(state) {
			var csKey = null;
			if(/[^\w]?(\w+)$/.test(state)){
				csKey = RegExp.$1;
				comp.computedState[csKey] = new Function('with(this.store.state){ return '+ csKey +'}');
			}
		});
	}

	for(var k in rs){
		var v = rs[k];
		if(isObject(v) && v.__im__oid){
			objs.push(k);
		}
		if(input && k in input){
			delete requires[k];
			
			}
	}

	if(comp.onPropBind){
		comp.onPropBind(rs);
	}else{
		for(var k in rs){
			var v = rs[k];
			if(v instanceof Function){
				comp[k] = v;
			}else{
				comp.state[k] = v;
			}
		}
	}//end if	
}

	var CMD_PREFIX = 'x-';//指令前缀
	var CMD_PARAM_DELIMITER = ':';
	var CMD_FILTER_DELIMITER = '.';

	var EXP_START_TAG = '{{',
		EXP_END_TAG = '}}';
	var REG_CMD = /^x-.*/;
	var ATTR_REF_TAG = 'ref';
	var ATTR_ID_TAG = 'id';
	var COMP_SLOT_TAG = 'component';
	var PROP_TYPE_PRIFX = '.';

	var EV_AB_PRIFX = ':';
	var BIND_AB_PRIFX = '.';
	var EXP_EXP = new RegExp(EXP_START_TAG+'(.+?)(?:(?:(?:=>)|(?:=&gt;))(.+?))?'+EXP_END_TAG,'img');

	var DOM_COMP_ATTR = 'impex-component';

	var SLOT = 'slot';

	var im_counter = 0;

	var DISPATCHERS = [];
	var FILTER_MAP = {};
	var DIRECT_MAP = {};
	var DIRECT_EXP_VALUE_MAP = {};
	var COMP_MAP = {'component':1};
	var EVENT_MAP = {};
	var COMP_CSS_MAP = {};

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
		 * 保存注册过的全局组件实例引用。
		 * 注册全局组件可以使用id属性.
		 * <p>
		 * 		<x-panel id="xPanel" >...</x-panel>
		 * </p>
		 * <p>
		 * 		impex.id.xPanel.todo();
		 * </p>
		 * @type {Object}
		 */
		this.id = {};

		/**
	     * 版本信息
	     * @type {Object}
	     * @property {Array} v 版本号
	     * @property {string} state
	     * @property {function} toString 返回版本
	     */
		this.version = {
	        v:[0,98,0],
	        state:'alpha',
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
		 */
		this.config = function(cfg){
			var delimiters = cfg.delimiters || [];
			EXP_START_TAG = delimiters[0] || '{{';
			EXP_END_TAG = delimiters[1] || '}}';

			EXP_EXP = new RegExp(EXP_START_TAG+'(.+?)(?:(?:(?:=>)|(?:=&gt;))(.+?))?'+EXP_END_TAG,'img');
		};

		/**
		 * 定义组件<br/>
		 * 定义的组件实质是创建了一个组件类的子类，该类的行为和属性由model属性
		 * 指定，当impex解析对应指令时，会动态创建子类实例<br/>
		 * @param  {string} name  组件名，全小写，必须是ns-name格式，至少包含一个"-"
		 * @param  {Object | String} model 组件模型对象，或url地址
		 * @return this
		 */
		this.component = function(name,model){
			COMP_MAP[name] = model;
			return this;
		}

		/**
		 * 查询是否定义了指定组件
		 * @param  {String}  name 组件名称
		 * @return {Boolean}
		 */
		this.hasComponentOf = function(name){
			return !!COMP_MAP[name];
		}

		/**
		 * 定义指令
		 * @param  {string} name  指令名，不带前缀
		 * @param  {Object} model 指令模型
		 * @return this
		 */
		this.directive = function(name,model){
			DIRECT_MAP[name] = model;
			return this;
		}

		/**
		 * 定义过滤器。过滤器可以用在表达式或者指令中
		 * <p>
		 * 	{{ exp... => cap}}
		 * </p>
		 * 过滤器可以连接使用，并以声明的顺序依次执行，比如
		 * <p>
		 * 	{{ exp... => lower|cap}}
		 * </p>
		 * 过滤器支持参数，比如
		 * <p>
		 * 	{{ exp... => currency:'€':4}}
		 * </p>
		 * <p>
		 * 	x-for="list as item => orderBy:'desc'"
		 * </p>
		 * @param  {string} name 过滤器名
		 * @param  {Function} to 过滤函数。回调参数为 [value,params...]，其中value表示需要过滤的内容
		 * @return this
		 */
		this.filter = function(name,to){
			FILTER_MAP[name] = to;
			return this;
		}

		/**
		 * 渲染一段HTML匿名组件到指定容器，比如
		 * <pre>
		 * 	<div id="entry"></div>
		 * 	...
		 * 	impex.renderTo('<x-app></x-app>','#entry'...)
		 * </pre>
		 * @param  {String} tmpl 字符串模板
		 * @param  {HTMLElement | String} container 匿名组件入口，可以是DOM节点或选择器字符
		 * @param  {Object} model 组件模型，如果节点本身已经是组件，该参数会覆盖原有参数 
		 */
		this.renderTo = function(tmpl,container,model){
			
			//link comps
			var links = document.querySelectorAll('link[rel="impex"]');

            //register requires
            for(var i=links.length;i--;){
                var lk = links[i];
                var type = lk.getAttribute('type');
                var href = lk.getAttribute('href');
                impex.component(type,href);
            }

            if(isString(container)){
            	container = document.querySelector(container);
            }
            var comp = newComponent(tmpl,container,model);
			comp.root = comp;

			parseComponent(comp);
			mountComponent(comp);

			return comp;
		}

		/**
		 * 渲染一个DOM节点组件，比如
		 * <pre>
		 * 	<x-stage id="entry"><x-stage>
		 * 	...
		 * 	impex.render('#entry'...)
		 * </pre>
		 * 如果DOM元素本身并不是组件,系统会创建一个匿名组件，也就是说
		 * impex总会从渲染一个组件作为一切的开始
		 * @param  {HTMLElement | String} node 组件入口，可以是DOM节点或选择器字符
		 * @param  {Object} model 组件模型，如果节点本身已经是组件，该参数会覆盖原有参数 
		 */
		this.render = function(node,model){
			if(isString(node)){
            	node = document.querySelector(node);
            }
            var tmpl = node.outerHTML;
            return this.renderTo(tmpl,node,model);
		}

		Object.defineProperty(this,'_cs',{enumerable: false,writable: true,value:{}});

		//for prototype API
		this.Component = Component;

		this.EventEmitter = EventEmitter;

		this._Observer = Observer;
	}


/**
 * 内建指令
 */
///////////////////// 视图控制指令 /////////////////////
/**
 * 内联样式指令
 * <br/>使用方式：
 * <div x-style="{'font-size': valExp}" >...</div>
 * <div x-style="{'fontSize': valExp}" >...</div>
 * <div x-style="'color:red;font-size:20px;'" >...</div>
 * <div x-style="obj" >...</div>
 */
impex.directive('style',{
    onBind:function(vnode,data){
        var v = data.value;
        if(isString(v)){
            var rs = {};
            var tmp = v.split(';');
            for(var i=tmp.length;i--;){
                if(!tmp[i])continue;
                var pair = tmp[i].split(':');
                rs[pair[0]] = pair[1];
            }
            v = rs;
        }
        var style = vnode.getAttribute('style')||'';
        for(var k in v){
            var n = this.filterName(k);
            var val = v[k];
            n = n.replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            style += n+':'+val+';';
            // if(val.indexOf('!important')){
            //     val = val.replace(/!important\s*;?$/,'');
            //     n = n.replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            //     style.setProperty(n, v, "important");
            // }else{
            //     style[n] = val;
            // }
        }
        vnode.setAttribute('style',style);
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
    onBind:function(vnode,data){
        var v = data.value;
        var cls = vnode.getAttribute('class')||'';
        if(isString(v)){
            cls += ' '+v;
        }else if(isArray(v)){
            cls += ' '+ v.join(' ');
        }else{
            for(var k in v){
                var val = v[k];
                if(val)
                    cls += ' '+k;
            }
        }
        
        vnode.setAttribute('class',cls);
    }
})
/**
 * 绑定视图事件，以参数指定事件类型，用于减少单一事件指令书写
 * <br/>使用方式1：<img x-on:load:mousedown:touchstart="hi()" x-on:dblclick="hello()">
 * <br/>使用方式2：<img :load:mousedown:touchstart="hi()" :dblclick="hello()">
 */
.directive('on',{
    onBind:function(vnode,data){
        var args = data.args;
        for(var i=args.length;i--;){
            vnode.on(args[i],data.value);
        }
    }
})
/**
 * 绑定视图属性，并用表达式的值设置属性
 * <br/>使用方式：<img x-bind:src="exp">
 */
.directive('bind',{
    onBind:function(vnode,data){
        var args = data.args;
        for(var i=args.length;i--;){
            var p = args[i];

            switch(p){
                case 'style':
                    DIRECT_MAP[p].onBind(vnode,data);
                    break;
                case 'class':
                    DIRECT_MAP[p].onBind(vnode,data);
                    break;
                default:
                    vnode.setAttribute(p,data.value);
            }//end switch
        }//end for
    }
})
/**
 * 控制视图显示指令，根据表达式计算结果控制
 * <br/>使用方式：<div x-show="exp"></div>
 */
.directive('show',{
    onBind:function(vnode,data){
        var v = data.value;
        var style = vnode.getAttribute('style')||'';
        if(v){
            style = style.replace(/display\s*:\s*none\s*;?/,'');
        }else{
            style += ';display:none;'
        }
        
        vnode.setAttribute('style',style);
    }
})
/**
 * 隐藏视图显示指令，用于屏蔽指定渲染模块
 * <br/>使用方式：
 * <style>
 *     [x-cloak]{
            display: none;
        }
 * </style>
 * <div x-cloak></div>
 */
.directive('cloak',{})
///////////////////// 模型控制指令 /////////////////////
/**
 * 绑定模型属性，当控件修改值后，模型值也会修改
 * <br/>使用方式：<input x-model="model.prop">
 */
.directive('model',{
    onBind:function(vnode,data){
        vnode.__exp = data.exp;
        vnode.__store = data.args && data.args[0]=='store'?true:false;
        switch(vnode.tag){
            case 'select':
                vnode.on('change',this.handleChange);
                break;
            case 'input':
                var type = vnode.attrNodes.type;
                if(type == 'radio' || type == 'checkbox'){
                    vnode.on('change',this.handleChange);
                    break;
                }
            default:
                vnode.on('input',handleInput);
        }
    },
    handleChange:function(e,vnode){
        var el = e.target;
        var tag = el.tagName.toLowerCase();
        var val = el.value;
        switch(tag){
            case 'textarea':
            case 'input':
                var type = el.getAttribute('type');
                switch(type){
                    case 'radio':
                        handleInput(e,vnode,this);
                        break;
                    case 'checkbox':
                        changeModelCheck(e,vnode,this);
                        break;
                }
                break;
            case 'select':
                var mul = el.getAttribute('multiple');
                if(mul !== null){
                    var parts = [];
                    for(var i=el.options.length;i--;){
                        var opt = el.options[i];
                        if(opt.selected){
                            parts.push(opt.value);
                        }
                    }
                    setModel(vnode,parts,this);
                }else{
                    handleInput(e,vnode,this);
                }
                break;
        }
    }
});

function handleInput(e,vnode,comp){
    var v = (e.target || e.srcElement).value;
    var toNum = vnode.getAttribute('number');
    if(!isUndefined(toNum)){
        v = parseFloat(v);
    }
    var debounce = vnode.getAttribute('debounce');
    if(debounce){
        if(vnode.debounceTimer){
            clearTimeout(vnode.debounceTimer);
            vnode.debounceTimer = null;
        }
        var that = this;
        vnode.debounceTimer = setTimeout(function(){
            clearTimeout(vnode.debounceTimer);
            vnode.debounceTimer = null;
            
            setModel(vnode,v,that || comp);
        },debounce);
    }else{
        setModel(vnode,v,this || comp);
    }
}
function changeModelCheck(e,vnode,comp){
    var t = e.target || e.srcElement;
    var val = t.value;
    var str = 'with(scope){return '+vnode.__exp+'}';
    var fn = new Function('scope',str);
    var parts = null;
    if(!this){
        parts = fn(comp.state);
    }else{
        parts = fn(this.state);
    }
    if(isArray(parts)){
        parts = parts.concat();
    }else{
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
    setModel(vnode,parts,comp);
}
function setModel(vnode,value,comp){
    if(vnode.__store){
        comp.store.commit('model',vnode.__exp,value);
    }else{
        comp.setState(vnode.__exp,value);
    }
}
impex.filter('json',function(v){
    return JSON.stringify(v);
})

//filterBy:'xxx'
//filterBy:'xxx':'name'
//filterBy:filter
.filter('filterBy',function(v,key,inName){
    var ary = v;
    if(!isArray(ary)){
        return v;
    }
    var rs = [];
    if(isFunction(key)){
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
})

//[1,2,3,4,5] => limitBy:3:1   ----> [2,3,4]
.filter('limitBy',function(v,count,start){
    if(!isArray(v)){
        return v;
    }
    if(!count)return v;
    return v.splice(start||0,count);
})

//[1,2,3,4,5] => orderBy:'':'desc'   ----> [5,4,3,2,1]
.filter('orderBy',function(v,key,dir){
    if(!key && !dir)return v;
    if(!isArray(v)){
        return v;
    }
    v.sort(function(a,b){
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
        v.reverse();
    }
    return v;
});

 	if ( typeof module === "object" && typeof module.exports === "object" ) {
 		module.exports = impex;
 	}else{
 		global.impex = impex;
 	}

 }(window||this);