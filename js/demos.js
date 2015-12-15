window.addEventListener('load',function(){
    if(window.demos){
        
        impex.filter('format',{
            to:function(){
                var tmp = this.$value;
                if(!/^0\./.test(this.$value)){
                    tmp = tmp.replace(/^0\./,'');

                    if(this.$value.length>1){
                        tmp = tmp.replace(/^0/,'');
                    }
                }



                return tmp;
            }
        });

        impex.component('demo-calc',{
            $template:'<div class="calc">\
                            <div class="block-display {{exp.length >9?exp.length >20?\'small-font\':\'normal-font\':\'\'}}">\
                                {{exp => format}}\
                            </div>\
                            <div class="block-buttons">\
                                <div x-each="buttons as btn">\
                                    <button x-click="addExp(btn)">{{btn}}</button>\
                                </div>\
                                <div style="clear: both;"></div>\
                            </div>\
                        </div>',
            buttons:[
                '1','2','3','+',
                '4','5','6','-',
                '7','8','9','*',
                '0','(',')','/',
                '.','←','C','=',
            ],
            exp:'0',
            clear:function () {
                this.exp = '0';
            },
            addExp:function(v){
                switch(v){
                    case 'C':
                        this.clear();
                        return;
                    case '←':
                        if(this.exp.length>1)
                            this.exp = this.exp.substring(0,this.exp.length-1);
                        return;
                    case '=':
                        var v = eval(this.exp.replace(/^0/,''));
                        this.exp = v+'';
                        return;
                    default:
                        this.exp += v;
                }
            }
        });


        if($('div[name="calc"]')){
            window.demos.output = '<demo-calc></demo-calc>'
        }
    }

},false);
