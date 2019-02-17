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
	this.$props;
	this._props = props;//raw props
	this._watchers = [];//use to del
	this._updateMap = {};
	this._propMap = {};
	this._propWatcher = {};
	impex._cs[this.$id] = this;

	
	//lc onCreate
	this.onCreate && this.onCreate();
},EventEmitter,{
	$setState:function(stateObj) {
		for(var k in stateObj){
			this.$state[k] = stateObj[k];
		}
		
		//reobserve state
		observe(this.$state,this);
	},
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {String} path 属性路径，比如a.b.c
	 * @param  {Function} cbk      回调函数，[change]
	 */
	$watch:function(path,cbk){
		cbk = cbk.bind(this);
		this._watchers.push(cbk);
		console.log('watcher变更监控。。。。',this.$id);
		Monitor.target = cbk;
		//find monitor
		var makeWatch = new Function('state','return state.'+path);

		makeWatch(this.$state);
		Monitor.target = null;
		console.log('watcher变更监控。。。。end');

		return this;
	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	$destroy:function(){
		this.onDestroy && this.onDestroy();
		var id = this.$id;

		//clear watchers
		this._watchers.forEach(function(watcher) {
			watcher.monitors.forEach(function(m) {
				m.removeWatcher(watcher);
			});
		});
		var vw = this._viewWatcher;
		vw.monitors.forEach(function(m) {
			m.removeWatcher(vw);
		});
		this._viewWatcher = 
		this._watchers = null;

		if(this._updateTimer){
			clearTimeout(this._updateTimer);
			this._updateTimer = null;
		}
		if(this._propTimer){
			clearTimeout(this._propTimer);
			this._propTimer = null;
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

		this._props = 
		this._watchers = 
		this._updateMap = 
		this._propMap = 
		this._propWatcher = 

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

		if(this._processedTmpl)
			compileComponent(this);

		//挂载组件
		if(this.$el){
			this.$mount();
		}

		console.log('mounted',this.$id)

		//init children
		for(var i = this.$children.length;i--;){
			this.$children[i]._parse();
		}
	},
	//VDOM对比时，自动检测需要更新入参
	//该方法并不会立即更新组件的state，只是增加一个更新标记
	//在父组件完成VDOM对比后才会开始更新
	_checkUpdate:function(props) {
		var oldPropsStr = JSON.stringify(this._props);
		var newPropsStr = JSON.stringify(props);
		if(oldPropsStr == newPropsStr)return;

		this._needUpdate = true;
		this._props = props;
	},
	_updateProps:function() {
		if(!this._needUpdate)return;
		var newProps = parseProps(this,this.$parent,this._props,this.constructor.props);
		
		this.onPropsChange && this.onPropsChange(newProps);

		this.$props = newProps;

		this._needUpdate = false;
	},
	_append:function(child) {
		this.$children.push(child);
		child.$parent = this;
		child.$root = this.$root;
	},
	/******* 默认实现 ********/
	onPropsChange:function(newProps){
		this.$setState(newProps);
    },
    onBeforeCompile:function(tmpl,rawNode) {
    	this.$setState(this.$props);
    	return tmpl;
    }
});

function getDirectiveParam(di,comp) {
	var dName = di[2].dName;
	var d = DIRECT_MAP[dName];
	var params = di[2].dArgsAry;
	var filter = di[2].dFilter;
	var v = di[1];
	var exp = di[3].vExp;

	return [d,{comp:comp,value:v,args:params,exp:exp,filter:filter}];
}

/*********	component handlers	*********/
function callDirective(vnode,comp,type){
	if(isUndefined(vnode.txt)){
		if(!vnode._comp){//uncompiled node  dosen't exec directive
			//directive init
			var dircts = vnode.directives;
			if(vnode._comp_directives){
				dircts = dircts.concat(vnode._comp_directives);
			}
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var part = getDirectiveParam(di,comp);
					var d = part[0];
					
					if(type == 0){
						d.onActive && d.onActive(vnode,part[1],vnode.dom);
					}else{
						d.onUpdate && d.onUpdate(vnode,part[1],vnode.dom);
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
		if(!vnode._comp){//uncompiled node  dosen't exec directive
			//directive init
			var dircts = vnode.directives;
			if(vnode._comp_directives){
				dircts = dircts.concat(vnode._comp_directives);
			}
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var part = getDirectiveParam(di,comp);
					var d = part[0];
					
					d.onDestroy && d.onDestroy(vnode,part[1]);
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

	//解析入参，包括
	//验证必填项和入参类型
	//建立变量依赖
	var calcProps = parseProps(comp,comp.$parent,comp._props,props);
	comp.$props = calcProps;
	
	//此时可以访问$props
	if(state)
		state = state.call(comp);

	//observe state
	observe(state,comp);

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

		Monitor.target = watcher;
		console.log('compute变更监控。。。。',comp.$id);
		var v = fn.call(comp);
		Monitor.target = null;
		console.log('compute变更监控。。。。end');

		comp.$state[k] = v;
		defineProxy(comp.$state,null,comp,true);
	}

	//编译前可以对模版视图或者slot的内容进行操作
	//可以通过RawNode来获取组件的innerHTML或者结构化的RawNode节点
	//但是任何试图修改raw的操作都是无效的，因为此时的vnode在组件编译后会被替换
	//顶级组件不会调用该方法
	if(tmpl){
		if(comp.onBeforeCompile && comp.$vel)
	        tmpl = comp.onBeforeCompile(tmpl,comp.$vel.raw);
		comp._processedTmpl = tmpl.trim()
	    .replace(/<!--[\s\S]*?-->/mg,'')
	    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/mg,'')
	    .replace(/^\s+|\s+$/img,' ')
	    .replace(/>\s([^<]*)\s</,function(a,b){
	            return '>'+b+'<';
	    });
	}
}
function parseProps(comp,parent,parentAttrs,input){

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

	var rs = {};
	if(parentAttrs){
		var depMap = {};
		for(var k in parentAttrs){
			var v = parentAttrs[k];
			if(k == ATTR_REF_TAG){
				continue;
			}
			k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});
			// xxxx
			if(k[0] !== PROP_TYPE_PRIFX){
				rs[k] = v;
				continue;
			}

			// .xxxx
			var n = k.substr(1);
			depMap[n] = v;
		}//end for
		//创建watcher
		for(k in depMap){
			var vn = comp.$vel;
			var args = [parent];
			var forScopeStart = '',forScopeEnd = '';
			if(vn._forScopeQ)
		        for(var i=0;i<vn._forScopeQ.length;i++){
		            forScopeStart += 'with(arguments['+(1+i)+']){';
		            forScopeEnd += '}';
		            args.push(vn._forScopeQ[i]);
		        }
			var fn = new Function('scope',
				'with(scope){'+forScopeStart+'return '
				+ depMap[k] +forScopeEnd+'}');
			//建立prop watcher
			var propWatcherKey = k+'-'+parent.$id;
			if(!comp._propWatcher[propWatcherKey]){
				var watcher = getPropWatcher(fn,k,args,comp);
				Monitor.target = watcher;

				console.log('入参变更监控。。。。',comp.$id);
			}
			//removeIf(production)
			try{
		    //endRemoveIf(production)
		       	rs[k] = fn.apply(parent,args);
		    //removeIf(production)
		    }catch(e){
		        assert(false,comp.$name,XERROR.COMPONENT.DEP,"creating dependencies error with prop "+JSON.stringify(k)+": ",e);
		    }
		    //endRemoveIf(production)
		    if(!comp._propWatcher[propWatcherKey]){
			    //记录watcher，防止重复
			    comp._propWatcher[propWatcherKey] = 1;
			    Monitor.target = null;
			    console.log('入参变更监控。。。。end');
		    }
		}
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
	}

	//removeIf(production)
	//check requires
	assert(Object.keys(requires).length==0,comp.$name,XERROR.INPUT.REQUIRE,"input props ["+Object.keys(requires).join(',')+"] are required");
	//endRemoveIf(production)

	return rs;	
}

function compileComponent(comp){
	//监控state
	Monitor.target = getViewWatcher(comp);
	console.log('组件属性变更监控。。。。',comp.$id);
	var vnode = buildVDOMTree(comp);
	Monitor.target = null;
	console.log('组件属性变更监控。。。。end');

	var pv = null;
	if(comp.$vel){
		pv = comp.$vel.parent;
		var cs = pv.children;
		var i = cs.indexOf(comp.$vel);
		if(i>-1){
			cs.splice(i,1,vnode);
		}
		//绑定组件上的指令
		vnode._comp_directives = comp.$vel.directives;
	}
	//覆盖编译后的vnode
	comp.$vel = vnode;
	vnode.parent = pv;

	comp.onCompile && comp.onCompile(comp.$vel);//must handle slots before this callback 
}
/**
 * 准备挂载组件到页面
 */
function mountComponent(comp,parentVNode){
	var dom = transform(comp.$vel,comp);

	//beforemount
	comp.onBeforeMount && comp.onBeforeMount(dom);

	//mount
	//在子组件之前插入页面可以在onMount中获取正确的dom样式
	comp.$el.parentNode.replaceChild(dom,comp.$el);
	comp.$el = dom;

	if(comp.$name){
		comp.$el.setAttribute(DOM_COMP_ATTR,comp.$name);
		comp.$vel.setAttribute(DOM_COMP_ATTR,comp.$name);
	}
	
	comp.onMount && comp.onMount(comp.$el);

	callDirective(comp.$vel,comp,0);
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
	Monitor.target = getViewWatcher(comp);
	console.log('组件属性变更监控。。。。',comp.$id);
	var vnode = buildVDOMTree(comp);
	Monitor.target = null;
	console.log('组件属性变更监控。。。。end');

	//diffing
	var forScopeQ = compareVDOM(vnode,comp.$vel,comp);

	//mount subcomponents which created by VDOM 
	for(var i = 0;i<comp.$children.length;i++){
		var c = comp.$children[i];
		if(isUndefined(c._processedTmpl)){
			c._parse();
		}
	}

	comp.onUpdate && comp.onUpdate(changeMap);

	//更新子组件
	comp.$children.forEach(function(child) {
		//更新子组件
		child._updateProps();

		var cvnode = child.$vel;
		if(cvnode._comp_directives){
			cvnode._comp_directives.forEach(function(di){
				var part = getDirectiveParam(di,child);
				var d = part[0];
				
				d.onUpdate && d.onUpdate(cvnode,part[1],cvnode.dom);
			});
		}
	});
}

/**
 * get vdom tree for component
 */
function buildVDOMTree(comp){
    var root = null;
    var fn = compile(comp._processedTmpl,comp);
    //removeIf(production)
    try{
    //endRemoveIf(production)
        root = fn.call(comp,comp,createElement,createTemplate,createText,createElementList,doFilter);
    //removeIf(production)
    }catch(e){
        assert(false,comp.$name,XERROR.COMPILE.ERROR,"compile error with attributes "+JSON.stringify(comp._props)+": ",e);
    }
    //endRemoveIf(production)
    
    return root;
}
