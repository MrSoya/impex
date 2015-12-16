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