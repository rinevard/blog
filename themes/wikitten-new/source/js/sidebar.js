// 侧边栏状态管理
$(document).ready(function () {
    // 加载js-cookie库
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js.cookie.min.js';
    script.onload = function () {
        initSidebar();
    };
    document.head.appendChild(script);

    function initSidebar() {
        // 检测是否为移动设备
        var isMobile = window.innerWidth <= 768;

        // 侧边栏切换功能
        $('#sidebar-toggle-btn').click(function () {
            $('#sidebar').toggleClass('hidden');
            $('#main').toggleClass('centered');

            // 强制确保文章顶部没有额外空间
            $('.article').css('margin-top', '0');
            $('.article-inner').css('margin-top', '0');
            $('#main').css('padding-top', '0');

            if (isMobile) {
                // 移动设备上的行为
                if ($('#sidebar').hasClass('hidden')) {
                    $(this).html('<i class="fa fa-angle-double-left"></i>');
                    Cookies.set('sidebarHidden', 'true', { expires: 30 });
                } else {
                    $(this).html('<i class="fa fa-angle-double-right"></i>');
                    Cookies.remove('sidebarHidden');
                }
            } else {
                // 桌面设备上的行为
                if ($('#sidebar').hasClass('hidden')) {
                    $(this).html('<i class="fa fa-angle-double-right"></i>');
                    Cookies.set('sidebarHidden', 'true', { expires: 30 });
                } else {
                    $(this).html('<i class="fa fa-angle-double-left"></i>');
                    Cookies.remove('sidebarHidden');
                }
            }
        });

        // 读取 Cookie 设置
        if (Cookies.get('sidebarHidden') === 'true') {
            $('#sidebar').addClass('hidden');
            $('#main').addClass('centered');
            if (isMobile) {
                $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-left"></i>');
            } else {
                $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-right"></i>');
            }
        } else {
            if (isMobile) {
                $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-right"></i>');
            } else {
                $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-left"></i>');
            }
        }

        // 监听窗口大小变化，更新移动设备状态
        $(window).resize(function () {
            isMobile = window.innerWidth <= 768;

            // 更新图标方向
            if (Cookies.get('sidebarHidden') === 'true') {
                if (isMobile) {
                    $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-left"></i>');
                } else {
                    $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-right"></i>');
                }
            } else {
                if (isMobile) {
                    $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-right"></i>');
                } else {
                    $('#sidebar-toggle-btn').html('<i class="fa fa-angle-double-left"></i>');
                }
            }
        });

        // 阻止在侧边栏上滚动时页面跟着滚动
        function preventPageScroll(selector) {
            $(document).on('mouseenter', selector, function () {
                var element = $(this)[0];
                $(this).on('wheel', function (e) {
                    var delta = e.originalEvent.deltaY;
                    var isAtTop = element.scrollTop === 0;
                    var isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

                    if ((delta < 0 && isAtTop) || (delta > 0 && isAtBottom)) {
                        e.preventDefault();
                    }
                });
            }).on('mouseleave', selector, function () {
                $(this).off('wheel');
            });
        }

        // 应用于左侧边栏和右侧TOC
        preventPageScroll('#sidebar .widget');
        preventPageScroll('.toc-sidebar-content');
    }
}); 