/**
 * @classdesc 事件类，为所有组件提供自定义事件接口
 * 
 * @class 
 */
function EventEmitter(){
	this.__eeMap = {};
}
EventEmitter.prototype = {
	/**
	 * 事件注册不支持队列。相同类型的事件注册会被覆盖
	 * @param  {String} type   事件类型
	 * @param  {Function} handler 回调函数
	 * @param  {Object} [context] 上下文
	 * @return {[type]}         [description]
	 */
	on:function(type,handler,context) {
		this.__eeMap[type] = [handler,context||this];
		return this;
	},
	emit:function(type){
		var pair = this.__eeMap[type];
		var fn = pair[0],
			ctx = pair[1];
		if(!fn)return;

		var args = [];
		for(var i=1;i<arguments.length;i++){
			args.push(arguments[i]);
		}
		fn.apply(ctx,args);
	}
}