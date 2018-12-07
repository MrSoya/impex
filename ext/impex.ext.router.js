/**
 * XRouter是一个基于impex的路由方案，由
 * impex.router对象，
 * x-rout组件，
 * x-link指令
 * 组成，为impex提供单页路由能力。
 *
 * 兼容性：IE 10+
 *
 */
!function(impex){
	if(!('pushState' in history)){
		throw Error('your browser does not support XRouter');
	}
	var TITLE = document.title;
	/**
	 * 路由点，url变更时，此路由点会显示对应的渲染内容。
	 * @event render - (setView,idMap,queryMap,path) 当路径匹配时触发此事件。一旦此事件触发，组件属性就会被忽略
	 * @event end - (comp,idMap,queryMap,path) 路由点执行过渲染（render回调或component属性）之后执行
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
		_updateView:function(path,query){
			var idMap = this.match(path);
			if(!idMap){
				this.state.comp = '';
				return;
			}
			if(this.state.component){
				var tag = this.state.component;
				var propstr = "";
				for(var k in idMap){
					propstr += '.'+k+'="'+idMap[k]+'" ';
				}
				this.state.comp = '<'+tag+' ref="'+this.id+'_route_comp" '+propstr+'></'+tag+'>';
			}else{
				var rs = this.emit("render",this.__setView.bind(this),idMap,query,path);
				if(rs !== undefined)this.state.comp = rs;
			}
			this.idMap = idMap;
			this.query = query;
		},
		onUpdate:function(changes){
			var ref = this.id+'_route_comp';

			if(changes.comp){
				this.emit("end",this.refs[ref],this.idMap,this.query,this.state.path);
			}
		},
		match:function(url){
			var params = null;
            var checkUrl = url.replace(/\?(\w+=[^=&]*&?)*$/img,'');
			/**
			 * /a/:b/:c
			 * /a/*
			 * /a/**
			 */
			if(this.matchExp.test(checkUrl)){
				params = {};
				for(var i=this.ids.length;i--;){
					var pair = this.ids[i];
					params[pair[0]] = eval("RegExp.$"+pair[1]);
				}
			}
			return params;
		},
		onDestory:function(){
			Router.routes[this.id] = null;
			delete Router.routes[this.id];
		},
		onCompile:function(){
			Router.routes[this.id] = this;
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
	 * 对象方式：<a x-link="{to:'/a/b',title:'表单',query:{x:''}}">...</a>
	 *
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
			var url = (link.to||'').replace(/&amp;/img,'&');

            //handle query string
            var query = link.query||{};
            url = url.replace(/\?(\w+=[^=&]*&?)*$/img,function(a){
                a.substr(1).split('&').forEach(function (kv) {
                    var pair = kv.split('=');
                    query[pair[0]] = pair[1];
                });
                return '';
            });
            var queryStr = '';
            if(Object.keys(query).length > 0){
                for(var k in query){
                    queryStr += '&' + k + '=' + query[k];
                }
                queryStr = '?'+queryStr.substr(1);
            }

            url += queryStr;

			if(router.lastTo == url){
				return;
			}

			router.goto(url,title,query);
		},
		goto:function(url,title,query){
			if(!history.state || url != history.state.url){
				history.pushState({url:url,title:title}, null, url);
			}
			if(Router.lastTo != url){
				Router.lastTo = url;
			}
				
			this._exec(url,title,query);
		},
		_exec:function(url,title,query){
			document.title = title || TITLE;
			for(var k in impex.router.routes){
				var route = impex.router.routes[k];
				route._updateView(url,query);
			}
		}
	}

	window.addEventListener('load',function(e){
		var url = location.pathname + location.search;
		Router.goto(url,'',getQuery());
	},false);
	window.addEventListener('popstate', function(e) {
        var state = e.state || {};
        //check anchor
        var url = location.pathname + location.search;
        if(url == Router.lastTo)return;
        
        Router.lastTo = url;
        
        Router._exec(state.url,state.title,getQuery());
    });

    function getQuery() {
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

	impex.router = Router;

}(impex);
