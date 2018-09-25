function pNode(type,tag,txtQ){
    this.type = type;//1 node 3 text
    this.tag = tag;
    this.txtQ = txtQ;
    this.children = [];
    this.attrNodes = {};
    this.slotMap = {};
}
function pNodeAttr(name,directive){
    this.value;
    this.name = name;
    this.directive = directive;
}

var vn_counter = 0;
/**
 * 虚拟节点
 */
function VNode(tag,attrNodes,directives){
    this.tag = tag;
    this.txt;
    this.children;
    this.vid = vn_counter++;
    this.attrNodes = attrNodes;
    this._directives = directives;
    this._comp;//组件
    this.dom;
    this._forScopeQ;
    this._slotMap;
    this._hasEvent;
}
VNode.prototype = {
    /**
     * 绑定事件到该节点
     * @param {String} type 事件类型
     * @param {String|Function} exp 表达式或回调函数
     */
    on:function(type,exp){
        var evMap = EVENT_MAP[type];
        if(!evMap){
            evMap = EVENT_MAP[type] = {};
        }
        var fn = false;
        if(isFunction(exp)){
            fn = true;
        }
        if(fn){
            evMap[this.vid] = [this,exp,this._cid,fn];
        }else{
            var declare = this.getAttribute('var');
            if(declare){
                var list = declare.replace(/^{|}$/mg,'').split(',');
                var str = '';
                list.forEach(function(de) {
                    var pair = de.split(':');
                    str += 'var '+ pair[0] +'='+pair[1]+';';
                });
                declare = str;
            }            
            var forScopeStart = '',forScopeEnd = '';
            if(this._forScopeQ)
                for(var i=0;i<this._forScopeQ.length;i++){
                    forScopeStart += 'with(arguments['+(4/* Delegator.js line 29 */+i)+']){';
                    forScopeEnd += '}';
                }
            evMap[this.vid] = [this,new Function('comp,state,$event,$vnode','with(comp){with(state){'+forScopeStart+declare+";"+exp+forScopeEnd+'}}'),this._cid];
        }

        this._hasEvent = true;
    },
    /**
     * 卸载事件
     * @param {String} [type] 事件类型。为空时，卸载所有事件
     */
    off:function(type){
        var evMap = EVENT_MAP[type];
        if(evMap){
            evMap[this.vid] = null;
        }else if(!type){
            for(var k in EVENT_MAP){
                evMap = EVENT_MAP[k];
                if(evMap)evMap[this.vid] = null;
            }
        }
    },
    setAttribute:function(k,v){
        this.attrNodes[k] = v;
        return this;
    },
    getAttribute:function(k){
        return this.attrNodes[k];
    }
};


/**
 * funcs for build VNode
 */
