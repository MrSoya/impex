/**
 * VDOM对比模块
 * 包括
 *     原始dom对比
 *     组件对比
 *     属性对比
 *
 * DOM更新包括
 *     新增、删除、属性变更、文本变更
 *
 * 
 */
function diff(comp){
    var newVNode = buildVDOMTree(comp);
    var oldVNode = comp.$vel;

    if(isSameVNode(newVNode,oldVNode)){
        updateView(newVNode,oldVNode,comp);
    }else{
        //remove old,insert new
        insertBefore(newVNode,oldVNode,oldVNode.parent?oldVNode.parent.children:null,oldVNode.parent,comp);
        removeVNode(oldVNode);
    }
    comp.$vel = newVNode;
}
function isSameComponent(nv,ov) {
    var c = impex._cs[ov._cid];
    if(!c)return false;
    //compare slots
    return c._slotted?nv._innerHTML == c._innerHTML:true;
}
function updateView(newVNode,oldVNode,comp){
    var dom = newVNode.dom = oldVNode.dom;
    newVNode._cid = oldVNode._cid;
    newVNode.scope = oldVNode.scope;
    if(newVNode.tag){
        var compareCompNode = newVNode._comp;
        //update $props
        if(compareCompNode){
            /**
             * 对于组件节点，直接把oldVnode接入新的VDOMtree，
             * 通过新属性来保持对dom的同步更新
             */
            var np = newVNode.parent;
            var i = np.children.indexOf(newVNode);
            if(i>-1){
                np.children.splice(i,1,oldVNode);
            }
            oldVNode.scope._update(newVNode);
            return;
        }else{
            PATCHES.forEach(function(patch) {
                patch(newVNode,oldVNode,comp,dom);
            });
        }
    }else{
        if(newVNode.txt !== oldVNode.txt){
            updateTxt(newVNode,oldVNode);
        }
    }

    if(newVNode.children && oldVNode.children){
        compareChildren(newVNode.children,oldVNode.children,oldVNode,comp);
    }else if(newVNode.children){
        //插入新的整个子树
        insertChildren(oldVNode,newVNode.children,comp);
    }else if(oldVNode.children && oldVNode.children.length>0){
        //删除旧的整个子树
        removeVNode(oldVNode.children);
    }
}
function compareChildren(nc,oc,op,comp){
    if(nc.length<1){
        if(oc.length>0)
            removeVNode(oc);
        return;
    }
    var osp = 0,oep = oc.length-1,
        nsp = 0,nep = nc.length-1,
        os = oc[0],oe = oc[oep],
        ns = nc[0],ne = nc[nep];

    while(osp <= oep && nsp <= nep){
        if(isSameVNode(ns,os)){
            updateView(ns,os,comp);
            os = oc[++osp],
            ns = nc[++nsp];
            continue;
        }else if(isSameVNode(ne,oe)){
            updateView(ne,oe,comp);
            oe = oc[--oep],
            ne = nc[--nep];
            continue;
        }else if(isSameVNode(ne,os)){
            insertBefore(os,next(oe),oc,op,comp);
            os = oc[osp];oep--;
            ne = nc[--nep];
            continue;
        }else if(isSameVNode(ns,oe)){
            insertBefore(oe,os,oc,op,comp);
            oe = oc[oep];osp++;
            ns = nc[++nsp];
            continue;
        }else{
            //todo xid
            
            //插入ov之前，并删除ov
            insertBefore(ns,os,oc,op,comp);
            removeVNode(os);
            os = oc[++osp],
            ns = nc[++nsp];
        }
    }
    //在osp位置，插入剩余的newlist，删除剩余的oldlist
    if(osp == nsp && oep>nep){//right match case
        var toDelList = oc.splice(osp,oep - nep);
        if(toDelList.length>0){
            removeVNode(toDelList);
        }
    }else if(osp <= oep && oep>0){
        var toDelList = oc.splice(osp,oep-osp+1);
        if(toDelList.length>0){
            removeVNode(toDelList);
        }
    }
    if(nsp <= nep){
        var toAddList = nsp==nep?[nc[nsp]]:nc.slice(nsp,nep+1);
        if(toAddList.length>0){
            insertBefore(toAddList,oc[osp],oc,op,comp);
        }
    }
}
function insertBefore(nv,target,list,targetParent,comp){
    if(list){
        //处理vdom
        if(nv.dom){//删除ov
            var i = list.indexOf(nv);
            if(i>-1)list.splice(i,1);
        }
        /*var p = targetParent;
        if(target){
            i = list.indexOf(target);
            p = p || target.parent;
            if(isArray(nv)){
                for(var l=nv.length;l--;){
                    nv[l].parent = p;
                }
                var args = [i,0].concat(nv);
                list.splice.apply(list,args);
            }else{
                nv.parent = p;
                list.splice(i,0,nv);
            }//end if
        }else{
            if(isArray(nv)){
                nv.forEach(function(n){
                    list.push(n);
                    n.parent = p;
                });
            }else{
                nv.parent = p;
                list.push(nv);
            }//end if
        }*/
    }
    //处理dom
    var dom = nv.dom;
    var compAry = [];
    if(!dom){
        if(isArray(nv)){
            var fragment = document.createDocumentFragment();
            for(var i=0;i<nv.length;i++){
                var vn = nv[i];
                var tmp = transform(vn,comp);

                fragment.appendChild(tmp);
            }
            dom = fragment;
        }else{
            dom = transform(nv,comp);
        }
    }else{
        dom.parentNode.removeChild(dom);
    }
    // if(dom.parentNode)dom.parentNode.removeChild(dom);
    if(target){
        var tdom = target.dom;
        tdom.parentNode.insertBefore(dom,tdom);
    }else{
        targetParent.dom.appendChild(dom);
    }
}
function next(nv){
    var p = nv.parent;
    var i = p.children.indexOf(nv);
    return p.children[i+1];
}
function removeVNode(vnodes){
    if(!isArray(vnodes))vnodes = [vnodes];
    var parent = vnodes[0].parent;
    for(var i=vnodes.length;i--;){
        var vnode = vnodes[i];
        var k = parent.children.indexOf(vnode);
        if(k>-1){
            parent.children.splice(k,1);
        }
        var p = vnode.dom.parentNode;
        p && p.removeChild(vnode.dom);

        if(impex._cs[vnode._cid] && vnode.dom.getAttribute(DOM_COMP_ATTR)){
            impex._cs[vnode._cid].$destroy();
        }
        if(vnode.children && vnode.children.length>0){
            removeVNode(vnode.children);
        }
        vnode.children = vnode.directives = null;
    }
}
function insertChildren(parent,children,comp){
    parent.children = children;
    var fragment = document.createDocumentFragment();
    var compAry = [];
    for(var i=0;i<children.length;i++){
        var vn = children[i];
        var dom = transform(vn,comp);
        fragment.appendChild(dom);
    }
    parent.dom.appendChild(fragment);
}
function isSameVNode(nv,ov){
    if(nv._comp){
        if(ov.tag === nv.tag)return true;//for loading component
        if(!ov.tag || (ov.dom.getAttribute(DOM_COMP_ATTR) != nv.tag))return false;
        return isSameComponent(nv,ov);
    }
    return ov.tag === nv.tag;
}
function updateTxt(nv,ov){
    ov.txt = nv.txt;
    var dom = ov.dom;
    dom.textContent = nv.txt;
    if(dom.parentElement.tagName == "TEXTAREA"){
        dom.parentElement.value = nv.txt;
    }
}

