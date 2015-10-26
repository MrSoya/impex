/**
 * @classdesc 转换器类，提供对表达式结果的转换处理
 * 转换器只能以字面量形式使用在表达式中，比如
 * <p>
 * 	{{#html exp...}}
 * </p>
 * html是一个内置的转换器，用于输出表达式内容为视图对象<br/>
 * 转换器可以连接使用，并以声明的顺序依次执行，比如
 * <p>
 * 	{{#lower|cap exp...}}
 * </p>
 * 转换器支持参数，比如
 * <p>
 * 	{{#currency:€:4 exp...}}
 * </p>
 * @class 
 */
function Converter (component) {
	/**
	 * 所在组件
	 */
	this.$component = component;
	/**
	 * 系统自动计算的表达式结果
	 */
	this.$value;
	/**
	 * 是否把内容转换为HTML代码，如果该属性为true，那么表达式内容将会
	 * 转换成DOM节点，并且该转换器的后续转换器不再执行。当然，前提是内容可以
	 * 被转换成DOM，如果内容无法转换成DOM，后续转换器依然会执行<br/>
	 * 该属性是针对文本节点中的表达式有效，属性中的表达式无效
	 * @type {Boolean}
	 */
	this.$html = false;
	/**
	 * 构造函数，在服务被创建时调用
	 * 如果指定了注入服务，系统会在创建时传递被注入的服务
	 */
	this.onCreate;
}
Converter.prototype = {
	/**
	 * 转变函数，该函数是实际进行转变的入口
	 * @param  {Object} args 可变参数，根据表达式中书写的参数决定
	 * @return {string | null} 返回结果会呈现在表达式上，如果没有返回结果，表达式则变为空
	 */
	to:function(){
		return null;
	}
}