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
    if(newVNode.tag){
        //update events forscope
        var forScopeChanged = JSON.stringify(newVNode._forScopeQ) != JSON.stringify(oldVNode._forScopeQ);
        if(newVNode._forScopeQ)
            oldVNode._forScopeQ = newVNode._forScopeQ;
        
        var compareCompNode = newVNode._comp;
        //只对比视图上的属性
        var newProps = newVNode.props;
        var oldProps = compareCompNode?impex._cs[oldVNode._cid]._props:oldVNode.props;
        var npk = Object.keys(newProps);
        var opk = Object.keys(oldProps);
        var dom = oldVNode.dom;

        var nvdis = newVNode.directives,
            ovdis = oldVNode.directives;
        var nvDiMap = getDirectiveMap(nvdis),
            ovDiMap = getDirectiveMap(ovdis);

        var addAttrs=[],delAttrs=[];
        var addDis=[],delDis=[];

        //add attr
        for(var nk in newProps){
            var ov = oldProps[nk];
            var nv = newProps[nk];
            if(opk.indexOf(nk)<0){
                if(nv.isDi){
                    addDis.push(nvDiMap[nk]);
                }else{
                    addAttrs.push([nk,nv.v]);
                }
            }else if(ov.v != nv.v){
                if(nv.isDi){
                    delDis.push(ovDiMap[nk]);
                    addDis.push(nvDiMap[nk]);
                }else{
                    addAttrs.push([nk,nv.v]);
                }
            }
        }
        //del attr
        opk.forEach(function(k) {
            if(npk.indexOf(k)<0){
                if(oldProps[k].isDi){
                    delDis.push(ovDiMap[k]);
                }else{
                    delAttrs.push(k);
                }
            }
        });

        //reset
        if(compareCompNode){
            impex._cs[oldVNode._cid]._props = newVNode.props;
        }else{
            oldVNode.props = newVNode.props;
        }

        if(!compareCompNode){
            /********** 更新 dom **********/
            delAttrs.forEach(function(k) {
                dom.removeAttribute(k);
            });
            addAttrs.forEach(function(attr) {
                var k = attr[0];
                var v = attr[1];
                dom.setAttribute(k,v);
                if(dom.tagName =='INPUT' && k === 'value'){
                    dom.value = v;
                }
                //update ref
                if(k == ATTR_REF_TAG)comp.$ref[v] = dom;
            });
        }

        /********** 更新 指令 **********/
        if(delDis.length>0){
            delDis.forEach(function(di) {
                var i = oldVNode.directives.indexOf(di);
                oldVNode.directives.splice(i,1);
            });
            callDirective(LC_DI.unbind,oldVNode,comp,delDis);
        }
        if(addDis.length>0){
            addDis.forEach(function(di) {
                oldVNode.directives.push(di);

                monitorDirective(di,impex._cs[oldVNode._cid],oldVNode);
            });
            callDirective(LC_DI.bind,oldVNode,comp,addDis);
        }
        
        if(compareCompNode){
            comp = impex._cs[oldVNode._cid];
        }
        //update when for scope changed
        if(forScopeChanged){
            ovdis.forEach(function(di){
                var exp = di[3].vExp;
                var name = di[2].dName;
                if(name == 'on')return;

                var fnData = getForScopeFn(oldVNode,comp,exp);
                var args = fnData[1];
                var fn = fnData[0];
                var v = fn.apply(comp,args);
                di[1] = v;
            });
            callDirective(LC_DI.update,oldVNode,comp,ovdis);
        }

        //组件更新属性
        if(compareCompNode){
            if(addAttrs.length>0 || delAttrs.length>0 || forScopeChanged)
                comp._updateProps(newVNode.attributes);
            return;
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
function getDirectiveMap(directives){
    var map = {};
    for(var i=directives.length;i--;){
        var di = directives[i];
        map[di[0]] = di;
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
