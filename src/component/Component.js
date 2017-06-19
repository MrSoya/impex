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
 * 		<li>onPropChange：当参数要绑定到组件时，该事件被触发，可以手动clone参数或者传递引用</li>
 * 		<li>onInit：当组件初始化时，该事件被触发，系统会扫描组件中的所有表达式并建立数据模型</li>
 * 		<li>onMount：当组件被挂载到组件树中时，该事件被触发，此时组件已经完成数据构建和绑定，DOM可用</li>
 * 		<li>onUnmount：当组件被卸载时，该事件被触发</li>
 * 		<li>onSuspend: 当组件被挂起时，该事件被触发</li>
 * 	</ul>
 * </p>
 * 
 * @class 
 */
function Component () {
	var id = 'C_' + im_counter++;
	this.__id = id;
	this.__state = Component.state.created;

	Signal.call(this);
	/**
	 * 对子组件的引用
	 * @type {Object}
	 */
	this.comps = {};
	/**
	 * 对组件内视图元素的引用
	 * @type {Object}
	 */
	this.els = {};
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

	//组件url
	this.__url;
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
	this.state = {};

	impex._cs[this.__id] = this;
};
Component.state = {
	created : 'created',
	inited : 'inited',
	mounted : 'mounted',
	suspend : 'suspend'
};
Util.inherits(Component,Signal);
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
				val = '"'+val.replace(/\\/mg,'\\\\').replace(/\r\n|\n/mg,'\\n').replace(/"/mg,'\\"')+'"';
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
	 * @param  {HTMLElement} el 视图
	 * @return {Component} 子组件
	 */
	createSubComponentOf:function(el){
		var instance = ComponentFactory.newInstanceOf(el.tagName.toLowerCase(),el);
		this.children.push(instance);
		instance.parent = this;

		return instance;
	},
	/**
	 * 创建一个匿名子组件
	 * @param  {Array<HTMLElement>} els 视图
	 * @return {Component} 子组件
	 */
	createSubComponent:function(els){
		var instance = ComponentFactory.newInstance(els);
		this.children.push(instance);
		instance.parent = this;

		return instance;
	},
	/**
	 * 初始化组件，该操作会生成用于显示的所有相关数据，包括表达式等，以做好显示准备
	 */
	init:function(){
		if(this.__state !== Component.state.created)return;

		if(this.__url){
			var that = this;
			Util.loadComponent(this.__url,function(data){
				var tmpl = data[0];
				that.template = tmpl;
				var model = data[1];
				model.template = tmpl;
				//cache
				ComponentFactory.register(that.name,model);
				ComponentFactory.initInstanceOf(that.name,that);

				//init
				ComponentFactory.parse(tmpl,that);
				that.__url = null;
				that.__init();
				that.mount();
			});
			
		}else{
			if(this.template){
				ComponentFactory.parse(this.template,this);
			}
			this.__init();
		}
		return this;
	},
	__init:function(){
		Scanner.scan(this.__nodes,this);

		LOGGER.log(this,'inited');

		//observe state
		this.state = Observer.observe(this.state,this);

		Builder.build(this);

		this.__state = Component.state.inited;

		if(this.onInit){
			var services = ComponentFactory.getServices(this,this.name);
			
			services ? this.onInit.apply(this,services) : this.onInit();
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
	 * 挂载组件到组件树上
	 */
	mount:function(){
		if(this.__state === Component.state.mounted)return;
		if(this.__state === Component.state.created)return;

		Renderer.render(this);

		//els
		this.__nodes.forEach(function(el){
			if(!el.querySelectorAll)return;
			var els = el.querySelectorAll('*['+ATTR_REF_TAG+']');
			for(var i=els.length;i--;){
				var node = els[i];
				this.els[node.getAttribute(ATTR_REF_TAG)] = node;
			}
		},this);

		this.__state = Component.state.mounted;
		LOGGER.log(this,'mounted');
		

		//mount children
		for(var i = 0;i<this.children.length;i++){
			if(!this.children[i].templateURL)
				this.children[i].mount();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].active();
		}

		this.onMount && this.onMount();
	},
	/**
	 * 卸载组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	unmount:function(){
		if(this.__state === null)return;

		LOGGER.log(this,'unmount');

		this.onUnmount && this.onUnmount();

		if(this.parent){
			//check parent watchs
			var index = -1;
			for(var i=this.parent.__watchProps.length;i--;){
				var prop = this.parent.__watchProps[i];
				if(prop.subComp === this){
					index = i;
					break;
				}
			}
			if(index > -1){
				this.parent.__watchProps.splice(index,1);
			}


			index = this.parent.children.indexOf(this);
			if(index > -1){
				this.parent.children.splice(index,1);
			}
			this.parent = null;
		}
		
		DOMHelper.detach(this.__nodes);

		while(this.children.length > 0){
			this.children[0].unmount();
		}

		for(var i = this.directives.length;i--;){
			this.directives[i].unmount();
		}


		this.children = 
		this.directives = 
		this.__expNodes = 
		this.__expDataRoot = null;

		impex._cs[this.__id] = null;
		delete impex._cs[this.__id];

		this.__state = 
		this.__id = 
		this.__url = 
		this.template = 
		this.restrict = 
		this.state = null;
	},
	/**
	 * 挂起组件，组件视图会从文档流中脱离，组件模型会从组件树中脱离，组件模型不再响应数据变化，
	 * 但数据都不会销毁
	 * @param {boolean} hook 是否保留视图占位符，如果为true，再次调用mount时，可以在原位置还原组件，
	 * 如果为false，则需要注入viewManager，手动插入视图
	 */
	suspend:function(hook){
		if(this.__state !== Component.state.mounted)return;

		LOGGER.log(this,'suspend');
		
		this.__suspend(this,hook===false?false:true);

		this.onSuspend && this.onSuspend();

		this.__state = Component.state.suspend;
	},
	__suspend:function(component,hook){
		var p = this.__nodes[0].parentNode;
		if(!p)return;
		if(hook){
			this.__target =  document.createComment("-- view suspended of ["+(component.name||'anonymous')+"] --");
			p.insertBefore(this.__target,this.__nodes[0]);
		}

		for(var i=this.__nodes.length;i--;){
			if(this.__nodes[i].parentNode)
				p.removeChild(this.__nodes[i]);
		}
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
				var k = this.__isVarMatch(prop.segments,path);
				if(k<0)return;
				if(!matchMap[prop.subComp.__id])
					matchMap[prop.subComp.__id] = [];
				var rs = Renderer.evalExp(this,prop.expWords);
				matchMap[prop.subComp.__id].push({
					name:prop.name,
					val:rs,
					path:path
				});
			},this);
		}
		for(var k in matchMap){
			var cs = matchMap[k];
			impex._cs[k].__childPropChange && impex._cs[k].__childPropChange(cs);
		}
	},
	__isVarMatch:function(segments,changePath){
		for(var k=0;k<segments.length;k++){
			if(!changePath[k])break;

			if(segments[k][0] !== '[' && 
				changePath[k][0] !== '[' && 
				segments[k] !== changePath[k]){
				return -1;
			}
		}
		return k;
	},
	__callWatchs:function (watchs){
		var invokedWatchs = [];
		for(var i=watchs.length;i--;){
			var change = watchs[i][1];
			var watch = watchs[i][0];

			var newVal = change.newVal;
			var oldVal = change.oldVal;
			var name = change.name;
			var object = change.object;
			var propChain = change.path.concat();
			if(!Util.isArray(object))
				change.path.pop();
			var changeType = change.type;

			if(watch.segments.length < propChain.length)continue;
			if(invokedWatchs.indexOf(watch) > -1)continue;

			//compare segs
			var k = this.__isVarMatch(watch.segments,propChain);

			if(k > -1){
				var matchLevel = change.path.length+1 - watch.segments.length;
				watch.cbk && watch.cbk.call(watch.ctrlScope,object,name,changeType,newVal,oldVal,change.path,matchLevel);
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
	__childPropChange:function(changes){
		this.onPropChange && this.onPropChange(changes);
		
		var matchMap = {};
		//update props
		for(var i=changes.length;i--;){
			var c = changes[i];
			var name = c.name;
			//check children which refers to props
			this.__watchProps.forEach(function(prop){
				if(!matchMap[prop.subComp.__id])
					matchMap[prop.subComp.__id] = [];
				var rs = Renderer.evalExp(this,prop.expWords);
				matchMap[prop.subComp.__id].push({
					name:prop.name,
					val:rs
				});
			},this);
		}

		for(var k in matchMap){
			var cs = matchMap[k];
			impex._cs[k].__childPropChange && impex._cs[k].__childPropChange(cs);
		}
	}
});