var PATCHES = [updateAttrs,updateRef,updateClass,updateStyle,updateEvents,updateDirectives];
function updateAttrs(newVNode,oldVNode,comp,dom) {
    if(!newVNode.attrs && !oldVNode.attrs)return;

    var nAttrs = newVNode.attrs;
    var oAttrs = newVNode._comp&&oldVNode.scope?oldVNode.scope.$props:oldVNode.attrs;
    if(nAttrs)
        for(var k in nAttrs){
            var v = nAttrs[k];
            if(!oAttrs || v != oAttrs[k]){
                dom.setAttribute(k,v);
                if(dom.tagName =='INPUT' && k === 'value'){
                    dom.value = v;
                }
            }
        }
    if(oAttrs){
        var nAttrKeys = Object.keys(nAttrs);
        for(var k in oAttrs){
            if(nAttrKeys.indexOf(k)<0){
                dom.removeAttribute(k);
            }
        }
    }
        
}
function updateRef(newVNode,oldVNode,comp,dom) {
    var nRef = newVNode.ref,
        oRef = oldVNode.ref;
    if(!nRef && !oRef)return;
    if(nRef == oRef)return;

    if(nRef){
        comp.$ref[nRef] = dom;
    }else{
        comp.$ref[oRef] = null;
    }
}
function updateDirectives(newVNode,oldVNode,comp,dom) {
    var nvdis = newVNode.directives,
        ovdis = oldVNode.directives;

    if(!nvdis && !ovdis)return;

    if(nvdis)
    for(var k in nvdis){
        var v = nvdis[k];
        if(!ovdis || isUndefined(ovdis[k])){
            callDirective(LC_DI.bind,newVNode,comp,v);
        }else if(ovdis[k].exp != v.exp){
            callDirective(LC_DI.unbind,oldVNode,comp,ovdis[k]);
            callDirective(LC_DI.bind,newVNode,comp,v);
        }else{
            callDirective(LC_DI.update,newVNode,comp,v);
        }
    }
    if(ovdis)
    for(var k in ovdis){
        if(!nvdis || isUndefined(nvdis[k])){
            callDirective(LC_DI.unbind,newVNode,comp,ovdis[k]);
        }
    }
}
function updateEvents(newVNode,oldVNode,comp,dom) {
    var nEvs = newVNode.events,
        oEvs = oldVNode.events;

    if(!nEvs && !oEvs)return;

    /**
     * 设置dom为新的vid
     */
    if(nEvs){
        dom._vid = newVNode.vid;
        for(var k in nEvs){
            var ev = nEvs[k];
            var args = [k];
            if(ev.args)args = args.concat(ev.args);
            for(var i=args.length;i--;){
                newVNode.on(args[i],ev.value,ev.modifiers);
            }
        }
    }
    
    if(oEvs)
    for(var k in oEvs){
        var ev = oEvs[k];
        var args = [k];
        if(ev.args)args = args.concat(ev.args);
        for(var i=args.length;i--;){
            oldVNode.off(args[i],ev.value,ev.modifiers);
        }
    }
}
function updateClass(newVNode,oldVNode,comp,dom) {
    if(!newVNode.class && !oldVNode.class)return;
    if(newVNode.class == oldVNode.class)return;
    
    /**
     * class更新不会影响dom已有或者非库添加的样式类
     */
    var cls = dom.className;//dom已有样式
    var clsAry = cls.trim().replace(/\s+/mg,' ').split(' ');
    var addCls = getClassAry(newVNode.class);
    var lastCls = getClassAry(oldVNode.class);
    //删除上一次样式
    if(lastCls){
        lastCls.forEach(function(c) {
            if(!c)return;
            var i = clsAry.indexOf(c.trim());
            if(i>-1){
                clsAry.splice(i,1);
            }
        });
    }
    
    //增加
    addCls.forEach(function(c) {
        if(c && clsAry.indexOf(c.trim())<0){
            clsAry.push(c);
        }
    });
    var cls = clsAry.join(' ');
    
    // if(isObject(newVNode.class))
    //     newVNode.class = copy(newVNode.class);
    if(dom._lastCls != cls){
        dom.setAttribute('class',cls);
        dom._lastCls = cls;
    }
    
}
function getClassAry(v) {
    var addCls = null;
    if(isString(v)){
        addCls = v.split(' ');
    }else if(isArray(v)){
        addCls = v;
    }else{
        addCls = [];
        for(var k in v){
            var val = v[k];
            if(val)
                addCls.push(k);
        }
    }
    return addCls;
}
function updateStyle(newVNode,oldVNode,comp,dom) {
    if(!newVNode.style && !oldVNode.style)return;
    if(!isObject(newVNode.style) && newVNode.style == oldVNode.style)return;
    
    var lastStyles = oldVNode.style||{};
    var styleMap = {};//当前dom样式
    var style = dom.getAttribute('style');
    if(style)
        style.split(';').forEach(function(kv) {
            if(!kv)return;

            var pair = kv.split(':');
            var k = pair[0].trim();
            if(!lastStyles[k])//删除上一次样式
                styleMap[k] = pair[1];
        });
    var nsMap = newVNode.style;
    if(nsMap){
        if(isString(nsMap)){
            var rs = {};
            var tmp = nsMap.split(';');
            for(var i=tmp.length;i--;){
                if(!tmp[i])continue;
                var pair = tmp[i].split(':');
                rs[pair[0]] = pair[1];
            }
            nsMap = rs;
        }
        //转换为css key
        var addStyles = {};
        for(var k in nsMap){
            var sk = k.trim().replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            addStyles[sk] = nsMap[k];
        }
        //增加
        for(var k in addStyles){
            styleMap[k] = addStyles[k];
        }
        // if(isObject(newVNode.style))
        //     newVNode.style = copy(newVNode.style);
    }
    style = getCssText(styleMap);

    if(dom._lastStyle != style){
        dom.setAttribute('style',style);
        dom._lastStyle = style;
    }
}
function getCssText(styleMap) {
    var style = '';
    for(var k in styleMap){
        var val = styleMap[k];
        style += ';'+k+':'+val;
        // if(val.indexOf('!important')){
        //     val = val.replace(/!important\s*;?$/,'');
        //     n = n.replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
        //     style.setProperty(n, v, "important");
        // }else{
        //     style[n] = val;
        // }
    }
    return style;
}