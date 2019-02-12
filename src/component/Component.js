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

	this.$id = 'C_' + im_counter++;

	/**
	 * 对顶级元素的引用
	 * @type {HTMLElement}
	 */
	this.$el = el;
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

	this._watchers = [];
	this._combiningChange = false;
	this._updateMap = {};
	this._lastProps = {};

	impex._cs[this.$id] = this;
};
function F(){}
F.prototype = EventEmitter.prototype;  
Component.prototype = new F();  
Component.prototype.constructor = Component.constructor; 
ext({
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {String} path 属性路径，比如a.b.c
	 * @param  {Function} cbk      回调函数，[newVal,oldVal,k]
	 */
	$watch:function(path,cbk){
		var watcher = new Watcher(function(change) {
			cbk && cbk.call(this,change.newVal,change.oldVal,change.name);
		},this);
		console.log('watcher变更监控。。。。',this.$id);
		Monitor.target = watcher;
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
	destroy:function(){
		this.onDestroy && this.onDestroy();
		var id = this.$id;

		this._watchers.forEach(function(watcher) {
			watcher.dispose();
		});
		this._watchers = null;

		if(this._updateTimer){
			clearTimeout(this._updateTimer);
			this._updateTimer = null;
		}

		if(this.$parent){
			
			var index = this.$parent.$children.indexOf(this);
			if(index > -1){
				this.$parent.$children.splice(index,1);
			}
			this.$parent = null;
		}

		while(this.$children.length > 0){
			this.$children[0].destroy();
		}

		this.$children = 
		impex._cs[id] = null;
		delete impex._cs[id];

		destroyDirective(this.$vnode,this);

		this.$vnode = 
		this.$el = 
		this.$compTags = 
		this.$root = 

		this.$ref = 
		this.$id = null;
	},
	/**
	 * 如果一个引用参数发生了改变，那么子组件必须重载该方法，
	 * 并自行判断是否真的修改了。但是更好的方案是，调用子组件的某个方法比如刷新之类
	 */
	onPropChange:function(key,newVal,oldVal){
		this[key] = newVal;
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

    	mountComponent(this,this.$vnode);
    },
    //解析组件参数，并编译视图
    _parse:function(opts) {
    	opts = opts || COMP_MAP[this.$name];
    	preprocess(this,opts);

    	//lc onCreate
    	this.onCreate && this.onCreate();

		if(this._processedTmpl)
			compileComponent(this);

		//挂载组件
		if(this.$el){
			this.$mount();
		}

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
		var newProps = parseInputProps(this,this.$parent,this._props,this._input);
		
		for(var k in newProps){
			//记录旧值
			this._lastProps[k] = this[k];
			this[k] = newProps[k];
		}
		//重置多余属性
		this._propKeys.forEach(function(k) {
			if(!(k in newProps)){
				this[k] = this._lastProps[k] || undefined;
			}
		},this);

		this._propKeys = Object.keys(newProps);
		this._needUpdate = false;
	}
},Component.prototype);

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
function preprocess(comp,opts) {
    var tmpl = null,
    	state = {},
    	computeState = {},
    	input = null;

    //解析组件模型
    if(opts){
    	tmpl = opts.template;
    	state = opts.state || {};
    	input = opts.input;
    	computeState = opts.computeState;

    	var keys = Object.keys(opts);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            if(isFunction(opts[k])) {
            	comp[k] = opts[k];
            }
        }
		
		if(isFunction(state)){
			state = state.call(comp);
		}
	}

	if(input){
		comp._input = input;
	}

	//解析入参，包括
	//验证必填项和入参类型
	//建立变量依赖
	//触发onPropBind
	if(comp._props){
		var props = parseInputProps(comp,comp.$parent,comp._props,input);
		comp._propKeys = Object.keys(props);
		for(var k in props){
			state[k] = props[k];
		}
	}

	//编译前可以对模版视图或者slot的内容进行操作
	//可以通过RawNode来获取组件的innerHTML或者结构化的RawNode节点
	//但是任何试图修改raw的操作都是无效的，因为此时的vnode在组件编译后会被替换
	//顶级组件不会调用该方法
	if(tmpl){
		if(comp.onBeforeCompile && comp.$vnode)
	        tmpl = comp.onBeforeCompile(tmpl,comp.$vnode.raw);
		comp._processedTmpl = tmpl.trim()
	    .replace(/<!--[\s\S]*?-->/mg,'')
	    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/mg,'')
	    .replace(/^\s+|\s+$/img,' ')
	    .replace(/>\s([^<]*)\s</,function(a,b){
	            return '>'+b+'<';
	    });
	}

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
		var watcher = new Watcher(function(change,wtc) {
			var v = wtc.fn.call(this,this);
			this[wtc.k] = v;
		},comp);
		watcher.k = k;
		watcher.fn = fn;

		Monitor.target = watcher;
		console.log('compute变更监控。。。。',comp.$id);
		var v = fn.call(comp);
		Monitor.target = null;
		console.log('compute变更监控。。。。end');

		comp.$state[k] = v;
		comp.$state = defineProxy(comp.$state,null,comp,true);
	}
}
function parseInputProps(comp,parent,parentAttrs,input){

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
			var vn = comp.$vnode;
			var args = [parent];
			var forScopeStart = '',forScopeEnd = '';
			if(vn._forScopeQ)
		        for(var i=0;i<vn._forScopeQ.length;i++){
		            forScopeStart += 'with(arguments['+(1+i)+']){';
		            forScopeEnd += '}';
		            args.push(vn._forScopeQ[i]);
		        }
			var fn = new Function('scope','with(scope){'+forScopeStart+'return '+ depMap[k] +forScopeEnd+'}');
			//建立parent的watcher
			var watcher = new Watcher(function(change,wtc) {
				var newVal = wtc.fn.apply(parent,wtc.args);
				this.onPropChange && this.onPropChange(wtc.k,newVal,this[wtc.k]);
			},comp);
			watcher.k = k;
			watcher.fn = fn;
			watcher.args = args;
			Monitor.target = watcher;
			console.log('入参变更监控。。。。',comp.$id);
			//removeIf(production)
			try{
		    //endRemoveIf(production)
		       	rs[k] = fn.apply(parent,args);
		    //removeIf(production)
		    }catch(e){
		        assert(false,comp.$name,XERROR.COMPONENT.DEP,"creating dependencies error with prop "+JSON.stringify(k)+": ",e);
		    }
		    //endRemoveIf(production)
		    Monitor.target = null;
		    console.log('入参变更监控。。。。end');
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
	
	if(!rs)return;

	if(comp.onPropBind){
		rs = comp.onPropBind(rs);
	}

	return rs;	
}

