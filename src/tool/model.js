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

function CompSlot(isExp,is,comp,node,cache){
	var calcVal = is;
	if(isExp){
		//calc 
		var expObj = lexer(is);
		calcVal = Renderer.evalExp(comp,expObj);
		var that = this;
		comp.watch(is,function(obj,name,type,newVal){
			that.is(newVal);
		});
	}
		
	this.node = node;
	this.cache = cache==null?false:true;
	this.cacheMap = this.cache?{}:null;
	this.comp = comp;

	if(calcVal)this.is(calcVal);
}
CompSlot.prototype = {
	/**
	 * change current compslot to new component
	 * @param  {String}  type comp type
	 */
	is:function(type){
		var lastComp = this.lastComp;
		if(lastComp && lastComp.name === type)return;

		var el = this.node;
		if(lastComp){
			el = lastComp.el;
			if(!ComponentFactory.hasTypeOf(type)){
				LOGGER.warn('cannot find component['+type+']');
				return;
			}
		}
		var placeholder = document.createComment('-- placeholder --');
	    DOMHelper.insertBefore([placeholder],el);
		
		if(lastComp){
			if(this.cache){
	        	lastComp.unmount(false);
	        }else{
	        	lastComp.destroy();
	        }
		}else{
			DOMHelper.detach([el]);
		}
        
        var subComp = null;
        if(this.cache && this.cacheMap[type]){
        	subComp = this.cacheMap[type];
        	if(subComp){
        		DOMHelper.replace(placeholder,subComp.__nodes);
        		subComp.mount();
        	}
        }else{
			//create new
	        var node = document.createElement(type);
	        placeholder.parentNode.replaceChild(node,placeholder);
	        subComp = this.comp.createSubComponentOf(node);
	        subComp.init().mount();
        }

        if(this.cache && !this.cacheMap[type]){
        	this.cacheMap[type] = subComp;
        }

        this.lastComp = subComp;
	}
}