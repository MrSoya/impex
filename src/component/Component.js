/**
 * @classdesc 组件类，包含视图、模型、控制器，表现为一个自定义标签。同内置标签样，
 * 组件也可以有属性。
 * <br/>
 * 组件可以设置事件或者修改视图样式等<br/>
 * 组件实例为组件视图提供了数据和控制
 * 组件可以包含组件，所以子组件视图中的表达式可以访问到父组件模型中的值
 * <p>
 * 	组件生命周期
 * 	<ul>
 * 		<li>onCreate：当组件被创建时，该事件被触发，系统会把指定的服务注入到参数中</li>
 * 		<li>onInit：当组件初始化时，该事件被触发，系统会扫描组件中的所有表达式并建立数据模型</li>
 * 		<li>onDisplay：当组件被显示时，该事件被触发，此时组件以及完成数据构建和绑定</li>
 * 		<li>onDestroy：当组件被销毁时，该事件被触发</li>
 * 		<li>onSuspend: 当组件被挂起时，该事件被触发</li>
 * 	</ul>
 * </p>
 * 
 * @class 
 */
function Component (view) {
	var id = 'C_' + im_counter++;
	this.__id = id;
	this.__state = Component.state.created;
	/**
	 * 组件绑定的视图对象，在创建时由系统自动注入
	 * 在DOM中，视图对象的所有操作都针对自定义标签的顶级元素，而不包括子元素
	 * @type {View}
	 */
	this.view = view;
	/**
	 * 对子组件的引用
	 * @type {Object}
	 */
	this.refs = {};
	/**
	 * 组件属性。在组件调用时写在组件上的所有属性,但不包括指令
	 * <p>
	 * <x-comp x-if="show" name="'impex'" value="obj" x-each="1 to 10 as i" :click="alert(343)">
            {{i}}
        </x-comp>
	 * </p>
	 * 上面的组件x-comp会有2个prop，name的值为常量字符串impex，value的值为上级组件的对象obj
	 * @type {Object}
	 */
	this.props = {};
	/**
	 * 用于指定属性的类型，如果类型不符会报错
	 * @type {Object}
	 */
	this.propTypes = null;
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
	this.__expNodes = [];
	this.__expDataRoot = new ExpData();
	this.__expWithProps = {'*':[]};
	this.__watchWithProps = {'*':[]};
	this.__directiveWithProps = {'*':[]};
	this.__eventMap = {};
	this.__watchProps = [];
	/**
	 * 组件域内的指令列表
	 * @type {Array}
	 */
	this.directives = [];
	/**
	 * 组件模版，用于生成组件视图
	 * @type {string}
	 */
	this.template;
	/**
	 * 组件模板url，动态加载组件模板
	 */
	this.templateURL;
	/**
	 * 组件约束，用于定义组件的使用范围包括上级组件限制
	 * <p>
	 * {
	 * 	parents:'comp name' | 'comp name1,comp name2,comp name3...',
	 * 	children:'comp name' | 'comp name1,comp name2,comp name3...'
	 * }
	 * </p>
	 * 这些限制可以单个或者同时出现
	 * @type {Object}
	 */
	this.restrict;

	/**
	 * 组件数据
	 * @type {Object}
	 */
	this.data = {};
	/**
	 * 自定义事件接口
	 * @type {Object}
	 */
	this.events = {};

	impex._cs[this.__id] = this;
};
Component.state = {
	created : 'created',
	inited : 'inited',
	displayed : 'displayed',
	suspend : 'suspend'
};
function broadcast(comps,type,params){
	for(var i=0;i<comps.length;i++){
		var comp = comps[i];
		var evs = comp.__eventMap[type];
		var conti = true;
		if(evs){
			conti = false;
			for(var l=0;l<evs.length;l++){
				conti = evs[l].apply(comp,params);
			}
		}
		if(conti && comp.children.length>0){
			broadcast(comp.children,type,params);
		}
	}
}
Util.ext(Component.prototype,{
	/**
	 * 设置或者获取模型值，如果第二个参数为空就是获取模型值<br/>
	 * 设置模型值时，设置的是当前域的模型，如果当前模型不匹配表达式，则赋值无效<br/>
	 * @param  {string} path 表达式路径
	 * @param  {var} val  值
	 * @return this
	 */
	d:function(path,val){
		if(!path){
			LOGGER.warn('invalid path \''+ path +'\'');
			return;
		}
		var expObj = lexer(path);
		var evalStr = Renderer.getExpEvalStr(this,expObj);
		if(arguments.length > 1){
			if(Util.isObject(val) || Util.isArray(val)){
				val = JSON.stringify(val);
			}else 
			if(Util.isString(val)){
				val = '"'+val.replace(/\r\n|\n/mg,'\\n').replace(/"/mg,'\\"')+'"';
			}
			try{
				eval(evalStr + '= '+ val);
			}catch(e){
				LOGGER.debug("error in eval '"+evalStr + '= '+ val +"'",e);
			}
			
			return this;
		}else{
			try{
				return eval(evalStr);
			}catch(e){
				LOGGER.debug("error in eval '"+evalStr + '= '+ val +"'",e);
			}
			
		}
	},
	/**
	 * 绑定自定义事件到组件
	 * @param  {String} type 自定义事件名
     * @param  {Function} handler   事件处理回调，回调参数[target，arg1,...]
	 */
	on:function(type,handler){
		var evs = this.__eventMap[type];
		if(!evs){
			evs = this.__eventMap[type] = [];
		}
		evs.push(handler);
	},
	/**
	 * 触发组件自定义事件，进行冒泡
	 * @param  {String} type 自定义事件名
	 * @param  {...Object} [data...] 回调参数，可以是0-N个  
	 */
	emit:function(){
		var type = arguments[0];
		var params = [this];
		for (var i =1 ; i < arguments.length; i++) {
			params.push(arguments[i]);
		}
		var my = this.parent;
		setTimeout(function(){
			while(my){
				var evs = my.__eventMap[type];
				if(evs){
					var interrupt = true;
					for(var i=0;i<evs.length;i++){
						interrupt = !evs[i].apply(my,params);
					}
					if(interrupt)return;
				}				

				my = my.parent;
			}
		},0);
	},
	/**
	 * 触发组件自定义事件，进行广播
	 * @param  {String} type 自定义事件名
	 * @param  {...Object} [data...] 回调参数，可以是0-N个  
	 */
	broadcast:function(){
		var type = arguments[0];
		var params = [this];
		for (var i =1 ; i < arguments.length; i++) {
			params.push(arguments[i]);
		}
		var my = this;
		setTimeout(function(){
			broadcast(my.children,type,params);
		},0);
	},
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {string} expPath 属性路径，比如a.b.c
	 * @param  {function} cbk      回调函数，[object,name,变动类型add/delete/update,新值，旧值]
	 */
	watch:function(expPath,cbk){
		var expObj = lexer(expPath);
		var keys = Object.keys(expObj.varTree);
		if(keys.length < 1)return;
		if(keys.length > 1){
			LOGGER.warn('error on parsing watch expression['+expPath+'], only one property can be watched at the same time');
			return;
		}
		
		var varObj = expObj.varTree[keys[0]];
		var watch = new Watch(cbk,this,varObj.segments);
		//监控变量
		Builder.buildExpModel(this,varObj,watch);

		return this;
	},
	/**
	 * 添加子组件到父组件
	 * @param {Component} child 子组件
	 */
	add:function(child){
		this.children.push(child);
		child.parent = this;
	},
	/**
	 * 创建一个未初始化的子组件
	 * @param  {string} type 组件名
	 * @param  {View} target 视图
	 * @return {Component} 子组件
	 */
	createSubComponentOf:function(type,target,placeholder){
		var instance = ComponentFactory.newInstanceOf(type,
			target.__nodes?target.__nodes[0]:target,
			placeholder && placeholder.__nodes?placeholder.__nodes[0]:placeholder);
		this.children.push(instance);
		instance.parent = this;

		return instance;
	},
	/**
	 * 创建一个匿名子组件
	 * @param  {string | View} tmpl HTML模版字符串或视图对象
	 * @param  {View} target 视图
	 * @return {Component} 子组件
	 */
	createSubComponent:function(tmpl,target){
		var instance = ComponentFactory.newInstance(tmpl,target && target.__nodes[0]);
		this.children.push(instance);
		instance.parent = this;

		return instance;
	},
	/**
	 * 初始化组件，该操作会生成用于显示的所有相关数据，包括表达式等，以做好显示准备
	 */
	init:function(){
		if(this.__state !== Component.state.created)return;

		if(this.templateURL){
			var that = this;
			Util.loadTemplate(this.templateURL,function(tmplStr){
				var rs = that.view.__init(tmplStr,that);
				if(rs === false)return;
				that.__init(tmplStr);
				that.display();
			});
		}else{
			if(this.template){
				var rs = this.view.__init(this.template,this);
				if(rs === false)return;
			}
			this.__init(this.template);
		}
		return this;
	},
	__init:function(tmplStr){
		Scanner.scan(this.view,this);

		LOGGER.log(this,'inited');

		//observe data
		this.data = Observer.observe(this.data,this);

		Builder.build(this);

		this.__state = Component.state.inited;

		if(this.onInit){
			this.onInit(tmplStr);
		}

		//init children
		for(var i = this.children.length;i--;){
			this.children[i].init();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].init();
		}
		
	},
	/**
	 * 显示组件到视图上
	 */
	display:function(){
		if(
			this.__state === Component.state.displayed
		)return;

		this.view.__display(this);

		Renderer.render(this);

		//view ref
		this.view.__nodes.forEach(function(el){
			if(!el.querySelectorAll)return;
			var refs = el.querySelectorAll('*['+ATTR_REF_TAG+']');
			for(var i=refs.length;i--;){
				var node = refs[i];
				this.view.refs[node.getAttribute(ATTR_REF_TAG)] = node;
			}
		},this);
		

		this.__state = Component.state.displayed;
		LOGGER.log(this,'displayed');
		

		//display children
		for(var i = 0;i<this.children.length;i++){
			if(!this.children[i].templateURL)
				this.children[i].display();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].active();
		}

		this.onDisplay && this.onDisplay();


	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	destroy:function(){
		if(this.__state === null)return;

		LOGGER.log(this,'destroy');

		this.onDestroy && this.onDestroy();

		if(this.parent){
			var i = this.parent.children.indexOf(this);
			if(i > -1){
				this.parent.children.splice(i,1);
			}
			this.parent = null;
		}
		
		this.view.__destroy(this);

		while(this.children.length > 0){
			this.children[0].destroy();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].destroy();
		}


		this.view = 
		this.children = 
		this.directives = 
		this.__expNodes = 
		this.__expDataRoot = null;

		impex._cs[this.__id] = null;
		delete impex._cs[this.__id];

		this.__state = 
		this.__id = 
		this.templateURL = 
		this.template = 
		this.restrict = 
		this.events = 
		this.data = null;
	},
	/**
	 * 挂起组件，组件视图会从文档流中脱离，组件模型会从组件树中脱离，组件模型不再响应数据变化，
	 * 但数据都不会销毁
	 * @param {boolean} hook 是否保留视图占位符，如果为true，再次调用display时，可以在原位置还原组件，
	 * 如果为false，则需要注入viewManager，手动插入视图
	 * @see ViewManager
	 */
	suspend:function(hook){
		if(!(this instanceof Directive) && this.__state !== Component.state.displayed)return;

		LOGGER.log(this,'suspend');
		
		this.view.__suspend(this,hook===false?false:true);

		this.onSuspend && this.onSuspend();

		this.__state = Component.state.suspend;
	},
	__getPath:function(){
		return 'impex._cs["'+ this.__id +'"]';
	},
	__update:function(changes){
		var renderable = true;
		var changeList = [];
		var expNodes = [];
		var watchs = [];
		var attrObserveNodes = [];
		for(var i=changes.length;i--;){
			var c = changes[i];
			var changeParam = {
				name:c.name,
				newVal:c.newVal,
				oldVal:c.oldVal,
				type:c.type,
				path:c.path,
				object:c.object
			};
			changeList.push(changeParam);
			var expProps = c.expProps;
			for(var k=expProps.length;k--;){
				var ens = expProps[k].expNodes;
				for(var j=ens.length;j--;){
					var en = ens[j];
					if(expNodes.indexOf(en) < 0)expNodes.push(en);
				}
				var aons = expProps[k].attrObserveNodes;
				for(var j=aons.length;j--;){
					var aon = aons[j];
					if(attrObserveNodes.indexOf(aon) < 0)attrObserveNodes.push(aon);
				}
				var ws = expProps[k].watchs;
				for(var j=ws.length;j--;){
					var w = ws[j];
					if(watchs.indexOf(w) < 0)watchs.push([w,changeParam]);
				}
			}
		}
		if(this.onUpdate){
			renderable = this.onUpdate(changeList);
		}
		//render view
		if(renderable !== false){
			Renderer.renderExpNodes(expNodes);
		}
		
		this.__updateDirective(attrObserveNodes);

		this.__callWatchs(watchs);

		//update children props
		this.__updateChildrenProps(changeList);
	},
	__updateChildrenProps:function(changes){
		var matchMap = {};
		for(var i=changes.length;i--;){
			var change = changes[i];
			var path = change.path;
			this.__watchProps.forEach(function(prop){
				var isMatch = this.__isVarMatch(prop.segments,path);
				if(isMatch){
					if(!matchMap[prop.subComp.__id])
						matchMap[prop.subComp.__id] = [];
					var rs = Renderer.evalExp(this,prop.expWords);
					matchMap[prop.subComp.__id].push({
						name:prop.name,
						oldVal:prop.oldVal,
						newVal:rs
					});
					prop.oldVal = rs;
				}
			},this);
		}
		for(var k in matchMap){
			var cs = matchMap[k];
			impex._cs[k].__propChange && impex._cs[k].__propChange(cs);
		}
	},
	__isVarMatch:function(segments,changePath){
		if(segments.length < changePath.length)return false;
		for(var k=0;k<segments.length;k++){
			if(!changePath[k])break;

			if(segments[k][0] !== '[' && 
				changePath[k][0] !== '[' && 
				segments[k] !== changePath[k]){
				return false;
			}
		}
		return true;
	},
	__callWatchs:function (watchs){
		var invokedWatchs = [];
		for(var i=watchs.length;i--;){
			var change = watchs[i][1];
			var watch = watchs[i][0];

			var propChain = change.path;
			var newVal = change.newVal;
			var oldVal = change.oldVal;
			var name = change.name;
			var object = change.object;
			var changeType = change.type;

			if(watch.segments.length < propChain.length)continue;
			if(invokedWatchs.indexOf(watch) > -1)continue;

			//compare segs
			var canWatch = this.__isVarMatch(watch.segments,propChain);

			if(canWatch){
				var nv = newVal,
				ov = oldVal;
				if(watch.segments.length > propChain.length){
					var findSegs = watch.segments.slice(k);
					var findStr = '$var';
					for(var k=0;k<findSegs.length;k++){
						var seg = findSegs[k];
						findStr += seg[0]==='['?seg:'.'+seg;
					}
					try{
						nv = new Function("$var","return "+findStr)(newVal);
						ov = new Function("$var","return "+findStr)(oldVal);
					}catch(e){
						LOGGER.debug('error on parse watch params',e);
						nv = null;
					}
				}
				watch.cbk && watch.cbk.call(watch.ctrlScope,object,name,changeType,nv,ov,propChain);
				invokedWatchs.push(watch);
			}
		}
	},
	__updateDirective:function (attrObserveNodes){
		for(var j=attrObserveNodes.length;j--;){
			var aon = attrObserveNodes[j];

			var rs = Renderer.evalExp(aon.directive.component,aon.expObj);
			aon.directive.onUpdate(rs);
		}
	},
	__propChange:function(changes){
		var matchMap = {};
		//update props
		for(var i=changes.length;i--;){
			var c = changes[i];
			var name = c.name;
			this.props[name] = c.newVal;
			//check children which refers to props
			this.__watchProps.forEach(function(prop){
				var k = prop.fromPropKey;
				if(!k)reutnr;
				if(k[0] === '[' || k === name){
					if(!matchMap[prop.subComp.__id])
						matchMap[prop.subComp.__id] = [];
					var rs = Renderer.evalExp(this,prop.expWords);
					matchMap[prop.subComp.__id].push({
						name:prop.name,
						oldVal:prop.oldVal,
						newVal:rs
					});
					prop.oldVal = rs;
				}
			},this);
		}

		var renderView = true;
		this.onPropChange && (renderView = this.onPropChange(changes));

		if(renderView !== false){
			var expNodeList = null;
			var directiveList = null;
			var watchList = null;
			var fuzzyE = false,
				fuzzyD = false,
				fuzzyW = false; 
			
			for(var i=changes.length;i--;){
				var c = changes[i];
				var name = c.name;
				if(this.__expWithProps[name]){
					expNodeList = this.__expWithProps[name].concat();
				}else{
					fuzzyE = true;
				}

				if(this.__directiveWithProps[name]){
					directiveList = this.__directiveWithProps[name].concat();
				}else{
					fuzzyD = true;
				}

				if(this.__watchWithProps[name]){
					watchList = this.__watchWithProps[name].concat();
				}else{
					fuzzyW = true;
				}
			}

			//expnodes
			if(fuzzyE && this.__expWithProps['*'].length > 0){
				expNodeList = expNodeList.concat(this.__expWithProps['*']);
			}
			expNodeList && Renderer.renderExpNodes(expNodeList);

			//directives
			if(fuzzyD && this.__directiveWithProps['*'].length > 0){
				directiveList = directiveList.concat(this.__directiveWithProps['*']);
			}
			directiveList && this.__updateDirective(directiveList);
			//watchs
			if(fuzzyW && this.__watchWithProps['*'].length > 0){
				watchList = watchList.concat(this.__watchWithProps['*']);
			}
			watchList && this.__callWatchs(watchList);
		}

		for(var k in matchMap){
			var cs = matchMap[k];
			impex._cs[k].__propChange && impex._cs[k].__propChange(cs);
		}
	}
});