/**
 * VDOM构建器，用来构建VDOM树
 */
function createElement(rootNode,comp,cls,style,attrs,directs,events,rid,children,html){
    var raw = RNODE_MAP[rid];
    var tag = raw.tag;
    if(tag == ATTR_SLOT_TAG)return;
    
    var rs = new VNode(tag,raw,attrs,directs,events,raw.ref,cls,style);

    var isComp = COMP_MAP[tag] || tag == 'component';
    /**
     * 对组件顶级节点绑定组件原生事件和组件指令
     */
    if(rootNode){
        var cevs = comp._natives;
        if(cevs){
            if(!rs.events)rs.events = {};
            for(var k in cevs){
                rs.events[k] = cevs[k];
            }
        }
        var cdis = comp._directives;
        if(cdis){
            if(!rs.directives)rs.directives = {};
            for(var k in cdis){
                rs.directives[k] = cdis[k];
            }
        }
    }

    if (isComp) {
        rs._comp = true;
        rs._innerHTML = raw.innerHTML;
          
        return rs;
    }
    if(html != null){
        children = html.children || [];
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
function createTemplate(children){
    var rs = [];
    if(children.length>0){
        children.forEach(function(node){
            if(node){
                if(node instanceof Array){
                    node.forEach(function(c){
                        rs.push(c);
                    });
                }else{
                    rs.push(node);
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
function createElementList(ds,iterator,scope){
    var rs = [];
    ds.forEach(function(item,i){
        var tmp = iterator.call(scope,i,item,i);
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
        if(!ins)error(comp.$name,"can not find filter '"+f[0]+"'",null,getStack(comp.$id,f[3],f[2],"filter"));
        //endRemoveIf(production)
        
        if(!ins)continue;
        
        var params = f[1];
        params.unshift(v);
        v = ins.apply(comp,params);
    }
    return v;
}