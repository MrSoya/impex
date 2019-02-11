/**
 * 用于关联属性的观察器。当属性通知观察器更新时，观察器需要调用不同的逻辑处理器
 */
function Watcher(handler,comp){
	this.key;
	this.handler = handler;
	this.component = comp;
	this.monitors = [];

	comp._watchers.push(this);
}
Watcher.prototype = {
	/**
	 * 更新处理
	 */
	update:function(change) {
		this.handler && this.handler.call(this.component,change,this);
	},
	//销毁watcher
	dispose:function() {
		this.monitors.forEach(function(m){
			m.removeWatcher(this);
		},this);
		
		this.component = 
		this.handler = 
		this.monitors = 
		this.key = null;
	},
	depend:function(monitor) {
		if(this.monitors.indexOf(monitor)<0)
			this.monitors.push(monitor);
	}
};