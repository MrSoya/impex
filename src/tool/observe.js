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

				    	if(isObject(v)){
				    		var pcs = target.__im__propChain.concat();
							pcs.push(name);
				    		v = observeData(this,pcs,v,this.comp);
				    	}
				    	if(isArray(target)){
				    		setArray(target,name,v);
				    	}else{
					    	target[name] = v;
				    	}

				    	var path = target.__im__propChain;//.concat();

				    	var changeObj = {object:target,name:name,pc:path,oldVal:old,newVal:v,comp:this.comp,type:isAdd?'add':'update'};

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

					    var path = target.__im__propChain;//.concat();

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