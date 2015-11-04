/**
 * @classdesc 指令类，继承自组件,表现为一个自定义属性。
 * <p>
 * 	指令继承自组件，所以生命周期也类似组件
 * 	<ul>
 * 		<li>onCreate：当指令被创建时，该事件被触发，系统会把指定的服务注入到参数中</li>
 * 		<li>onInit：当指令初始化时，该事件被触发，系统会监控指令中的所有表达式</li>
 * 		<li>onDestroy：当指令被销毁时，该事件被触发</li>
 * 	</ul>
 * </p>
 * @extends Component
 * @class 
 */
function Directive (name,value) {
	Component.call(this);
	/**
	 * 指令的字面值
	 */
	this.$value = value;
	/**
	 * 指令名称
	 */
	this.$name = name;

	/**
	 * 是否终结<br/>
	 * 终结指令会告诉扫描器不对该组件的内部进行扫描，包括表达式，指令，子组件都不会生成<br/>
	 * *该属性与$endTag冲突，并会优先匹配
	 * @type {Boolean}
	 * @default false
	 */
	this.$final = false;
	/**
	 * 范围结束标记，用来标识一个范围指令的终结属性名<br/>
	 * 如果设置了该标识，那么从当前指令开始到结束标识结束形成的范围，扫描器都不对内部进行扫描，包括表达式，指令，子组件都不会生成<br/>
	 * *该标记必须加在与当前指令同级别的元素上<br/>
	 * *该属性与$final冲突
	 * @type {String}
	 * @default null
	 */
	this.$endTag = null;
	/**
	 * 当指令表达式中对应模型的值发生变更时触发，回调参数为表达式计算结果
	 */
	this.observe;
}
Util.inherits(Directive,Component);
Util.ext(Directive.prototype,{
	init:function(){
		//预处理自定义标签中的表达式
		var exps = {};
		var that = this;
		this.$value.replace(REG_EXP,function(a,modelExp){
    		var expObj = lexer(modelExp);

    		var val = Renderer.evalExp(that.$parent,expObj);
    		
    		//保存表达式
    		exps[modelExp] = {
    			val:val
    		};
    	});
    	var attrVal = this.$value;
    	for(var k in exps){
			attrVal = attrVal.replace(EXP_START_TAG +k+ EXP_END_TAG,exps[k].val);
		}
		this.$view.attr(this.$name,attrVal);
		this.$value = attrVal;

		//do observe
		if(this.observe){
			var expObj = lexer(attrVal);
			for(var varStr in expObj.varTree){
				var varObj = expObj.varTree[varStr];

				var aon = new AttrObserveNode(this,expObj);

				//监控变量
				Builder.buildExpModel(this.$parent,varObj,varStr,aon);
			}
			
			var rs = Renderer.evalExp(this.$parent,expObj);
			this.observe(rs);
		}

		this.onInit && this.onInit();
	}
});