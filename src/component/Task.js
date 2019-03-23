/**
 * @classdesc 任务类，用于封装系统内的异步执行调用
 * 
 * @class 
 */
function Task(run){
	this.id = Task.id++;
	this.run = run;
}
Task.id = 0;