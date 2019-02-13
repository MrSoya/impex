/**
 * 把VDOM 转换成 真实DOM
 */

function transform(vnode,comp){
	var n,cid = comp.$id;
	if(vnode._isEl){
		n = document.createElement(vnode.tag);
		n._vid = vnode.vid;
		vnode._cid = cid;

		if(!vnode._comp){//uncompiled node dosen't exec directive
			//directive init
			var dircts = vnode.directives;
			if(vnode._comp_directives){
				dircts = dircts.concat(vnode._comp_directives);
			}

			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var part = getDirectiveParam(di,comp);
					var d = part[0];
					d.onBind && d.onBind(vnode,part[1]);
				});
			}
		}

		for(var k in vnode.attributes){
			if(k[0] === BIND_AB_PRIFX)continue;
			var attr = vnode.attributes[k];
			n.setAttribute(k,attr);
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
		}
		
	}else{
		n = document.createTextNode(filterEntityTxt(vnode.txt));
	}
	vnode.dom = n;
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
	vnode.directives.forEach(function(di){
		var dName = di[2].dName;
		if(dName !== 'on')return;
		
		var type = di[2].dArgsAry[0];
		var exp = di[3].vExp;
		var fnStr = exp.replace(/\(.*\)/,'');
		var fn = new Function('comp','with(comp){return '+fnStr+'}');

		//parse context
		di[1] = exp.replace(/this\./img,'impex._cs["'+parent.$id+'"].');

        fn = fn.call(parent,parent);
        if(parent[fnStr])
        	fn = fn.bind(parent);
       
        if(fn){
			c.on(type,fn);
        }
	});

	c._slots = slots;
	c._slotMap = slotMap;
	c._innerHTML = vnode.raw.getInnerHTML();
	
	return c;
}