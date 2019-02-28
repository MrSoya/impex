/**
 * VDOM构建器，用来构建VDOM树
 */
function createElement(comp,rid,children,html,forScopeAry){
    var raw = RNODE_MAP[rid];
    var tag = raw.tag;
    var rs = new VNode(tag,raw);

    //复制原始属性
    rs.props = Object.assign({},raw.props);
    rs.attributes = Object.assign({},raw.attributes);
    rs._isEl = true;
    if(forScopeAry.length>0)
        rs._forScopeQ = forScopeAry;
    var isComp = COMP_MAP[tag] || tag == 'component';
    //把计算后的指令表达式值放入vnode中
    for(var k in raw.directives){
        var di = raw.directives[k];
        rs.directives.push([di[0],undefined,di[2],di[3],isComp?true:false]);
    }
    if (isComp) {
        rs._comp = true;
        
        rs._slots = raw.children;
        rs._slotMap = raw.slotMap;
        return rs;
    }
    if(html != null){
        var forScopeStart = '',forScopeEnd = '';
        var root,str;
        var args = [comp,createElement,createTemplate,createText,createElementList,doFilter];
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
        
        var fn = new Function('comp,_ce,_tmp,_ct,_li,_fi'+argStr,'with(comp){'+forScopeStart+'return '+str+';'+forScopeEnd+'}');
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
        if(!ins)ins = comp[f[0]];
        //removeIf(production)
        assert(ins,comp.$name,XERROR.COMPILE.NOFILTER,"can not find filter '"+f[0]+"'");
        //endRemoveIf(production)
        var params = f[1];
        params.unshift(v);
        v = ins.apply(comp,params);
    }
    return v;
}