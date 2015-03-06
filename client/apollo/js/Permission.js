define([],
       function() {

var Permission = {};
Permission.NONE= 0x0;
Permission.READ= 0x1;
Permission.WRITE= 0x2;
Permission.ADMIN= 0x8;
return Permission;

});