function createElement(comp,tag,props,directives,children,html,forScopeAry){
    var rs = new VNode(tag,props,directives);
    rs._isEl = true;
    if(forScopeAry.length>0)
        rs._forScopeQ = forScopeAry;
    if (COMP_MAP[tag] || tag == 'component') {
        rs._comp = true;
        var slotData = children[0];
        if(slotData){
            rs._slots = slotData[0];
            rs._slotMap = slotData[1];     
        }
        return rs;
    }
    if(html != null){
        var forScopeStart = '',forScopeEnd = '';
        var root,str;
        var args = [comp,comp.state,createElement,createTemplate,createText,createElementList,doFilter];
        //build for scope
        var scopeAry = [];
        var argCount = args.length;
        if(rs._forScopeQ)
            for(var i=0;i<rs._forScopeQ.length;i++){
                var tmp = 'forScope'+FORSCOPE_COUNT++;
                forScopeStart += 'with('+tmp+'){';
                forScopeEnd += '}';
                args.push(rs._forScopeQ[i]);
                scopeAry.push(tmp);
            }

        str = compileVDOMStr('<'+tag+'>'+html+'</'+tag+'>',comp,scopeAry);

        var argStr = scopeAry.length>0?','+scopeAry.toString():'';
        
        var fn = new Function('comp,state,_ce,_tmp,_ct,_li,_fi'+argStr,'with(comp){with(state){'+forScopeStart+'return '+str+';'+forScopeEnd+'}}');
        root = fn.apply(comp,args);
        children = root.children || [];
    }
    
    if(children.length>0){
        rs.children = [];
        children.forEach(function(node){
            if(node){
                if(node instanceof Array){
                    node.forEach(function(c){
                        c.parent = rs;
                        rs.children.push(c);
                    });
                }else{
                    node.parent = rs;
                    rs.children.push(node);
                }//end if
            }//end if
        });
    }
    
    return rs;
}
function createTemplate(children,forScope){
    var fsq = null;
    if(forScope)
        fsq = [forScope];
    var rs = [];
    if(children.length>0){
        children.forEach(function(node){
            if(node){
                if(node instanceof Array){
                    node.forEach(function(c){
                        rs.push(c);
                        if(fsq){
                            var cfsq = c._forScopeQ;
                            if(cfsq){
                                c._forScopeQ = fsq.concat(cfsq);
                            }else{
                                c._forScopeQ = fsq;
                            }
                        }
                    });
                }else{
                    rs.push(node);
                    if(fsq){
                        var cfsq = node._forScopeQ;
                        if(cfsq){
                            node._forScopeQ = fsq.concat(cfsq);
                        }else{
                            node._forScopeQ = fsq;
                        }
                    }
                }//end if
            }//end if
        });
    }
    
    return rs;
}
function createText(txt){
    var rs = new VNode();
    rs.txt = txt && txt.toString?txt.toString():txt;
    return rs;
}
function createElementList(ds,iterator,scope,k,v){
    var rs = [];
    ds.forEach(function(item,i){
        var forScope = {$index:i};
        
        if(k)forScope[k] = i;
        forScope[v] = item;
        var tmp = iterator.call(scope,forScope);
        if(tmp){
            if(isArray(tmp)){
                rs = rs.concat(tmp);
            }else{
                rs.push(tmp);
            }
        }
    });
    return rs;
}
function doFilter(v,filters,comp){
    for(var i=0;i<filters.length;i++){
        var f = filters[i];
        var ins = FILTER_MAP[f[0]];
        //removeIf(production)
        assert(ins,comp.name,XERROR.COMPILE.NOFILTER,"can not find filter '"+f[0]+"'");
        //endRemoveIf(production)
        var params = f[1];
        params.unshift(v);
        v = ins.apply(ins,params);
    }
    return v;
}
var VDOM_CACHE = [];
//解析属性名，如果是指令，返回指令name,参数
function isDirectiveVNode(attrName,comp,isCompNode){
    var rs = null;
    var params = null;
    var filter = null;
    if(REG_CMD.test(attrName)){
        var c = attrName.replace(CMD_PREFIX,'');
        var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
        if(CPDI > -1)c = c.substring(0,CPDI);
        rs = c;

        var i = attrName.indexOf(CMD_PARAM_DELIMITER);
        if(i > -1){
            params = attrName.substr(i+1);
        }

        switch(c){
            case 'if':case 'else':case 'for':case 'html':return c;
        }

        //removeIf(production)
        //如果没有对应的处理器
        assert(DIRECT_MAP[c],comp?comp.name:'ROOT',"there is no handler of directive '"+c+"' ");
        //endRemoveIf(production)
    }else if(attrName[0] === EV_AB_PRIFX){
        rs = 'on';
        params = attrName.substr(1);
    }else if(attrName[0] === BIND_AB_PRIFX && !isCompNode){/* 区分指令参数和bind */
        rs = 'bind';
        params = attrName.substr(1);
    }

    if(params){
        var fi = params.indexOf(CMD_FILTER_DELIMITER);
        if(fi > -1){
            filter = params.substr(fi+1);
            params = params.substring(0,fi);
        }

        params = params.split(CMD_PARAM_DELIMITER);
    }

    return rs?[rs,params,filter]:rs;
}
//解析for语句：datasource，alias
//包括to和普通语法
function parseDirectFor(name,attrNode,compNode){
    if(name !== 'for')return false;

    var rs = null;//k,v,filters,ds1,ds2;
    var forExpStr = attrNode.exp[0];
    var filters = attrNode.exp[1];
    //removeIf(production)    
    assert(forExpStr.match(/^([\s\S]*?)\s+as\s+([\s\S]*?)$/),compNode?compNode.name:'ROOT',XERROR.COMPILE.EACH,'invalid for expression : '+forExpStr);
    //endRemoveIf(production)
    var alias = RegExp.$2;
    var kv = alias.split(',');
    var k = kv.length>1?kv[0]:null;
    var v = kv.length>1?kv[1]:kv[0];
    var ds = RegExp.$1;
    if(ds.match(/^([\s\S]*?)\s+to\s+([\s\S]*?)$/)){ 
        rs = [k,v,filters,RegExp.$1,RegExp.$2];
    }else{
        rs = [k,v,filters,ds];
    }
    return rs;
}
function parseDirectIf(name,attrNode){
    if(name !== 'if')return false;

    return attrNode.exp[0];
}
function parseDirectHTML(name,attrNode){
    if(name !== 'html')return false;

    return attrNode.exp[0];
}
function replaceGtLt(str){
    return str.replace(/&gt;/img,'>').replace(/&lt;/img,'<');
}

