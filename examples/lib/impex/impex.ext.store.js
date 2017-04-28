/**
 * Store是一个基于impex的flux解决方案。用于处理大量共享状态需要交互的场景
 */
!function(impex){

	/**
	 * 变更处理器，处理所有变量变更
	 */

	var Handler = new function() {

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
		var changes = [];
		var store = null;

		this.handle = function (change){
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

						// console.log('处理变更',change);
						
						var c = {
							name:name,
							newVal:newVal,
							oldVal:oldVal,
							path:pc,
							type:type,
							object:object};

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

		impex.util.ext(this,data);

		if(!this.actions)this.actions = {};

		if(this.state instanceof Function){
			this.state = this.state.call(ins);
		}

		this.state = impex.Observer.observe(this.state,this,Handler.handle);
	}

	var lastAction = null;

	Store.prototype = {
		/**
		 * 监听action执行
		 * @param  {String} type     action type
		 * @param  {Function | Component} listener 监听回调或组件引用。
		 * 如果是组件引用，系统会自动更新组件对应由action执行引起的state变动
		 */
		on:function(type,listener){
	        var ts = type.replace(/\s+/mg,' ').split(' ');
	        for(var i=ts.length;i--;){
	            var t = ts[i];
	            var listeners = this.echoMap[t];
	            if(!listeners)listeners = this.echoMap[t] = [];
	            
	            listeners.push(listener);
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
	                    if(listener?listeners[j] === listener:true){
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
		},
		__update:function(changes){
			// console.log(changes)

			var action = lastAction;
			var cbks = this.echoMap[action];

			var meta = {type:action,changes:changes};

			this.onUpdate && this.onUpdate(meta);

			cbks.forEach(function(cbk){
				if(cbk instanceof Function){
					cbk(meta);
				}else{
					setState(cbk,changes);
				}
			});
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
			comp.d(p,c.newVal);
        });
	}

	impex.Store = Store;
}(impex);
