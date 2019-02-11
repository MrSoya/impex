/**
 * 编译模块，解析结果进行编译，编译后可以进行link
 * 支持 
 *     编译错误提醒
 *     VNODE构建
 *     过滤器处理
 *
 * 变量作用域支持所在域组件变量、全局变量，不支持上级组件变量
 */

var VDOM_CACHE = [];
function compile(str,comp){
    if(VDOM_CACHE[str] && !comp._slots && !comp._slotMap)return VDOM_CACHE[str];

    var rs = 'with(comp){return '+compileVDOMStr(str,comp,[])+'}';
    rs = new Function('comp,_ce,_tmp,_ct,_li,_fi',rs);
    VDOM_CACHE[str] = rs;
    return rs;
}
function compileVDOMStr(str,comp,forScopeAry){
    var pair = parseHTML(str);
    var roots = pair[0];

    //removeIf(production)
    assert(roots.length==1,comp.$name,XERROR.COMPILE.ONEROOT,"should only have one root in your template");
    //endRemoveIf(production)
    
    var rs = roots[0];

    //removeIf(production)
    assert(rs.tag && rs.tag != 'template' && rs.tag != 'slot' && !rs.for,comp.$name,XERROR.COMPILE.ROOTTAG,"root element cannot be <template> or <slot>");
    assert(!COMP_MAP[rs.tag],comp.$name,XERROR.COMPILE.ROOTCOMPONENT,"root element <"+rs.tag+"> should be a non-component tag");
    //endRemoveIf(production)
    
    //doslot
    doSlot(pair[1],comp._slots,comp._slotMap);
    var str = buildEvalStr(rs,forScopeAry);
    return str;
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
                if(slotMap[name])
                    params.push(slotMap[name]);
            }else{
                params = params.concat(slots);
            }
            parent.children.splice.apply(parent.children,params);
        });
}

var FORSCOPE_COUNT = 0;
var RNODE_MAP = {};
function buildEvalStr(raw,forScopeAry){
    var str = '';
    if(raw.tag){
        var forScopeStr,forScopeChainStr;
        if(raw.for){
            forScopeStr = 'forScope'+FORSCOPE_COUNT++;
            forScopeAry = forScopeAry.concat(forScopeStr);
        }
        forScopeChainStr = '['+forScopeAry.toString()+']';

        var children = '';
        RNODE_MAP[raw.rid] = raw;
        if(!COMP_MAP[raw.tag]){
            var startIf = false,ifStr = '';
            for(var i=0;i<raw.children.length;i++){
                var pmc = raw.children[i];
                var npmc = raw.children[i+1];
                var nodeStr = buildEvalStr(pmc,forScopeAry);
                if(pmc.if && !pmc.for){
                    startIf = true;
                    ifStr = '';
                }
                if(startIf){
                    if(pmc.else){
                        startIf = false;
                        children += ',' + ifStr + nodeStr;
                        continue;
                    }
                    if(ifStr && !pmc.elseif){
                        startIf = false;
                        children += ',' + ifStr + 'null,'+nodeStr;
                        continue;
                    }
                    ifStr += nodeStr;
                    if(!npmc || npmc.if){
                        children += ',' + ifStr + 'null';
                    }
                }else{
                    children += ',' + nodeStr;
                }
                
            }
            if(children.length>0)children = children.substr(1);
        }
        var ifStr = raw.if || raw.elseif;
        var ifStart = '',ifEnd = '';
        if(ifStr){
            ifStart = '('+ifStr+')?';
            ifEnd = ':';
        }

        var diCalcExpMap = buildDirectiveExp(raw.directives);
        var innerHTML = raw.html || 'null';
        var nodeStr = '_ce(this,"'+raw.rid+'",['+children+'],{'+diCalcExpMap+'},'+innerHTML+','+forScopeChainStr;
        if(raw.tag == 'template'){
            nodeStr = '_tmp(['+children+'],'+forScopeChainStr;
        }
        nodeStr = ifStart + nodeStr;
        if(raw.for){
            var k = (raw.for[0]||'').trim();
            var v = raw.for[1].trim();
            var filters = raw.for[2];
            var ds1 = raw.for[3];
            var ds2 = raw.for[4];
            var dsStr = ds1;
            var declare = "";
            if(raw.attributes.var){
                declare = raw.attributes.var;
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
            if(filters.length>0){
                dsStr = "_fi("+dsStr+","+buildFilterStr(filters)+",comp)";
            }
            str = '_li('+dsStr+',function('+forScopeStr+'){with('+forScopeStr+'){'+declare+' return '+nodeStr+')'+(ifEnd?':null':'')+'}},this,"'+k+'","'+v+'")';
        }else{
            str = nodeStr+')'+ifEnd;
        }
    }else{
        var tmp = buildTxtStr(raw.txtQ);
        str += '_ct('+tmp+')';
    }

    return str;
}
function buildDirectiveExp(map){
    var dirStr = '';
    for(var k in map){
        var attr = map[k];
        var exp = attr[3].vExp;
        var dName = attr[2].dName;
        var calcExp = dName === 'on'||dName === 'model'?JSON.stringify(exp):exp;
        dirStr += ',"'+k+'":'+ (calcExp || 'null');
    }//end for
    return dirStr.substr(1);
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
                rs += "+("+exp+")";
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