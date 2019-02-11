/**
 * 监控属性的变更以及依赖收集
 */
function Monitor(){
	this.key;
	this.target;
	this.value;
	this.watchers = [];
}
Monitor.prototype = {
	/**
	 * 通知watcher进行更新
	 */
	notify:function(newVal,type) {
		this.value = newVal;

		var c = new Change(this.key,newVal,this.value,type,this.target);
		this.watchers.forEach(function(watcher) {
			watcher.key = this.key;
			watcher.update(c);
		},this);
	},
	/**
	 * 收集依赖
	 */
	collect:function() {
		if(Monitor.target){
			Monitor.target.depend(this);
			if(this.watchers.indexOf(Monitor.target)<0)
				this.watchers.push(Monitor.target);
		}
	},
	/**
	 * 删除已监控的watcher
	 */
	removeWatcher:function(watcher) {
		var i = this.watchers.indexOf(watcher);
		if(i>-1){
			this.watchers.splice(i,1);
		}
		console.log('removeWatcher',this.key)
	}
};