/**
 * @classdesc 事件封装对象
 * 
 * @class 
 * 
 */
function Event(type,e,ct) {
	this.type = type;
	this.e = e;
	this.target = e && e.target;
	this.currentTarget = ct;
}