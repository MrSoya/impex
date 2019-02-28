/**
 * 把VDOM 转换成 真实DOM
 */

function transform(vnode,comp){
	var n,cid = comp.$id;
	if(vnode._isEl){
		n = document.createElement(vnode.tag);
		n._vid = vnode.vid;
		vnode._cid = cid;
		vnode.dom = n;

		//初始化属性
		for(var k in vnode.attributes){
			if(k[0] === BIND_AB_PRIFX)continue;
			var attr = vnode.attributes[k];
			n.setAttribute(k,attr);
		}

		if(!vnode._comp){//uncompiled node dosen't exec directive
			//除了事件，都绑定
			vnode.directives.forEach(function(di){
				var dName = di[2].dName;
				if(dName == 'on')return;
				var part = getDirectiveParam(di,comp);
				var exp = di[3].vExp;
				var isCompDi = di[4];
				var scope = isCompDi?comp.$parent:comp;
				
				var fnData = getForScopeFn(vnode,scope,exp);
				var args = fnData[1];
				var fn = fnData[0];
				var watcher = getDirectiveWatcher(part,vnode,comp,fn,scope,args);

				Monitor.target = watcher;
				// console.log('指令监控。。。。',comp.$id,vnode.tag,dName);
				var v = fn.apply(scope,args);
				Monitor.target = null;
				// console.log('指令监控。。。。end');

				di[1] = v;//init value
			});
			

			//directive bind
			callDirective(LC_DI.bind,vnode,comp);
		}

		if(vnode.attributes[ATTR_REF_TAG]){
			comp.$ref[vnode.attributes[ATTR_REF_TAG]] = n;
		}
		
		if(vnode._comp){
			var c = newComponentOf(vnode,vnode.tag,n,comp,vnode._slots,vnode._slotMap,vnode.attributes);
			vnode._comp = c;
		}else{
			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					var c = transform(vnode.children[i],comp);
					n.appendChild(c);
				}
			}
			//directive
			callDirective(LC_DI.appended,vnode,comp);
		}
		
	}else{
		n = document.createTextNode(filterEntityTxt(vnode.txt));
		vnode.dom = n;
	}
	return n;
}
function filterEntityTxt(str){
	return str && str.replace?str
	.replace(/&lt;/img,'<')
	.replace(/&gt;/img,'>')
	.replace(/&nbsp;/img,'\u00a0')
	.replace(/&amp;/img,'&'):str;
}
//创建有类型组件
function newComponentOf(vnode,type,el,parent,slots,slotMap,attrs){
	//handle component
	if(type == 'component'){
		type = attrs.is;
		if(attrs['.is']){//'.is' value can only be a var
			type = attrs['.is'];
			type = new Function('scope',"with(scope){return "+type+"}")(parent);
		}
	}
	var c = new COMP_MAP[type](attrs);
	c.$name = type;
	c.$el = el;
	c.$vel = vnode;
	//bind parent
	parent._append(c);
	//ref
	if(attrs[ATTR_REF_TAG]){
		parent.$ref[attrs[ATTR_REF_TAG]] = c;
	}
	//global
	if(attrs[ATTR_ID_TAG]){
		impex.id[attrs[ATTR_ID_TAG]] = c;
	}
	//custom even
	for(var k=vnode.directives.length;k--;){
		var di = vnode.directives[k];
		var dName = di[2].dName;
		if(dName !== 'on')continue;
		
		var type = di[2].dArgsAry[0];
		var exp = di[3].vExp;
		var modifiers = di[2].dModifiers;
		var fn = null;
		var onlyName = !/\(.*\)/.test(exp);
		var emptyParen = !onlyName && !/\(.+\)/.test(exp);
       
		//native
		if(modifiers && modifiers.indexOf(EVENT_MODIFIER_NATIVE)>-1){
			if(onlyName){
				exp += '()';
			}
			
			di[1] = '$emit("'+type+'",$event,$vnode)';
			exp = 'var args = [$event,$vnode];var fss = "with(this){",fse = "}";'+
			'if($vnode&&$vnode._forScopeQ){var fsq = $vnode._forScopeQ;fsq.forEach(function(scope,i) {fss += "with(arguments["+(i+2)+"]){";fse += "}";args.push(scope);});}'+
			'return new Function("$event","$vnode",fss+" return '+exp+'"+fse).apply(this,args)'
		}else{
			if(emptyParen){
				exp = exp.substr(0,exp.indexOf('('));
				onlyName = true;
			}
			if(onlyName){
				//查找context
				var ctx = exp.substr(0,exp.lastIndexOf('.'));
				ctx = ctx || 'this';

				exp += '.apply('+ctx+',arguments)';
			}
			exp = 'with(this){ return '+exp+'}';
			vnode.directives[k] = null;
		}

		fn = new Function('$event','$vnode',exp);

		c.$on(type,fn,parent);
	}

	c._slots = slots;
	c._slotMap = slotMap;
	c._innerHTML = vnode.raw.getInnerHTML();
	
	return c;
}