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
		return p;
	}

	var Observer = {
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
			    	Builder.handleChange(changeObj);
			    	
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
			    	Builder.handleChange(changeObj);

				    return true;
				}
			};

			return observeData(handler,[],data,component);
		}
	};



	///////////////////////////////////////// fallback ///////////////////////////////////////////
	if(!window.Proxy){
	// if(true){
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

		var observedObjects = [],//用于保存监控对象
		observedArys = [];//用于保存监控数组

		var Observer = {};
		Observer.observe = function(data,component){
			if(data && data.__im__propChain)return data;

			return observeData([],data,component);
		}

		function getter(k){
			return this.__im__innerProps[k];
		}
		function setter(k,v){
			var old = this.__im__innerProps[k];

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
	    	}]);
		}

		function observeData(propChains,data,component){
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

		//start up check
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
		};
		dirtyCheck();

		function clearObserve(obj){
			for(var i=observedObjects.length;i--;){
				var oo = observedObjects[i];
				if(typeof oo === 'object'){
					clearObserve(oo);
				}
				if(oo.id === obj.__im__oid)break;
			}
			observedObjects.splice(i,1);
		}

		function handler(changes){
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
		    		if(typeof v === 'object'){
		    			var pc = path.concat();
		    			pc.push(name);
		    			target.__im__innerProps[name] = observeData(pc,v,comp);
		    		}
		    		Object.defineProperty(target,name,{
	    				get:function(){return getter.call(this,name)},
						set:function(v){setter.call(this,name,v)},
						enumerable:true,
						configurable:true
	    			})
		    	}

		    	if(type === 'delete'){
		    		var obj = snap[name];
		    		if(typeof obj === 'object'){

		    		}
		    		delete snap[name];
		    	}

		    	var changeObj = {object:target,name:name,pc:path,xpc:xpath,oldVal:old,newVal:v,comp:comp,type:type};
		    	Builder.handleChange(changeObj);
		    }
		}
	}//end if