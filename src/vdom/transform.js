/**
 * 把VDOM 转换成 真实DOM
 */
function transform(vnode,comp){
	var n,cid = comp.$id;
	if(vnode.tag){
		n = document.createElement(vnode.tag);
		n._vid = vnode.vid;
		vnode._cid = cid;
		vnode.scope = comp;
		vnode.dom = n;
		
		if(vnode._comp){
			var c = newComponentOf(vnode,vnode.tag,n,comp,vnode.attrs);
			vnode._comp = c;
		}else{

			PATCHES.forEach(function(patch) {
	            patch(vnode,{},comp,n);
	        });

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					var c = transform(vnode.children[i],comp);
					n.appendChild(c);
				}
			}
			//directive
			callDirectives(LC_DI.appended,vnode,comp,vnode.directives);
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
function newComponentOf(vnode,type,el,parent,props){
	//handle component
	if(type == 'component'){
		type = props.is;
	}
	var c = new COMP_MAP[type](props);
	c.$name = type;
	c.$el = el;
	c.$vel = vnode;
	c._directives = vnode.directives;
	var attrs = vnode.attrs;
	//bind parent
	parent._append(c);
	//ref
	if(vnode.ref){
		parent.$ref[vnode.ref] = c;
	}
	//global
	if(attrs && attrs[ATTR_ID_TAG]){
		impex.id[attrs[ATTR_ID_TAG]] = c;
	}
	
	c._innerHTML = vnode._innerHTML;
	
	return c;
}