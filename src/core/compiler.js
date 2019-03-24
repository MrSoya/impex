/**
 * 编译模块，解析结果进行编译，编译后可以进行link
 * 支持 
 *     编译错误提醒
 *     VNODE构建
 *     过滤器处理
 *
 * 变量作用域支持所在域组件变量、全局变量，不支持上级组件变量
 */

var VDOM_CACHE = {};
function compile(str,comp){
    if(VDOM_CACHE[comp.$name] && !comp._hasSlots){
        return VDOM_CACHE[comp.$name];
    }
    if(comp._compiler && comp._hasSlots){
        return comp._compiler;
    }

    var rs = 'with(comp){return '+compileVDOMStr(str,comp)+'}';
    rs = new Function('comp,_ce,_tmp,_ct,_li,_fi,_cs',rs);
    
    if(comp.$name == 'ROOT' || !comp._hasSlots){
        VDOM_CACHE[comp.$name] = rs;
    }else{
        comp._compiler = rs;
    }

    return rs;
}
function compileVDOMStr(str,comp,isHTML){
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
    var str = buildEvalStr(comp,rs,!isHTML);
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
                if(slotMap && slotMap[name])
                    params.push(slotMap[name]);
            }else{
                params = params.concat(slots);
            }
            parent.children.splice.apply(parent.children,params);
        });
}

var FORSCOPE_COUNT = 0;
var RNODE_MAP = {};
function buildEvalStr(comp,raw,root){
    var str = '';
    if(raw.tag){
        var children = '';
        RNODE_MAP[raw.rid] = raw;
        var attrs = '';
        for(var k in raw.attrs){
            attrs += ','+k+':'+raw.attrs[k];
        }
        attrs = '{'+attrs.substr(1)+'}';
        if(!raw.isComp){
            var startIf = false,ifStr = '';
            if(raw.children)
            for(var i=0;i<raw.children.length;i++){
                var pmc = raw.children[i];
                var npmc = raw.children[i+1];
                var nodeStr = buildEvalStr(comp,pmc,false);
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

        //指令
        var diStr = '';
        for(var k in raw.directives){
            var di = raw.directives[k];
            var tmp = JSON.stringify(di);
            tmp = tmp.substr(0,tmp.length - 1) + ',value:'+di.exp+'}';
            diStr += ','+k+':'+tmp;
        }
        diStr = diStr?'{'+diStr.substr(1)+'}':undefined;
        

        //事件
        var events = '';
        for(var k in raw.events){
            var ev = raw.events[k];
            var tmp = JSON.stringify(ev);
            var modifiers = ev.modifiers;
            var exp = ev.exp;
            var isOnlyName = !/\(.*\)/.test(exp);
            if(isOnlyName){
                exp += '()';
            }
            //组件自定义事件无论是否写了参数，都以实际触发时的参数为准
            if(raw.isComp && (!modifiers || modifiers.indexOf(EVENT_MODIFIER_NATIVE)<0)){
                var args = '';
                var context = exp.substring(0,exp.lastIndexOf('.')) || 'this';
                exp = exp.substr(0,exp.indexOf('('));
                exp += '.apply('+context+',arguments)';
            }
            var val = 'function($event,$vnode){ '+exp+'}';

            tmp = tmp.substr(0,tmp.length - 1) + ',value:'+val+'}';
            events += ','+k+':'+tmp;
        }
        events = events?'{'+events.substr(1)+'}':undefined;

        //html
        var html = 'null';
        if(raw.html){
            html = "eval(_cs('<"+raw.tag+">'+("+raw.html+")+'</"+raw.tag+">',comp,true))";
        }

        var nodeStr = '_ce('+root+',this,'+(raw.class||undefined)+','+(raw.style||undefined)+','+attrs+','+diStr+','+events+',"'+raw.rid+'",['+children+'],'+html;
        if(raw.tag == 'template'){
            nodeStr = '_tmp(['+children+']';
        }
        nodeStr = ifStart + nodeStr;
        if(raw.for){
            var k = (raw.for[0]||'').trim();
            k = k?','+k:'';
            var v = raw.for[1].trim();
            var filters = raw.for[2];
            var ds1 = raw.for[3];
            var ds2 = raw.for[4];
            var dsStr = ds1;
            var declare = "";
            if(ds2){
                dsStr = "(function(){var rs=[];for(var i="+ds1+";i<="+ds2+";i++)rs.push(i);return rs;}).call(this)"
            }
            if(filters){
                dsStr = "_fi("+dsStr+","+buildFilterStr(filters)+",comp)";
            }
            str = '_li('+dsStr+',function($index,'+v+k+'){'+declare+' return '+nodeStr+')'+(ifEnd?':null':'')+'},this)';
        }else{
            str = nodeStr+')'+ifEnd;
        }
    }else{
        var tmp = buildTxtStr(raw.txtQ);
        str += '_ct('+tmp+')';
    }

    return str;
}
function buildTxtStr(q){
    var rs = '';
    q.forEach(function(item){
        if(item instanceof Array){
            var exp = item[0];
            var filter = item[1];
            if(filter){
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