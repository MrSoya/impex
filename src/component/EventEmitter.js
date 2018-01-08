/**
 * @classdesc 事件类，为所有组件提供自定义事件接口
 * 
 * @class 
 */
function EventEmitter(){
	this.__eeMap = {};
}
EventEmitter.prototype = {
	on:function(type,handler) {
		this.__eeMap[type] = handler;
		return this;
	},
	emit:function(type){
		var fn = this.__eeMap[type];
		if(!fn)return;

		var args = [];
		for(var i=1;i<arguments.length;i++){
			args.push(arguments[i]);
		}
		fn.apply(this,args);
	}
}