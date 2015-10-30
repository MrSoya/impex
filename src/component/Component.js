/**
 * @classdesc 组件类，包含视图、模型、控制器，表现为一个自定义标签。同内置标签样，
 * 组件也可以有属性。impex支持两种属性处理方式
 * <p>
 * <ol>
 * 		<li></li>
 * </ol>
 * </p>
 * <br/>
 * 组件可以设置事件或者修改视图样式等<br/>
 * 组件实例本身会作为视图的数据源，也就是说，实例上的属性、方法可以在视图中
 * 通过表达式访问，唯一例外的是以$开头的属性，这些属性不会被监控，也无法在
 * 表达式中访问到<br/>
 * 组件可以包含组件，所以子组件视图中的表达式可以访问到父组件模型中的值
 * <p>
 * 	组件生命周期
 * 	<ul>
 * 		<li>onCreate：当组件被创建时，该事件被触发，系统会把指定的服务注入到参数中</li>
 * 		<li>onInit：当组件初始化时，该事件被触发，系统会扫描组件中的所有表达式并建立数据模型</li>
 * 		<li>onDisplay：当组件被显示时，该事件被触发，此时组件以及完成数据构建和绑定</li>
 * 		<li>onDestroy：当组件被销毁时，该事件被触发</li>
 * 	</ul>
 * </p>
 * 
 * @class 
 * @extends ViewModel
 */
function Component (view) {
	//每个组件都保存顶级路径
	var id = 'C_' + Object.keys(impex.__components).length;
	impex.__components[id] = this;
	this.__id = id;
	this.__state = Component.state.created;
	/**
	 * 组件绑定的视图对象，在创建时由系统自动注入
	 * 在DOM中，视图对象的所有操作都针对自定义标签的顶级元素，而不包括子元素
	 * @type {View}
	 */
	this.$view = view;
	/**
	 * 组件名，在创建时由系统自动注入
	 */
	this.$name;
	/**
	 * 对父组件的引用
	 * @type {Component}
	 * @default null
	 */
	this.$parent;
	this.$__components = [];
	this.$__directives = [];
	this.$__expNodes = [];
	this.$__expPropRoot = new ExpProp();
	/**
	 * 组件模版，用于生成组件视图
	 * @type {string}
	 */
	this.$template;
	/**
	 * 组件模板url，动态加载组件模板
	 */
	this.$templateURL;
	/**
	 * 构造函数，在组件被创建时调用
	 * 如果指定了注入服务，系统会在创建时传递被注入的服务
	 */
	this.onCreate;
	/**
	 * 组件初始化时调用
	 */
	this.onInit;
	/**
	 * 组件被显示时调用
	 */
	this.onDisplay;
	/**
	 * 组件被销毁时调用
	 */
	this.onDestroy;
}
Component.state = {
	created : 'created',
	inited : 'inited',
	displayed : 'displayed',
	destroyed : 'destroyed'
}
Util.inherits(Component,ViewModel);
Util.ext(Component.prototype,{
	/**
	 * 绑定事件到组件上
	 * @param  {string} type 事件名
     * @param {string} exp 自定义函数表达式，比如 { fn(x+1) }
     * @param  {function} handler   事件处理回调，回调参数e
	 */
	on:function(type,exp,handler){
		this.$view.__on(this,type,exp,handler);
	},
	/**
	 * 查找子组件，并返回符合条件的第一个实例
	 * @param  {string} name       组件名
	 * @param  {Object} conditions 查询条件，JSON对象
	 * @return {Component | null} 
	 */
	find:function(name,conditions){
		name = name.toLowerCase();
		for(var i=this.$__components.length;i--;){
			var comp = this.$__components[i];
			if(comp.$name == name){
				var matchAll = true;
				if(conditions)
					for(var k in conditions){
						if(comp[k] != conditions[k]){
							matchAll = false;
							break;
						}
					}
				if(matchAll){
					return comp;
				}
			}
		}
		return null;
	},
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {string} expPath 属性路径，比如a.b.c
	 * @param  {function} cbk      回调函数，[变动类型add/delete/update,新值，旧值]
	 */
	watch:function(expPath,cbk){
		var expObj = lexer(expPath);
		var keys = Object.keys(expObj.varTree);
		if(keys.length < 1)return;
		if(keys.length > 1){
			impex.console.warn('变量表达式'+expPath+'错误，只能同时watch一个变量');
			return;
		}
		
		var varObj = expObj.varTree[keys[0]];
		var watch = new Watch(cbk,this,varObj.segments);
		//监控变量
		Builder.buildExpModel(this,varObj,keys[0],watch);
	},
	/**
	 * 添加子组件到父组件
	 * @param {Component} child 子组件
	 */
	add:function(child){
		this.$__components.push(child);
		child.$parent = this;
	},
	/**
	 * 创建一个未初始化的子组件
	 * @param  {string} type 组件名
	 * @param  {HTMLElement} target DOM节点
	 * @return {Component} 子组件
	 */
	createSubComponentOf:function(type,target){
		var instance = ComponentFactory.newInstanceOf(type,target.element?target.element:target);
		this.$__components.push(instance);
		instance.$parent = this;

		return instance;
	},
	/**
	 * 创建一个匿名子组件
	 * @param  {string | View} tmpl HTML模版字符串或视图对象
	 * @param  {View} target 视图
	 * @return {Component} 子组件
	 */
	createSubComponent:function(tmpl,target){
		var instance = ComponentFactory.newInstance(tmpl,target.element?target.element:target);
		this.$__components.push(instance);
		instance.$parent = this;

		return instance;
	},
	/**
	 * 初始化组件，该操作会生成用于显示的所有相关数据，包括表达式等，以做好显示准备
	 */
	init:function(){
		if(this.__state != Component.state.created)return;
		if(this.$templateURL){
			var that = this;
			Util.loadTemplate(this.$templateURL,function(tmplStr){
				var rs = that.$view.__init(tmplStr,that);
				if(rs === false)return;
				that.__init();
				that.display();
			});
		}else{
			if(this.$template){
				var rs = this.$view.__init(this.$template,this);
				if(rs === false)return;
			}
			this.__init();
		}
		return this;
	},
	__init:function(){
		Scanner.scan(this.$view,this);

		this.onInit && this.onInit();

		this.__state = Component.state.inited;
	},
	/**
	 * 显示组件到视图上
	 */
	display:function(){
		if(this.__state != Component.state.inited)return;
		this.$view.__display();
		
		Renderer.render(this);

		this.onDisplay && this.onDisplay();

		this.__state = Component.state.displayed;

		Builder.build(this);
	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	destroy:function(){
		if(this.__state == Component.state.destroyed)return;

		var i = this.$parent.$__components.indexOf(this);
		if(i > -1){
			this.$parent.$__components.splice(i,1);
		}
		this.$parent = null;
		this.$view.__destroy();

		this.onDestroy && this.onDestroy();

		this.__state = Component.state.destroyed;
	},
	__getPath:function(){
		return 'impex.__components["'+ this.__id +'"]';
	}
});