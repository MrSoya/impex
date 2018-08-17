/**
 * @classdesc 组件类，包含视图、模型、控制器，表现为一个自定义标签。同内置标签样，
 * 组件也可以有属性。
 * <br/>
 * 组件可以设置事件或者修改视图样式等<br/>
 * 组件实例为组件视图提供了数据和控制
 * 组件可以包含组件，所以子组件视图中的表达式可以访问到父组件模型中的值
 * 
 * @class 
 */
function Component (el) {
	EventEmitter.call(this);

	this._uid = 'C_' + im_counter++;

	/**
	 * 对顶级元素的引用
	 * @type {HTMLElement}
	 */
	this.el = el;
	/**
	 * 对子组件/dom的引用
	 * @type {Object}
	 */
	this.refs = {};
	/**
	 * 组件标签引用
	 * @type {Object}
	 */
	this.compTags = {};
	/**
	 * 用于指定输入参数的限制
	 * @type {Object}
	 */
	this.input = null;
	/**
	 * 组件名，在创建时由系统自动注入
	 */
	this.name;
	/**
	 * 对父组件的引用
	 * @type {Component}
	 */
	this.parent;
	/**
	 * 子组件列表
	 * @type {Array}
	 */
	this.children = [];
	//watchs
	this.__watchMap = {};
	this.__watchFn;
	this.__watchOldVal;
	this.__watchPaths = [];
	//syncs
	this.__syncFn = {};
	this.__syncOldVal = {};
	this.__syncFnForScope = {};
	//computedstate
	this.__dependence = {};

	/**
	 * 组件数据
	 * @type {Object}
	 */
	this.state = {};

	impex._cs[this._uid] = this;
};
function F(){}
F.prototype = EventEmitter.prototype;  
Component.prototype = new F();  
Component.prototype.constructor = Component.constructor; 
ext({
	/**
	 * 设置组件状态值
	 * @param {String} path 状态路径
	 * @param {Object} v  
	 */
	setState:function(path,v){
		v = JSON.stringify(v);
		var str = 'with(scope){'+path+'='+v+'}';
		var fn = new Function('scope',str);
		fn(this.state);
		
		return this;
	},
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {String} path 属性路径，比如a.b.c
	 * @param  {Function} cbk      回调函数，[newVal,oldVal]
	 */
	watch:function(path,cbk){
		this.__watchPaths.push(path);
		var str = '';
		for(var i=this.__watchPaths.length;i--;){
			var p = this.__watchPaths[i];
			str += ','+JSON.stringify(p)+':'+p;
		}
		str = str.substr(1);
		var fn = this.__watchFn = new Function('scope','with(scope){return {'+str+'}}');
		this.__watchOldVal = fn(this.state);
		this.__watchMap[path] = cbk;

		return this;
	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	destroy:function(){
		this.onDestroy && this.onDestroy();

		if(this.parent){
			this.parent.__syncFn[this._uid] = null;
			this.parent.__syncOldVal[this._uid] = null;
			this.parent.__syncFnForScope[this._uid] = null;
			delete this.parent.__syncFn[this._uid];
			delete this.parent.__syncOldVal[this._uid];
			delete this.parent.__syncFnForScope[this._uid];
			var index = this.parent.children.indexOf(this);
			if(index > -1){
				this.parent.children.splice(index,1);
			}
			this.parent = null;
		}

		while(this.children.length > 0){
			this.children[0].destroy();
		}

		this.children = 
		impex._cs[this._uid] = null;
		delete impex._cs[this._uid];

		destroyDirective(this.vnode,this);

		this.vnode = 
		this.el = 
		this.compTags = 
		this.root = 
		this.__dependence = 

		this.refs = 
		this.__nodes = 
		this.__syncFn = 
		this._uid = 

		this.__url = 
		this.template = 
		this.state = null;
	},
	/**
	 * 如果一个引用参数发生了改变，那么子组件必须重载该方法，
	 * 并自行判断是否真的修改了。但是更好的方案是，调用子组件的某个方法比如刷新之类
	 */
	onPropChange : function(newProps,oldProps){
		for(var k in newProps){
			var v = newProps[k];
			if(v !== this.state[k]){
				this.state[k] = v;
			}
		}
    }
},Component.prototype);

/*********	component handlers	*********/
//////	init flow
function buildOffscreenDOM(vnode,comp){
	var n,cid = comp._uid;
	if(vnode._isEl){
		n = document.createElement(vnode.tag);
		n._vid = vnode.vid;
		vnode._cid = cid;

		if(!vnode._comp){//component dosen't exec directive
			//directive init
			var dircts = vnode._directives;
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var dName = di[1][0];
					var d = DIRECT_MAP[dName];
					if(!d)return;
					
					var params = di[1][1];
					var v = di[2];
					var exp = di[3];

					d.onBind && d.onBind(vnode,{comp:comp,value:v,args:params,exp:exp});
				});
			}
		}

		for(var k in vnode.attrNodes){
			if(k[0] === BIND_AB_PRIFX)continue;
			n.setAttribute(k,vnode.attrNodes[k]);
		}

		if(vnode.attrNodes[ATTR_REF_TAG]){
			comp.refs[vnode.attrNodes[ATTR_REF_TAG]] = n;
		}
		
		if(vnode._comp){
			var c = newComponentOf(vnode,vnode.tag,n,comp,vnode._slots,vnode._slotMap,vnode.attrNodes);
			vnode._comp = c;
		}else{
			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					var c = buildOffscreenDOM(vnode.children[i],comp);
					n.appendChild(c);
				}
			}
		}
		
	}else{
		n = document.createTextNode(filterEntity(vnode.txt));
	}
	vnode.dom = n;
	return n;
}
function filterEntity(str){
	return str && str.replace?str
	.replace(/&lt;/img,'<')
	.replace(/&gt;/img,'>')
	.replace(/&nbsp;/img,'\u00a0')
	.replace(/&amp;/img,'&'):str;
}

