/**
 * 表达式映射
 */
function ExpData (propName) {
	this.propName = propName;
	this.subProps = {};
	this.expNodes = [];
	this.attrObserveNodes = [];
	this.watchs = [];
}

/**
 * 变更信息
 */
function Change(name,newVal,oldVal,path,type,object){
	this.name = name;
	this.newVal = newVal;
	this.oldVal = oldVal;
	this.path = path;
	this.type = type;
	this.object = object;
	this.expProps = [];
}

/**
 * 表达式节点
 */
function ExpNode (node,attrName,origin,expMap,component,toHTML) {
	this.node = node;
	this.attrName = attrName;
	this.origin = origin;
	this.expMap = expMap;
	this.component = component;	
	this.toHTML = toHTML;
	this.id = Math.random();
}

/**
 * 自定义observe节点
 */
function AttrObserveNode (directive,expObj) {
	this.directive = directive;
	this.expObj = expObj;
}

/**
 * watch
 */
function Watch (cbk,ctrlScope,segments) {
	this.cbk = cbk;
	this.ctrlScope = ctrlScope;	
	this.segments = segments;
}

/**
 * 参数信息
 */
function Prop (subComp,name,segments,expWords,oldVal,fromPropKey) {
	this.subComp = subComp;
	this.name = name;
	this.segments = segments;
	this.expWords = expWords;
	this.oldVal = oldVal;
}