/**
 * 内建过滤器，提供基础操作接口
 */
impex.converter('html',{
    $html:true,
    to:function(){
        return this.$value;
    }
});