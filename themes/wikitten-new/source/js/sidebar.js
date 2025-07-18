// 侧边栏状态管理
$(document).ready(function () {
    // 立即初始化侧边栏，因为 js-cookie 已经提前加载
    initSidebar();

    function initSidebar() {
        // 检测是否为移动设备
        var isMobile = window.innerWidth <= 768;

        // 侧边栏切换功能
        $('#sidebar-toggle-btn').click(function () {
            // 切换 <html> 元素的类
            $('html').toggleClass('sidebar-hidden');

            // 根据新的状态设置 cookie
            if ($('html').hasClass('sidebar-hidden')) {
                Cookies.set('sidebarHidden', 'true', { expires: 30 });
            } else {
                Cookies.remove('sidebarHidden');
            }
            // 更新按钮图标
            updateToggleButtonIcon(isMobile);
        });

        // 页面加载时根据 HTML 元素的 class 更新图标
        updateToggleButtonIcon(isMobile);

        // 监听窗口大小变化，更新移动设备状态和图标
        $(window).resize(function () {
            isMobile = window.innerWidth <= 768;
            updateToggleButtonIcon(isMobile);
        });

        // 更新切换按钮图标的函数
        function updateToggleButtonIcon(isMobile) {
            var sidebarHidden = $('html').hasClass('sidebar-hidden');
            if (sidebarHidden) {
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
        }

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