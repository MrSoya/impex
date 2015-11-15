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
	this.element = element instanceof Array?element[0]:element;

	this.elements = element instanceof Array?element:undefined;

	/**
	 * 视图名称，在DOM中是标签名
	 */
	this.name = this.element && this.element.nodeName.toLowerCase();

	this.__evMap = {};
	this.__target = target;
}
View.prototype = {
	__init:function(tmpl,component){
		//解析属性
		var propMap = this.__target.attributes;
		var innerHTML = this.__target.innerHTML;

		var compileStr = tmplExpFilter(tmpl,innerHTML,propMap);
		var els = DOMViewProvider.compile(compileStr);
		if(!els || els.length < 1){
			impex.console.warn('invalid template "'+tmpl+'" of component['+component.$name+']');
			return false;
		}
		this.name = els[0].nodeName.toLowerCase();
		this.element = els[0];
		if(els.length > 1)
			this.elements = els;

		if(propMap)
		for(var i=propMap.length;i--;){
			var k = propMap[i].name;
			var v = propMap[i].value;
			component[k] = v;
		}
	},
	__display:function(){
		if(!this.__target || (this.element.parentNode && this.element.parentNode.nodeType===1))return;

		var fragment = null;
		if(this.elements && this.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<this.elements.length;i++){
				fragment.appendChild(this.elements[i]);
			}
		}else{
			fragment = this.element;
		}

		this.__target.parentNode.replaceChild(fragment,this.__target);
		fragment = null;
		this.__target = null;
	},
	__destroy:function(component){
		for(var k in this.__evMap){
			var events = this.__evMap[k];
	        for(var i=events.length;i--;){
	            var pair = events[i];
	            var evHandler = pair[1];
	            Util.off(k,this.element,evHandler);
	        }
		}

		if(this.elements){
			var p = this.elements[0].parentNode;
			if(p)
			for(var i=this.elements.length;i--;){
				if(this.elements[i].__impex__view)
					this.elements[i].__impex__view = null;
				p.removeChild(this.elements[i]);
			}
		}else{
			if(this.element.__impex__view)
				this.element.__impex__view = null;
			this.element.parentNode.removeChild(this.element);
		}

		if(this.__target){
			this.__target.parentNode.removeChild(this.__target);
			this.__target = null;
		}
		
	},
	__suspend:function(component,hook){
		if(hook){
			this.__target =  document.createComment("-- view suspended of ["+(component.$name||'anonymous')+"] --");
			this.element.parentNode.insertBefore(this.__target,this.element);
		}		

		if(this.elements){
			var p = this.elements[0].parentNode;
			if(p)
			for(var i=this.elements.length;i--;){
				p.removeChild(this.elements[i]);
			}
		}else{
			this.element.parentNode.removeChild(this.element);
		}
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
				tmpExp = handler.call(comp,e,originExp);
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
		this.__evMap[type].push([exp,evHandler]);
	},
	__off:function(component,type,exp){
		var events = this.__evMap[type];
        for(var i=events.length;i--;){
            var pair = events[i];
            var evExp = pair[0];
            var evHandler = pair[1];
            if(evExp == exp)
                Util.off(type,this.element,evHandler);
        }
	},
	/**
	 * 复制当前视图
	 * @return {View}
	 */
	clone:function(){
		var tmp = null;
		if(this.elements){
			tmp = [];
			for(var i=this.elements.length;i--;){
				var c = this.elements[i].cloneNode(true);
				tmp.unshift(c);
			}
		}else{
			tmp = this.element.cloneNode(true);
		}
		
		var copy = new View(tmp,this.name);
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
		if(attrName === 'CONTENT'){
            return bodyHTML;
        }
        if(attrName === 'BINDPROPS'){
            var rs = '';
            var ks = Object.keys(propMap);
            for(var i=ks.length;i--;){
                rs += propMap[ks[i]].nodeName + '="'+propMap[ks[i]].nodeValue+'" ';
            }
            return rs;
        }

		var attrVal = propMap[attrName] && propMap[attrName].nodeValue;
		return attrVal || '';
	});
	return tmpl;
}