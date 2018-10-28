impex.filter('json',function(v){
    return JSON.stringify(v);
})

//filterBy:'xxx'
//filterBy:'xxx':'name'
//filterBy:filter
.filter('filterBy',function(v,key,inName){
    var ary = v;
    if(!isArray(ary)){
        return v;
    }
    var rs = [];
    if(isFunction(key)){
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
})

//[1,2,3,4,5] => limitBy:3:1   ----> [2,3,4]
.filter('limitBy',function(v,count,start){
    if(!isArray(v)){
        return v;
    }
    v = v.concat();
    if(!count)return v;
    return v.splice(start||0,count);
})

//[1,2,3,4,5] => orderBy:'':'desc'   ----> [5,4,3,2,1]
.filter('orderBy',function(v,key,dir){
    if(!key && !dir)return v;
    if(!isArray(v)){
        return v;
    }
    v = v.concat();
    v.sort(function(a,b){
        var x = key?a[key]:a,
            y = key?b[key]:b;

        if(typeof x === "string"){
            return x.localeCompare(y);
        }else if(typeof x === "number"){
            return x - y;
        }else{
            return (x+'').localeCompare(y);
        }
    });
    if(dir === 'desc'){
        v.reverse();
    }
    return v;
});