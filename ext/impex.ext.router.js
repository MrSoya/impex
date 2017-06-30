/**
 * XRouter是一个基于impex的路由方案，包括XRouter服务和x-router-view组件，
 * 为impex组件提供单页路由能力。
 * 当需要为impex路由时，只需要注入XRouter服务即可
 */
!function(impex){

	/**
	 * XRouter自动路由点，当路由组件中出现该子组件时，系统会自动把路由内容展示在该路由点位置
	 * @type {String}
	 */
	impex.component('x-router-view',{
		template:'<!-- impex router -->'
	});

	var routerMap = {};
	function changeComponent(url,component,compNameOrCbk,params,router){
		var routerView = component.children.filter(function(comp){return comp.name=='x-router-view'})[0] || router.lastComp;

		var compName = compNameOrCbk instanceof Function?compNameOrCbk.apply(router,params):compNameOrCbk;
		
		if(!router.componentManager.hasTypeOf(compName)){
			impex.logger.warn('cannot find component['+compName+'] of path "'+url+'"');
			return;
		}
		var placeholder = document.createComment('-- placeholder --');
        router.DOMHelper.insertBefore([placeholder],routerView.el);

        routerView.destroy();

        //create new
        var node = document.createElement(compName);
        placeholder.parentNode.replaceChild(node,placeholder);
        var subComp = component.createSubComponentOf(node);
        subComp.init().mount();

        router.lastComp = subComp;
	}

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
	var XRouter = {
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
		},
		onCreate:function(DOMHelper,componentManager){
	    	this.DOMHelper = DOMHelper;
	    	this.componentManager = componentManager;

	    	if(!this.host.__id){
	    		impex.logger.warn('service[XRouter] can only be injected into Component or Directive');
	    		return;
	    	}
	    	if(!routerMap[this.host.__id]){
	    		routerMap[this.host.__id] = {router:this,comp:this.host};
	    	}
	    }
	}

	window.addEventListener('load',function(e){
		onhashchange(e);
	},false);
	function onhashchange(e) {
		var url = location.hash.replace(/#!?/,'');
		
		for(var k in routerMap){
			var router = routerMap[k].router;
			var auto = true;
			
			var component = routerMap[k].comp;
			var expMap = router.__expMap;
			for(var k in expMap){
				var exp = expMap[k].exp;
				if(exp.test(url)){
					url && router.__cbk && (auto = router.__cbk(url));
					if(auto !== false){
						var params = [];
						url.replace(exp,function () {
							for(var i=1;i<arguments.length-2;i++){
								params.push(arguments[i]);
							}
						});
						changeComponent(url,component,expMap[k].comp,params,router);
						break;
					}
				}
			}//end for
		}
	}
	window.addEventListener('hashchange',function(e){
		onhashchange(e);
	},false);

	impex.service('XRouter',XRouter,['DOMHelper','ComponentManager']);


}(impex);
