impex.filter('formatRMB',function(value){
    var pair = (value+"").split('.');
    var inte = pair[0].replace(/\s/g,'');
    var integer = '';
    var delta = 0;
    for(var i=inte.length;i--;){
        integer = inte[i] + integer;
        delta++;
        if(delta%3==0){
            integer = ','+integer;
            delta = 0;
        }
    }
    return '￥' + integer.replace(/^,/,'');
});

impex.filter('formatDate',function(value){
    var d = new Date();
    d.setTime(value);
    var mon = d.getMonth()+1+'';
    if(mon.length<2)mon = '0'+mon;
    var date = d.getDate()+'';
    if(date.length<2)date = '0'+date;
    return d.getFullYear()+'-'+mon+'-'+date;
});