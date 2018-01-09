
	var CMD_PREFIX = 'x-';//指令前缀
	var CMD_PARAM_DELIMITER = ':';
	var CMD_FILTER_DELIMITER = '.';

	var EXP_START_TAG = '{{',
		EXP_END_TAG = '}}';
	var REG_CMD = /^x-.*/;
	var ATTR_REF_TAG = 'ref';
	var ATTR_ID_TAG = 'id';
	var COMP_SLOT_TAG = 'component';
	var PROP_TYPE_PRIFX = '.';
	// var PROP_SYNC_SUFX = ':sync';
	// var PROP_SYNC_SUFX_EXP = /:sync$/;

	var EV_AB_PRIFX = ':';
	var BIND_AB_PRIFX = '.';

	var EXP2HTML_EXP_TAG = '#';
	var EXP2HTML_START_EXP = /^\s*#/;
	var FILTER_EXP_START_TAG = '=>';
	var FILTER_EXP_START_TAG_ENTITY = '=&gt;';
	var FILTER_EXP_SPLITTER = '|';
	var FILTER_EXP_PARAM_SPLITTER = ':';

	var DOM_COMP_ATTR = 'impex-component';

	var SLOT = 'slot';

	var im_counter = 0;

	var DISPATCHERS = [];
	var FILTER_MAP = {};
	var DIRECT_MAP = {};
	var COMP_MAP = {'component':1};
	var EVENT_MAP = {};
	var COMP_CSS_MAP = {};
	var SHOW_WARN = true;

	function warn(msg){
		console && console.warn('impex warn :: ' + msg);
	}

	function error(msg){
		console && console.error('impex error :: ' + msg);
	}


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
		 * 保存注册过的全局组件实例引用。
		 * 注册全局组件可以使用id属性.
		 * <p>
		 * 		<x-panel id="xPanel" >...</x-panel>
		 * </p>
		 * <p>
		 * 		impex.id.xPanel.todo();
		 * </p>
		 * @type {Object}
		 */
		this.id = {};

		/**
	     * 版本信息
	     * @type {Object}
	     * @property {Array} v 版本号
	     * @property {string} state
	     * @property {function} toString 返回版本
	     */
		this.version = {
	        v:[0,96,0],
	        state:'alpha',
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
		 * @param  {int} cfg.showWarn 是否显示警告信息
		 */
		this.config = function(cfg){
			var delimiters = cfg.delimiters || [];
			EXP_START_TAG = delimiters[0] || '{{';
			EXP_END_TAG = delimiters[1] || '}}';
			SHOW_WARN = cfg.showWarn===false?false:true;
		};

		/**
		 * 定义组件<br/>
		 * 定义的组件实质是创建了一个组件类的子类，该类的行为和属性由model属性
		 * 指定，当impex解析对应指令时，会动态创建子类实例<br/>
		 * @param  {string} name  组件名，全小写，必须是ns-name格式，至少包含一个"-"
		 * @param  {Object | String} param 组件参数对象，或url地址
		 * @return this
		 */
		this.component = function(name,param){
			if(typeof(param)!='string' && !param.template){
				error("can not find property 'template' of component '"+name+"'");
			}
			COMP_MAP[name] = param;
			return this;
		}

		/**
		 * 定义指令
		 * @param  {string} name  指令名，不带前缀
		 * @param  {Object} data 指令定义
		 * @return this
		 */
		this.directive = function(name,param){
			DIRECT_MAP[name] = param;
			return this;
		}

		/**
		 * 定义过滤器。过滤器可以用在表达式或者指令中
		 * <p>
		 * 	{{ exp... => cap}}
		 * </p>
		 * 过滤器可以连接使用，并以声明的顺序依次执行，比如
		 * <p>
		 * 	{{ exp... => lower|cap}}
		 * </p>
		 * 过滤器支持参数，比如
		 * <p>
		 * 	{{ exp... => currency:'€':4}}
		 * </p>
		 * <p>
		 * 	x-for="list as item => orderBy:'desc'"
		 * </p>
		 * @param  {string} name 过滤器名
		 * @param  {Function} to 过滤函数。回调参数为 [value,params...]，其中value表示需要过滤的内容
		 * @return this
		 */
		this.filter = function(name,to){
			FILTER_MAP[name] = to;
			return this;
		}

		/**
		 * 渲染一段HTML匿名组件到指定容器，比如
		 * <pre>
		 * 	<div id="entry"></div>
		 * 	...
		 * 	impex.renderTo('<x-app></x-app>','#entry'...)
		 * </pre>
		 * @param  {String} tmpl 字符串模板
		 * @param  {HTMLElement | String} container 匿名组件入口，可以是DOM节点或选择器字符
		 * @param  {Object} param 组件参数，如果节点本身已经是组件，该参数会覆盖原有参数 
		 * @param  {Array} [services] 需要注入的服务，服务名与注册时相同，比如['ViewManager']
		 */
		this.renderTo = function(tmpl,container,param){
			
			//link comps
			var links = document.querySelectorAll('link[rel="impex"]');

            //register requires
            for(var i=links.length;i--;){
                var lk = links[i];
                var type = lk.getAttribute('type');
                var href = lk.getAttribute('href');
                impex.component(type,href);
            }

            if(isString(container)){
            	container = document.querySelector(container);
            }
            if(container.tagName === 'BODY'){
            	error("container element must be inside <body> tag");
            	return;
            }

            tmpl = tmpl.replace(/<!--[\s\S]*?-->/mg,'')
            		.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/mg,'')
            		.trim();
			var comp = newComponent(tmpl,container,param);

			comp.onCreate && comp.onCreate();
			parseComponent(comp);
			mountComponent(comp);

			return comp;
		}

		/**
		 * 渲染一个DOM节点组件，比如
		 * <pre>
		 * 	<x-stage id="entry"><x-stage>
		 * 	...
		 * 	impex.render('#entry'...)
		 * </pre>
		 * 如果DOM元素本身并不是组件,系统会创建一个匿名组件，也就是说
		 * impex总会从渲染一个组件作为一切的开始
		 * @param  {HTMLElement | String} node 组件入口，可以是DOM节点或选择器字符
		 * @param  {Object} param 组件参数，如果节点本身已经是组件，该参数会覆盖原有参数 
		 */
		this.render = function(node,param){
			if(isString(node)){
            	node = document.querySelector(node);
            }
            var tmpl = node.outerHTML;
            return this.renderTo(tmpl,node,param);
		}

		Object.defineProperty(this,'_cs',{enumerable: false,writable: true,value:{}});

		//for prototype API
		this.Component = Component;

		this.EventEmitter = EventEmitter;
	}