function callDirective(vnode,comp,type){
	if(isUndefined(vnode.txt)){
		if(!vnode._comp){//component dosen't exec directive
			//directive init
			var dircts = vnode._directives;
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var dName = di[1][0];
					var d = DIRECT_MAP[dName];
					if(!d)return;
					
					var params = di[1][1];
					var v = di[2];
					var exp = di[3];
					
					if(type == 0){
						d.onActive && d.onActive(vnode,{comp:comp,value:v,args:params,exp:exp},vnode.dom);
					}else{
						d.onUpdate && d.onUpdate(vnode,{comp:comp,value:v,args:params,exp:exp},vnode.dom);
					}
				});
			}

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					callDirective(vnode.children[i],comp,type);
				}
			}//end if
		}//end if
	}
}

function destroyDirective(vnode,comp){
	if(isUndefined(vnode.txt)){
		if(!vnode._comp){//component dosen't exec directive
			//directive init
			var dircts = vnode._directives;
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var dName = di[1][0];
					var d = DIRECT_MAP[dName];
					if(!d)return;
					
					var params = di[1][1];
					var v = di[2];
					var exp = di[3];
					
					d.onDestroy && d.onDestroy(vnode,{comp:comp,value:v,args:params,exp:exp});
				});
			}

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					destroyDirective(vnode.children[i],comp);
				}
			}//end if
		}//end if
	}
}
function bindScopeStyle(name,css){
	if(!css)return;
	var cssStr = scopeStyle(name,css);
	if(!COMP_CSS_MAP[name]){
		//attach style
		if(cssStr.trim().length>0){
			var target = document.head.children[0];
			if(target){
				target.insertAdjacentHTML('afterend','<style>'+cssStr+'</style>');
			}else{
				document.head.innerHTML = '<style>'+cssStr+'</style>';
			}
		}
		COMP_CSS_MAP[name] = true;	
	}
}
/**
 * parse component template & to create vdom
 */
