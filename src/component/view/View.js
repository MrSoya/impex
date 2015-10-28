/**
 * @classdesc 视图类，提供视图相关操作。所有影响显示效果的都属于视图操作，
 * 比如show/hide/css/animate等等
 * 无法直接创建实例，会被自动注入到组件或者指令中
 * 一个组件或者指令只会拥有一个视图
 * @class
 */
function View (element,name,target) {
	/**
	 * 对可视元素的引用，在DOM中就是HTMLElement，
	 * 在绝大多数情况下，都不应该直接使用该属性
	 * 
	 */
	this.element = element;

	/**
	 * 视图名称，在DOM中是标签名
	 */
	this.name = name;

	this.__evMap = {};
	this.__target = target;
}
View.prototype = {
	__init:function(tmpl,component){
		//解析属性
		var propMap = this.__target.attributes;
		var innerHTML = this.__target.innerHTML;

		var compileStr = tmplExpFilter(tmpl,innerHTML,propMap);
		var el = DOMViewProvider.compile(compileStr);
		if(!el){
			impex.console.warn('invalid template "'+tmpl+'" of component['+component.$name+']');
			return false;
		}
		this.name = el.nodeName.toLowerCase();
		this.element = el;

		if(propMap)
		for(var i=propMap.length;i--;){
			var k = propMap[i].name;
			var v = propMap[i].value;
			component[k] = v;
		}
	},
	__display:function(){
		if(!this.__target || this.element.parentNode)return;

		this.__target.parentNode.replaceChild(this.element,this.__target);
	},
	__destroy:function(){
		for(var k in this.__evMap){
			for(var i=this.__evMap[k].length;i--;){
				var node = this.__evMap[k][i][0];
				var handler = this.__evMap[k][i][1];
				Util.off(k,node,handler);
			}
		}
		this.element.parentNode.removeChild(this.element);
	},
	__on:function(component,type,exp,handler){
		var originExp = exp;
		var comp = component;
		var evHandler = null;
		var tmpExpOutside = '';
		var fnOutside = null;
		Util.on(type,this.element,evHandler = function(e){
			var tmpExp = originExp;

			if(handler instanceof Function){
				tmpExp = handler(e,originExp);
			}
			if(!tmpExp)return;
			if(tmpExpOutside != tmpExp){
				var expObj = lexer(tmpExp);

				var evalStr = Renderer.getExpEvalStr(comp,expObj);

				var tmp = evalStr.replace('self.$event','$event');
				fnOutside = new Function('$event',tmp);

				tmpExpOutside = tmpExp;
			}
			
			fnOutside(e);
		});
		if(!this.__evMap[type]){
			this.__evMap[type] = [];
		}
		this.__evMap[type].push([this.element,evHandler]);
	},
	/**
	 * 复制当前视图
	 * @return {View}
	 */
	clone:function(){
		var copy = new View(this.element.cloneNode(true),this.name);
		return copy;
	},
	/**
	 * 显示视图
	 */
	show:function(){
		this.element.style.display = '';
		return this;
	},
	/**
	 * 隐藏视图
	 */
	hide:function(){
		this.element.style.display = 'none';
		return this;
	},
	/**
	 * 获取或设置视图的样式
	 * @param  {string} name  样式名，如width/height
	 * @param  {var} value 样式值
	 */
	style:function(name,value){
		if(arguments.length > 1){
			this.element.style[name] = value;
			return this;
		}else{
			return this.element.style[name];
		}
	},
	/**
	 * 获取或设置视图的属性值
	 * @param  {string} name  属性名
	 * @param  {string} value 属性值
	 */
	attr:function(name,value){
		if(arguments.length > 1){
			this.element.setAttribute(name,value);
			return this;
		}else{
			return this.element.getAttribute(name);
		}
	},
	/**
	 * 删除视图属性
	 * @param  {string} name  属性名
	 */
	removeAttr:function(name){
		this.element.removeAttribute(name);
		return this;
	}
}

function tmplExpFilter(tmpl,bodyHTML,propMap){
	tmpl = tmpl.replace(REG_TMPL_EXP,function(a,attrName){
		var attrName = attrName.replace(/\s/mg,'');
		if(attrName == 'tagBody'){
			return bodyHTML;
		}

	});
	return tmpl;
}