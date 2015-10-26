/**
 * 表达式映射
 */
function ExpProp (propName) {
	this.propName = propName;
	this.subProps = {};
	this.expNodes = [];
	this.attrObserveNodes = [];
	this.watchs = [];
}

/**
 * 表达式节点
 */
function ExpNode (node,attrName,origin,expMap,ctrlScope,funcSymbol) {
	this.node = node;
	this.attrName = attrName;
	this.origin = origin;
	this.expMap = expMap;
	this.ctrlScope = ctrlScope;	
	this.funcSymbol = funcSymbol;
}

/**
 * 自定义observe节点
 */
function AttrObserveNode (attr,observer,expObj,ctrlScope) {
	this.attr = attr;
	this.expObj = expObj;
	this.observer = observer;
	this.ctrlScope = ctrlScope;	
}

/**
 * watch
 */
function Watch (cbk,ctrlScope,segments) {
	this.cbk = cbk;
	this.ctrlScope = ctrlScope;	
	this.segments = segments;
}