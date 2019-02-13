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
	        v:[0,99,1],
	        state:'ZhuJi',
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
		 * @param  {Object} opts 组件选项
		 * @param  {Object} opts.props 属性验证
		 * @return this
		 */
		this.component = function(name,opts){
			COMP_MAP[name] = extend(function() {
				this._super.constructor.apply(this,arguments);
			},Component,opts);
			
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
		 * 增加一个插件到插件列表。
		 * 插件会在首次渲染前进行安装，相同插件对象只会增加一次
		 * @param  {Object} plugin 插件对象，至少实现install回调接口
		 */
		this.add = function(plugin) {
			if(!plugin)return;
			//removeIf(production)
            assert(isFunction(plugin.install),'impex',XERROR.PLUGIN.NOINSTALL,'can not find "install" function in plugin "'+JSON.stringify(plugin)+'"');
            //endRemoveIf(production)
            if(PLUGIN_LIST.indexOf(plugin)<0)
            	PLUGIN_LIST.push(plugin);
		}

		/**
		 * 全局mix接口，混入属性会影响之后创建的所有组件
		 * @param  {Object} mixin 混入对象
		 */
		this.mixin = function(mixin) {
			Mixins.push(mixin);
		}

		/**
		 * 渲染一个DOM节点组件，比如
		 * <pre>
		 * 	<x-stage id="entry" @click="showStage()"><x-stage>
		 * 	...
		 * 	impex.create({
		 * 		el:'$entry',
		 * 		state:{...},
		 * 		showStage:function(){}
		 * 	})
		 * </pre>
		 * 创建一个impex实例。
		 * 如果有el参数那就会以el为根渲染一个组件树，如果el参数是已经挂载的DOM节点或者选择器，
		 * 渲染完成后的组件树会自动挂载到页面，否则需要手动挂载
		 * 如果el参数为空，会创建一个只对state监控的非视图组件，无法挂载
		 * 
		 * @param  {Object} opts  
		 * @param  {var} [opts.el] DOM节点或选择器字符串或一段HTML代码
		 * @param  {Object} [opts.state] 组件状态，内部所有属性会被监控
		 * @param  {Object} [opts.computeState] 计算状态
		 * @param  {...} [functions] 所有函数都会直接绑定到组件上
		 */
		this.create = function(opts){
			var tmpl = null;
			var el = opts.el;
			if(el instanceof HTMLElement){
				//removeIf(production)
	            assert(el.tagName !== 'BODY','ROOT',XERROR.COMPONENT.CONTAINER,"root element must be inside <body> tag");
	            //endRemoveIf(production)
				tmpl = el.outerHTML;
			}else if(isString(el) && el.trim()){
				try{
            		el = document.querySelector(el);
            		//removeIf(production)
		            assert(el.tagName !== 'BODY','ROOT',XERROR.COMPONENT.CONTAINER,"root element must be inside <body> tag");
		            //endRemoveIf(production)
            		tmpl = el.outerHTML;
				}catch(e){
					tmpl = el;
				}
            }
            //安装插件
            if(!PluginInited){
            	PluginInited = true;
            	PLUGIN_LIST.forEach(function(plugin) {
            		plugin.install(this,dispatch);
            	},this);
            }

            //创建根组件
			opts.template = tmpl;
			var RootComponent = extend(function() {
				this._super.constructor.apply(this,arguments);
			},Component,opts);
			var root = new RootComponent();
			root.$name = 'ROOT';
			root.$root = root;
			root.$el = isString(el)?null:el;

			root._parse();

            return root;
		}

		Object.defineProperty(this,'_cs',{enumerable: false,writable: true,value:{}});

		//for prototype API
		this.Component = Component;

		this.EventEmitter = EventEmitter;
	}

