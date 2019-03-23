function getWatchWatcher(cbk) {
	var task = new Task(function() {
		cbk(this.change);
	});
	return function(change) {
		task.change = change;
		addTask(task);
	};
}
function getComputeWatcher(getter,computeKey,comp){
	var task = new Task(function() {
		var v = getter.call(comp,comp);
		comp[computeKey] = v;
	});
	return function() {
		addTask(task);
	};
}
function getViewWatcher(comp) {
	if(comp._viewWatcher)return comp._viewWatcher;

	var task = new Task(function() {
		updateComponent(comp,comp._updateMap);
		comp._updateMap = {};
	});
	comp._viewWatcher = function(change) {
		comp._updateMap[change.name] = change;
		addTask(task);
	}
	return comp._viewWatcher;
}

var called = {};
var taskQ = [];
var nextQ = [];
var waiting = true;
var executing = false;
function addTask(task) {
	if(executing && called[task.id]){
		if(nextQ.indexOf(task)<0)
		    nextQ.push(task);
		return;
	}else{
		if(taskQ.indexOf(task)<0)
			taskQ.push(task);
	}

	if(waiting){
		setTimeout(function(){
			execute();
		},0);
		waiting = false;
	}
}

function execute() {
	executing = true;
	
	for(var i=0;i<taskQ.length;i++){
		var task = taskQ[i];
		called[task.id] = 1;
		task.run();
	}

	/**
	 * 在队列执行期间产生的任务，会在队列执行完成后立即执行
	 */
	for(var i=0;i<nextQ.length;i++){
		var task = nextQ[i];
		task.run();
	}

	//restore
	taskQ = [];
	nextQ = [];
	waiting = true;
	executing = false;
	called = {};
}