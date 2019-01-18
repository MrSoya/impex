/**
 * for DOM event delegation，support mouseEvent , touchEvent and pointerEvent
 */
function dispatch(type,e) {
    var p = e.target;
    var canceled = false;
    do{
        var uid = p._vid;
        if(uid === undefined)continue;
        var evMap = EVENT_MAP[type];
        if(!evMap)continue;
        var tmp = evMap[uid];
        if(!tmp)continue;

        var vnode = tmp[0];

        if(type == 'mouseleave'){
            var t = e.target;
            if(!contains(vnode.dom,t))return;
            var toElement = e.toElement || e.relatedTarget;
            if(contains(vnode.dom,toElement))return;
            
            var i = vnodes_mouseEntered.indexOf(vnode);
            if(i>-1)vnodes_mouseEntered.splice(i,1);
        }
        if(type == 'mouseenter'){
            var t = e.target;
            var fromElement = e.relatedTarget;
            if(contains(vnode.dom,t) && vnode.dom != t && vnodes_mouseEntered.indexOf(vnode)>-1)return;
            if(fromElement && contains(vnode.dom,fromElement))return;
            vnodes_mouseEntered.push(vnode);
        }

        var fn = tmp[1];
        var cid = tmp[2];
        var isFn = tmp[3];
        var comp = impex._cs[cid];
        if(isFn){
            fn.call(comp,e,vnode);
        }else{
            var args = [comp,comp.state,e,vnode];
            if(vnode._forScopeQ)
                for(var i=0;i<vnode._forScopeQ.length;i++){
                    args.push(vnode._forScopeQ[i]);
                }
            fn.apply(comp,args);
        }

        canceled = e.cancelBubble;
        
    }while((p = p.parentNode) && p.tagName != 'BODY' && !canceled);
}
function contains(a,b){
    if(a.contains){
        return a.contains(b);
    }
    do{
        if(a == b)return true;
        b = b.parentNode;
    }while(b && b.tagName != 'BODY');
    return false;
}
//scope vars
var vnodes_mouseEntered = [];

