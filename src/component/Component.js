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
var Component = extend(function(props) {
	EventEmitter.call(this);

	this.$id = 'C_' + im_counter++;

	/**
	 * 对顶级元素的引用
	 * @type {HTMLElement}
	 */
	this.$el;
	/**
	 * 对顶级虚拟元素的引用
	 */
	this.$vel;
	/**
	 * 对子组件/dom的引用
	 * @type {Object}
	 */
	this.$ref = {};
	/**
	 * 组件标签引用
	 * @type {Object}
	 */
	this.$compTags = {};
	/**
	 * 组件类型，在创建时由系统自动注入
	 */
	this.$name;
	/**
	 * 对父组件的引用
	 * @type {Component}
	 */
	this.$parent;
	/**
	 * 子组件列表
	 * @type {Array}
	 */
	this.$children = [];
	/**
	 * 计算后的参数map
	 */
	this.$props = props;
	this._watchers = [];//use to del
	this._updateMap = {};
	this._slotted = false;//组件是否支持插槽
	impex._cs[this.$id] = this;
},EventEmitter,{
	$setState:function(stateObj) {
		for(var k in stateObj){
			this.$state[k] = stateObj[k];
		}
		
		//reobserve state
		observe(this.$state,this);
	},
	/**
	 * 回调会在当前任务队列执行完成后调用
	 * @param  {Function} fn 回调函数
	 */
	$nextTick:function(fn) {
		addTask(new Task(fn.bind(this)));
	},
	/**
	 * 强制组件立即更新视图
	 */
	$forceUpdate:function() {
		updateComponent(this,{});
	},
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {String} path 属性路径，比如a.b.c
	 * @param  {Function} cbk      回调函数，[change]
	 */
	$watch:function(path,cbk){
		cbk = cbk.bind(this);
		var watcher = getWatchWatcher(cbk);
	
		this._watchers.push(watcher);
		Monitor.target = watcher;
		//find monitor
		var makeWatch = new Function('state','return state.'+path);
		makeWatch(this.$state);
		Monitor.target = null;

		return this;
	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	$destroy:function(){
		callLifecycle(this,LC_CO.destroy);
		
		var id = this.$id;

		//clear watchers
		this._watchers.forEach(function(watcher) {
			if(watcher.monitors)
				watcher.monitors.forEach(function(m) {
					m.removeWatcher(watcher);
				});
		});
		var vw = this._viewWatcher;
		if(vw.monitors)
			vw.monitors.forEach(function(m) {
				m.removeWatcher(vw);
			});
		this._viewWatcher = 
		this._watchers = null;

		if(this._updateTimer){
			clearTimeout(this._updateTimer);
			this._updateTimer = null;
		}

		//clear refs
		if(this.$parent){
			var index = this.$parent.$children.indexOf(this);
			if(index > -1){
				this.$parent.$children.splice(index,1);
			}
			this.$parent = null;
		}

		while(this.$children.length > 0){
			this.$children[0].$destroy();
		}

		this.$children = 
		impex._cs[id] = null;
		delete impex._cs[id];

		destroyDirective(this.$vel,this);

		this._watchers = 
		this._updateMap = 

		this.$vel = 
		this.$el = 
		this.$compTags = 
		this.$root = 
		this.$state = 
		this.$props = 

		this.$ref = 
		this.$id = null;
	},
    /**
     * 把一个未挂载的根组件挂载到指定的dom中
     * @param  {HTMLElement|String} target 挂载的目标dom或者选择器
     */
    $mount:function(target) {
    	if(target){
    		if(isString(target) && target.trim()){
	    		target = document.querySelector(target);
	    	}
	    	target.append(this.$el);
    	}

    	mountComponent(this,this.$vel);
    },
    //解析组件参数，并编译视图
    _parse:function() {
    	preprocess(this);

		callLifecycle(this,LC_CO.created);

		var tmpl = this._processedTmpl;
		if(tmpl){
			this._processedTmpl = filterSlot(this._innerHTML,tmpl);
		    if(this._processedTmpl != tmpl){
		        this._slotted = true;
		    }
			//removeIf(production)
			this._tmplRows = this._processedTmpl.split('\n');
			//endRemoveIf(production)
			compileComponent(this);
		}

		//挂载组件
		if(this.$el && this.$el.parentElement){
			this.$mount();
		}

		//init children
		for(var i = this.$children.length;i--;){
			this.$children[i]._parse();
		}
	},
	_update:function(newVnode) {
		var newProps = newVnode.attrs;
		//仅进行非引用类型参数判断
		var update = false;
		var npk = Object.keys(newProps);
		var opk = Object.keys(this.$props);
		if(npk.length != opk.length){
			update = true;
		}else{
			for(var k in newProps){
				if(this.$props[k] != newProps[k] || isObject(newProps[k])){
					update = true;
					break;
				}
			}
		}

		//更新自定义事件
		if(newVnode.events){
			bindCustomEvent(newVnode.events,this);
		}
		//更新组件指令
		if(newVnode.directives){
			var dis = this._directives = newVnode.directives;
			//只做更新
			for(var k in dis){
				var nd = dis[k];
				var od = this.$vel.directives[k];
				if(od.value != nd.value){
					this.$vel.directives[k] = nd;
					callDirective(LC_DI.update,this.$vel,this,nd);
				}
			}
		}
		
		
		if(update){
			callLifecycle(this,LC_CO.propsChange,[newProps]);
			this.$props = newProps;
		}
	},
	_append:function(child) {
		this.$children.push(child);
		child.$parent = this;
		child.$root = this.$root;
	},
	/******* 默认实现 ********/
	/**
	 * 默认的propsChange回调可能存在很大的性能风险，
	 * 而且有可能会导致死循环
	 * @param  {[type]} newProps [description]
	 * @return {[type]}          [description]
	 */
	propsChange:function(newProps){
		this.$setState(newProps);
    }
});

/**
 * 如果生命周期回调有返回值，并且有多个回调函数，返回值以最后一次回调返回的结果为准
 */
function callLifecycle(comp,lcName,argAry) {
	var lcq = comp.constructor.lcq;
	var rs = null;
	lcq && lcq.forEach(function(lcMap) {
		lcMap[lcName] && (rs = lcMap[lcName].apply(comp,argAry));
	});
	//removeIf(production)
	try{
	//endRemoveIf(production)
		comp[lcName] && (rs = comp[lcName].apply(comp,argAry));
	//removeIf(production)
	}catch(e){
		error(comp.$name,'errors in lifecycle ['+lcName+']',e);
	}
	//endRemoveIf(production)
	
	return rs;
}

/*********	component handlers	*********/
function callDirectives(type,vnode,comp,directives){
	for(var k in directives){
		var di = directives[k];
		var d = DIRECT_MAP[di.name];
		d[type] && d[type](vnode.dom,di,vnode);
	}
}
function callDirective(type,vnode,comp,directive) {
	var d = DIRECT_MAP[directive.name];
	d[type] && d[type](vnode.dom,directive,vnode);
}

function destroyDirective(vnode,comp){
	if(isUndefined(vnode.txt)){
		if(!vnode._comp){//uncompiled node  dosen't exec directive

			callDirectives(LC_DI.unbind,vnode,comp,vnode.directives);

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					destroyDirective(vnode.children[i],comp);
				}
			}//end if
		}//end if
	}
}

