/**
 * 表达式映射
 */
function ExpData (propName,parent) {
	this.propName = propName;
	this.subProps = {};
	this.expNodes = [];
	this.attrObserveNodes = [];
	this.watchs = [];

	this.parentProp = parent;//for release

	//bind exp
	if(HTML_EXP_COMPILING){
		CURRENT_HTML_EXP_LIST.push(this);
	}
}

ExpData.prototype = {
	release:function(){
		if(this.expNodes == null)return;
		
		this.expNodes.forEach(function(item){
			item.release();
		});
		this.attrObserveNodes.forEach(function(item){
			item.release();
		});
		this.watchs.forEach(function(item){
			item.release();
		});
		if(this.parentProp){
			this.parentProp[this.propName] = null;
			delete this.parentProp[this.propName];
		}
		for(var k in this.subProps){
			var ed = this.subProps[k];
			if(ed)ed.release();
		}
		

		this.propName = 
		this.subProps = 
		this.expNodes = 
		this.attrObserveNodes = 
		this.watchs = 
		this.parentProp = null;
	}
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

	//bind exp
	if(HTML_EXP_COMPILING){
		CURRENT_HTML_EXP_LIST.push(this);
	}
}
ExpNode.prototype = {
	release:function(){
		this.node = 
		this.attrName = 
		this.origin = 
		this.expMap = 
		this.component = 
		this.toHTML = 
		this.id = null;
	}
}

/**
 * 自定义observe节点
 */
function AttrObserveNode (directive,expObj) {
	this.directive = directive;
	this.expObj = expObj;
}
AttrObserveNode.prototype = {
	release:function(){
		this.directive = 
		this.expObj = null;
	}
}

/**
 * watch
 */
function Watch (cbk,ctrlScope,segments) {
	this.cbk = cbk;
	this.ctrlScope = ctrlScope;	
	this.segments = segments;
}
Watch.prototype = {
	release:function(){
		this.cbk = 
		this.segments = 
		this.ctrlScope = null;
	}
}

/**
 * 参数信息
 */
function Prop (subComp,name,segments,expWords) {
	this.subComp = subComp;
	this.name = name;
	this.segments = segments;
	this.expWords = expWords;
}