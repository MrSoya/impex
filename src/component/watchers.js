/**
 * 为组件提供watcher，以及watcher的响应
 */
function getDirectiveWatcher(getter,comp){
	var watcher = function() {
		addEvent('D',getter.vnode.vid+'-'+getter.dName,getter,comp);
	}
	comp._watchers.push(watcher);
	return watcher;
}

function getComputeWatcher(getter,computeKey,comp){
	var watcher = function() {
		var v = getter.call(comp,comp);
		comp[computeKey] = v;
	}
	comp._watchers.push(watcher);
	return watcher;
}
/**
 * 创建组件视图监控
 * 当视图中的任何state发生变更后都会发出
 */
function getViewWatcher(comp) {
	if(comp._viewWatcher)return comp._viewWatcher;

	comp._viewWatcher = function(change) {
		addEvent('V',change.name,change,comp);
	}
	return comp._viewWatcher;
}
function getPropWatcher(computer,propKey,args,comp){
	var watcher = function() {
		addEvent('P',propKey,computer.apply(comp.parent,args),comp);
	}
	// watcher.id = comp.$id+'-'+propKey;//防止重复
	comp._watchers.push(watcher);
	return watcher;
}

/**
 * 添加一个事件到事件队列中，并启动事件处理器
 */
var EventProcesser = null;
function addEvent(type,name,event,comp) {
	var typeMap = EventQ[comp.$id];
	if(!typeMap){
		typeMap = EventQ[comp.$id] = {
			D:{},
			V:{},
			P:{}
		}; 
	}
	typeMap[type][name] = event;

	if(!EventProcesser){
		EventProcesser = setTimeout(function(){
			//按照组件分组，处理不同的事件类型
			//参数、视图、指令
			var compIds = Object.keys(EventQ);
			compIds.forEach(function(cid) {
				var ev = EventQ[cid];
				var comp = impex._cs[cid];

				/********* 参数更新 *********/
				var propMap = ev.P;
				callLifecycle(comp,LC_CO.propsChange,[propMap]);
				//restore
				ev.P = {};

				/********* 视图更新 *********/
				updateComponent(comp,ev.V);
				ev.V = {};

				/********* 指令更新 *********/
				var dis = ev.D;
				for(var k in dis){
					var getter = dis[k];
					var v = getter.apply(getter.scope,getter.args);
					getter.data.value = v;
					var d = getter.di;
					d.update && d.update(getter.vnode.dom,getter.data,getter.vnode);
				}
				ev.D = {};

				/********* ticks *********/
				var ticks = TicksMap[cid];
				ticks && ticks.forEach(function(fn) {
					fn.call(comp);
				});
			});

			//next tick
			TicksMap['global'].forEach(function(fn) {
				fn();
			});

			EventProcesser = null;
		},20);
	}	
}