/**
 * 在编译组件前进行预处理，包括
 * 	解析组件模型
 * 	参数绑定处理
 * 	模版处理
 * 	监控state
 * 	计算状态处理
 */
function preprocess(comp) {
    var tmpl = comp.constructor.tmpl,
    	state = comp.constructor.state,
    	computeState = comp.constructor.computeState,
    	props = comp.constructor.props;

	//验证必填项和入参类型
	if(props)
		checkProps(comp,props);
	
	//此时可以访问$props
	if(state)
		state = state.call(comp);

	//observe state
	observe(state,comp);
	comp.$state = state;

	//removeIf(production)
    //check computeState
	for(var k in computeState){
		var cs = computeState[k];
		var fn = cs.get || cs;

		assert(fn instanceof Function,comp.$name,XERROR.COMPONENT.COMPUTESTATE,"invalid computeState '"+k+"' ,it must be a function or an object with getter");
	}
	//endRemoveIf(production)

	//compute state
	for(var k in computeState){
		var cs = computeState[k];
		var fn = cs.get || cs;
		//record hooks
		var watcher = getComputeWatcher(fn,k,comp);
		comp._watchers.push(watcher);

		Monitor.target = watcher;
		var v = fn.call(comp);
		Monitor.target = null;

		comp.$state[k] = v;
		observe(comp.$state,comp);
	}

	//编译前可以对模版视图或者slot的内容进行操作
	//可以通过RawNode来获取组件的innerHTML或者结构化的RawNode节点
	//但是任何试图修改raw的操作都是无效的，因为此时的vnode在组件编译后会被替换
	//顶级组件不会调用该方法
	if(tmpl){
		var procTmpl = callLifecycle(comp,LC_CO.compile,[tmpl,comp.$vel?comp.$vel.raw:null]);
		if(typeof procTmpl == 'string')tmpl = procTmpl;

		comp._processedTmpl = tmpl.trim()
	    .replace(/<!--[\s\S]*?-->/mg,'')
	    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/mg,'');
	}
}
function checkProps(comp,input){

	//解析input，抽取必须项
	var requires = {};
	if(input){
		for(var k in input){
			var arg = input[k];
			if(arg.require){
				requires[k] = 1;
			}
		}
	}

	var rs = comp.$props;
	//验证input
	for(var k in rs){
		var v = rs[k];
		if(input && k in input){
			delete requires[k];
			
			//removeIf(production)
			//check type 
			if(isUndefined(input[k].type))continue;
			assert((function(k,v,input,component){
				if(!input[k] || !input[k].type)return false;
				var checkType = input[k].type;
				checkType = checkType instanceof Array?checkType:[checkType];
				var vType = typeof v;
				if(v instanceof Array){
					vType = 'array';
				}
				if(vType !== 'undefined' && checkType.indexOf(vType) < 0){
					return false;
				}
				return true;
			})(k,v,input,comp),comp.$name,XERROR.INPUT.TYPE,"invalid type ["+(v instanceof Array?'array':(typeof v))+"] of input prop ["+k+"];should be ["+(input[k].type && input[k].type.join?input[k].type.join(','):input[k].type)+"]");
			//endRemoveIf(production)
		}
	}//end for

	//removeIf(production)
	//check requires
	assert(Object.keys(requires).length==0,comp.$name,XERROR.INPUT.REQUIRE,"input props ["+Object.keys(requires).join(',')+"] are required");
	//endRemoveIf(production)
}

