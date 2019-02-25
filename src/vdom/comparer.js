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
function compareVDOM(newVNode,oldVNode,comp){
    if(isSameVNode(newVNode,oldVNode)){
        compareSame(newVNode,oldVNode,comp);
    }else{
        //remove old,insert new
        insertBefore(newVNode,oldVNode,oldVNode.parent?oldVNode.parent.children:null,oldVNode.parent,comp);
        removeVNode(oldVNode);
    }
}
function isSameComponent(nv,ov) {
    var c = impex._cs[ov._cid];
    if(!c)return false;
    //compare slots
    return nv.raw.getInnerHTML() == c._innerHTML;
}
function compareSame(newVNode,oldVNode,comp){
    if(newVNode._comp){
        //判断是否需要更新属性
        impex._cs[oldVNode._cid]._checkUpdate(newVNode.attributes,newVNode._forScopeQ);
        return;
    }

    if(newVNode.tag){
        //update events forscope
        var forScopeChanged = JSON.stringify(newVNode._forScopeQ) != JSON.stringify(oldVNode._forScopeQ);
        oldVNode._forScopeQ = newVNode._forScopeQ;
        
        var renderedAttrs = Object.assign({},oldVNode.attributes);
        //overwirte raw attrs
        oldVNode.raw.attributes = newVNode.raw.attributes;
        oldVNode.attributes = {};

        //bind _attr
        for(var k in oldVNode.raw.attributes){
            oldVNode.attributes[k] = oldVNode.raw.attributes[k];
        }

        var nvdis = newVNode.directives,
            ovdis = oldVNode.directives;
        var nvDiMap = getDirectiveMap(nvdis),
            ovDiMap = getDirectiveMap(ovdis);
        var add=[],del=[],update=[];
        //compare dirs
        for(var i=ovdis.length;i--;){
            var odi = ovdis[i];
            var odiStr = odi[0]+odi[3].vExp;
            if(!nvDiMap[odiStr]){
                del.push(odi);
            }
        }
        for(var i=nvdis.length;i--;){
            var ndi = nvdis[i];
            var ndiStr = ndi[0]+ndi[3].vExp;
            if(!ovDiMap[ndiStr]){
                add.push(ndi);
            }else if(ovDiMap[ndiStr][1] != nvDiMap[ndiStr][1]){
                update.push(ndi);
            }
        }
        //do del
        for(var i=del.length;i--;){
            var index = oldVNode.directives.indexOf(del[i]);
            oldVNode.directives.splice(index,1);
        }
        if(del.length>0)
            callDirective(LC_DI.unbind,oldVNode,comp,del);
        //add
        add.forEach(function(di){
            oldVNode.directives.push(di);
        });
        if(add.length>0)
            callDirective(LC_DI.update,oldVNode,comp,add);
        //update 
        if(forScopeChanged){
            update.forEach(function(di){
                var exp = di[3].vExp;
                var fnData = getForScopeFn(oldVNode,comp,exp);
                var args = fnData[1];
                var fn = fnData[0];
                var v = fn.apply(comp,args);
                di[1] = v;
            });
            
            callDirective(LC_DI.update,oldVNode,comp,update);
        }

        //for unstated change like x-html
        updateAttr(comp,oldVNode.attributes,renderedAttrs,oldVNode.dom,oldVNode.tag);
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
function getDirectiveMap(directives){
    var map = {};
    for(var i=directives.length;i--;){
        var di = directives[i];
        var diStr = di[0]+di[3].vExp;
        map[diStr] = di;
    }
    return map;
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
            compareSame(ns,os,comp);
            os = oc[++osp],
            ns = nc[++nsp];
            continue;
        }else if(isSameVNode(ne,oe)){
            compareSame(ne,oe,comp);
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
        var toAddList = nsp==nep?[nc[nsp]]:nc.splice(nsp,nep-nsp+1);
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
        var p = targetParent;
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
        }
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

        if(impex._cs[vnode._cid] && vnode.getAttribute(DOM_COMP_ATTR)){
            impex._cs[vnode._cid].$destroy();
        }
        if(vnode.children && vnode.children.length>0){
            removeVNode(vnode.children);
        }
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
        if(!ov.tag || (ov.getAttribute(DOM_COMP_ATTR) != nv.tag))return false;
        return isSameComponent(nv,ov);
    }
    return ov.tag === nv.tag;
}
function updateTxt(nv,ov){
    ov.txt = nv.txt;
    var dom = ov.dom;
    dom.textContent = nv.txt;
}
function updateAttr(comp,newAttrs,oldAttrs,dom,tag){
    //比较节点属性
    var nvas = newAttrs;
    var ovas = oldAttrs;
    var nvasKs = Object.keys(nvas);
    var ovasKs = Object.keys(ovas);
    var isInputNode = tag === 'input'; 
    for(var i=nvasKs.length;i--;){
        var k = nvasKs[i];
        var index = ovasKs.indexOf(k);
        if(index<0){
            dom.setAttribute(k,nvas[k]);
            if(isInputNode && k === 'value'){
                dom.value = nvas[k];
            }
        }else{
            if(nvas[k] != ovas[k]){
                dom.setAttribute(k,nvas[k]);
                if(isInputNode && k === 'value'){
                    dom.value = nvas[k];
                }
            }
            ovasKs.splice(index,1);
        }
    }
    for(var i=ovasKs.length;i--;){
        if(ovasKs[i] === DOM_COMP_ATTR)continue;
        dom.removeAttribute(ovasKs[i]);
    }

    //update ref
    if(newAttrs[ATTR_REF_TAG]){
        comp.$ref[newAttrs[ATTR_REF_TAG]] = dom;
    }

    //update new attrs
    var comp_attr = oldAttrs[DOM_COMP_ATTR];
    if(comp_attr)newAttrs[DOM_COMP_ATTR] = comp_attr;
}


