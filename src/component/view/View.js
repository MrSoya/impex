/**
 * @classdesc 视图类，提供视图相关操作。所有影响显示效果的都属于视图操作，
 * 比如show/hide/css/animate等等
 * 无法直接创建实例，会被自动注入到组件或者指令中
 * 一个组件或者指令只会拥有一个视图
 * @class
 */
function View (el,target,nodes,placeholder) {
	/**
	 * 对可视元素的引用，在DOM中就是HTMLElement，
	 * 在绝大多数情况下，都不应该直接使用该属性
	 * @type {Object}
	 */
	this.el = el;

	this.__nodes = nodes;
	this.__evMap = {};
	this.__target = target;
	this.__placeholder = placeholder || target;
	/**
	 * 对视图范围内可视元素的引用，在DOM中就是HTMLElement
	 * @type {Object}
	 */
	this.refs = {};
}
View.prototype = {
	__init:function(tmpl,component){
		//解析属性
		var propMap = this.__target.attributes;
		var innerHTML = this.__target.innerHTML;

		var compileStr = tmplExpFilter(tmpl,innerHTML,propMap);

		if(component.onBeforeCompile){
            compileStr = component.onBeforeCompile(compileStr);
        }

		var nodes = DOMViewProvider.compile(compileStr,this.__placeholder);

		this.__nodes = nodes;
		this.el = nodes.length===1 && nodes[0].nodeType===1?nodes[0]:null;

		if(!nodes || nodes.length < 1){
			LOGGER.error('invalid template "'+tmpl+'" of component['+component.name+']');
			return false;
		}
		if(nodes.length > 1){
			LOGGER.warn('more than 1 root node of component['+component.name+']');
		}

		//check props
		var requires = {};
		var propTypes = component.propTypes;
		if(propTypes){
			for(var k in propTypes){
				var type = propTypes[k];
				if(type.require){
					requires[k] = type;
				}
			}
		}

		if(propMap){
			//bind props
			for(var i=propMap.length;i--;){
				var k = propMap[i].name.toLowerCase();
				var v = propMap[i].value;
				if(k == ATTR_REF_TAG){
					var expNode = Scanner.getExpNode(v,component);
					var calcVal = expNode && Renderer.calcExpNode(expNode);
					component.parent.refs[calcVal || v] = component;
					continue;
				}

				var instance = null;
				if(REG_CMD.test(k)){
					var c = k.replace(CMD_PREFIX,'');
					var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
					if(CPDI > -1)c = c.substring(0,CPDI);
					//如果有对应的处理器
					if(DirectiveFactory.hasTypeOf(c)){
						instance = DirectiveFactory.newInstanceOf(c,this.el,component,k,v);
					}
				}else if(k.indexOf(CMD_PARAM_DELIMITER) === 0){
					instance = DirectiveFactory.newInstanceOf('on',this.el,component,k,v);
				}else{
					if(!component.parent)continue;
					//如果是属性，给props
					var tmp = lexer(v);
					var rs = Renderer.evalExp(component.parent,tmp);
					var keys = Object.keys(tmp.varTree);
					//watch props
					keys.forEach(function(key){
						if(tmp.varTree[key].isFunc)return;
						
						var prop = new Prop(component,k,tmp.varTree[key].segments,tmp,rs);
						component.parent.__watchProps.push(prop);
					});

					if(propTypes){
						delete requires[k];
						this.__checkPropType(k,rs,propTypes,component);
					}

					component.props[k] = rs;
				}

				if(instance){
					instance.init();
				}
			}
		}

		//check requires
		var ks = Object.keys(requires);
		if(ks.length > 0){
			LOGGER.error("props ["+ks.join(',')+"] of component["+component.name+"] are required");
			return;
		}

		this.__comp = component;

		//组件已经直接插入DOM中
		this.__placeholder = null;
	},
	__checkPropType:function(k,v,propTypes,component){
		if(!propTypes[k])return;
		var checkType = propTypes[k].type;
		checkType = checkType instanceof Array?checkType:[checkType];
		var vType = typeof v;
		if(checkType.indexOf(vType) < 0){
			LOGGER.error("invalid type ["+vType+"] of prop ["+k+"] of component["+component.name+"];should be ["+checkType.join(',')+"]");
		}
	},
	__display:function(component){
		if(!this.__placeholder ||!this.__placeholder.parentNode)return;

		var fragment = null;
		if(this.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<this.__nodes.length;i++){
				fragment.appendChild(this.__nodes[i]);
			}
		}else{
			fragment = this.__nodes[0];
		}

		this.__placeholder.parentNode.replaceChild(fragment,this.__placeholder);

		fragment = null;
		this.__placeholder = null;
	},
	__destroy:function(component){
		for(var k in this.__evMap){
			var events = this.__evMap[k];
	        for(var i=events.length;i--;){
	            var pair = events[i];
	            var evHandler = pair[1];

	            for(var j=this.__nodes.length;j--;){
	            	if(this.__nodes[j].nodeType !== 1)continue;
	            	this.__nodes[j].removeEventListener(k,evHandler,false);
	            }
	        }
		}

		var p = this.__nodes[0].parentNode;
		if(p){
			if(this.__nodes[0].__impex__view)
				this.__nodes[0].__impex__view = null;
			for(var i=this.__nodes.length;i--;){
				this.__nodes[i].parentNode && p.removeChild(this.__nodes[i]);
			}
		}

		if(this.__target){
			if(this.__target.parentNode)
				this.__target.parentNode.removeChild(this.__target);
			this.__target = null;
		}
	},
	__suspend:function(component,hook){
		var p = this.__nodes[0].parentNode;
		if(!p)return;
		if(hook){
			this.__target =  document.createComment("-- view suspended of ["+(component.name||'anonymous')+"] --");
			p.insertBefore(this.__target,this.__nodes[0]);
		}

		for(var i=this.__nodes.length;i--;){
			if(this.__nodes[i].parentNode)
				p.removeChild(this.__nodes[i]);
		}
	},
	/**
	 * 绑定事件到视图
	 * @param  {string} type 事件名，标准DOM事件名，比如click / mousedown
     * @param {string} exp 自定义函数表达式，比如  fn(x+1) 
     * @param  {function} handler   事件处理回调，回调参数e
	 */
	on:function(type,exp,handler){
		if(!this.el)return;

		var originExp = exp;
		var comp = this.__comp;
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
				LOGGER.debug("error in event '"+type +"'",error);
			}
		};

        this.el.addEventListener(type,evHandler,false);
		
		if(!this.__evMap[type]){
			this.__evMap[type] = [];
		}
		this.__evMap[type].push([exp,evHandler]);
	},
	/**
	 * 从视图解绑事件
	 * @param  {string} type 事件名
     * @param {string} exp 自定义函数表达式，比如 { fn(x+1) }
	 */
	off:function(type,exp){
		if(!this.el)return;

		var events = this.__evMap[type];
        for(var i=events.length;i--;){
            var pair = events[i];
            var evExp = pair[0];
            var evHandler = pair[1];
            if(evExp == exp){
	            this.el.removeEventListener(type,evHandler,false);
            }
        }
	},
	/**
	 * 复制当前视图
	 * @return {View}
	 */
	clone:function(){
		var tmp = [];
		for(var i=this.__nodes.length;i--;){
			var c = this.__nodes[i].cloneNode(true);
			tmp.unshift(c);
		}
		
		var copy = new View(tmp.length===1&&tmp[0].nodeType===1?tmp[0]:null,null,tmp);
		return copy;
	},
	/**
	 * 显示视图
	 */
	show:function(){
		this.el.style.display = '';

		return this;
	},
	/**
	 * 隐藏视图
	 */
	hide:function(){
		this.el.style.display = 'none';

		return this;
	},
	/**
	 * 获取或设置视图的样式
	 * @param  {String} name  样式名，如width/height
	 * @param  {var} value 样式值
	 */
	style:function(name,value){
		if(arguments.length > 1){
			this.el.style[name] = value;

			return this;
		}else{
			return this.el.style[name];
		}
	},
	/**
	 * 获取或设置视图的属性值
	 * @param  {String} name  属性名
	 * @param  {String} value 属性值
	 */
	attr:function(name,value){
		if(arguments.length > 1){
			this.el.setAttribute(name,value);

			return this;
		}else{
			return this.el.getAttribute(name);
		}
	},
	/**
	 * 删除视图属性
	 * @param  {String} name  属性名
	 */
	removeAttr:function(name){
		this.el.removeAttribute(name);
		
		return this;
	},
	/**
	 * 视图是否包含指定样式
	 * @param  {String} name  样式名
	 */
	hasClass:function(name){
		return this.el.className.indexOf(name) > -1;
	},
	/**
	 * 添加样式到视图
	 * @param  {String} names  空格分隔多个样式名
	 */
	addClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');

		names = names.split(' ');
		var cls = this.el.className.split(' ');
		var rs = '';
		for(var n=names.length;n--;){
			if(cls.indexOf(names[n]) < 0){
				rs += names[n]+' ';
			}
		}
		this.el.className += ' '+rs;
		
		return this;
	},
	/**
	 * 从视图删除指定样式
	 * @param  {String} names  空格分隔多个样式名
	 */
	removeClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');
		var clss = names.split(' ');
		var clsName = this.el.className;
		if(clsName){
			for(var ci=clss.length;ci--;){
				var cname = clss[ci];

				var exp = new RegExp('^'+cname+'\\s+|\\s+'+cname+'$|\\s+'+cname+'\\s+','img');
				clsName = clsName.replace(exp,'');
			}

			this.el.className = clsName;
		}
		
		return this;
	},
	/**
	 * 从视图添加或移除指定样式
	 * @param  {String} names  空格分隔多个样式名
	 */
	toggleClass:function(names){
		names = names.replace(/\s+/mg,' ').replace(/^\s*|\s*$/mg,'');

		var clss = names.split(' ');
		var add = false;
		var clsName = this.el.className;
		for(var ci=clss.length;ci--;){
			var cname = clss[ci];

			if(clsName.indexOf(cname) < 0){
				add = true;
				break;
			}
		}
		if(add){
			this.addClass(names);
		}else{
			this.removeClass(names);
		}
	}//fn over
}

function tmplExpFilter(tmpl,bodyHTML,propMap){
	tmpl = tmpl.replace(REG_TMPL_EXP,function(a,attrName){
		var attrName = attrName.replace(/\s/mg,'');
		if(attrName === 'CONTENT'){
            return bodyHTML||'';
        }
		return '';
	});
	return tmpl;
}