function compileComponent(comp){
	if(comp.$vel){
		//绑定组件事件
		bindCustomEvent(comp.$vel.events,comp);
	}

	//监控state
	Monitor.target = getViewWatcher(comp);
	var vnode = buildVDOMTree(comp);
	Monitor.target = null;

	var pv = null;
	if(comp.$vel){
		pv = comp.$vel.parent;
		var cs = pv.children;
		var i = cs.indexOf(comp.$vel);
		if(i>-1){
			cs.splice(i,1,vnode);
		}
	}

	//覆盖编译后的vnode
	comp.$vel = vnode;
	vnode.parent = pv;
}
function bindCustomEvent(events,comp) {
	var natives = undefined;
	if(events){
		/**
		 * 对原生组件事件进行转换
		 */
		for(var k in events){
			var ev = events[k];
			var modifiers = ev.modifiers;
			var evName = k;
			//native
			var handler = ev.value;
			if(modifiers && modifiers.indexOf(EVENT_MODIFIER_NATIVE)>-1){
				evName = ev.cName;
				ev.value = getCustomEvHandler(evName,comp);
				if(!natives)natives = {};
				natives[k] = ev;
			}

			comp.$on(evName,handler,comp.$parent);
		}
	}
	comp._natives = natives;
}
function getCustomEvHandler(k,comp) {
	return function($event,$vnode) {
		comp.$emit(k,$event,$vnode);
	}
}
/**
 * 准备挂载组件到页面
 */
function mountComponent(comp,parentVNode){
	var dom = transform(comp.$vel,comp);

	callLifecycle(comp,LC_CO.willMount,[dom]);

	//mount
	//在子组件之前插入页面可以在mounted中获取正确的dom样式
	comp.$el.parentNode.replaceChild(dom,comp.$el);
	comp.$el = dom;

	//directive
	callDirectives(LC_DI.appended,comp.$vel,comp,comp.$vel.directives);

	if(comp.$name){
		comp.$el.setAttribute(DOM_COMP_ATTR,comp.$name);
	}
	
	callLifecycle(comp,LC_CO.mounted);
}

//////	update flow
function updateComponent(comp,changeMap){
	if(!comp.$id)return;//destroyed
	
	var renderable = true;
	renderable = callLifecycle(comp,LC_CO.willUpdate,[changeMap]);
	if(renderable === false)return;

	//diffing
	Monitor.target = getViewWatcher(comp);
	diff(comp);
	Monitor.target = null;

	//mount subcomponents which created by VDOM 
	for(var i = 0;i<comp.$children.length;i++){
		var c = comp.$children[i];
		if(isUndefined(c._processedTmpl)){
			c._parse();
		}
	}

	callLifecycle(comp,LC_CO.updated,[changeMap]);
}

/**
 * get vdom tree for component
 */
function buildVDOMTree(comp){
    var root = null;
    var fn = compile(comp._processedTmpl,comp);
    var argAry = [comp];
    var p = comp.$parent;
    while(p){
        argAry.unshift(p);
        p = p.$parent;
    }
    argAry.push(createElement,createTemplate,createText,createElementList,doFilter,compileVDOMStr);
    //removeIf(production)
    try{
    //endRemoveIf(production)
        root = fn.apply(comp,argAry);
    //removeIf(production)
    }catch(e){
        assert(false,comp.$name,"compile error ",e);
    }
    //endRemoveIf(production)

    return root;
}
