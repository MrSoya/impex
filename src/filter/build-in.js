impex.filter('json',{
    to:function(){
        return JSON.stringify(this.$value);
    }
})

//filterBy:'xxx'
//filterBy:'xxx':'name'
//filterBy:filter
.filter('filterBy',{
    to:function(key,inName){
        var ary = this.$value;
        if(!(ary instanceof Array)){
            LOGGER.warn('can only filter array');
            return this.$value;
        }
        var rs = [];
        if(key instanceof Function){
            for(var i=ary.length;i--;){
                var need = key.call(this,ary[i]);
                if(need){
                    rs.unshift(ary[i]);
                }
            }
        }else{
            for(var i=ary.length;i--;){
                var item = ary[i];
                if(inName){
                    if(!key || (item[inName]+'').indexOf(key) > -1){
                        rs.unshift(item);
                    }
                }else{
                    if(!key || item.indexOf && item.indexOf(key) > -1){
                        rs.unshift(item);
                    }
                }
            }
        }
        return rs;
    }
})

//[1,2,3,4,5] => limitBy:3:1   ----> [2,3,4]
.filter('limitBy',{
    to:function(count,start){
        if(!(this.$value instanceof Array)){
            LOGGER.warn('can only filter array');
            return this.$value;
        }
        if(!count)return this.$value;
        return this.$value.splice(start||0,count);
    }
})

//[1,2,3,4,5] => orderBy:'':'desc'   ----> [5,4,3,2,1]
.filter('orderBy',{
    to:function(key,dir){
        if(!(this.$value instanceof Array)){
            LOGGER.warn('can only filter array');
            return this.$value;
        }
        this.$value.sort(function(a,b){
            var x = key?a[key]:a,
                y = key?b[key]:b;

            return (x+'').localeCompare(y+'');
        });
        if(dir === 'desc'){
            this.$value.reverse();
        }
        return this.$value;
    }
});