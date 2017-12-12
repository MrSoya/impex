/**
 * @classdesc 组件类，包含视图、模型、控制器，表现为一个自定义标签。同内置标签样，
 * 组件也可以有属性。
 * <br/>
 * 组件可以设置事件或者修改视图样式等<br/>
 * 组件实例为组件视图提供了数据和控制
 * 组件可以包含组件，所以子组件视图中的表达式可以访问到父组件模型中的值
 * <p>
 * 	组件生命周期
 * 	<ul>
 * 		<li>onCreate：当组件被创建时，该事件被触发，系统会把指定的服务注入到参数中</li>
 * 		<li>onPropChange：当参数要绑定到组件时，该事件被触发，可以手动clone参数或者传递引用</li>
 * 		<li>onUpdate: 当state中任意属性变更时触发。</li>
 * 		<li>onInit：当组件初始化时，该事件被触发，系统会扫描组件中的所有表达式并建立数据模型</li>
 * 		<li>onMount：当组件被挂载到组件树中时，该事件被触发，此时组件已经完成数据构建和绑定，DOM可用</li>
 * 		<li>onUnmount：当组件被卸载时，该事件被触发</li>
 * 		<li>onDestroy: 当组件被销毁时，该事件被触发</li>
 * 	</ul>
 * </p>
 * 
 * @class 
 */
function Component (el) {
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
	 * 用于指定属性的类型，如果类型不符会报错
	 * @type {Object}
	 */
	this.propTypes = null;
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

	/**
	 * 组件模版，用于生成组件视图
	 * @type {string}
	 */
	this.template;

	//组件url
	this.__url;
	/**
	 * 组件数据
	 * @type {Object}
	 */
	this.state = {};

	impex._cs[this._uid] = this;
};
Component.prototype = {
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

		this.refs = 
		this.__nodes = 
		this.__syncFn = 
		this._uid = 

		this.__url = 
		this.template = 
		this.state = null;
	},
	onPropChange : function(newProps,oldProps){
		for(var k in newProps){
			var v = newProps[k];
			if(isObject(v)){
				var copy = v instanceof Array?[]:{};
				this.state[k] = Object.assign(copy,v);
			}else if(v !== this.state[k]){
				this.state[k] = v;
			}
		}
    }
};

/*********	component handlers	*********/
//////	init flow
function buildOffscreenDOM(vnode,comp){
	var n,cid = comp._uid;
	if(isUndefined(vnode.txt)){
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
	return str.replace?str.replace(/&lt;/img,'<').replace(/&gt;/img,'>'):str;
}

function callDirectiveUpdate(vnode,comp){
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
					d.onUpdate && d.onUpdate(vnode,{comp:comp,value:v,args:params,exp:exp},vnode.dom);
				});
			}

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					callDirectiveUpdate(vnode.children[i],comp);
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
			preCompile(comp.template,comp);
			
			//css
			bindScopeStyle(comp.name,css);
			comp.__url = null;
			compileComponent(comp);
			mountComponent(comp);
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
    
    comp.compiledTmp = tmpl = tmpl.replace(/^\s+|\s+$/img,'').replace(/>\s([^<]*)\s</,function(a,b){
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
function compileComponent(comp){
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

	callDirectiveUpdate(comp.vnode,comp);
}

//////	update flow
function updateComponent(comp,changes){
	var renderable = true;
	var syncPropMap = {};
	
	if(comp.onBeforeUpdate){
		renderable = comp.onBeforeUpdate(changes);
	}
	if(renderable === false)return;

	//rebuild VDOM tree
	var vnode = buildVDOMTree(comp);
	comp.onCompile && comp.onCompile(vnode);

	//diffing
	var forScopeQ = compareVDOM(vnode,comp.vnode,comp,forScopeQ);

	//call watchs
	if(comp.__watchFn){
		var newVal = comp.__watchFn(comp.state);
		for(var k in newVal){
			var nv = newVal[k];
			var ov = comp.__watchOldVal[k];
			if(nv !== ov){
				comp.__watchMap[k].call(comp,nv,ov);
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

	comp.onUpdate && comp.onUpdate();

	callDirectiveUpdate(comp.vnode,comp);
}



function newComponent(tmpl,el,param){
	var c = new Component(el);
	c.compiledTmp = tmpl;
	if(param){
		ext(param,c);

		if(isFunction(param.state)){
			c.state = param.state.call(c);
		}
	}
	
	return c;
}
function newComponentOf(vnode,type,el,parent,slots,slotMap,attrs){
	var param = COMP_MAP[type];
	var c = new Component(el);
	c.name = type;
	//bind parent
	parent.children.push(c);
	c.parent = parent;
	c.vnode = vnode;
	//ref
	if(attrs[ATTR_REF_TAG]){
		parent.refs[attrs[ATTR_REF_TAG]] = c;
	}
	//global
	if(attrs[ATTR_G_TAG]){
		impex.g[attrs[ATTR_G_TAG]] = c;
	}

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
	c.compiledTmp = param.template;
	c.__slots = slots;
	c.__slotMap = slotMap;
	
	bindProps(c,parent,attrs);
	
	return c;
}

function bindProps(comp,parent,parentAttrs){
	//check props
	var requires = {};
	var propTypes = comp.propTypes;
	if(propTypes){
		for(var k in propTypes){
			var type = propTypes[k];
			if(type.require){
				requires[k] = type;
			}
		}
	}

	if(parentAttrs){
		handleProps(parentAttrs,comp,parent,propTypes,requires);
	}

	//check requires
	var ks = Object.keys(requires);
	if(ks.length > 0){
		error("props ["+ks.join(',')+"] of component["+comp.name+"] are required");
		return;
	}
}
function handleProps(parentAttrs,comp,parent,propTypes,requires){
	var str = '';
	for(var k in parentAttrs){
		var v = parentAttrs[k];
		if(k == ATTR_REF_TAG){
			continue;
		}
		k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});
		// xxxx
		if(k[0] !== PROP_TYPE_PRIFX){
			if(propTypes && k in propTypes){
				delete requires[k];
				checkPropType(k,v,propTypes,comp);
			}
			comp.state[k] = v;
			continue;
		}

		// .xxxx
		var n = k.substr(1);
		str += ','+JSON.stringify(n)+':'+v;
	}//end for
	str = str.substr(1);
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
	var rs = parent.__syncOldVal[comp._uid] = fn.apply(parent,args);
	var objs = [];
	for(var k in rs){
		var v = rs[k];
		if(isObject(v) && v.__im__oid){
			objs.push(k);
		}
		if(propTypes && k in propTypes){
			delete requires[k];
			checkPropType(k,v,propTypes,comp);
		}
	}
	if(objs.length>0){
		warn("ref parameters '"+objs.join(',')+"' should be read only");
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

function checkPropType(k,v,propTypes,component){
	if(!propTypes[k] || !propTypes[k].type)return;
	var checkType = propTypes[k].type;
	checkType = checkType instanceof Array?checkType:[checkType];
	var vType = typeof v;
	if(v instanceof Array){
		vType = 'array';
	}
	if(vType !== 'undefined' && checkType.indexOf(vType) < 0){
		error("invalid type ["+vType+"] of prop ["+k+"] of component["+component.name+"];should be ["+checkType.join(',')+"]");
	}
}