/**
 * 为组件提供watcher，以及watcher的响应
 */
function getDirectiveWatcher(exp,directiveParams,vnode,comp,scope){
	var watcher = function(change) {
		var d = directiveParams[0];
		var data = directiveParams[1];
		//计算新值
		var fnData = getForScopeFn(vnode,scope,exp);
		var v = fnData[0].apply(scope,fnData[1]);
		data.value = v;
		d.update && d.update(vnode.dom,data,vnode);
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
		comp._updateMap[change.name] = change;
		notify2state(comp);
	}
	return comp._viewWatcher;
}
function getPropWatcher(computer,propKey,args,comp){
	var watcher = function() {
		var v = computer.apply(comp.parent,args);
		comp._propMap[propKey] = v;
		notify2prop(comp);
	}
	comp._watchers.push(watcher);
	return watcher;
}

function notify2state(comp) {
	if(comp._updateTimer){
		clearTimeout(comp._updateTimer);
	}
	comp._updateTimer = setTimeout(function(){
		//通知组件更新
		updateComponent(comp,comp._updateMap);

		//restore
		comp._updateMap = {};
	},20);
}
function notify2prop(comp) {
	if(comp._propTimer){
		clearTimeout(comp._propTimer);
	}
	comp._propTimer = setTimeout(function(){
		//通知属性变更
		callLifecycle(comp,LC_CO.propsChange,[comp._propMap]);

		//restore
		comp._propMap = {};
	},20);
}