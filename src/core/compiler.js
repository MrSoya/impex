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
    if(VDOM_CACHE[comp.$name] && !comp._slotted){
        return VDOM_CACHE[comp.$name];
    }

    var compiled = compileVDOMStr(str,comp);

    var scopeStart= '';
    var scopeEnd= '';
    var p = comp;
    var i = 0;
    var argAry = [];
    while(p){
        var compName = 'comp'+ i++;
        argAry.unshift(compName);
        scopeStart = 'with('+compName+'){'+scopeStart;
        scopeEnd += '}';
        p = p.$parent;
    }
    argAry.push('_ce','_tmp','_ct','_li','_fi','_cs');

    var rs = scopeStart+'return '+compiled+scopeEnd;
    rs = new Function(argAry.join(','),rs);

    if(comp.$name == 'ROOT' || !comp._slotted){
        VDOM_CACHE[comp.$name] = rs;
    }

    return rs;
}
function compileVDOMStr(str,comp,isHTML){

    var roots = parseHTML(str);

    //removeIf(production)
    assert(roots.length==1,comp.$name,XERROR.COMPILE.ONEROOT,"should only have one root in your template");
    //endRemoveIf(production)
    
    var rs = roots[0];

    //removeIf(production)
    assert(rs.tag && rs.tag != 'template' && rs.tag != 'slot' && !rs.for,comp.$name,XERROR.COMPILE.ROOTTAG,"root element cannot be <template> or <slot>");
    assert(!COMP_MAP[rs.tag],comp.$name,XERROR.COMPILE.ROOTCOMPONENT,"root element <"+rs.tag+"> should be a non-component tag");
    //endRemoveIf(production)
    
    var str = buildEvalStr(comp,rs,!isHTML);
    return str;
}

