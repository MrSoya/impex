/**
 * XRouter是一个基于impex的路由方案，包括XRouter服务和x-router-view组件，
 * 为impex组件提供单页路由能力。
 * 当需要为impex路由时，只需要注入XRouter服务即可
 */
!function(impex){

	impex.component('x-router-view',{
		$template:'<span name="x-router-view"></span>'
	});


	/**
	 * 
	 * XRouter提供了基于hash的锚点路由，这表示开发者着必须以#!(!可不写，但对SEO友好)为开头
	 * 书写路由信息，比如
	 * <p>
	 * 	&lt;a href="#!/impex/v0" &gt; &lt;/a&gt;
	 * </p>
	 * XRouter会自动匹配到/impex/v0这个路径<br/>
	 * XRouter支持正则路由匹配，比如
	 * <p>
	 * 	router.when({
	 * 		"/([a-z]+)/(v[0-9]+)":'component name',
	 * 		"/([a-z]+)/(.*)":function(a,b){
	 * 			if(a...)compName=xxx;
	 * 			if(b...)compName=yyy;
	 * 			var compName = '';
	 * 			return compName;
	 * 		},
	 * 	})
	 * </p>
	 * 这个路由也会被上面的a触发，同时，正则中捕获组的值会以捕获顺序填充到回调参数中
	 * @namespace service
	 * @version 1.0
	 */
	var _XRouter = new function (){
		this.$singleton = true;

		var routerMap = {};

		this.onCreate = function(viewManager,componentManager){
	    	this.viewManager = viewManager;
	    	this.componentManager = componentManager;

	    	var that = this;
	    	window.onload = function(e){
	    		window.onhashchange(e);
	    	}
	    	window.onhashchange = function (e) {
				var url = location.hash.replace(/#!?/,'');
				
				for(var k in routerMap){
					var router = routerMap[k].router;
					var auto = true;
					router.__cbk && (auto = router.__cbk(url));
					if(auto !== false){
						var component = routerMap[k].comp;
						var expMap = router.__expMap;
						for(var k in expMap){
							var exp = expMap[k].exp;
							if(exp.test(url)){
								var params = [];
								url.replace(exp,function () {
									for(var i=1;i<arguments.length-2;i++){
										params.push(arguments[i]);
									}
								});
								that.changeComponent(url,component,expMap[k].comp,params,router);
								break;
							}
						}
					}
				}
			}
	    }

		

		this.changeComponent = function (url,component,compNameOrCbk,params,router){
			var routerView = component.find('x-router-view') || this.lastComp;

			var compName = compNameOrCbk instanceof Function?compNameOrCbk.apply(router,params):compNameOrCbk;
			
			if(!this.componentManager.hasTypeOf(compName)){
				impex.console.warn('invaild route component['+compName+'] of path "'+url+'"');
				return;
			}
			var placeholder = this.viewManager.createPlaceholder('-- placeholder --');
	        this.viewManager.insertBefore(placeholder,routerView.$view);

	        routerView.destroy();

	        //create new
	        var subComp = component.createSubComponentOf(compName,placeholder);
	        subComp.init().display();

	        this.lastComp = subComp;
		}

		/**
		 * 和组件绑定，用于自动路由
		 * @param  {Component} component 需要执行路由的组件
		 * @return {XRouter} 返回XRouter实例
		 */
		this.bind = function(component){
			if(routerMap[component.__id])return routerMap[component.__id];

			var router = new XRouter();
			routerMap[component.__id] = {router:router,comp:component};

			return router;
		}
	}

	function XRouter(){
	}
	XRouter.prototype = {
		/**
		 * 配置路由信息
		 * @param  {Object} routInfo 标准json格式，key可以是正则串，value可以是字符串或者回调函数
		 * @return {XRouter} this
		 */
		when:function(routInfo){
			var expMap = {};
			for(var k in routInfo){
				var exp = new RegExp(k);
				expMap[k] = {exp:exp,comp:routInfo[k]};
			}
			this.__expMap = expMap;
			return this;
		},
		/**
		 * 路由通知,当发生任何路由操作时都会触发，并且该通知发生在所有自动路由之前
		 * @param  {function} cbk 回调函数，参数为路由路径。如果返回值为false，就会取消后续所有自动路由
		 * @return {XRouter} this
		 */
		onRoute:function(cbk){
			this.__cbk = cbk;
			return this;
		}
	}

	impex.service('XRouter',_XRouter,['ViewManager','ComponentManager']);


}(impex);
