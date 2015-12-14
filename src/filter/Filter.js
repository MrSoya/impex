/**
 * @classdesc 过滤器类，提供对表达式结果的转换处理，比如
 * <p>
 * 	{{ exp... => cap}}
 * </p>
 * 过滤器可以连接使用，并以声明的顺序依次执行，比如
 * <p>
 * 	{{ exp... => lower|cap}}
 * </p>
 * 过滤器支持参数，比如
 * <p>
 * 	{{ exp... => currency:€:4}}
 * </p>
 * @class 
 */
function Filter (component) {
	/**
	 * 所在组件
	 */
	this.$component = component;
	/**
	 * 系统自动计算的表达式结果
	 */
	this.$value;
	/**
	 * 构造函数，在服务被创建时调用
	 * 如果指定了注入服务，系统会在创建时传递被注入的服务
	 */
	this.onCreate;
}
Filter.prototype = {
	/**
	 * 转变函数，该函数是实际进行转变的入口
	 * @param  {Object} args 可变参数，根据表达式中书写的参数决定
	 * @return {string | null} 返回结果会呈现在表达式上，如果没有返回结果，表达式则变为空
	 */
	to:function(){
		return null;
	}
}