function parseComponent(comp){
	if(comp.__url){
		loadComponent(comp.name,comp.__url,function(model,css){
			COMP_MAP[comp.name] = model;
			ext(model,comp);
			if(isFunction(model.state)){
				comp.state = model.state.call(comp);
			}else if(model.state){
				comp.state = {};
				ext(model.state,comp.state);
			}

			preCompile(comp.template,comp);


			comp.onCreate && comp.onCreate();

			//同步父组件变量
			bindProps(comp,comp.parent,comp.__attrs);

			//css
			bindScopeStyle(comp.name,css);
			comp.__url = null;
			compileComponent(comp);
			mountComponent(comp,comp.parent?comp.parent.vnode:null);
		});
	}else{
		if(comp.template){
			preCompile(comp.template,comp);
		}
		compileComponent(comp);
	}
}
function preCompile(tmpl,comp){
	if(comp.onBeforeCompile)
        tmpl = comp.onBeforeCompile(tmpl);
    
    comp.compiledTmp = 
    tmpl.trim()
    .replace(/<!--[\s\S]*?-->/mg,'')
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/mg,'')
    .replace(/^\s+|\s+$/img,' ')
    .replace(/>\s([^<]*)\s</,function(a,b){
            return '>'+b+'<';
    });
}
function doSlot(slotList,slots,slotMap){
	if(slots || slotMap)
		slotList.forEach(function(slot){
			var parent = slot[0];
			var node = slot[1];
			var name = slot[2];
			//update slot position everytime
			var pos = parent.children.indexOf(node);
			var params = [pos,1];
			
			if(name){
				if(slotMap[name])
					params.push(slotMap[name]);
			}else{
				params = params.concat(slots);
			}
			parent.children.splice.apply(parent.children,params);
		});
}
function scopeStyle(host,style){
	style = style.replace(/\n/img,'').trim()//.replace(/:host/img,host);
	var isBody = false;
	var selector = '';
	var body = '';
	var lastStyle = {};
	var styles = [];
	for(var i=0;i<style.length;i++){
		var c = style[i];
		if(isBody){
			if(c === '}'){
				isBody = false;
				lastStyle.body = body.trim();
				selector = '';
				styles.push(lastStyle);
				lastStyle = {};
			}
			body += c;
		}else{
			if(c === '{'){
				isBody = true;
				lastStyle.selector = selector.trim();
				body = '';
				continue;
			}
			selector += c;
		}
	}

	var css = '';
	host = '['+DOM_COMP_ATTR+'="'+host+'"]';
	styles.forEach(function(style){
		var parts = style.selector.split(',');
		var tmp = '';
		for(var i=0;i<parts.length;i++){
			var name = parts[i].trim();
			
			if(name.indexOf(':host')===0){
				tmp += ','+name.replace(/:host/,host);
			}else{
				tmp += ','+host + ' ' + name;
			}
		}
		tmp = tmp.substr(1);
		css += tmp + '{'+style.body+'}';
	});

	return css;
}

var g_computedState,
	g_computedComp;
function compileComponent(comp){
	//init computedstate to state
	for(var k in comp.computedState){
		var cs = comp.computedState[k];
		var fn = cs.get || cs;
		comp.state[k] = cs;
		//removeIf(production)
		assert(fn instanceof Function,comp.name,XERROR.COMPONENT.COMPUTESTATE,"invalid computedState '"+k+"' ,it must be a function or an object with getter");
		//endRemoveIf(production)
	}

	var vnode = buildVDOMTree(comp);
	var pv = null;
	if(comp.vnode){
		pv = comp.vnode.parent;
		var cs = pv.children;
		var i = cs.indexOf(comp.vnode);
		if(i>-1){
			cs.splice(i,1,vnode);
		}
	}
	comp.vnode = vnode;
	vnode.parent = pv;

	//observe state
	comp.state = Observer.observe(comp.state,comp);

	//compute state
	for(var k in comp.computedState){
		var cs = comp.computedState[k];
		var fn = cs.get || cs;
		g_computedState = k;
		g_computedComp = comp;
		if(fn instanceof Function){
			var v = fn.call(comp);
			comp.state[k] = v;
		}
	}
	g_computedComp = g_computedState = null;

	comp.onCompile && comp.onCompile(comp.vnode);//must handle slots before this callback 
}
/**
 * 准备挂载组件到页面
 */
function mountComponent(comp,parentVNode){
	var dom = buildOffscreenDOM(comp.vnode,comp);

	//beforemount
	comp.onBeforeMount && comp.onBeforeMount(dom);
	comp.el.parentNode.replaceChild(dom,comp.el);
	comp.el = dom;

	//init children
	for(var i = comp.children.length;i--;){
		parseComponent(comp.children[i]);
	}
	//mount children
	for(var i = 0;i<comp.children.length;i++){
		if(!comp.children[i].__url)
			mountComponent(comp.children[i],comp.vnode);
	}
	if(comp.name){
		comp.el.setAttribute(DOM_COMP_ATTR,comp.name);
		comp.vnode.setAttribute(DOM_COMP_ATTR,comp.name);
	}
	comp.onMount && comp.onMount(comp.el);

	comp.vnode.parent = parentVNode;

	callDirective(comp.vnode,comp,0);
}

