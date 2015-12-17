/**
 * @classdesc 视图类，提供视图相关操作。所有影响显示效果的都属于视图操作，
 * 比如show/hide/css/animate等等
 * 无法直接创建实例，会被自动注入到组件或者指令中
 * 一个组件或者指令只会拥有一个视图
 * @class
 */
function View (elements,target) {
	/**
	 * 对可视元素的引用，在DOM中就是HTMLElement，
	 * 在绝大多数情况下，都不应该直接使用该属性
	 * @type {Array}
	 */
	this.elements = elements;

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
			LOGGER.warn('invalid template "'+tmpl+'" of component['+component.$name+']');
			return false;
		}
		this.elements = els;

		if(propMap)
		for(var i=propMap.length;i--;){
			var k = propMap[i].name;
			var v = propMap[i].value;
			component[k] = v;
		}
	},
	__display:function(){
		if(!this.__target ||!this.__target.parentNode || (this.elements[0].parentNode && this.elements[0].parentNode.nodeType===1))return;

		var fragment = null;
		if(this.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<this.elements.length;i++){
				fragment.appendChild(this.elements[i]);
			}
		}else{
			fragment = this.elements[0];
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

	            for(var j=this.elements.length;j--;){
	            	if(this.elements[j].nodeType !== 1)continue;
	            	Util.off(k,this.elements[j],evHandler);
	            }
	        }
		}

		var p = this.elements[0].parentNode;
		if(p){
			if(this.elements[0].__impex__view)
				this.elements[0].__impex__view = null;
			for(var i=this.elements.length;i--;){
				p.removeChild(this.elements[i]);
			}
		}

		if(this.__target){
			this.__target.parentNode.removeChild(this.__target);
			this.__target = null;
		}
	},
	__suspend:function(component,hook){
		if(!this.elements[0].parentNode)return;
		if(hook){
			this.__target =  document.createComment("-- view suspended of ["+(component.$name||'anonymous')+"] --");
			this.elements[0].parentNode.insertBefore(this.__target,this.element);
		}

		var p = null;
		for(var i=this.elements.length;i--;){
			if(this.elements[i].parentNode){
				p = this.elements[i].parentNode;
				break;
			}
		}
		if(p)
		for(var i=this.elements.length;i--;){
			if(this.elements[i].parentNode)
				p.removeChild(this.elements[i]);
		}
	},
	__on:function(component,type,exp,handler){
		var originExp = exp;
		var comp = component;
		var tmpExpOutside = '';
		var fnOutside = null;
		var evHandler = function(e){
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
			
			try{
				fnOutside(e);
			}catch(error){
				LOGGER.debug(error.message + 'eval error on event '+type+'('+tmp +')');
			}
			
		};
		for(var j=this.elements.length;j--;){
			var el = this.elements[j];
        	if(el.nodeType !== 1)continue;
        	Util.on(type,el,evHandler);
        }
		
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
            if(evExp == exp){
            	for(var j=this.elements.length;j--;){
	            	if(this.elements[j].nodeType !== 1)continue;
	            	Util.off(type,this.elements[j],evHandler);
	            }
            }
        }
	},
	/**
	 * 复制当前视图
	 * @return {View}
	 */
	clone:function(){
		var tmp = [];
		for(var i=this.elements.length;i--;){
			var c = this.elements[i].cloneNode(true);
			tmp.unshift(c);
		}
		
		var copy = new View(tmp);
		return copy;
	},
	/**
	 * 显示视图
	 */
	show:function(){
		for(var i=this.elements.length;i--;){
			if(this.elements[i].nodeType !== 1)continue;
			this.elements[i].style.display = '';
		}
		return this;
	},
	/**
	 * 隐藏视图
	 */
	hide:function(){
		for(var i=this.elements.length;i--;){
			if(this.elements[i].nodeType !== 1)continue;
			this.elements[i].style.display = 'none';
		}
		return this;
	},
	/**
	 * 获取或设置视图的样式
	 * @param  {String} name  样式名，如width/height
	 * @param  {var} value 样式值
	 */
	style:function(name,value){
		if(arguments.length > 1){
			for(var i=this.elements.length;i--;){
				if(this.elements[i].nodeType !== 1)continue;
				this.elements[i].style[name] = value;
			}
			return this;
		}else{
			for(var i=0;i<this.elements.length;i++){
				if(this.elements[i].nodeType === 1)break;
			}
			return this.elements[i].style[name];
		}
	},
	/**
	 * 获取或设置视图的属性值
	 * @param  {String} name  属性名
	 * @param  {String} value 属性值
	 */
	attr:function(name,value){
		if(arguments.length > 1){
			for(var i=this.elements.length;i--;){
				if(this.elements[i].nodeType !== 1)continue;
				this.elements[i].setAttribute(name,value);
			}
			return this;
		}else{
			for(var i=0;i<this.elements.length;i++){
				if(this.elements[i].nodeType === 1)break;
			}
			return this.elements[i].getAttribute(name);
		}
	},
	/**
	 * 删除视图属性
	 * @param  {String} name  属性名
	 */
	removeAttr:function(name){
		for(var i=this.elements.length;i--;){
			if(this.elements[i].nodeType !== 1)continue;
			this.elements[i].removeAttribute(name);
		}
		return this;
	},
	/**
	 * 视图是否包含指定样式
	 * @param  {String} name  样式名
	 */
	hasClass:function(name){
		for(var i=0;i<this.elements.length;i++){
			if(this.elements[i].nodeType === 1)break;
		}
		return this.elements[i].className.indexOf(name) > -1;
	},
	/**
	 * 添加样式到视图
	 * @param  {String} names  空格分隔多个样式名
	 */
	addClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');
		for(var i=0;i<this.elements.length;i++){
			if(this.elements[i].nodeType !== 1)continue;
			this.elements[i].className += ' '+names;
		}
	},
	/**
	 * 从视图删除指定样式
	 * @param  {String} names  空格分隔多个样式名
	 */
	removeClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');
		var clss = names.split(' ');
		for(var ci=clss.length;ci--;){
			var cname = clss[ci];

			var exp = new RegExp('^'+cname+'\s+|\s+'+cname+'$|\s+'+cname+'\s+','img');

			for(var i=0;i<this.elements.length;i++){
				if(this.elements[i].nodeType !== 1)continue;

				this.elements[i].className.replace(exp,'');
			}
		}
	},
	/**
	 * 从视图添加或移除指定样式
	 * @param  {String} names  空格分隔多个样式名
	 */
	toggleClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');
		var clss = names.split(' ');
		for(var i=0;i<this.elements.length;i++){
			if(this.elements[i].nodeType === 1)break;
		}
		var add = false;
		for(var ci=clss.length;ci--;){
			var cname = clss[ci];

			if(this.elements[i].className.indexOf(cname) < 0){
				add = true;
				break;
			}
		}
		for(var i=0;i<this.elements.length;i++){
			if(this.elements[i].nodeType !== 1)continue;
			if(add){
				this.elements[i].className += ' '+names;
			}else{
				for(var ci=clss.length;ci--;){
					var cname = clss[ci];
					var exp = new RegExp('^'+cname+'\s+|\s+'+cname+'$|\s+'+cname+'\s+','img');

					this.elements[i].className.replace(exp,'');
				}
			}
		}
	}//fn over
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