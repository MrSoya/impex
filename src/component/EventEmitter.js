/**
 * @classdesc 事件类，为所有组件提供自定义事件接口
 * 
 * @class 
 */
function EventEmitter(){
	this._eeMap = {};
}
EventEmitter.prototype = {
	/**
	 * 事件注册不支持队列。相同类型的事件注册会被覆盖
	 * @param  {String} type   事件类型
	 * @param  {Function} handler 回调函数
	 * @param  {Object} [context] 上下文
	 * @return {Object}   返回事件函数返回值
	 */
	$on:function(type,handler,context) {
		this._eeMap[type] = [handler,context||this];
		return this;
	},
	/**
	 * 取消事件注册
	 * @param  {[type]} type [description]
	 * @return {[type]}      [description]
	 */
	$off:function(type) {
		this._eeMap[type] = null;
	},
	$emit:function(type){
		var pair = this._eeMap[type];
		if(!pair)return;
		var fn = pair[0],
			ctx = pair[1];
		if(!fn)return;

		var args = [];
		for(var i=1;i<arguments.length;i++){
			args.push(arguments[i]);
		}
		return fn.apply(ctx,args);
	},
	/**
	 * 获取事件，可以用来实现同步的事件处理
	 * @param  {String} type   事件类型
	 * @return {Array}  [handler,context]
	 */
	$getEvent:function(type) {
		return this._eeMap[type];
	}
}