function compileComponent(comp){
	//监控state
	var watcher = new Watcher(function(change) {
		this._updateMap[change.name] = change;
		ready2notify(this);
		console.log('组件属性变更',arguments);
	},comp);
	Monitor.target = watcher;
	console.log('组件属性变更监控。。。。',comp.$id);
	var vnode = buildVDOMTree(comp);
	Monitor.target = null;
	console.log('组件属性变更监控。。。。end');

	var pv = null;
	if(comp.$vnode){
		pv = comp.$vnode.parent;
		var cs = pv.children;
		var i = cs.indexOf(comp.$vnode);
		if(i>-1){
			cs.splice(i,1,vnode);
		}
		//绑定组件上的指令
		vnode._comp_directives = comp.$vnode.directives;
	}
	//覆盖编译后的vnode
	comp.$vnode = vnode;
	vnode.parent = pv;

	comp.onCompile && comp.onCompile(comp.$vnode);//must handle slots before this callback 
}
function ready2notify(comp) {
	comp._combiningChange = true;

	if(comp._updateTimer)
		clearTimeout(comp._updateTimer);
	comp._updateTimer = setTimeout(function(){
		//通知组件更新
		updateComponent(comp,comp._updateMap);

		console.log('update',comp.$id)

		//restore
		comp._updateMap = {};
		comp._combiningChange = false;
	},20);
}
/**
 * 准备挂载组件到页面
 */
function mountComponent(comp,parentVNode){
	var dom = transform(comp.$vnode,comp);

	//beforemount
	comp.onBeforeMount && comp.onBeforeMount(dom);

	//mount
	//在子组件之前插入页面可以在onMount中获取正确的dom样式
	comp.$el.parentNode.replaceChild(dom,comp.$el);
	comp.$el = dom;

	if(comp.$name){
		comp.$el.setAttribute(DOM_COMP_ATTR,comp.$name);
		comp.$vnode.setAttribute(DOM_COMP_ATTR,comp.$name);
	}
	
	comp.onMount && comp.onMount(comp.$el);

	callDirective(comp.$vnode,comp,0);
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
	var forScopeQ = compareVDOM(vnode,comp.$vnode,comp);

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
		if(child._needUpdate){
			child._updateProps();
		}

		var cvnode = child.$vnode;
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
        assert(false,comp.$name,XERROR.COMPILE.ERROR,"compile error with attributes "+JSON.stringify(comp.$attributes)+": ",e);
    }
    //endRemoveIf(production)
    
    return root;
}
