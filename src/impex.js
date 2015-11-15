
 	
	var CMD_PREFIX = 'x-';//指令前缀

	var EXP_START_TAG = '{{',
		EXP_END_TAG = '}}';
	var REG_EXP = /\{\{(.*?)\}\}/img,
		REG_TMPL_EXP = /\{\{=(.*?)\}\}/img,
		REG_CMD = /x-.*/;

	var CONVERTER_EXP = /^\s*#/;
	var EXP_CONVERTER_SYM = '#';
	var DEPTH = 9;
	var DEBUG = false;

	var BUILD_IN_PROPS = ['data','closest'];

	var lastComp;
	function compDebug(comp,state){
		var indent = '';
		var p = comp.$parent;
		while(p){
			indent += '=';
			p = p.$parent;
		}
		var info = '';
		if(comp == lastComp){
			info = '↑↑↑ ↑↑↑ ↑↑↑ ';
		}else{
			var props = [];
			props.push('id:'+comp.$__id);
			if(comp.$name)
				props.push('name:'+comp.$name);
			props.push('view:'+comp.$view.element.tagName);
			if(comp.$parent){
				props.push('parentId:'+(comp.$parent?comp.$parent.$__id:'null'));
			}

			var type = comp instanceof Directive?'Directive':'Component';

			info = type+'{'+ props.join(',') +'} ';
		}
		lastComp = comp;
		
		impex.console.debug(indent + (indent?'> ':'') + info + state);
	}

	/**
	 * impex是一个用于开发web应用的组件式开发引擎，impex可以运行在桌面或移动端
	 * 让你的web程序更好维护，更好开发。
	 * impex的目标是让开发者基于web技术以最低的学习成本获得最大的收益，所以impex会尽量简单。
	 * impex由组件、指令、转换器和服务这几个概念构成
	 * @namespace 
	 * @author {@link https://github.com/MrSoya MrSoya}
	 */
	var impex = new function(){

		/**
	     * 版本信息
	     * @type {Object}
	     * @property {Array} v 版本号
	     * @property {string} state
	     * @property {function} toString 返回版本
	     */
		this.version = {
	        v:[0,3,2],
	        state:'beta',
	        toString:function(){
	            return impex.version.v.join('.') + ' ' + impex.version.state;
	        }
	    };
	    /**
	     * 官网地址
	     * @type {String}
	     * @constant
	     */
		this.website = 'http://mrsoya.github.io/impex';

		/**
		 * 设置impex参数
		 * @param  {Object} opt 参数选项
		 * @param  {String} opt.expStartTag 标签开始符号，默认{{
		 * @param  {String} opt.expEndTag 标签结束符号，默认}}
		 * @param  {int} opt.recurDepth 模型递归深度，默认9
		 * @param  {boolean} debug 是否开启debug，默认false
		 */
		this.option = function(opt){
			EXP_START_TAG = opt.expStartTag || '{{';
			EXP_END_TAG = opt.expEndTag || '}}';

			DEPTH = parseInt(opt.recurDepth) || 9;

			REG_EXP = new RegExp(EXP_START_TAG+'(.*?)'+EXP_END_TAG,'img');
			REG_TMPL_EXP = new RegExp(EXP_START_TAG+'=(.*?)'+EXP_END_TAG,'img');

			DEBUG = opt.debug;
		};

		/**
		 * 定义组件<br/>
		 * 定义的组件实质是创建了一个组件类的子类，该类的行为和属性由model属性
		 * 指定，当impex解析对应指令时，会动态创建子类实例<br/>
		 * @param  {string} name  组件名，全小写，必须是ns-name格式，至少包含一个"-"
		 * @param  {Object} model 组件模型，用来定义新组件模版。<br/>
		 * *模型属性是共享的，比如数组是所有实例公用。如果模型中的某些属性不想
		 * 被表达式访问，只需要在名字前加上"$"符号<br/>
		 * *模型方法会绑定到组件原型中，以节省内存
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.component = function(name,model,services){
			ComponentFactory.register(name,model,services);
			return this;
		}

		/**
		 * 定义指令
		 * @param  {string} name  指令名，不带前缀
		 * @param  {Object} model 指令模型，用来定义新指令模版
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.directive = function(name,model,services){
			DirectiveFactory.register(name,model,services);
			return this;
		}

		/**
		 * 定义服务
		 * @param  {string} name  服务名，注入时必须和创建时名称相同
		 * @param  {Object} model 服务模型，用来定义新指令模版
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.service = function(name,model,services){
			ServiceFactory.register(name,model,services);
			return this;
		}

		/**
		 * 定义转换器
		 * @param  {string} name  转换器名
		 * @param  {Object} model 转换器模型，用来定义新转换器模版
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.converter = function(name,model,services){
			ConverterFactory.register(name,model,services);
			return this;
		}

		/**
		 * 渲染一个组件，比如
		 * <pre>
		 * 	<x-stage id="entry"><x-stage>
		 * 	...
		 * 	impex.render(document.getElementById('entry')...)
		 * </pre>
		 * 如果DOM元素本身并不是组件,系统会创建一个虚拟组件，也就是说
		 * impex总会从渲染一个组件作为一切的开始
		 * @param  {HTMLElement} element DOM节点，可以是组件节点
		 * @param  {Object} model 模型，用来给组件提供数据支持，如果节点本身已经是组件，
		 * 该模型所包含参数会附加到模型中 
		 * @param  {Array | null} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 */
		this.render = function(element,model,services){
			var name = element.tagName.toLowerCase();
			if(elementRendered(element)){
				impex.console.warn('element ['+name+'] has been rendered');
				return;
			}
			var comp = ComponentFactory.newInstanceOf(name,element);
			if(!comp){
				topComponentNodes.push(element);
				comp = ComponentFactory.newInstance(element,null,model,services);
			}
			
			comp.init();
			comp.display();

			return comp;
		}

		var topComponentNodes = [];
		function elementRendered(element){
			var p = element;
			do{
				if(topComponentNodes.indexOf(p) > -1)return true;
				p = p.parentNode;
			}while(p);
			return false;
		}

		this.__components = {};

		/**
		 * 查找组件实例，并返回符合条件的所有实例
		 * @param  {string} name       组件名，可以使用通配符*
		 * @param  {Object} conditions 查询条件，JSON对象
		 * @return {Array}  
		 */
		this.findAll = function(name,conditions){
			name = name.toLowerCase();
			var rs = [];
			var ks = Object.keys(this.__components);
			for(var i=ks.length;i--;){
				var comp = this.__components[ks[i]];
				if(name != '*' && comp.$name != name)continue;

				var matchAll = true;
				if(conditions)
					for(var k in conditions){
						if(comp[k] != conditions[k]){
							matchAll = false;
							break;
						}
					}
				if(matchAll){
					rs.push(comp);
				}
				
			}
			return rs;
		}
	}