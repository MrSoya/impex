/**
 * @classdesc 指令存在于某个组件域中,表现为一个自定义属性。
 * 组件的生命周期：
 * <p>
 * 	<ul>
 * 		<li>onCreate：当指令被创建时触发</li>
 * 		<li>onInit：当指令初始化时触发</li>
 * 		<li>onActive: 当指令激活时触发</li>
 * 		<li>onUpdate: 当指令条件变更时触发</li>
 * 		<li>onDestroy：当指令被销毁时触发</li>
 * 	</ul>
 * </p>
 * @class 
 */
function Directive (name,value) {
	/**
	 * 指令的字面值
	 */
	this.value = value;
	/**
	 * 指令名称
	 */
	this.name = name;
	/**
	 * 参数列表
	 * @type {Array}
	 */
	this.params;
	/**
	 * 过滤函数
	 * @type {Function}
	 */
	this.filter;
	/**
	 * 指令所在的组件
	 */
	this.component;
	/**
	 * 指令所在的目标视图
	 */
	this.view;

	/**
	 * 是否终结<br/>
	 * 终结指令会告诉扫描器不对该组件的内部进行扫描，包括表达式，指令，子组件都不会生成<br/>
	 * *该属性与$endTag冲突，并会优先匹配
	 * @type {Boolean}
	 * @default false
	 */
	this.final = false;
	/**
	 * 范围结束标记，用来标识一个范围指令的终结属性名<br/>
	 * 如果设置了该标识，那么从当前指令开始到结束标识结束形成的范围，扫描器都不对内部进行扫描，包括表达式，指令，子组件都不会生成<br/>
	 * *该标记必须加在与当前指令同级别的元素上<br/>
	 * *该属性与$final冲突
	 * @type {String}
	 * @default null
	 */
	this.endTag = null;
	/**
	 * 指令优先级用于定义同类指令的执行顺序。最大999
	 * @type {Number}
	 */
	this.priority = 0;
}
Util.ext(Directive.prototype,{
	init:function(){
		if(this.__state == Component.state.inited){
			return;
		}
		//预处理自定义标签中的表达式
		var expNode = Scanner.getExpNode(this.value,this.component);
		var calcVal = expNode && Renderer.calcExpNode(expNode);
		if(calcVal)this.value = calcVal;

		LOGGER.log(this,'inited');

		if(this.onInit){
			this.onInit();
		}

		this.__state = Component.state.inited;
	},
	//component invoke only
	active:function(){
		//do observe
		if(this.onUpdate){
			var expObj = lexer(this.value);
			for(var varStr in expObj.varTree){
				var varObj = expObj.varTree[varStr];

				var aon = new AttrObserveNode(this,expObj);

				//监控变量
				if(this.component)
				Builder.buildExpModel(this.component,varObj,aon);
			}
			
			var rs = Renderer.evalExp(this.component,expObj);
			this.onUpdate(rs);
		}

		this.onActive && this.onActive();

	},
	/**
	 * 销毁指令
	 */
	destroy:function(){
		LOGGER.log(this,'destroy');

		this.view.__destroy(this);

		this.view = 
		this.component = 
		this.params = 
		this.filter = 
		this.onUpdate = null;

		this.onDestroy && this.onDestroy();
	}
});