//////	update flow
function updateComponent(comp,changeMap){
	var renderable = true;
	var syncPropMap = {};
	
	if(comp.onBeforeUpdate){
		renderable = comp.onBeforeUpdate(changeMap);
	}
	if(renderable === false)return;

	//rebuild VDOM tree
	var vnode = buildVDOMTree(comp);

	//diffing
	var forScopeQ = compareVDOM(vnode,comp.vnode,comp,forScopeQ);

	//mount subcomponents which created by VDOM 
	for(var i = 0;i<comp.children.length;i++){
		var c = comp.children[i];
		if(!c.compiledTmp){
			parseComponent(c);
			if(!c.__url)
				mountComponent(c,c.vnode.parent);
		}
	}

	//call watchs
	if(comp.__watchFn){
		var newVal = comp.__watchFn(comp.state);
		for(var k in newVal){
			var nv = newVal[k];
			var ov = comp.__watchOldVal[k];
			if(nv !== ov || isObject(nv)){
				comp.__watchMap[k].call(comp,nv,ov,k);
			}
		}
		comp.__watchOldVal = newVal;
	}	

	//update children props
	for(var uid in comp.__syncFn){
		var changeProps = {};
		var args = [comp.state];
		if(forScopeQ[uid])comp.__syncFnForScope[uid] = forScopeQ[uid];
		var sfs = comp.__syncFnForScope[uid];
	    if(sfs)
	        for(var i=0;i<sfs.length;i++){
	            args.push(sfs[i]);
	        }
		var rs = comp.__syncFn[uid].apply(comp,args);
		impex._cs[uid].onPropChange && impex._cs[uid].onPropChange(rs,comp.__syncOldVal[uid]);
		comp.__syncOldVal[uid] = rs;
	}

	comp.onUpdate && comp.onUpdate(changeMap);

	callDirective(comp.vnode,comp);
}



