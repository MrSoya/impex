/**
 * @classdesc 视图接口，提供视图相关操作。组件和指令实现此接口
 * @class
 */
function View () {
	this.__evMap = {};
	/**
	 * 对视图节点的引用。如果组件/指令拥有多个顶级节点，该属性为null
	 * @type {HTMLElement | null}
	 */
	this.el = null;
}
View.prototype = {
	__destroy:function(){
		for(var k in this.__evMap){
			var events = this.__evMap[k];
	        for(var i=events.length;i--;){
	            var pair = events[i];
	            var evHandler = pair[1];

	            this.el.removeEventListener(k,evHandler,false);
	        }
		}

		DOMHelper.detach(this.__nodes);
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
		var comp = this instanceof Component?this:this.component;
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
	 * 显示视图
	 */
	show:function(){
		for(var i=this.__nodes.length;i--;){
			this.__nodes[i].style.display = '';
		}

		return this;
	},
	/**
	 * 隐藏视图
	 */
	hide:function(){
		for(var i=this.__nodes.length;i--;){
			this.__nodes[i].style.display = 'none';
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
		return this.el.className.split(' ').indexOf(name) > -1;
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