var FORSCOPE_COUNT = 0;
var RNODE_MAP = {};
function buildEvalStr(comp,raw,root){
    var str = '';
    if(raw.tag){
        var children = '';
        RNODE_MAP[raw.rid] = raw;
        var attrs = '';
        var attrsDebug = '';
        for(var k in raw.attrs){
            //removeIf(production)
            attrsDebug += 'try{'+raw.attrs[k]
            +'}catch(e){impex._$error("'+comp.$name+'","",e,impex._$getStack("'+comp.$id+'","'+raw.rid+'","'+k+'","attrs"))}';
            //endRemoveIf(production)
            
            attrs += ','+k+':'+raw.attrs[k];
        }
        attrs = '{'+attrs.substr(1)+'}';
        //removeIf(production)
        attrs = '(function(){'+attrsDebug+';return '+attrs+'}).call(this)';
        //endRemoveIf(production)
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
            //removeIf(production)
            ifStr = '(function(){try{return '+ifStr+'}catch(e){impex._$error("'+comp.$name+'","",e,impex._$getStack("'+comp.$id+'","'+raw.rid+'","'+(raw.if?'if':'else-if')+'","directs"))}}).call(this)';
            //endRemoveIf(production)
            ifStart = '('+ifStr+')?';
            ifEnd = ':';
        }

        //指令
        var diStr = '';
        var diDebug = '';
        for(var k in raw.directives){
            var di = raw.directives[k];
            var tmp = JSON.stringify(di);
            tmp = tmp.substr(0,tmp.length - 1) + ',value:'+di.exp+'}';

            //removeIf(production)
            diDebug += 'try{'+di.exp+'}catch(e){impex._$error("'+comp.$name+'","",e,impex._$getStack("'+comp.$id+'","'+raw.rid+'","'+k+'","directs"))}';
            //endRemoveIf(production)

            diStr += ','+k+':'+tmp;
        }
        diStr = diStr?'{'+diStr.substr(1)+'}':undefined;
        //removeIf(production)
        diStr = '(function(){'+diDebug+';return '+diStr+'}).call(this)';
        //endRemoveIf(production)

        //事件
        var events = '';
        var eventsDebug = '';
        for(var k in raw.events){
            var ev = raw.events[k];
            var tmp = JSON.stringify(ev);
            var modifiers = ev.modifiers;
            var isNative = modifiers && modifiers.indexOf(EVENT_MODIFIER_NATIVE)>-1;
            var exp = ev.exp.trim();
            //是否为变量名
            var isVar = /^[$_a-z][$_a-z0-9]*$/i.test(exp);
            var val;
            var cName = null;
            //组件自定义事件无论是否写了参数，都以实际触发时的参数为准
            if(raw.isComp && !isNative){
                if(isVar){
                    //removeIf(production)
                    exp = '(function(){try{return '+exp+'}catch(e){impex._$error("'+comp.$name+'","",e,impex._$getStack("'+comp.$id+'","'+raw.rid+'","'+k+'","events"))}}).call(this)';
                    //endRemoveIf(production)
                    val = exp;
                }else{
                    //removeIf(production)
                    exp = 'try{'+exp+'}catch(e){impex._$error("'+comp.$name+'","",e,impex._$getStack("'+comp.$id+'","'+raw.rid+'","'+k+'","events"))}';
                    //endRemoveIf(production)
                    val = 'function(){'+exp+'}';
                }
            }else{
                if(raw.isComp && isNative){
                    cName = k + Date.now();
                }
                if(isVar){
                    exp += '()';
                }
                //removeIf(production)
                exp = 'try{'+exp+'}catch(e){impex._$error("'+comp.$name+'","",e,impex._$getStack("'+comp.$id+'","'+raw.rid+'","'+k+'","events"))}';
                //endRemoveIf(production)
                val = 'function($event,$vnode){ '+exp+'}';
            }

            tmp = tmp.substr(0,tmp.length - 1) + ',value:'+val+ ',cName:"'+cName+'"}';
            events += ','+k+':'+tmp;
        }
        events = events?'{'+events.substr(1)+'}':undefined;

        //html
        var html = 'null';
        if(raw.html){
            html = "eval(_cs('<"+raw.tag+">'+("+raw.html+")+'</"+raw.tag+">',this,true))";
            //removeIf(production)
            html = '(function(){try{return '+html+'}catch(e){impex._$error("'+comp.$name+'","",e,impex._$getStack("'+comp.$id+'","'+raw.rid+'","html","directs"))}}).call(this)';
            //endRemoveIf(production)
        }

        var nodeStr = '_ce('+root+',this,'+(raw.class||undefined)+','+(raw.style||undefined)+','+attrs+','+diStr+','+events+',"'+raw.rid+'",['+children+'],'+html;
        if(raw.tag == 'template'){
            nodeStr = '_tmp(['+children+']';
        }
        nodeStr = ifStart + nodeStr;
        //removeIf(production)
        if(raw.for && !raw.for[1]){
            error(comp.$name,"invalid x-for expression",null,getStack(comp.$id,raw.rid,'for',"directs"));
        }
        //endRemoveIf(production)
        if(raw.for && raw.for[1]){
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
                dsStr = "_fi("+dsStr+","+buildFilterStr(filters)+",this)";
            }
            str = '_li('+dsStr+',function($index,'+v+k+'){'+declare+' return '+nodeStr+')'+(ifEnd?':null':'')+'},this)';
        }else{
            str = nodeStr+')'+ifEnd;
        }
    }else{
        var tmp = buildTxtStr(raw.txtQ,comp.$name,comp.$id,raw.rid);
        str += '_ct('+tmp+')';
    }

    return str;
}
function buildTxtStr(q,cname,cid,rid){
    var rs = '';
    q.forEach(function(item){
        if(item instanceof Array){
            var exp = item[0];
            var filter = item[1];
            var evalStr = '';
            if(filter){
                evalStr = "+_fi("+exp+","+buildFilterStr(filter)+",this)";
            }else{
                evalStr = "+("+exp+")";
            }
            //removeIf(production)
            evalStr = '+(function(){try{return ""'+evalStr+'}catch(e){impex._$error("'+cname+'","txt",e,impex._$getStack("'+cid+'","'+rid+'","'+exp+'","txt"))}}).call(this)';
            //endRemoveIf(production)
            rs += evalStr;
        }else if(item){
            rs += "+" + JSON.stringify(item);
        }
    });
    rs = rs.replace(/\n/mg,'');
    if(rs.length>0)rs = rs.substr(1);
    return rs;
}
function buildFilterStr(filters){
    var rs = '';
    filters.forEach(function(f){
        var tmp = '["'+f.name+'",['+f.param.toString()+'],"'+f.id+'","'+f.rid+'"]';
        rs += ','+tmp;
    });
    return '['+rs.substr(1)+']';
}