function newComponent(tmpl,el,param){
	var c = new Component(el);
	c.template = tmpl;
	c.name = 'ROOT';
	if(param){
		ext(param,c);

		if(isFunction(param.state)){
			c.state = param.state.call(c);
		}
	}

	c.onCreate && c.onCreate();
	
	return c;
}
function newComponentOf(vnode,type,el,parent,slots,slotMap,attrs){
	//handle component
	if(type == 'component'){
		type = attrs.is;
		if(attrs['.is']){//'.is' value can only be a var
			type = attrs['.is'];
			type = new Function('scope',"with(scope){return "+type+"}")(parent.state);
		}
	}
	var param = COMP_MAP[type];
	if(!param)return;
	var c = new Component(el);
	c.name = type;
	//bind parent
	parent.children.push(c);
	c.parent = parent;
	c.root = parent.root;
	c.store = c.root.store;
	c.vnode = vnode;
	//ref
	if(attrs[ATTR_REF_TAG]){
		parent.refs[attrs[ATTR_REF_TAG]] = c;
	}
	//global
	if(attrs[ATTR_ID_TAG]){
		impex.id[attrs[ATTR_ID_TAG]] = c;
	}
	//custome even
	vnode._directives.forEach(function(di){
		var dName = di[1][0];
		if(dName !== 'on')return;
		
		var type = di[1][1][0];
		var exp = di[2];
		exp.match(/(?:^|this\.)([a-zA-Z_][a-zA-Z0-9_$]*)(?:\(|$)/);
		var fnName = RegExp.$1;
		

        var fn = parent[fnName];
        if(fn)
			c.on(type,fn.bind(parent));
	});

	c.__attrs = attrs;
	c.__slots = slots;
	c.__slotMap = slotMap;
	
	if(isString(param)){
		c.__url = param;
		return c;
	}
	if(param){
		ext(param,c);
		
		if(isFunction(param.state)){
			c.state = param.state.call(c);
		}else if(param.state){
			c.state = {};
			ext(param.state,c.state);
		}
	}
	
	c.onCreate && c.onCreate();

	bindProps(c,parent,attrs);
	
	return c;
}

function bindProps(comp,parent,parentAttrs){
	//check props
	var requires = {};
	var input = comp.input;
	if(input){
		for(var k in input){
			var arg = input[k];
			if(arg.require){
				requires[k] = type;
			}
			if(!isUndefined(arg.value) && isUndefined(comp.state[k])){
				comp.state[k] = arg.value;
			}
		}
	}

	if(parentAttrs){
		handleProps(parentAttrs,comp,parent,input,requires);
	}

	//removeIf(production)
	//check requires
	assert(Object.keys(requires).length==0,comp.name,XERROR.INPUT.REQUIRE,"input attributes ["+Object.keys(requires).join(',')+"] are required");
	//endRemoveIf(production)
}
function handleProps(parentAttrs,comp,parent,input,requires){
	var str = '';
	var strMap = {};
	var computedState = {};
	for(var k in parentAttrs){
		var v = parentAttrs[k];
		if(k == ATTR_REF_TAG){
			continue;
		}
		k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});
		// xxxx
		if(k[0] !== PROP_TYPE_PRIFX){
			strMap[k] = v;
			continue;
		}

		// .xxxx
		var n = k.substr(1);
		if(parent[v] instanceof Function){
			v = 'this.'+v;
		}
		str += ','+JSON.stringify(n)+':'+v;
	}//end for
	str = str.substr(1);
	var rs = {};
	if(str){
		var forScopeStart = '',forScopeEnd = '';
		var vn = comp.vnode;
		var args = [parent.state];
		var sfs = parent.__syncFnForScope[comp._uid] = [];
	    if(vn._forScopeQ)
	        for(var i=0;i<vn._forScopeQ.length;i++){
	            forScopeStart += 'with(arguments['+(1+i)+']){';
	            forScopeEnd += '}';
	            args.push(vn._forScopeQ[i]);
	            sfs.push(vn._forScopeQ[i]);
	        }
		var fn = parent.__syncFn[comp._uid] = new Function('scope','with(scope){'+forScopeStart+'return {'+str+'}'+forScopeEnd+'}');
		rs = parent.__syncOldVal[comp._uid] = fn.apply(parent,args);
	}	
	var objs = [];
	ext(strMap,rs);

	//compute state
	if(!isUndefined(strMap['store'])){
		//removeIf(production)
		assert(comp.store,comp.name,XERROR.STORE.NOSTORE,"there's no store injected into the 'render' method");
		//endRemoveIf(production)
		var states = null;
		if(strMap['store']){
			states = strMap['store'].split(' ');
		}else{
			states = Object.keys(comp.store.state);
		}		
		if(!comp.computedState)comp.computedState = {};
		states.forEach(function(state) {
			var csKey = null;
			if(/[^\w]?(\w+)$/.test(state)){
				csKey = RegExp.$1;
				comp.computedState[csKey] = new Function('with(this.store.state){ return '+ csKey +'}');
			}
		});
	}

	for(var k in rs){
		var v = rs[k];
		if(isObject(v) && v.__im__oid){
			objs.push(k);
		}
		if(input && k in input){
			delete requires[k];
			
			//removeIf(production)
			//check type 
			assert((function(k,v,input,component){
				if(!input[k] || !input[k].type)return false;
				var checkType = input[k].type;
				checkType = checkType instanceof Array?checkType:[checkType];
				var vType = typeof v;
				if(v instanceof Array){
					vType = 'array';
				}
				if(vType !== 'undefined' && checkType.indexOf(vType) < 0){
					return false;
				}
				return true;
			})(k,v,input,comp),comp.name,XERROR.INPUT.TYPE,"invalid type ["+(v instanceof Array?'array':(typeof v))+"] of input attribute ["+k+"];should be ["+(input[k].type && input[k].type.join?input[k].type.join(','):input[k].type)+"]");
			//endRemoveIf(production)
		}
	}

	if(comp.onPropBind){
		comp.onPropBind(rs);
	}else{
		for(var k in rs){
			var v = rs[k];
			if(v instanceof Function){
				comp[k] = v;
			}else{
				comp.state[k] = v;
			}
		}
	}//end if	
}