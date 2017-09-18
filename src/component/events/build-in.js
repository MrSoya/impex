/**
 * 内建分派器
 */
!function(impex){
    var userAgent = self.navigator.userAgent.toLowerCase();

    var isAndroid = userAgent.indexOf('android')>0?true:false;
    var isIphone = userAgent.indexOf('iphone')>0?true:false;
    var isIpad = userAgent.indexOf('ipad')>0?true:false;
    var isWphone = userAgent.indexOf('windows phone')>0?true:false;

    var isMobile = isIphone || isIpad || isAndroid || isWphone;
    if(isMobile){
        ///////////////////// 触摸事件分派器 /////////////////////
        var touchDispatcher = new Dispatcher({
            onInit:function() {
                if(this.inited)return;

                document.addEventListener('touchstart',this.doStart.bind(this),true);
                document.addEventListener('touchmove',this.doMove.bind(this),true);
                document.addEventListener('touchend',this.doEnd.bind(this),true);
                document.addEventListener('touchcancel',this.doCancel.bind(this),true);

                this.inited = true;
                this.lastTapTime = 0;

                this.FLING_INTERVAL = 200;
            },
            doStart:function(e){
                this.dispatch('touchstart',e);
                this.dispatch('pointerdown',e);

                //start timer
                var that = this;
                this.timer = setTimeout(function(){
                    that.dispatch('press',e);
                },800);

                this.hasMoved = false;
                this.canceled = false;

                //handle fling
                var touch = e.touches[0];
                this.fling_data = {
                    x:touch.clientX,
                    y:touch.clientY,
                    t:Date.now()
                };
            },
            doMove:function(e){
                clearTimeout(this.timer);

                this.dispatch('touchmove',e);
                this.dispatch('pointermove',e);

                this.hasMoved = true;
            },
            doCancel:function(e){
                clearTimeout(this.timer);

                this.canceled = true;
                this.dispatch('touchcancel',e);
                this.dispatch('pointercancel',e);
            },
            doEnd:function(e){
                clearTimeout(this.timer);
                
                this.dispatch('touchend',e);
                this.dispatch('pointerup',e);

                if(this.canceled)return;

                if(!this.hasMoved){
                    this.dispatch('tap',e);

                    if(Date.now() - this.lastTapTime < 300){
                        this.dispatch('dbltap',e);
                    }

                    this.lastTapTime = Date.now();
                }else{
                    var touch = e.changedTouches[0];
                    var dx = touch.clientX,
                        dy = touch.clientY;

                    var data = this.fling_data;
                    var sx = data.x,
                        sy = data.y,
                        st = data.t;

                    var long = Date.now() - st;
                    var s = Math.sqrt((dx-sx)*(dx-sx)+(dy-sy)*(dy-sy)) >> 0;
                    //时间小于interval并且位移大于20px才触发fling
                    if(long <= this.FLING_INTERVAL && s > 20){
                        var r = Math.atan2(dy-sy,dx-sx);

                        var extra = {
                            slope:r,
                            interval:long,
                            distance:s
                        }

                        this.dispatch('fling',e,extra);
                    }
                }
            }
        });
        impex.events.
        registerDispatcher(
            'touchstart touchend touchcancel touchmove fling'+
            'pointerdown pointerup pointermove pointercancel press tap dbltap',touchDispatcher);
    }else{
        ///////////////////// 鼠标事件分派器 /////////////////////
        var mouseDispatcher = new Dispatcher({
            listeningEventMap:{},
            onInit:function() {
                if(this.inited)return;

                document.addEventListener('mousedown',this.doMousedown.bind(this),true);
                document.addEventListener('mousemove',this.doMousemove.bind(this),true);
                document.addEventListener('mouseup',this.doMouseup.bind(this),true);
                window.addEventListener('blur',this.doMouseCancel.bind(this),true);
                var type = document.body.onmousewheel == null?'mousewheel':'DOMMouseScroll';
                document.addEventListener(type,this.doMousewheel.bind(this),true);

                document.addEventListener('mouseout',this.doMouseout.bind(this),true);

                this.inited = true;
                this.lastClickTime = 0;
            },
            doMousedown:function(e){
                this.dispatch('mousedown',e);
                this.dispatch('pointerdown',e);

                //start timer
                var that = this;
                this.timer = setTimeout(function(){
                    that.dispatch('press',e);
                },800);
            },
            doMousemove:function(e){
                clearTimeout(this.timer);

                this.dispatch('mousemove',e);
                this.dispatch('pointermove',e);
            },
            doMouseup:function(e){
                clearTimeout(this.timer);

                this.dispatch('mouseup',e);
                this.dispatch('pointerup',e);

                if(e.button === 0){
                    this.dispatch('click',e);
                    this.dispatch('tap',e);
                    if(Date.now() - this.lastClickTime < 300){
                        this.dispatch('dblclick',e);
                        this.dispatch('dbltap',e);
                    }

                    this.lastClickTime = Date.now();
                }
            },
            doMouseCancel:function(e){
                clearTimeout(this.timer);

                this.dispatch('pointercancel',e);                
            },
            doMouseout:function(e){
                this.dispatch('mouseout',e);

                //check leave
                var t = e.target;
                var events = this.__eventMap['mouseleave'];
                if(!events)return;
                
                do{
                    if(this.fireMouseleave(t,events,e) === false){
                        break;
                    }

                    t = t.parentNode;
                }while(t.tagName && t.tagName != 'HTML');
            },
            fireMouseleave:function(t,events,e){
                for(var i=events.length;i--;){
                    if(events[i].el === t){
                        break;
                    }
                }
                if(i < 0)return;

                var currentTarget = t;
                var target = e.target;

                if(!this.contains(currentTarget,target))return;

                var toElement = e.toElement || e.relatedTarget;
                if(this.contains(currentTarget,toElement))return;
                
                return this.fireEvent(t,events,e,'mouseleave');
            },
            contains:function(a,b){
                if(a.contains){
                    return a.contains(b);
                }
                do{
                    if(a == b)return true;
                    b = b.parentNode;
                }while(b && b.tagName != 'BODY');
                return false;
            },
            doMousewheel:function(e){
                this.dispatch('mousewheel',e);
            }
        });

        impex.events.
        registerDispatcher(
            'mousedown mouseup click dblclick mousemove mousewheel mouseout mouseleave'+
            'pointerdown pointerup pointermove pointercancel press tap dbltap',mouseDispatcher);

    }
    
    
}(impex);