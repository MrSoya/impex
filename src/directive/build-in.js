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
    onUpdate:function(vnode,data) {
        vnode.setAttribute('style',vnode.raw.attributes.style);
        this.onBind(vnode,data);
    },
    onDestroy:function(vnode){
        if(isUndefined(vnode.raw.attributes.style)){
            vnode.removeAttribute('style');
        }else{
            vnode.setAttribute('style',vnode.raw.attributes.style);  
        }
        
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
        var clsAry = cls.trim().replace(/\s+/mg,' ').split(' ');
        var appendCls = null;
        if(isString(v)){
            appendCls = v.split(' ');
        }else if(isArray(v)){
            appendCls = v;
        }else{
            appendCls = [];
            for(var k in v){
                var val = v[k];
                if(val)
                    appendCls.push(k);
            }
        }
        appendCls.forEach(function(c) {
            if(c && clsAry.indexOf(c.trim())<0){
                clsAry.push(c);
            }
        });
        
        vnode.setAttribute('class',clsAry.join(' '));
    },
    onUpdate:function(vnode,data) {
        vnode.setAttribute('class',vnode.raw.attributes.class);
        this.onBind(vnode,data);
    },
    onDestroy:function(vnode,data) {
        if(isUndefined(vnode.raw.attributes.class)){
            vnode.removeAttribute('class');
        }else{
            vnode.setAttribute('class',vnode.raw.attributes.class);   
        }
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
            vnode.on(args[i],data.value,data.filter);
        }
    },
    onDestroy:function(vnode,data){
        var args = data.args;
        for(var i=args.length;i--;){
            vnode.off(args[i]);
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
        for(var i=args.length;i--;){
            var p = args[i];

            switch(p){
                case 'style':
                    DIRECT_MAP[p].onUpdate(vnode,data);
                    break;
                case 'class':
                    DIRECT_MAP[p].onUpdate(vnode,data);
                    break;
                default:
                    vnode.setAttribute(p,data.value);
            }//end switch
        }//end for
    },
    onUpdate:function(vnode,data) {
        this.onBind(vnode,data);
    },
    onDestroy:function(vnode,data) {
        var args = data.args;
        for(var i=args.length;i--;){
            var p = args[i];
            switch(p){
                case 'style':
                    DIRECT_MAP[p].onDestroy(vnode,data);
                    break;
                case 'class':
                    DIRECT_MAP[p].onDestroy(vnode,data);
                    break;
                default:
                    vnode.removeAttribute(p);
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
        var style = vnode.getAttribute('style')||'';
        if(data.value){
            style = style.replace(/;display\s*:\s*none\s*;?/,'');
        }else{
            style = style.replace(/;display:none;/,'') + ';display:none;';
        }
        
        vnode.setAttribute('style',style);
        return style;
    },
    onUpdate:function(vnode,data,dom) {
        var style = this.onBind(vnode,data);
        dom.setAttribute('style',style);
    },
    onDestroy:function(vnode) {
        var style = vnode.getAttribute('style');
        if(!style)return;
        style = style.replace(/;display\s*:\s*none\s*;?/,'');
        vnode.setAttribute('style',style);
    }
})
/**
 * 隐藏视图显示指令，用于屏蔽指定渲染模块
 * <br/>使用方式：
 * <style>
 *     [x-cloak]{
            display: none;
        }
 * </style>
 * <div x-cloak></div>
 */
.directive('cloak',{})
///////////////////// 模型控制指令 /////////////////////
/**
 * 绑定模型属性，当控件修改值后，模型值也会修改
 * <br/>使用方式：<input x-model="model.prop">
 */
.directive('model',{
    onBind:function(vnode,data){
        vnode._exp = data.exp;
        switch(vnode.tag){
            case 'select':
                vnode.on('change',this.handleChange);
                break;
            case 'input':
                var type = vnode.attributes.type;
                if(type == 'radio' || type == 'checkbox'){
                    vnode.on('change',this.handleChange);
                    break;
                }
            default:
                vnode.on('input',handleInput);
        }
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
                    setModel(vnode,parts,this);
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
            
            setModel(vnode,v,that || comp);
        },debounce);
    }else{
        setModel(vnode,v,this || comp);
    }
}
function changeModelCheck(e,vnode,comp){
    var t = e.target || e.srcElement;
    var val = t.value;
    var str = 'with(scope){return '+vnode._exp+'}';
    var fn = new Function('scope',str);
    var parts = null;
    if(!this){
        parts = fn(comp);
    }else{
        parts = fn(this);
    }
    if(isArray(parts)){
        parts = parts.concat();
    }else{
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
    setModel(vnode,parts,comp);
}
function setModel(vnode,value,comp){
    var fn = new Function('comp','v','comp.'+vnode._exp+'= v;');
    fn(comp,value);
}