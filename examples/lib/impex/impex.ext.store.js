/**
 * Store是一个基于impex的flux解决方案。用于处理大量共享状态需要交互的场景
 */
!function(impex){
	
	var store_counter = 0;

	/**
	 * @class impex.Store是一个基于impex的flux解决方案。用于处理大量共享状态需要交互的场景
	 * @param {Object} data 构造参数
	 * @param {Object} [actions] store中的逻辑实现
	 * @param {Object} [state] store中的存储
	 */
	function Store(data){
		this._uid = 'S_'+store_counter++;
		/**
		 * 数据
		 * @type {Object}
		 */
		this.state = {};

		this.__subscribeMap = {};
		//{state:[comp,compState]}
		this.__noticeMap = {};
		//current action
		this.__action;

		var keys = Object.keys(data);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            this[k] = data[k];
        }

		if(!this.actions)this.actions = {};

		if(this.state instanceof Function){
			this.state = this.state.call(ins);
		}

		this.state = impex._Observer.observe(this.state,this);
	}

	Store.prototype = {
		/**
		 * 监听action执行
		 * @param  {String} type     action type
		 * @param  {Function | Component} listener 监听回调或组件引用
		 * @param {Object} context 参数/回调函数所属上下文。可以是组件、指令或者任何对象
		 * 如果是组件引用，系统会自动更新组件对应由action执行引起的state变动
		 */
		subscribe:function(type,listener,context){
	        var ts = type.replace(/\s+/mg,' ').split(' ');
	        for(var i=ts.length;i--;){
	            var t = ts[i];
	            var listeners = this.__subscribeMap[t];
	            if(!listeners)listeners = this.__subscribeMap[t] = [];
	            
	            listeners.push([listener,context]);
	        }//end for
	    },
	    /**
		 * 解除监听action执行
		 * @param  {String} [type]  action type。如果是空，删除所有监听
		 * @param  {Function | Component} [listener] 监听回调或组件引用。如果是空，删除指定分类监听
		 */
	    unsubscribe:function(type,listener){
	        var types = null;
	        if(!type){
	            types = Object.keys(this.__subscribeMap);
	        }else{
	            types = type.replace(/\s+/mg,' ').split(' ');
	        }

	        for(var i=types.length;i--;){
	            var listeners = this.__subscribeMap[types[i]];
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
		commit:function(){
			var action = arguments[0];

	        var params = [];
	        for(var i=1;i<arguments.length;i++){
	            params.push(arguments[i]);
	        }

	        this.__action = action;

	        var act = this.actions[action];
	        act && act.apply(this,params);

	        return this;
		},
		__update:function(change){
			var actionTypes = [];
			var actionMap = {};
			for(var k in change){
				var c = change[k];
				var action = c[1];
				if(actionTypes.indexOf(action)<0){
					actionTypes.push(action);
				}
			}

			for(var i=actionTypes.length;i--;){
				var action = actionTypes[i];
				var cbks = this.__subscribeMap[action];
				var meta = {type:action,changeMap:changeMap};

				// this.onUpdate && this.onUpdate(meta);

				if(cbks)
				cbks.forEach(function(cbk){
					var fn = cbk[0];
					var context = cbk[1];
					if(fn instanceof Function){
						fn.call(context,meta);
					}
				});
			}
			
		}
	};

	impex.Store = Store;
}(impex);
