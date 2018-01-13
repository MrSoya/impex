/**
 * 内建指令
 */
///////////////////// 视图控制指令 /////////////////////
/**
 * 内联样式指令
 * <br/>使用方式：
 * <div x-style="{'font-size': valExp}" >...</div>
 * <div x-style="{'fontSize': valExp}" >...</div>
 * <div x-style="'color:red;font-size:20px;'" >...</div>
 * <div x-style="obj" >...</div>
 */
impex.directive('style',{
    onBind:function(vnode,data){
        var v = data.value;
        if(isString(v)){
            var rs = {};
            var tmp = v.split(';');
            for(var i=tmp.length;i--;){
                if(!tmp[i])continue;
                var pair = tmp[i].split(':');
                rs[pair[0]] = pair[1];
            }
            v = rs;
        }
        var style = vnode.getAttribute('style')||'';
        for(var k in v){
            var n = this.filterName(k);
            var val = v[k];
            n = n.replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            style += n+':'+val+';';
            // if(val.indexOf('!important')){
            //     val = val.replace(/!important\s*;?$/,'');
            //     n = n.replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            //     style.setProperty(n, v, "important");
            // }else{
            //     style[n] = val;
            // }
        }
        vnode.setAttribute('style',style);
    },
    filterName:function(k){
        return k.replace(/-([a-z])/img,function(a,b){
            return b.toUpperCase();
        });
    }
})
/**
 * 外部样式指令
 * <br/>使用方式：
 * <div x-class="'cls1 cls2 cls3 ...'" >...</div>
 * <div x-class="['cls1','cls2','cls3']" >...</div>
 * <div x-class="{cls1:boolExp,cls2:boolExp,cls3:boolExp}" >...</div>
 */
.directive('class',{
    onBind:function(vnode,data){
        var v = data.value;
        var cls = vnode.getAttribute('class')||'';
        if(isString(v)){
            cls += ' '+v;
        }else if(isArray(v)){
            cls += ' '+ v.join(' ');
        }else{
            for(var k in v){
                var val = v[k];
                if(val)
                    cls += ' '+k;
            }
        }            
        
        vnode.setAttribute('class',cls);
    }
})
/**
 * 绑定视图事件，以参数指定事件类型，用于减少单一事件指令书写
 * <br/>使用方式1：<img x-on:load:mousedown:touchstart="hi()" x-on:dblclick="hello()">
 * <br/>使用方式2：<img :load:mousedown:touchstart="hi()" :dblclick="hello()">
 */
.directive('on',{
    onBind:function(vnode,data){
        var args = data.args;
        for(var i=args.length;i--;){
            vnode.on(args[i],data.value);
        }
    }
})
/**
 * 绑定视图属性，并用表达式的值设置属性
 * <br/>使用方式：<img x-bind:src="exp">
 */
.directive('bind',{
    onBind:function(vnode,data){
        var args = data.args;
        if(!args || args.length < 1){
            warn('at least one attribute be binded');
        }
        for(var i=args.length;i--;){
            var p = args[i];

            switch(p){
                case 'style':
                    DIRECT_MAP[p].onBind(vnode,data);
                    break;
                case 'class':
                    DIRECT_MAP[p].onBind(vnode,data);
                    break;
                default:
                    vnode.setAttribute(p,data.value);
            }//end switch
        }//end for
    }
})
/**
 * 控制视图显示指令，根据表达式计算结果控制
 * <br/>使用方式：<div x-show="exp"></div>
 */
.directive('show',{
    onBind:function(vnode,data){
        var v = data.value;
        var style = vnode.getAttribute('style')||'';
        if(v){
            style += ';display:;'
        }else{
            style += ';display:none;'
        }
        
        vnode.setAttribute('style',style);
    }
})
///////////////////// 模型控制指令 /////////////////////
/**
 * 绑定模型属性，当控件修改值后，模型值也会修改
 * <br/>使用方式：<input x-model="model.prop">
 */
.directive('model',{
    onBind:function(vnode,data){
        // vnode.toNum = vnode.getAttribute('number');
        // vnode.debounce = vnode.getAttribute('debounce')>>0;
        vnode.exp = data.exp;
        vnode.on('change',this.handleChange);
        vnode.on('input',handleInput);
    },
    handleChange:function(e,vnode){
        var el = e.target;
        var tag = el.tagName.toLowerCase();
        var val = el.value;
        switch(tag){
            case 'textarea':
            case 'input':
                var type = el.getAttribute('type');
                switch(type){
                    case 'radio':
                        handleInput(e,vnode,this);
                        break;
                    case 'checkbox':
                        changeModelCheck(e,vnode,this);
                        break;
                }
                break;
            case 'select':
                var mul = el.getAttribute('multiple');
                if(mul !== null){
                    var parts = [];
                    for(var i=el.options.length;i--;){
                        var opt = el.options[i];
                        if(opt.selected){
                            parts.push(opt.value);
                        }
                    }
                    this.setState(vnode.exp,parts);
                }else{
                    handleInput(e,vnode,this);
                }
                
                break;
        }
    }
});

function handleInput(e,vnode,comp){
    var v = (e.target || e.srcElement).value;
    var toNum = vnode.getAttribute('number');
    if(!isUndefined(toNum)){
        v = parseFloat(v);
    }
    var debounce = vnode.getAttribute('debounce');
    if(debounce){
        if(vnode.debounceTimer){
            clearTimeout(vnode.debounceTimer);
            vnode.debounceTimer = null;
        }
        var that = this;
        vnode.debounceTimer = setTimeout(function(){
            clearTimeout(vnode.debounceTimer);
            vnode.debounceTimer = null;
            
            that.setState(vnode.exp,v);
        },debounce);
    }else{
        if(!this){
            comp.setState(vnode.exp,v);
        }else{
            this.setState(vnode.exp,v);
        }
    }
}
function changeModelCheck(e,vnode,comp){
    var t = e.target || e.srcElement;
    var val = t.value;
    var str = 'with(scope){return '+vnode.exp+'}';
    var fn = new Function('scope',str);
    var parts = null;
    if(!this){
        parts = fn(comp.state);
    }else{
        parts = fn(this.state);
    }
    if(!isArray(parts)){
        parts = [parts];
    }
    if(t.checked){
        parts.push(val);
    }else{
        var i = parts.indexOf(val);
        if(i > -1){
            parts.splice(i,1);
        }
    }
}