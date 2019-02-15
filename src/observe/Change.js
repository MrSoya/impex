/**
 * 当属性发生变更时，一个变更对象会被创建并通过watcher传递给handler
 */
function Change(name,newVal,oldVal,object){
	this.name = name;
	this.newVal = newVal;
	this.oldVal = oldVal;
	this.object = object;
}