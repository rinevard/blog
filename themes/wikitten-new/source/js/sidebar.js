// 侧边栏状态管理
$(document).ready(function() {
    // 加载js-cookie库
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js.cookie.min.js';
    script.onload = function() {
        initSidebar();
    };
    document.head.appendChild(script);

    function initSidebar() {
        // 侧边栏切换功能
        $('#sidebar-toggle-btn').click(function() {
            $('#sidebar').toggleClass('hidden');
            $('#main').toggleClass('centered');
            
            // 强制确保文章顶部没有额外空间
            $('.article').css('margin-top', '0');
            $('.article-inner').css('margin-top', '0');
            $('#main').css('padding-top', '0');
            
            if ($('#sidebar').hasClass('hidden')) {
                $(this).html('<i class="fa fa-angle-double-right"></i>');
                Cookies.set('sidebarHidden', 'true', { expires: 30 });
            } else {
                $(this).html('<i class="fa fa-angle-double-left"></i>');
                Cookies.remove('sidebarHidden');
            }
        });
        
        // 读取 Cookie 设置
        if (Cookies.get('sidebarHidden') === 'true') {
            $('#sidebar').addClass('hidden');
            $('#main').addClass('centered');
            $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-right"></i>');
        } else {
            $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-left"></i>');
        }
        
        // 无论侧边栏状态如何，确保文章顶部没有额外空间
        $('.article').css('margin-top', '0');
        $('.article-inner').css('margin-top', '0');
        $('#main').css('padding-top', '0');
    }
}); 