//touch/mouse/pointer events
var userAgent = self.navigator.userAgent.toLowerCase();
var isAndroid = userAgent.indexOf('android')>0?true:false;
var isIphone = userAgent.indexOf('iphone')>0?true:false;
var isIpad = userAgent.indexOf('ipad')>0?true:false;
var isWphone = userAgent.indexOf('windows phone')>0?true:false;
var isMobile = isIphone || isIpad || isAndroid || isWphone;
if(isMobile){
    var FLING_INTERVAL = 200;
    var lastTapTime = 0;
    var timer;
    var hasMoved = false;
    var canceled = false;
    var fling_data;
    ///////////////////// touch events /////////////////////
    document.addEventListener('touchstart',doStart,true);
    document.addEventListener('touchmove',doMove,true);
    document.addEventListener('touchend',doEnd,true);
    document.addEventListener('touchcancel',doCancel,true);
    function doStart(e){
        dispatch('touchstart',e);
        dispatch('pointerdown',e);

        //start timer
        timer = setTimeout(function(){
            dispatch('press',e);
        },800);

        hasMoved = false;
        canceled = false;

        //handle fling
        var touch = e.touches[0];
        fling_data = {
            x:touch.clientX,
            y:touch.clientY,
            t:Date.now()
        };
    }
    function doMove(e){
        clearTimeout(timer);

        dispatch('touchmove',e);
        dispatch('pointermove',e);

        hasMoved = true;
    }
    function doCancel(e){
        clearTimeout(timer);

        canceled = true;
        dispatch('touchcancel',e);
        dispatch('pointercancel',e);
    }
    function doEnd(e){
        clearTimeout(timer);
        
        dispatch('touchend',e);
        dispatch('pointerup',e);

        if(canceled)return;

        if(!hasMoved){
            dispatch('tap',e);

            if(Date.now() - lastTapTime < 300){
                dispatch('dbltap',e);
            }

            lastTapTime = Date.now();
        }else{
            var touch = e.changedTouches[0];
            var dx = touch.clientX,
                dy = touch.clientY;

            var data = fling_data;
            var sx = data.x,
                sy = data.y,
                st = data.t;

            var long = Date.now() - st;
            var s = Math.sqrt((dx-sx)*(dx-sx)+(dy-sy)*(dy-sy)) >> 0;
            //时间小于interval并且位移大于20px才触发fling
            if(long <= FLING_INTERVAL && s > 20){
                var r = Math.atan2(dy-sy,dx-sx);

                var extra = {
                    slope:r,
                    interval:long,
                    distance:s
                }

                dispatch('fling',e,extra);
            }
        }
    }
}else{
    ///////////////////// 鼠标事件分派器 /////////////////////
    document.addEventListener('click',doClick,true);
    document.addEventListener('dblclick',doDblClick,true);
    document.addEventListener('mousedown',doMousedown,true);
    document.addEventListener('mousemove',doMousemove,true);
    document.addEventListener('mouseup',doMouseup,true);
    window.addEventListener('blur',doMouseCancel,true);
    var type = self.onmousewheel == null?'mousewheel':'DOMMouseScroll';
    document.addEventListener(type,doMousewheel,true);

    document.addEventListener('mouseout',doMouseout,true);
    document.addEventListener('mouseover',doMouseover,true);

    var inited = true;
    var lastClickTime = 0;
    var timer;

    function doClick(e) {
        dispatch('click',e);
        dispatch('tap',e);
    }

    function doDblClick(e) {
        dispatch('dblclick',e);
        dispatch('dbltap',e);
    }
        
    function doMousedown(e){
        dispatch('mousedown',e);
        dispatch('pointerdown',e);

        //start timer
        timer = setTimeout(function(){
            dispatch('press',e);
        },800);
    }
    function doMousemove(e){
        clearTimeout(timer);

        dispatch('mousemove',e);
        dispatch('pointermove',e);
    }
    function doMouseup(e){
        clearTimeout(timer);

        dispatch('mouseup',e);
        dispatch('pointerup',e);
    }
    function doMouseCancel(e){
        clearTimeout(timer);

        dispatch('pointercancel',e);                
    }
    function doMouseout(e){
        dispatch('mouseout',e);
        dispatch('mouseleave',e);

        //check entered
        var t = e.target;
        var toDel = [];
        vnodes_mouseEntered.forEach(function(vnode) {
            if(!contains(vnode.dom,t))return;
            var toElement = e.toElement || e.relatedTarget;
            if(contains(vnode.dom,toElement))return;
            
            toDel.push(vnode);
        });
        toDel.forEach(function(vnode) {
            var i = vnodes_mouseEntered.indexOf(vnode);
            vnodes_mouseEntered.splice(i,1);
        });
    }
    function doMouseover(e){
        dispatch('mouseover',e);
        dispatch('mouseenter',e);
    }
    function doMousewheel(e){
        dispatch('mousewheel',e);
    }
}

//model events
document.addEventListener('input',function(e){
    dispatch('input',e);
},true);
document.addEventListener('change',function(e){
    dispatch('change',e);
},true);

//keyboard events
document.addEventListener('keydown',function(e){
    dispatch('keydown',e);
},true);
document.addEventListener('keypress',function(e){
    dispatch('keypress',e);
},true);
document.addEventListener('keyup',function(e){
    dispatch('keyup',e);
},true);

//focus events
document.addEventListener('focus',function(e){
    dispatch('focus',e);
},true);
document.addEventListener('blur',function(e){
    dispatch('blur',e);
},true);

//mousewheel
var mousewheel = self.onwheel==null?'wheel':'mousewheel';
document.addEventListener(mousewheel,function(e){
    dispatch('wheel',e);
},true);

//scroll
document.addEventListener('scroll',function(e){
    dispatch('scroll',e);
},true);