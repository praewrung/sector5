
jQuery(document).ready(function() {
   // alert("a");
    /*
        Login form validation
    */
    $('.login-form input[type="text"], .login-form input[type="password"], .login-form textarea').on('focus', function() {
    	$(this).removeClass('input-error');
    });

    $('.login-form').on('submit', function(e) {

    	$(this).find('input[type="text"], input[type="password"], textarea').each(function(){
    		if( $(this).val() == "" ) {
    			e.preventDefault();
                //alert("a");
    			$(this).addClass('input-error');
    		}
    		else {
    			$(this).removeClass('input-error');
    		}
    	});

    });

    /*
        Registration form validation
    */
    $('.registration-form input[type="text"], .registration-form input[type="password"]').on('focus', function() {
    	$(this).removeClass('input-error');
    });

    $('.registration-form').on('submit', function(e) {
        console.log("asad");

    	$(this).find('input[type="text"], input[type="password"]').each(function(){
    		if( $(this).val() == "" ) {
    			e.preventDefault();
    			$(this).addClass('input-error');
    		}
    		else {
    			$(this).removeClass('input-error');
    		}
    	});

    });

//    var register = angular.module("myApp", []);
//    register.directive('submit', function(e) {
//
//    	$(this).find('input[type="text"], input[type="password"]').each(function(){
//    		if( $(this).val() == "" ) {
//    			e.preventDefault();
//    			$(this).addClass('input-error');
//    		}
//    		else {
//    			$(this).removeClass('input-error');
//    		}
//    	});
//
//    });

});
