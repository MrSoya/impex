/**
 * 监控属性的变更以及依赖收集
 */
function Monitor(key,value,target,parent){
	this.key = key;
	this.target = target;
	this.value = value;
	this.watchers = [];
	this.parent = parent;
}
Monitor.prototype = {
	/**
	 * 通知watcher进行更新
	 */
	notify:function(newVal) {
		this.value = newVal;

		var c = new Change(this.key,newVal,this.value,this.target);
		this.watchers.forEach(function(watcher) {
			watcher(c);
		});

		//通知父对象
		if(this.parent){
			this.parent.notify(this.parent.value);
		}
	},
	/**
	 * 收集依赖
	 */
	collect:function() {
		var mt = Monitor.target;

		if(mt){
			if(!mt.monitors){
				mt.monitors = [];
			}//record to del
			if(mt.monitors.indexOf(this)<0){
				mt.monitors.push(this);
				mt.key = this.key;
			}
			if(this.watchers.indexOf(mt)<0)
				this.watchers.push(mt);
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
	}
};