//https://www.w3.org/TR/html5/syntax.html#void-elements
var VOIDELS = ['br','hr','img','input','link','meta','area','base','col','embed','keygen','param','source','track','wbr'];
// var TAG_START_EXP = /^<([-a-z0-9]+)((?:\s+[a-zA-Z_:.][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(?:\/?)>/im;
var TAG_START_EXP = /<([-a-z0-9]+)((?:\s+[-a-zA-Z0-9_:.]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')))?)*)\s*(?:\/?)>/im;
var TAG_ATTR_EXP = /[a-zA-Z_:.][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?/img;
var TAG_END_EXP = /<\/([-a-z0-9]+)>/im;
var TAG_END_EXP_G = /<\/([-a-z0-9]+)>/img;

function parseHTML(str){
    var startNodeData = null;
    var endNodeData;
    var stack = [];
    var compStack = [];
    var roots = [];
    var slotList = [];
    var compNode;
    while(str.length>0){
        if(!startNodeData){
            startNodeData = TAG_START_EXP.exec(str);
            var index = startNodeData.index + startNodeData[0].length;
            str = str.substr(index);
        }
        //build pNode
        var tagName = startNodeData[1];
        var node = new pNode(1,tagName);
        var parentNode = stack[stack.length-1];
        if(parentNode){
            parentNode.children.push(node);
        }else{
            roots.push(node);
        }
        if(COMP_MAP[tagName]){
            compNode = node;
            compStack.push(node);
        }
        var attrStr = startNodeData[2].trim();
        var attrAry = attrStr.match(TAG_ATTR_EXP);
        if(attrAry)parseHTML_attrs(attrAry,node,compNode);

        //handle void el root
        if(str.length<1)break;

        //handle slot
        if(tagName === SLOT){
            slotList.push([parentNode,node,node.attrNodes.name?node.attrNodes.name.value:null]);
        }else if(node.attrNodes.slot){
            if(compNode)compNode.slotMap[node.attrNodes.slot.value] = node;
        }

        if(VOIDELS.indexOf(tagName)<0)stack.push(node);

        //check
        var nextNodeData = TAG_START_EXP.exec(str);
        if(nextNodeData){
            startNodeData = nextNodeData;
        }
        endNodeData = TAG_END_EXP.exec(str);
        var endIndex = endNodeData?endNodeData.index:-1;
        var nextIndex = nextNodeData?nextNodeData.index:-1;
        parentNode = stack[stack.length-1];
        if(nextIndex>-1 && nextIndex < endIndex){
            parseHTML_txt(str.substr(0,nextIndex),parentNode);

            str = str.substr(nextIndex + nextNodeData[0].length);
        }else{
            parseHTML_txt(str.substr(0,endIndex),parentNode);

            var lastEndIndex = endIndex + endNodeData[0].length;
            TAG_END_EXP_G.lastIndex = 0;
            TAG_END_EXP_G.exec(str);
            do{
                var tmp = stack.pop();
                if(tmp === compNode){
                    compStack.pop();
                    compNode = compStack[compStack.length-1];
                }
                if(stack.length<1)break;
                endNodeData = TAG_END_EXP_G.exec(str);
                //removeIf(production)
                assert(endNodeData,compStack.length<1?'ROOT':compStack[compStack.length-1],XERROR.COMPILE.HTML,"html template compile error - there's no end tag of <"+tagName+"> - \n"+str);
                //endRemoveIf(production)
                endIndex = endNodeData.index;
                var txt = str.substring(lastEndIndex,endNodeData.index);
                if(txt.trim()){
                    if(endIndex>nextIndex){
                        var tmp = TAG_START_EXP.exec(txt);
                        if(tmp){
                            txt = txt.substr(0,tmp.index).trim();
                        }
                    }
                    if(txt.trim()){
                        node = stack[stack.length-1];
                        parseHTML_txt(txt,node);
                    }                    
                }
                lastEndIndex = endIndex + endNodeData[0].length;
            }while(endIndex < nextIndex);
            
            if(!nextNodeData)break;

            str = str.substr(nextIndex + nextNodeData[0].length);
        }
    }

    return [roots,slotList];
}
function parseHTML_attrs(attrs,node,compNode){
    for(var i=attrs.length;i--;){
        var attrStr = attrs[i];
        var splitIndex = attrStr.indexOf('=');
        var value=null,aName;
        if(splitIndex<0){
            aName = attrStr;
        }else{
            aName = attrStr.substring(0,splitIndex);
            value = attrStr.substring(splitIndex+2,attrStr.length-1);
        }
        var attrNode = new pNodeAttr(aName,isDirectiveVNode(aName,node,compNode && node == compNode));
        node.attrNodes[aName] = attrNode;
        attrNode.value = value;
        if(attrNode.directive){
            if(value){
                //convert
                value = value.replace(/&amp;/mg,'&');
                //handle filter
                var splitIndex = value.indexOf('=>');
                var expStr,filterStr;
                if(splitIndex<0){
                    expStr = value;
                }else{
                    expStr = value.substring(0,splitIndex);
                    filterStr = value.substring(splitIndex+2,value.length);
                }
                attrNode.exp = parseHTML_exp(expStr,filterStr);    
            }
            
            var tmp = null;
            var dName = attrNode.directive;
            if(dName === 'for' || dName === 'if' || dName === 'else' || dName === 'html'){
                if(tmp = parseDirectFor(dName,attrNode,compNode)){
                    node.for = tmp;
                }
                if(tmp = parseDirectIf(dName,attrNode)){
                    node.if = tmp;
                }
                if(tmp = parseDirectHTML(dName,attrNode)){
                    node.html = tmp;
                }
                if(dName === 'else'){
                    node.else = true;
                }
                node.attrNodes[attrNode.name] = null;
                delete node.attrNodes[attrNode.name];
            }
        }
    }
}
function parseHTML_txt(txt,node){
    txt = txt.trim();
    var txtQ = [];
    if(txt){
        var expData = null;
        var lastIndex = 0;
        while(expData = EXP_EXP.exec(txt)){
            var t = txt.substring(lastIndex,expData.index);
            if(t)txtQ.push(t);
            txtQ.push(parseHTML_exp(expData[1],expData[2],true));
            lastIndex = expData.index + expData[0].length;
        }
        if(lastIndex < txt.length){
            txtQ.push(txt.substr(lastIndex));
        }
        if(txtQ.length<1)txtQ.push(txt);
        var tn = new pNode(3,null,txtQ);
        node.children.push(tn);
    }
}
function parseHTML_exp(expStr,filterStr,isTxt){
    var rs = [];
    rs[0] = expStr.trim();
    if(isTxt)rs[0] = '('+rs[0]+')';
    var filterAry = [];
    if(filterStr){
        var filters = filterStr.split('|');
        for(var i=0;i<filters.length;i++){
            var parts = filters[i].split(':');
            filterAry.push({
                name:parts[0].trim(),
                param:parts.slice(1)
            });
        }
    }
    rs[1] = filterAry;
    return rs;
}

var FORSCOPE_COUNT = 0;
function buildEvalStr(pm,prevIfStr,forScopeAry){
    var str = '';
    if(pm.type === 1){
        var forScopeStr,forScopeChainStr;
        if(pm.for){
            forScopeStr = 'forScope'+FORSCOPE_COUNT++;
            forScopeAry = forScopeAry.concat(forScopeStr);
        }
        forScopeChainStr = '['+forScopeAry.toString()+']';

        var children = '';
        if(COMP_MAP[pm.tag]){
            children = JSON.stringify([pm.children,pm.slotMap]);
        }else{
            for(var i=0;i<pm.children.length;i++){
                var prevPm = pm.children[i-1];
                children += ','+buildEvalStr(pm.children[i],prevPm?prevPm.if:null,forScopeAry);
            }
            if(children.length>0)children = children.substr(1);
        }            
        var pair = buildAttrs(pm.attrNodes);
        var attrStr = pair[0];
        var dirStr = pair[1];
        var ifStr = pm.if || 'true';
        ifStr = '('+ifStr+')';
        if(prevIfStr && pm.else){
            ifStr = '!('+prevIfStr+')'
        }
        var innerHTML = pm.html || 'null';
        var nodeStr = ifStr+'?_ce(this,"'+pm.tag+'",'+attrStr+','+dirStr+',['+children+'],'+innerHTML;
        if(pm.tag == 'template'){
            nodeStr = ifStr+'?_tmp(['+children+']';
        }
        if(pm.for){
            var k = (pm.for[0]||'').trim();
            var v = pm.for[1].trim();
            var filter = pm.for[2];
            var ds1 = pm.for[3];
            var ds2 = pm.for[4];
            var dsStr = ds1;
            var declare = "";
            if(pm.attrNodes.var){
                declare = pm.attrNodes.var.value;
                var list = declare.replace(/^{|}$/mg,'').split(',');
                var s = '';
                list.forEach(function(de) {
                    var pair = de.split(':');
                    s += 'var '+ pair[0] +'='+pair[1]+';';
                });
                declare = s;
            }
            if(ds2){
                dsStr = "(function(){var rs=[];for(var i="+ds1+";i<="+ds2+";i++)rs.push(i);return rs;}).call(this)"
            }
            if(filter){
                dsStr = "_fi("+dsStr+","+buildFilterStr(filter)+",comp)";
            }
            str += '_li('+dsStr+',function('+forScopeStr+'){with('+forScopeStr+'){'+declare+' return '+nodeStr+','+forScopeChainStr+'):null}},this,"'+k+'","'+v+'")';
        }else{
            str += nodeStr+','+forScopeChainStr+'):null';
        }
    }else{
        var tmp = buildTxtStr(pm.txtQ);
        str += '_ct('+tmp+')';
    }

    return str;
}
function buildAttrs(map){
    var rs = {};
    var dirStr = '';
    for(var k in map){
        var attr = map[k];
        if(attr.directive){
            var exp = attr.value;
            var calcExp = attr.directive[0] === 'on'||attr.directive[0] === 'model'?JSON.stringify(exp):exp;
            dirStr += ",['"+k+"',"+JSON.stringify(attr.directive)+","+(calcExp)+","+JSON.stringify(exp)+"]";
        }else{
            rs[k] = attr.value;
        }
    }//end for
    return [JSON.stringify(rs),'['+dirStr.substr(1)+']'];
}
function buildTxtStr(q){
    var rs = '';
    q.forEach(function(item){
        if(item instanceof Array){
            var exp = item[0];
            var filter = item[1];
            if(filter.length>0){
                rs += "+_fi("+exp+","+buildFilterStr(filter)+",comp)";
            }else{
                rs += "+"+exp;
            }
        }else if(item){
            rs += "+"+JSON.stringify(item);
        }
    });
    rs = rs.replace(/\n/mg,'');
    if(rs.length>0)rs = rs.substr(1);
    return rs;
}
function buildFilterStr(filters){
    var rs = '';
    filters.forEach(function(f){
        var tmp = '["'+f.name+'",['+f.param.toString()+']]';
        rs += ','+tmp;
    });
    return '['+rs.substr(1)+']';
}
function compileVDOM(str,comp){
    if(VDOM_CACHE[str] && !comp.__slots && !comp.__slotMap)return VDOM_CACHE[str];

    var rs = 'with(comp){with(state){return '+compileVDOMStr(str,comp,[])+'}}';
    rs = new Function('comp,state,_ce,_tmp,_ct,_li,_fi',rs);
    VDOM_CACHE[str] = rs;
    return rs;
}
function compileVDOMStr(str,comp,forScopeAry){
    var pair = parseHTML(str);
    var roots = pair[0];
    //removeIf(production)
    assert(roots.length==1,comp.name,XERROR.COMPILE.ONEROOT,"should only have one root in your template");
    //endRemoveIf(production)
    var rs = roots[0];
    //removeIf(production)
    assert(rs.type == 1 && rs.tag != 'template' && rs.tag != 'slot' && !rs.for,comp.name,XERROR.COMPILE.ROOTTAG,"root element cannot be <template> or <slot>");
    assert(!COMP_MAP[rs.tag],comp.name,XERROR.COMPILE.ROOTCOMPONENT,"root element <"+rs.tag+"> should be a non-component tag");
    //endRemoveIf(production)
    //doslot
    doSlot(pair[1],comp.__slots,comp.__slotMap);
    var str = buildEvalStr(rs,null,forScopeAry);
    return str;
}
/**
 * get vdom tree for component
 */
function buildVDOMTree(comp){
    var root = null;
    var fn = compileVDOM(comp.compiledTmp,comp);
    root = fn.call(comp,comp,comp.state,createElement,createTemplate,createText,createElementList,doFilter);
    return root;
}
var forScopeQ = null;
function compareVDOM(newVNode,oldVNode,comp){
    forScopeQ = {};
    if(isSameVNode(newVNode,oldVNode)){
        compareSame(newVNode,oldVNode,comp);
    }else{
        //remove old,insert new
        insertBefore(newVNode,oldVNode,oldVNode.parent?oldVNode.parent.children:null,oldVNode.parent,comp);
        removeVNode(oldVNode);
    }
    return forScopeQ;
}
function isSameComponent(nv,ov) {
    var c = impex._cs[ov._cid];
    if(!c)return false;
    //compare attrs
    var nas = nv.attrNodes;
    var oas = c.__attrs;
    if(Object.keys(nas).length !== Object.keys(oas).length)return false;
    for(var k in nas){
        if(isUndefined(oas[k]))return false;
    }
    //compare slots
    return JSON.stringify(nv._slots) == JSON.stringify(c.__slots)
            && JSON.stringify(nv._slotMap) == JSON.stringify(c.__slotMap);
}

function compareSame(newVNode,oldVNode,comp){
    if(newVNode._comp){
        forScopeQ[oldVNode._cid] = newVNode._forScopeQ;
        return;
    }

    if(newVNode.tag){
        //update events forscope
        oldVNode._forScopeQ = newVNode._forScopeQ;
        
        var allOldAttrs = oldVNode.attrNodes;
        var nvdis = newVNode._directives,
            ovdis = oldVNode._directives;
        var nvDiMap = getDirectiveMap(nvdis),
            ovDiMap = getDirectiveMap(ovdis);
        var add=[],del=[];
        //compare dirs
        for(var i=ovdis.length;i--;){
            var odi = ovdis[i];
            var odiStr = odi[0]+odi[3];
            if(!nvDiMap[odiStr]){
                del.push(odi);
            }
        }
        for(var i=nvdis.length;i--;){
            var ndi = nvdis[i];
            var ndiStr = ndi[0]+ndi[3];
            if(ovDiMap[ndiStr]){
                ovDiMap[ndiStr][2] = ndi[2];
            }else{
                add.push(ndi);
            }
        }
        //reset attrs
        oldVNode.attrNodes = newVNode.attrNodes;
        //do del
        for(var i=del.length;i--;){
            var index = oldVNode._directives.indexOf(del[i]);
            oldVNode._directives.splice(index,1);

            var params = del[i][1][1];
            var v = del[i][2];
            var exp = del[i][3];
            del[i].onDestroy && del[i].onDestroy(oldVNode,{value:v,args:params,exp:exp});
        }
        //add
        for(var i=add.length;i--;){
            oldVNode._directives.push(add[i]);
        }
        //unbind old events
        oldVNode.off();
        //do bind
        oldVNode._directives.forEach(function(di){
            var dName = di[1][0];
            var d = DIRECT_MAP[dName];
            if(!d)return;
            
            var params = di[1][1];
            var v = di[2];
            var exp = di[3];

            d.onBind && d.onBind(oldVNode,{value:v,args:params,exp:exp});
        });

        //for unstated change like x-html
        updateAttr(oldVNode.attrNodes,allOldAttrs,oldVNode.dom,oldVNode.tag);
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
        var diStr = di[0]+di[3];
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
    if(osp <= oep && oep>0){
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
                var tmp = buildOffscreenDOM(vn,comp);

                fragment.appendChild(tmp);
            }
            dom = fragment;
        }else{
            dom = buildOffscreenDOM(nv,comp);
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

        //todo...   release other resource
        if(impex._cs[vnode._cid] && vnode.getAttribute(DOM_COMP_ATTR)){
            impex._cs[vnode._cid].destroy();
        }
    }
}
function insertChildren(parent,children,comp){
    parent.children = children;
    var fragment = document.createDocumentFragment();
    var compAry = [];
    for(var i=0;i<children.length;i++){
        var vn = children[i];
        var dom = buildOffscreenDOM(vn,comp);
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
function updateAttr(newAttrs,oldAttrs,dom,tag){
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

    //update new attrs
    var comp_attr = oldAttrs[DOM_COMP_ATTR];
    if(comp_attr)newAttrs[DOM_COMP_ATTR] = comp_attr;

}


