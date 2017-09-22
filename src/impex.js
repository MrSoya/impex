
 	
	var CMD_PREFIX = 'x-';//指令前缀
	var CMD_PARAM_DELIMITER = ':';
	var CMD_FILTER_DELIMITER = '.';

	var EXP_START_TAG = '{{',
		EXP_END_TAG = '}}';
	var REG_EXP = /\{\{#?(.*?)\}\}/img,
		REG_CMD = /x-.*/;
	var ATTR_REF_TAG = 'ref';
	var COMP_SLOT_TAG = 'component';
	var PROP_TYPE_PRIFX = '.';
	var PROP_SYNC_SUFX = ':sync';
	var PROP_SYNC_SUFX_EXP = /:sync$/;

	var EXP2HTML_EXP_TAG = '#';
	var EXP2HTML_START_EXP = /^\s*#/;
	var FILTER_EXP = /=>\s*(.+?)$/;
	var FILTER_EXP_START_TAG = '=>';
	var FILTER_EXP_SPLITTER = '|';
	var LOGGER = {
	    log : function(){},
	    debug : function(){},
	    error : function(){},
	    warn : function(){}
	};

	var im_counter = 0;

	var DISPATCHERS = [];

	var HTML_EXP_COMPILING = false;
	var HTML_EXP_MAP = {};
	var CURRENT_HTML_EXP_LIST = null;
	/**
	 * impex是一个用于开发web应用的组件式开发引擎，impex可以运行在桌面或移动端
	 * 让你的web程序更好维护，更好开发。
	 * impex的目标是让开发者基于web技术以最低的学习成本获得最大的收益，所以impex会尽量简单。
	 * impex由组件、指令、过滤器和服务这几个概念构成
	 * @namespace 
	 * @author {@link https://github.com/MrSoya MrSoya}
	 */
	var impex = new function(){

		/**
		 * 保存注册过的全局组件实例引用。注册全局组件可以使用x-global指令.
		 * <p>
		 * 		<x-panel x-global="xPanel" >...</x-panel>
		 * </p>
		 * <p>
		 * 		impex.global.xPanel.todo();
		 * </p>
		 * @type {Object}
		 */
		this.global = {};

		/**
		 * impex事件管理接口
		 * @type {Object}
		 */
		this.events = {
			/**
			 * 注册一个事件分派器
			 * @param  {String | Array} events 支持的事件列表。数组或者以空格分割的字符串
			 * @param  {Dispatcher} dispatcher 分派器
			 */
			registerDispatcher:function(events,dispatcher){
				if(typeof(events) == 'string'){
					events = events.split(' ');
				}
				DISPATCHERS.push([events,dispatcher]);
			}
		}

		/**
	     * 版本信息
	     * @type {Object}
	     * @property {Array} v 版本号
	     * @property {string} state
	     * @property {function} toString 返回版本
	     */
		this.version = {
	        v:[0,56,1],
	        state:'',
	        toString:function(){
	            return impex.version.v.join('.') + ' ' + impex.version.state;
	        }
	    };
	    /**
	     * 官网地址
	     * @type {String}
	     * @constant
	     */
		this.website = 'http://impexjs.org';

		/**
		 * 设置impex参数
		 * @param  {Object} cfg 参数选项
		 * @param  {String} cfg.delimiters 表达式分隔符，默认{{ }}
		 * @param  {int} cfg.logger 日志器对象，至少实现warn/log/debug/error 4个接口
		 */
		this.config = function(cfg){
			var delimiters = cfg.delimiters || [];
			EXP_START_TAG = delimiters[0] || '{{';
			EXP_END_TAG = delimiters[1] || '}}';

			REG_EXP = new RegExp(EXP_START_TAG+'(.*?)'+EXP_END_TAG,'img');

			if(cfg.logger)LOGGER = cfg.logger;
			this.logger = LOGGER;
		};

		/**
		 * 定义组件<br/>
		 * 定义的组件实质是创建了一个组件类的子类，该类的行为和属性由model属性
		 * 指定，当impex解析对应指令时，会动态创建子类实例<br/>
		 * @param  {string} name  组件名，全小写，必须是ns-name格式，至少包含一个"-"
		 * @param  {Object} param 组件参数<br/>
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.component = function(name,param,services){
			if(typeof(param)!='string' && !param.template){
				LOGGER.warn("can not find property 'template' of component '"+name+"'");
			}
			ComponentFactory.register(name,param,services);
			return this;
		}

		/**
		 * 定义指令
		 * @param  {string} name  指令名，不带前缀
		 * @param  {Object} param 指令参数
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.directive = function(name,param,services){
			DirectiveFactory.register(name,param,services);
			return this;
		}

		/**
		 * 定义服务
		 * @param  {string} name  服务名，注入时必须和创建时名称相同
		 * @param  {Object} param 服务参数
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.service = function(name,param,services){
			ServiceFactory.register(name,param,services);
			return this;
		}

		/**
		 * 定义过滤器
		 * @param  {string} name  过滤器名
		 * @param  {Object} param 过滤器参数
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 * @return this
		 */
		this.filter = function(name,param,services){
			FilterFactory.register(name,param,services);
			return this;
		}

		/**
		 * 定义过渡器
		 * @param  {string} name  过渡器名
		 * @param  {Object} hook 过渡器钩子，可以在过渡的各个周期进行调用
		 * @return this
		 */
		this.transition = function(name,hook){
			TransitionFactory.register(name,hook);
			return this;
		}

		/**
		 * 对单个组件进行测试渲染
		 */
		this.unitTest = function(compName,entry,model){
			window.onload = function(){
	            'use strict';
	            
                var subModel = component();
                var tmpl = document.querySelector('template');
                subModel.template = tmpl.innerHTML;
	            //register
	            impex.component(compName,subModel);

	            //register requires
	            var links = document.querySelectorAll('link[rel="impex"]');
	            for(var i=links.length;i--;){
	                var lk = links[i];
	                var type = lk.getAttribute('type');
	                var href = lk.getAttribute('href');
	                var services = lk.getAttribute('services');
	                if(services)
	                	services = services.split(',');
	                impex.component(type,href,services);
	            }

	            //render
	            impex.render(document.querySelector(entry),model);
	        }
		}

		/**
		 * 渲染一个组件，比如
		 * <pre>
		 * 	<x-stage id="entry"><x-stage>
		 * 	...
		 * 	impex.render(document.getElementById('entry')...)
		 * </pre>
		 * 如果DOM元素本身并不是组件,系统会创建一个匿名组件，也就是说
		 * impex总会从渲染一个组件作为一切的开始
		 * @param  {HTMLElement} element DOM节点，可以是组件节点
		 * @param  {Object} param 组件参数，如果节点本身已经是组件，该参数会覆盖原有参数 
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 */
		this.render = function(element,param,services){
			if(!element){
				LOGGER.error('invalid element, can not render');
				return;
			}
			var name = element.tagName.toLowerCase();
			if(elementRendered(element)){
				LOGGER.warn('element ['+name+'] has been rendered');
				return;
			}
			//link comps
			var links = document.querySelectorAll('link[rel="impex"]');

            //register requires
            for(var i=links.length;i--;){
                var lk = links[i];
                var type = lk.getAttribute('type');
                var href = lk.getAttribute('href');
                var services = lk.getAttribute('services');
                if(services)
	                	services = services.split(',');
                impex.component(type,href,services);
            }

			var comp = ComponentFactory.newInstanceOf(name,element);
			if(!comp){
				topComponentNodes.push(element);
				comp = ComponentFactory.newInstance([element],param);
			}

			if(comp.onCreate){
				var svs = null;
				if(Util.isArray(services)){
					//inject
					svs = [];
					for(var i=0;i<services.length;i++){
						var serv = ServiceFactory.newInstanceOf(services[i],comp);
						svs.push(serv);
					}
				}
				svs ? comp.onCreate.apply(comp,svs) : comp.onCreate();
			}
			
			comp.init();
			comp.mount();

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

		Object.defineProperty(this,'_cs',{enumerable: false,writable: true,value:{}});


		this.logger = LOGGER;
		this.util = Util;


		//for prototype API
		this.Component = Component;

		this.Signal = Signal;
		/**
		 * 开启基础渲染。用于自动更新父组件参数变更导致的变化。
		 * 注意：参数传递默认引用方式，这可能会导致父组件的一个对象参数的子属性变更无法通知子组件。
		 * 如果需要传递不可变对象，可以使用impex.util.immutable()方法
		 */
		this.useBasicRender = function(){
			Util.ext(Component.prototype,{
				onPropChange : function(changes){
					for(var k in changes){
						var c = changes[k];
						var val = this.state[c.name];
			            if(c.val !== val){
			                this.state[c.name] = c.val;
			            }
					}
			    }
			});
		}
	}

