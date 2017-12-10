/**
 * XRouter是一个基于impex的路由方案，由impex.router对象，x-rout组件，x-link指令组成
 * 为impex提供单页路由能力
 */
!function(impex){

	/**
	 * 路由点，url变更时，此路由点会显示对应的渲染内容
	 */
	impex.component('x-route',{
		template:'<div x-html="comp"></div>',
		propTypes:{
			path:{
                type:'string',
                require:true
            },
            component:{
                type:'string'
            },
            render:{
                type:'function'
            }
		},
		_updateView:function(path){
			var isMath = this.match(path);
			if(isMath && this.state.component){
				var tag = this.state.component;
				this.state.comp = '<'+tag+'></'+tag+'>';
			}else if(isMath && this.render){
				this.state.comp = this.render()||'';
			}else{
				this.state.comp = '';
			}
		},
		match:function(url){
			/**
			 * /page/1/demos/2
			 * /a/:b/:c
			 * /a/*
			 * /a/**
			 */
			if(this.matchExp.test(url)){
				return true;
			}
			return false;
		},
		onCompile:function(){
			Router.routes[this._uid] = this;
			var segs = this.state.path.split('/');
			var idMap = {};
			for(var i=segs.length;i--;){
				var tmp = segs[i];
				if(/\s*:([^/]+)/img.test(tmp)){
					idMap[i] = RegExp.$1;
					segs[i] = '[^/?#]+';
				}else if(/^\s*\*\s*$/.test(tmp)){
					segs[i] = '[^/?#]+';
				}else if(/\s*\*\*\s*$/.test(tmp)){
					segs[i] = '.*';
				}
			}
			var expstr = segs.join('/');
			expstr += '$';
			this.matchExp = new RegExp(expstr,'i');
		},
		state:{
			comp:''
		}
	});

	impex.directive('link',{
		onBind:function(vnode,data){
			var v = data.value;
			if(!vnode.lid)
				vnode.lid = Date.now()+Math.random();
			if(typeof(v) == 'object'){
				Router.link[vnode.lid] = v;
			}else{
				if(!Router.link[vnode.lid]){
					Router.link[vnode.lid] = {};
				}
				Router.link[vnode.lid].to = v;
			}

			vnode.on('click',Router.onLink);
		}
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
	var Router = {
		routes:{},
		link:{
			// to:xx, path
			// prop:{}, prop
			// title:'', title
		},
		lastTo:'',
		//触发route，并跳转url
		onLink:function(e,vnode){
			var lid = vnode.lid;
			var router = impex.router;
			var link = router.link[lid];
			var title = link.title;
			var url = link.to||'';
			// if(url[0].trim() != '/'){
			// 	var root = location.pathname;
			// 	url = root.replace(/\/\s*([^/]*)$/i,function(){
			// 		return '/'+url;
			// 	});
			// }

			if(router.lastTo != url){
				router.lastTo = url;
			}else{
				return;
			}
			router.direct(url,title);
		},
		direct:function(url,title){
			history.pushState({url:url,title:title}, null, url);
			if(title){
				document.title = title;
			}
			for(var k in impex.router.routes){
				var route = impex.router.routes[k];
				route._updateView(url);
			}
		}
	}

	window.addEventListener('load',function(e){
		var url = location.pathname;
		Router.direct(url,'');
	},false);
	function onhashchange(e) {
		var url = location.hash.replace(/#!?/,'');
		
	}
	window.addEventListener('hashchange',function(e){
		onhashchange(e);
	});
	window.addEventListener('popstate', function(e) {
        var state = e.state || {};
        Router.direct(state.url,state.title);
    });

	impex.router = Router;

}(impex);
