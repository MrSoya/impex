/**
 * Store是一个基于impex的flux解决方案。用于处理大量共享状态需要交互的场景
 */
!function(impex){
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
	    	Handler.handle(changeObj);
	    }
	}
	var observedObjects = [];//用于保存监控对象
	function observe(data,component){
		if(data && data.__im__propChain)return data;

		return observeData([],data,component);
	}

	dirtyCheck();

	var lastAction = null;
	/**
	 * 变更处理器，处理所有变量变更
	 */
	var Handler = new function() {

		function mergeChange(change){
			for(var i=changeQ.length;i--;){
				var c = changeQ[i];
				if(c.object.__im__oid === change.object.__im__oid && c.name === change.name)break;
			}
			if(i > -1){
				changeQ.splice(i,1,change);
			}
			else{
				changeQ.push(change);
			}
		}

		var combineChange = false;
		var changeQ = [];
		var changes = [];
		var store = null;

		this.handle = function (change){
			change.actionType = lastAction;
			if(combineChange){
				mergeChange(change);
			}else{
				changeQ = [];
				changes = [];
				combineChange = true;
				changeQ.push(change);
				store = null;
				setTimeout(function(){
					combineChange = false;

					changeQ.forEach(function(change){
						var newVal = change.newVal;
						var oldVal = change.oldVal;
						var pc = change.pc;
						var xpc = change.xpc;
						if(!store)store = change.comp;
						var type = change.type;
						var name = change.name;
						var object = change.object;
						var actionType = change.actionType;

						// console.log('处理变更',change);
						
						var c = {
							name:name,
							newVal:newVal,
							oldVal:oldVal,
							path:pc,
							type:type,
							object:object,
							actionType:actionType
						};

						changes.push(c);
					});//end for
					
					store.__update(changes);
				},20);
			}
		}
	}

	/**
	 * @class impex.Store是一个基于impex的flux解决方案。用于处理大量共享状态需要交互的场景
	 * @param {Object} data 构造参数
	 * @param {Object} [actions] store中的逻辑实现
	 * @param {Object} [state] store中的存储
	 * @param {Function} [onUpdate] 变更时触发
	 */
	function Store(data){
		/**
		 * 数据
		 * @type {Object}
		 */
		this.state = {};

		this.echoMap = {};

		var keys = Object.keys(data);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            this[k] = data[k];
        }

		if(!this.actions)this.actions = {};

		if(this.state instanceof Function){
			this.state = this.state.call(ins);
		}

		this.state = observe(this.state,this);
	}

	

	Store.prototype = {
		/**
		 * 监听action执行
		 * @param  {String} type     action type
		 * @param  {Function | Component} listener 监听回调或组件引用
		 * @param {Object} context 参数/回调函数所属上下文。可以是组件、指令或者任何对象
		 * 如果是组件引用，系统会自动更新组件对应由action执行引起的state变动
		 */
		on:function(type,listener,context){
	        var ts = type.replace(/\s+/mg,' ').split(' ');
	        for(var i=ts.length;i--;){
	            var t = ts[i];
	            var listeners = this.echoMap[t];
	            if(!listeners)listeners = this.echoMap[t] = [];
	            
	            listeners.push([listener,context]);
	        }//end for
	    },
	    /**
		 * 解除监听action执行
		 * @param  {String} [type]  action type。如果是空，删除所有监听
		 * @param  {Function | Component} [listener] 监听回调或组件引用。如果是空，删除指定分类监听
		 */
	    off:function(type,listener){
	        var types = null;
	        if(!type){
	            types = Object.keys(this.echoMap);
	        }else{
	            types = type.replace(/\s+/mg,' ').split(' ');
	        }

	        for(var i=types.length;i--;){
	            var listeners = this.echoMap[types[i]];
	            if(listeners){
	                var toDel = [];
	                for(var j=listeners.length;j--;){
	                    if(listener?listeners[j][0] === listener:true){
	                        toDel.push(listeners[j]);
	                    }
	                }
	                toDel.forEach(function(listener){
	                    var index = listeners.indexOf(listener);
	                    listeners.splice(index,1);
	                });
	            }
	        }
	    },
	    /**
	     * 触发action
	     * @param  {String} [type]  action type
	     * @param {...} [var] 可变参数，传递给action回调
	     */
		emit:function(){
			var action = arguments[0];

	        var params = [];
	        for(var i=1;i<arguments.length;i++){
	            params.push(arguments[i]);
	        }

	        lastAction = action;

	        var act = this.actions[action];
	        act && act.apply(this,params);

	        return this;
		},
		__update:function(changes){
			var actionTypes = [];
			var actionMap = {};
			changes.forEach(function(c){
				if(actionTypes.indexOf(c.actionType)<0){
					actionTypes.push(c.actionType);
					actionMap[c.actionType] = [c];
				}else{
					actionMap[c.actionType].push(c);
				}
			});

			for(var i=actionTypes.length;i--;){
				var action = actionTypes[i];
				var cbks = this.echoMap[action];
				var cs = actionMap[action];
				var meta = {type:action,changes:cs};

				this.onUpdate && this.onUpdate(meta);

				if(cbks)
				cbks.forEach(function(cbk){
					var fn = cbk[0];
					var context = cbk[1];
					if(fn instanceof Function){
						fn.call(context,meta);
					}else{
						setState(fn,cs);
					}
				});
			}
			
		}
	};

	function setState(comp,changes){
		changes.forEach(function(c){
			var p = c.path.join('.');
			var isArray = c.object instanceof Array;
			if(p){
				if(isArray){
					p += '[' + c.name + ']';
				}else{
					p += '.' + c.name;
				}
				
			}else{
				p = c.name;
			}
			comp.setState(p,c.newVal);
        });
	}

	impex.Store = Store;
}(impex);
