/**
 * XRouter是一个基于impex的路由方案，由
 * impex.router对象，
 * x-rout组件，
 * x-link指令
 * 组成，为impex提供单页路由能力。
 *
 * 兼容性：IE 10+
 */
!function(impex){
	if(!('pushState' in history)){
		throw Error('your browser does not support XRouter');
	}
	var TITLE = document.title;
	/**
	 * 路由点，url变更时，此路由点会显示对应的渲染内容。
	 * @event render 当路径匹配时触发此事件。一旦此事件触发，组件属性就会被忽略
	 * @event end 路由点执行过渲染（render回调或component属性）之后执行
	 */
	impex.component('x-route',{
		template:'<div x-html="comp"></div>',
		input:{
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
		//设置路由点内容
		__setView:function(html){
			this.state.comp = html;
		},
		_updateView:function(path,params){
			var ids = this.match(path);
			if(!ids){
				this.state.comp = '';
				return;
			}
			for(var k in ids){
				params[k] = ids[k];
			}
			if(this.state.component){
				var tag = this.state.component;
				var propstr = "";
				for(var k in params){
					propstr += '.'+k+'="'+params[k]+'" ';
				}
				this.state.comp = '<'+tag+' ref="'+this._uid+'_route_comp" '+propstr+'></'+tag+'>';
			}else{
				var rs = this.emit("render",this.__setView.bind(this),params,path);
				if(rs !== undefined)this.state.comp = rs;
			}
			this.params = params;
		},
		onUpdate:function(changes){
			var ref = this._uid+'_route_comp';

			if(changes[0].name == "comp"){
				this.emit("end",this.refs[ref],this.params,this.state.path);
			}
		},
		match:function(url){
			var params = null;
			/**
			 * /a/:b/:c
			 * /a/*
			 * /a/**
			 */
			if(this.matchExp.test(url)){
				params = {};
				for(var i=this.ids.length;i--;){
					var pair = this.ids[i];
					params[pair[0]] = eval("RegExp.$"+pair[1]);
				}
			}
			return params;
		},
		onCompile:function(){
			Router.routes[this._uid] = this;
			var segs = [];
			this.state.path.replace(/\/?([^/]+)/mg,function(a,b){
				segs.push(b);
			});
			var ids = [];
			var idsCounter = 1;
			for(var i=0;i<segs.length;i++){
				var tmp = segs[i];
				if(/\s*:([^/]+)/img.test(tmp)){
					ids.push([RegExp.$1,idsCounter++]);
					segs[i] = '([^/?#]+)';
				}else if(/^\s*\*\s*$/.test(tmp)){
					segs[i] = '[^/?#]+';
				}else if(/\s*\*\*\s*$/.test(tmp)){
					segs[i] = '.*';
				}
			}
			var expstr = segs.join('/');
			expstr += '$';
			this.matchExp = new RegExp(expstr,'i');
			this.ids = ids;
		},
		state:{
			comp:''
		}
	});

	/**
	 * 绑定路由请求节点。该指令可以让元素具有发起路由的能力。
	 * 指令支持两种方式：
	 * 字符串方式：<a x-link="'/list/1?id=20'" http="true">...</a>
	 * 对象方式：<a x-link="{to:'/a/b',title:'表单',input:{x:''}}">...</a>
	 *
	 * 默认路由不会进行http请求，除非添加http属性。
	 * 路由地址中的search参数以及<x-route>中的匹配模版中的参数都会作为
	 * 回调函数的参数，比如
	 * <x-route path="/list/:id" :route="route"></x-route>
	 *
	 * function route(props){...}
	 */
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

			vnode.on('click',Router._onLink);
		}
	});

	function getParams() {
		//calc param
		var params = {};
		var tmp = location.search.substr(1).split('&');
		for(var i=tmp.length;i--;){
			if(!tmp[i])continue;
			var pair = tmp[i].split("=");
			params[pair[0]] = pair[1];
		}
		return params;
	}

	/**
	 * 
	 * @version 1.0
	 */
	var Router = {
		routes:{},
		link:{
			// to:xx, path
			// title:'', title
		},
		lastTo:'',
		//点击x-link时触发，并跳转url
		_onLink:function(e,vnode){
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

			router.goto(url,title,getParams());
		},
		goto:function(url,title,params){
	        history.pushState({url:url,title:title}, null, url);
			this._exec(url,title,params);
		},
		_exec:function(url,title,params){
			document.title = title || TITLE;
			for(var k in impex.router.routes){
				var route = impex.router.routes[k];
				route._updateView(url,params);
			}
		}
	}

	window.addEventListener('load',function(e){
		var url = location.pathname;
		Router.goto(url,'',getParams());
	},false);
	window.addEventListener('popstate', function(e) {
        var state = e.state || {};
        Router._exec(state.url,state.title,getParams());
    });

	impex.router = Router;

}(impex);
