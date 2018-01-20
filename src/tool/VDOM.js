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
            var forScopeStart = '',forScopeEnd = '';
            if(this._forScopeQ)
                for(var i=0;i<this._forScopeQ.length;i++){
                    forScopeStart += 'with(arguments['+(3+i)+']){';
                    forScopeEnd += '}';
                }
            evMap[this.vid] = [this,new Function('scope,$event,$vnode','with(scope){'+forScopeStart+exp+forScopeEnd+'}'),this._cid];
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
function createElement(comp,tag,props,directives,children,html,forScope){
    var rs = new VNode(tag,props,directives);
    var fsq = null;
    if(forScope)
        fsq = rs._forScopeQ = [forScope];
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
        //这里需要更新children
        // var pair = parseHTML(html);
        var root;
        try{
            var fn = compileVDOM('<'+tag+'>'+html+'</'+tag+'>',comp);
            root = fn.call(comp,comp.state,createElement,createTemplate,createText,createElementList,doFilter);
        }catch(e){
            error(comp.name,'[x-html] compile error on '+e.message);
            return;
        }
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
                    node.parent = rs;
                    rs.children.push(node);
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
function doFilter(v,filters){
    for(var i=0;i<filters.length;i++){
        var f = filters[i];
        var ins = FILTER_MAP[f[0]];
        var params = f[1];
        params.unshift(v);
        v = ins.apply(ins,params);
    }
    return v;
}
var VDOM_CACHE = [];
//解析属性名，如果是指令，返回指令name,参数
function isDirectiveVNode(attrName,comp){
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

        //如果有对应的处理器
        if(!DIRECT_MAP[c]){
            warn(comp.name,"there is no handler of directive '"+c+"' ");
            return;
        }
    }else if(attrName[0] === EV_AB_PRIFX){
        rs = 'on';
        params = attrName.substr(1);
    }else if(attrName[0] === BIND_AB_PRIFX && !comp){
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
function parseDirectFor(name,attrNode){
    if(name !== 'for')return false;

    var rs = null;//k,v,filters,ds1,ds2;
    var forExpStr = attrNode.exp[0];
    var filters = attrNode.exp[1];
    if(!forExpStr.match(/^([\s\S]*?)\s+as\s+([\s\S]*?)$/)){
        //each语法错误
        throw new Error('invalid each expression : '+forExpStr);
        return;
    }
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
function parseHTML(str){
    var op = null;
    var strQueue = '';
    var lastNode = null;
    var lastAttrNode = null;
    var delimiter = null;
    var escape = false;
    var roots = [];
    var nodeStack = [];
    var startTagLen = EXP_START_TAG.length;
    var endTagLen = EXP_END_TAG.length;
    var inExp = false;//在表达式内部
    var delimiterInExp = null;
    var escapeInExp = null;
    var expStartPoint = 0;
    var expEndPoint = 0;
    var filterStartTagLen = FILTER_EXP_START_TAG.length;
    var filterStartEntityLen = FILTER_EXP_START_TAG_ENTITY.length;
    var filterStartPoint = 0;
    var lastFilter = '';
    var lastOp = null;
    var lastFilterList = [];
    var lastFilterParam = '';
    var lastFilterParamList = [];
    var textQ = [];
    var compNode;
    var slotNode;
    var slotList = [];

    for(var i=0;i<=str.length;i++){
        var c = str[i];

        if(!op && c==='<'){//开始解析新节点
            op = 'n';
            continue;
        }else if(!op){
            op = 't';
        }

        if(op==='a' || op==='t' || op==='efp'){
            if(strQueue.length>=startTagLen && !inExp){
                var expStart = strQueue.substr(strQueue.length-startTagLen);
                if(expStart == EXP_START_TAG){
                    var sp = expEndPoint===0?expEndPoint:expEndPoint+endTagLen;
                    textQ.push(strQueue.substr(sp).replace(EXP_START_TAG,''));
                    inExp = true;
                    expStartPoint = strQueue.length;
                    if(op==='a'){
                        var n = lastAttrNode.name;
                        throw new Error("to bind a dynamic attribute '"+n+"' using x-bind:"+n+" / ."+n+", instead of expressions");
                        return;
                    }
                }
            }
            escape = false;
            if(c === '\\'){
                escape = true;
            }
            if(inExp && (c === '\'' || c === '"')){
                if(!delimiterInExp)delimiterInExp = c;
                else{
                    if(c === delimiterInExp && !escape){
                        delimiterInExp = null;
                    }
                }
            }
        }

        switch(op){
            case 'n':
                if(c===' '||c==='\n'|| c==='\t' || c==='>'){
                    if(!strQueue)break;//<  div 这种场景，过滤前面的空格
                    if(strQueue.indexOf('<')>-1){
                        throw new Error("unexpected identifier '<' in tagName '"+strQueue+"'");
                        return;
                    }

                    //创建VNode
                    var node = new pNode(1,strQueue);
                    lastNode = nodeStack[nodeStack.length-1];
                    //handle slot
                    if(COMP_MAP[strQueue]){
                        compNode = node;
                    }
                    if(strQueue === SLOT){
                        slotNode = [lastNode,node];
                        slotList.push(slotNode);
                    }

                    if(lastNode){
                        lastNode.children.push(node);
                    }
                    if(VOIDELS.indexOf(strQueue)>-1){
                        node.isVoid = true;
                    }
                    if(nodeStack.length<1){
                        roots.push(node);
                    }
                    lastNode = node;
                    if(!node.isVoid)
                        nodeStack.push(lastNode);

                    

                    if(c==='>'){
                        if(node.isVoid){
                            lastNode = nodeStack[nodeStack.length-1];
                        }
                        op = 't';
                    }else{
                        op = 'a';
                    }
                    
                    strQueue = '';
                    break;
                }
                if(c === '\/'){//终结节点，这里要判断是否和当前解析的元素节点相同
                    //如果不做非法语法验证，只需要跳过即可
                    op = 'e';
                    break;
                }
                strQueue += c;break;
            case 'e':
                if(c===' '|| c==='\t')break;
                if(c === '>'){
                    nodeStack.pop();
                    lastNode = nodeStack[nodeStack.length-1];

                    if(compNode && compNode.tag === strQueue){
                        compNode = null;
                    }
                    if(strQueue === SLOT){
                        slotNode = null;
                    }
                    
                    op = 't';
                    strQueue = '';
                    break;
                }
                strQueue += c;break;
            case 'a':
                if(!delimiter && strQueue.length<1 && (c === ' '|| c==='\t'))break;
                if(!delimiter && c === '>'){//结束节点解析
                    //check component or directive
                    // if(ComponentFactory.hasTypeOf(lastNode.tag)){
                    //     node.comp = lastNode.tag;
                    // }

                    if(lastNode.isVoid){
                        lastNode = nodeStack[nodeStack.length-1];
                    }
                    op = 't';
                    break;
                }
                if(!lastAttrNode){//解析属性名
                    var noValueAttr = strQueue.length>0 && (c === ' '|| c==='\t');
                    if(c === '=' || noValueAttr){
                        //创建VAttrNode
                        var aName = strQueue.trim();
                        lastAttrNode = new pNodeAttr(aName,isDirectiveVNode(aName,compNode));
                        lastNode.attrNodes[aName] = lastAttrNode;

                        strQueue = '';

                        if(noValueAttr){
                            lastAttrNode = null;
                        }
                        break;
                    }
                    strQueue += c;break;
                }else{
                    if(c === '\'' || c === '"'){
                        if(!delimiter){
                            delimiter = c;

                            if(lastAttrNode.directive){
                                //进入表达式解析
                                inExp = true;
                                expStartPoint = 0;
                            }

                            break;
                        }else{
                            if(c === delimiter && !escape){
                                lastAttrNode.value = strQueue;
                                if(lastAttrNode.name === SLOT){
                                    compNode.slotMap[strQueue] = lastNode;
                                }

                                if(slotNode && lastAttrNode.name === 'name'){
                                    slotNode.push(strQueue);
                                }

                                //parse for
                                if(lastAttrNode.directive){
                                    var tmp = null;
                                    var dName = lastAttrNode.directive;
                                    if(dName === 'for' || dName === 'if' || dName === 'else' || dName === 'html'){
                                        if(tmp = parseDirectFor(dName,lastAttrNode)){
                                            lastNode.for = tmp;
                                        }
                                        if(tmp = parseDirectIf(dName,lastAttrNode)){
                                            lastNode.if = tmp;
                                        }
                                        if(tmp = parseDirectHTML(dName,lastAttrNode)){
                                            lastNode.html = tmp;
                                        }
                                        if(dName === 'else'){
                                            lastNode.else = true;
                                        }
                                        lastNode.attrNodes[lastAttrNode.name] = null;
                                        delete lastNode.attrNodes[lastAttrNode.name];
                                    }
                                }

                                lastAttrNode = null;
                                delimiter = null;
                                strQueue = '';
                                break;
                            }
                        }
                    }
                    strQueue += c;break;
                }
                break;
            case 't':
                if(!inExp && (c === '<' || !c)){
                    var tmp = strQueue.replace(/^\s*|\s*$/,'');
                    if(tmp){
                        var txt = strQueue;
                        if(textQ.length>0)txt = txt.substr(expEndPoint+endTagLen,strQueue.length-startTagLen);
                        if(txt){
                            textQ.push(txt);
                        }
                        var tn = new pNode(3,null,textQ);
                        textQ = [];
                        if(lastNode){
                            lastNode.children.push(tn);
                        }
                        expEndPoint = 0;
                    }
                    op = 'n';
                    strQueue = '';
                    break;
                }
                strQueue += c;
                break;
            case 'ef':
                if(c === ' '|| c==='\t')break;
                var append = true;
                if(c===FILTER_EXP_PARAM_SPLITTER){
                    // => xxx:
                    // => xxx:yy: 
                    // 这里只会出现第一种情况，第二种需要在efp中处理
                    lastFilter = {name:lastFilter,param:[]};
                    lastFilterList.push(lastFilter);
                    // lastFilter = '';
                    op='efp';
                    append = false;
                }else if(c===FILTER_EXP_SPLITTER){
                    // => xxx |
                    // => xxx:yy |
                    // 这里只会出现第一种情况，第二种需要在efp中处理
                    lastFilter = {name:lastFilter,param:[]};
                    lastFilterList.push(lastFilter);
                    lastFilter = '';
                    append = false;
                }
                
                strQueue += c;
                if(append)lastFilter += c;
                break;
            case 'efp':
                var append = true;
                if(!delimiterInExp){
                    if(c === ' '|| c==='\t')break;
                    if(lastFilter && (c===FILTER_EXP_PARAM_SPLITTER ||c===FILTER_EXP_SPLITTER)){
                        lastFilter.param.push(lastFilterParam);
                        lastFilterParam = '';
                        append = false;
                        if(c===FILTER_EXP_SPLITTER){
                            op = 'ef';
                            lastFilter = '';
                        }
                    }
                }

                if(append)lastFilterParam += c;
                strQueue += c;
        }//end switch

        if((op==='a' || op==='t' || op==='ef' || op==='efp') && inExp){
            var filterStart = strQueue.substr(strQueue.length-filterStartTagLen);
            var filterEntityStart = strQueue.substr(strQueue.length-filterStartEntityLen);
            if((filterStart===FILTER_EXP_START_TAG || filterEntityStart===FILTER_EXP_START_TAG_ENTITY) 
                && op!=='ef' && !delimiterInExp){
                // inFilter = true;
                lastOp = op;
                op = 'ef';
                if(filterStart===FILTER_EXP_START_TAG){
                    filterStartPoint = strQueue.length - filterStartTagLen;
                }else{
                    filterStartPoint = strQueue.length - filterStartEntityLen;
                }
                
            }else if(inExp){
                var expEnd = strQueue.substr(strQueue.length-endTagLen);
                var doEnd = expEnd===EXP_END_TAG;//大括号表达式结束
                var isDi = false;
                //对于指令表达式结束
                if(lastAttrNode && lastAttrNode.directive && delimiter 
                    && (!delimiterInExp && !escape) 
                    && str[i+1]==delimiter){
                    isDi = doEnd = true;
                }
                if(doEnd){
                    switch(op){
                        case 't':
                            if(delimiterInExp)continue;
                            break;
                        case 'ef':
                            if(lastFilter){
                                var tmp = new RegExp(EXP_END_TAG+'$');
                                lastFilter = lastFilter.replace(tmp,'');
                                lastFilter = {name:lastFilter,param:[]};
                                lastFilterList.push(lastFilter);
                            }
                            break;
                        case 'efp':
                            if(lastFilterParam){
                                var tmp = new RegExp(EXP_END_TAG+'$');
                                lastFilterParam = lastFilterParam.replace(tmp,'');                            

                                lastFilter.param.push(lastFilterParam);
                            }
                            break;
                    }
                    inExp = false;
                    var withoutFilterStr = strQueue.substring(expStartPoint,filterStartPoint||(strQueue.length-endTagLen));
                    expEndPoint = strQueue.length-endTagLen;
                    
                    if(isDi){
                        withoutFilterStr = strQueue.substring(0,filterStartPoint||strQueue.length);
                    }
                    
                    filterStartPoint = 0;
                    if(lastOp==='t' || op==='t'){
                        textQ.push(['('+replaceGtLt(withoutFilterStr)+')',lastFilterList]);
                    }else if(lastOp==='a' || op==='a'){
                        lastAttrNode.exp = [withoutFilterStr,lastFilterList];
                        expEndPoint = 0;
                    }
                    
                    
                    lastFilter = '';
                    lastFilterList = [];
                    if(lastOp){
                        lastFilter = '';
                        lastFilterParam = '';
                        op = lastOp;
                        lastOp = null;
                    }
                }
            }
            
        }//end if
    }// end for

    return [roots,slotList];
}
function buildVDOMStr(pm){
    var str = buildEvalStr(pm);
    return 'with(scope){return '+str+'}';
}
function buildEvalStr(pm,prevIfStr){
    var str = '';
    if(pm.type === 1){
        var children = '';
        if(COMP_MAP[pm.tag]){
            children = JSON.stringify([pm.children,pm.slotMap]);
        }else{
            for(var i=0;i<pm.children.length;i++){
                var prevPm = pm.children[i-1];
                children += ','+buildEvalStr(pm.children[i],prevPm?prevPm.if:null);
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
            if(ds2){
                ds1 = ds1.replace(/(this[.a-z_$0-9]+)?[_$a-z][_$a-z0-9]*\(/img,function(a){
                    if(a.indexOf('this')===0)return a;
                    return 'this.'+a;
                });
                ds2 = ds2.replace(/(this[.a-z_$0-9]+)?[_$a-z][_$a-z0-9]*\(/img,function(a){
                    if(a.indexOf('this')===0)return a;
                    return 'this.'+a;
                });
                dsStr = "(function(){var rs=[];for(var i="+ds1+";i<="+ds2+";i++)rs.push(i);return rs;}).call(this)"
            }
            if(filter){
                dsStr = "_fi("+dsStr+","+buildFilterStr(filter)+")";
            }
            str += '_li('+dsStr+',function(forScope){ with(forScope){return '+nodeStr+',forScope):null}},this,"'+k+'","'+v+'")';
        }else{
            str += nodeStr+'):null';
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
            var exp = attr.value.replace(/(this[.a-z_$0-9]+)?[_$a-z][_$a-z0-9]*\(/img,function(a){
                if(a.indexOf('this')===0)return a;
                return 'this.'+a;
            });
            dirStr += ",['"+k+"',"+JSON.stringify(attr.directive)+","+(attr.directive[0] === 'on'?JSON.stringify(exp):exp)+","+JSON.stringify(exp)+"]";
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
                rs += "+_fi("+exp+","+buildFilterStr(filter)+")";
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

    var pair = parseHTML(str);
    var roots = pair[0];
        
    if(roots.length>1){
        throw new Error("should only have one root");
    }
    var rs = roots[0];
    if(rs.type != 1 || rs.tag == 'template' || rs.tag == 'slot' || rs.for){
        throw new Error("root element cannot be <template> or <slot>");
    }
    if(COMP_MAP[rs.tag]){
        throw new Error("root element <"+rs.tag+"> should be a non-component tag");
    }
    //doslot
    doSlot(pair[1],comp.__slots,comp.__slotMap);

    rs = buildVDOMStr(rs);
    rs = new Function('scope,_ce,_tmp,_ct,_li,_fi',rs);
    VDOM_CACHE[str] = rs;
    return rs;
}
/**
 * get vdom tree for component
 */
function buildVDOMTree(comp){
    var root = null;
    try{
        var fn = compileVDOM(comp.compiledTmp,comp);
        root = fn.call(comp,comp.state,createElement,createTemplate,createText,createElementList,doFilter);
    }catch(e){
        error(comp.name,"compile error on "+e.message);
    }
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
function compareSame(newVNode,oldVNode,comp){
    if(newVNode._comp){
        forScopeQ[oldVNode._cid] = newVNode._forScopeQ;
        return;
    }

    if(newVNode.tag){
        var rebindDis = false;
        //compare dirs
        for(var i=newVNode._directives.length;i--;){
            var ndi = newVNode._directives[i];
            var odi = oldVNode._directives[i];
            if(ndi[2] !== odi[2]){
                rebindDis = true;
                break;
            }
        }
        //compare attrs
        var ks = Object.keys(newVNode.attrNodes);
        if(ks.length != Object.keys(oldVNode.attrNodes).length){
            rebindDis = true;
        }else{
            for(var i=ks.length;i--;){
                var k = ks[i];
                if(newVNode.attrNodes[k] != oldVNode.attrNodes[k]){
                    rebindDis = true;
                    break;
                }
            }
        }        

        if(rebindDis){
            newVNode._directives.forEach(function(di){
                var dName = di[1][0];
                if(dName === 'on')return;
                var d = DIRECT_MAP[dName];
                if(!d)return;
                
                var params = di[1][1];
                var v = di[2];
                var exp = di[3];
                d.onBind && d.onBind(newVNode,{value:v,args:params,exp:exp});
            });
        }

        //for unstated change like x-html
        updateAttr(newVNode,oldVNode);

        //update events forscope
        if(oldVNode._forScopeQ){
            oldVNode._forScopeQ = newVNode._forScopeQ;
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
            if(ns.getAttribute('xid')){
                //处理id重用
            }else{
                //插入ov之前，并删除ov
                insertBefore(ns,os,oc,op,comp);
                removeVNode(os);
                os = oc[++osp],
                ns = nc[++nsp];
            }
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
                //bind vdom
                if(vn._comp){
                    parseComponent(vn._comp);
                    compAry.push(vn._comp);
                }
                fragment.appendChild(tmp);
            }
            dom = fragment;
        }else{
            dom = buildOffscreenDOM(nv,comp);
            //bind vdom
            if(nv._comp){
                parseComponent(nv._comp);
                compAry.push(nv._comp);
            }
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
    
    //comp
    for(var i=0;i<compAry.length;i++){
        var tmp = compAry[i];
        if(!tmp.__url){
            mountComponent(tmp,targetParent);
        }        
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
        //bind vdom
        if(vn._comp){
            parseComponent(vn._comp);
            compAry.push(vn._comp);
        }
        fragment.appendChild(dom);
    }
    parent.dom.appendChild(fragment);

    for(var i=0;i<compAry.length;i++){
        var tmp = compAry[i];
        mountComponent(tmp,parent);
    }
}
function isSameVNode(nv,ov){
    if(nv._comp){
        if(ov.getAttribute(DOM_COMP_ATTR)==nv.tag)return true;
        return false;
    }
    return ov.tag === nv.tag;
}
function updateTxt(nv,ov){
    ov.txt = nv.txt;
    var dom = ov.dom;
    dom.textContent = nv.txt;
}
function updateAttr(nv,ov){
    //比较节点属性
    var nvas = nv.attrNodes;
    var ovas = ov.attrNodes;
    var nvasKs = Object.keys(nvas);
    var ovasKs = Object.keys(ovas);
    var odom = ov.dom;
    for(var i=nvasKs.length;i--;){
        var k = nvasKs[i];
        var index = ovasKs.indexOf(k);
        if(index<0){
            odom.setAttribute(k,nvas[k]);
        }else{
            if(nvas[k] != ovas[k])
                odom.setAttribute(k,nvas[k]);
            ovasKs.splice(index,1);
        }
    }
    for(var i=ovasKs.length;i--;){
        if(ovasKs[i] === DOM_COMP_ATTR)continue;
        odom.removeAttribute(ovasKs[i]);
    }

    //update new attrs
    var comp_attr = ov.attrNodes[DOM_COMP_ATTR];
    ov.attrNodes = nv.attrNodes;
    if(comp_attr)ov.attrNodes[DOM_COMP_ATTR] = comp_attr;
    //update new directive exp value
    ov._directives = nv._directives;
    ov._directives.forEach(function(dir){
        if(isArray(dir[2]) || isObject(dir[2])){
            dir[2] = JSON.parse(JSON.stringify(dir[2]));
        }
    });
}


