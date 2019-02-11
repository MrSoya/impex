impex.component("x-wish",{
    template:`
    <div .class="{show:show}" class="x-wish" @tap="open()">
            <div class="progress" .style="{width:progress+'%'}"></div>
            <span class="title">
                {{title}}
            </span>
            <span class="cost">{{cost=>formatRMB}}</span>
            <div class="done" x-if="done">已在 {{time => formatDate}} 达成</div>
            <ul class="target">
                <li x-for="1 to 5 as i" .class="{passed:i*2*10<=progress}" @tap="setProgress(i*2*10)">{{i*2*10}}%</li>
            </ul>
        </div>`,
    state:{
        progress:0,
        show:false,
        time:'',
        done:false
    },
    input:{
        title:{
            type:'string',
            require:true
        },
        cost:{
            type:'number',
            require:true
        }
    },
    setProgress : function(prog){
        this.progress = prog;
        if(prog == 100){
            this.emit('done',this.id);
        }
        this.emit('progress',this.id,prog);
    },
    open:function() {
        if(this.done)return;

        var lastShow = this.$root.showWish;
        this.$root.showWish = this;
        if(lastShow == this){
            if(this.show){
                this.show = false;
                this.close();
            }else{
                this.show = true;
            }
            return ;
        }
        this.show = true;
        if(lastShow && lastShow.$id)lastShow.close();
    },
    close:function() {
        this.show = false;
    }
});