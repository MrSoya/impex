
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

	var EV_AB_PRIFX = ':';
	var BIND_AB_PRIFX = '.';
	var EXP_EXP = new RegExp(EXP_START_TAG+'(.+?)(?:(?:(?:=>)|(?:=&gt;))(.+?))?'+EXP_END_TAG,'img');

	var DOM_COMP_ATTR = 'impex-component';

	var SLOT = 'slot';

	var im_counter = 0;

	var DISPATCHERS = [];
	var FILTER_MAP = {};
	var DIRECT_MAP = {};
	var DIRECT_EXP_VALUE_MAP = {};
	var COMP_MAP = {'component':1};
	var EVENT_MAP = {};
	var COMP_CSS_MAP = {};

	//removeIf(production)
	function error(compName,code,msg,e){
		console && console.error('xerror[' + compName +'] - #'+code+' - '+msg,e||'','\n\nFor more information about the xerror,please visit the following address: http://impexjs.org/doc/techniques.php#techniques-xerror');
	}
	function assert(isTrue,compName,code,msg,e) {
		!isTrue && error(compName,code,msg,e);
	}
	var XERROR = {
		COMPONENT:{//1XXX
			CONTAINER:1001,
			TEMPLATEPROP:1002,
			LOADERROR:1003,
			LOADTIMEOUT:1004,
			TEMPLATETAG:1005,
			COMPUTESTATE:1006
		},
		COMPILE:{//2XXX
			ONEROOT:2001,
			EACH:2002,
			HTML:2003,
			ROOTTAG:2004,
			ROOTCOMPONENT:2005,
			NOFILTER:2006
		},
		//COMPONENT ATTRIBUTE ERRORS
		INPUT:{//3XXX
			REQUIRE:3001,
			TYPE:3002
		},
		STORE:{//4XXX
			NOSTORE:4001
		}
	}
	//endRemoveIf(production)

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
	        v:[0,98,0],
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
		 */
		this.config = function(cfg){
			var delimiters = cfg.delimiters || [];
			EXP_START_TAG = delimiters[0] || '{{';
			EXP_END_TAG = delimiters[1] || '}}';

			EXP_EXP = new RegExp(EXP_START_TAG+'(.+?)(?:(?:(?:=>)|(?:=&gt;))(.+?))?'+EXP_END_TAG,'img');
		};

		/**
		 * 定义组件<br/>
		 * 定义的组件实质是创建了一个组件类的子类，该类的行为和属性由model属性
		 * 指定，当impex解析对应指令时，会动态创建子类实例<br/>
		 * @param  {string} name  组件名，全小写，必须是ns-name格式，至少包含一个"-"
		 * @param  {Object | String} model 组件模型对象，或url地址
		 * @return this
		 */
		this.component = function(name,model){
			//removeIf(production)
			assert(typeof(model)=='string' || model.template,name,XERROR.COMPONENT.TEMPLATEPROP,"can not find property 'template'")
			//endRemoveIf(production)
			COMP_MAP[name] = model;
			return this;
		}

		/**
		 * 查询是否定义了指定组件
		 * @param  {String}  name 组件名称
		 * @return {Boolean}
		 */
		this.hasComponentOf = function(name){
			return !!COMP_MAP[name];
		}

		/**
		 * 定义指令
		 * @param  {string} name  指令名，不带前缀
		 * @param  {Object} model 指令模型
		 * @return this
		 */
		this.directive = function(name,model){
			DIRECT_MAP[name] = model;
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
		 * @param  {Object} model 组件模型，如果节点本身已经是组件，该参数会覆盖原有参数 
		 */
		this.renderTo = function(tmpl,container,model){
			
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
            //removeIf(production)
            assert(container.tagName !== 'BODY','ROOT',XERROR.COMPONENT.CONTAINER,"container element must be inside <body> tag");
            //endRemoveIf(production)
			var comp = newComponent(tmpl,container,model);
			comp.root = comp;

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
		 * @param  {Object} model 组件模型，如果节点本身已经是组件，该参数会覆盖原有参数 
		 */
		this.render = function(node,model){
			if(isString(node)){
            	node = document.querySelector(node);
            }
            var tmpl = node.outerHTML;
            return this.renderTo(tmpl,node,model);
		}

		Object.defineProperty(this,'_cs',{enumerable: false,writable: true,value:{}});

		//for prototype API
		this.Component = Component;

		this.EventEmitter = EventEmitter;

		this._Observer = Observer;
	}

