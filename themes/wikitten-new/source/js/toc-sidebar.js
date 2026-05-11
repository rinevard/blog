$(document).ready(function () {
    function getArticleTopId() {
        const articleTitle = $('.article-title').first();
        if (articleTitle.length === 0) return 'container';

        let articleTopId = articleTitle.attr('id');
        if (!articleTopId) {
            articleTopId = 'article-top';
            articleTitle.attr('id', articleTopId);
        }
        return articleTopId;
    }

    function buildMobileTocList(sourceList) {
        const tocList = sourceList && sourceList.length ? sourceList.clone() : $('<ol class="toc"></ol>');
        if (tocList.find('.toc-link').length === 0) {
            const articleTitle = $('.article-title').first().text().trim() || document.title;
            const topItem = $('<li class="toc-item toc-level-1"></li>');
            const topLink = $('<a class="toc-link"></a>').attr('href', '#' + getArticleTopId()).text(articleTitle);
            tocList.append(topItem.append(topLink));
        }
        return tocList;
    }

    function createMobileTocPanel(title, sourceList) {
        const mobileTocPanel = $('<div class="mobile-toc-panel"></div>');
        const mobileTocHeader = $('<div class="mobile-toc-header"><span>' + title + '</span><button type="button" class="mobile-toc-close" aria-label="关闭文章目录"><i class="fa fa-times"></i></button></div>');
        const mobileTocContent = $('<div class="mobile-toc-content"></div>');
        mobileTocContent.append(buildMobileTocList(sourceList));
        mobileTocPanel.append(mobileTocHeader).append(mobileTocContent);
        $('body').append(mobileTocPanel);
    }

    function bindMobileTocPanel() {
        $('#mobile-toc-open').off('click.mobileToc').on('click.mobileToc', function () {
            $('html').removeClass('mobile-sidebar-open');
            $('html').addClass('mobile-toc-open');
        });

        $('.mobile-toc-close, #mobile-panel-mask').off('click.mobileToc').on('click.mobileToc', function () {
            $('html').removeClass('mobile-toc-open');
        });

        $('.mobile-toc-content .toc-link').off('click.mobileToc').on('click.mobileToc', function (e) {
            e.preventDefault();

            const href = $(this).attr('href');
            if (!href || href.indexOf('#') === -1) return;

            const targetId = decodeURIComponent(href.substring(1));
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                $('html').removeClass('mobile-toc-open');
                $('html, body').animate({
                    scrollTop: Math.max($(targetElement).offset().top - 80, 0)
                }, 300);
            }
        });
    }

    // 检查是否在文章页面，并且文章有目录
    const tocArticle = $('.toc-article');
    if (tocArticle.length === 0) {
        createMobileTocPanel('文章目录', null);
        bindMobileTocPanel();
        return;
    }

    // 创建浮动TOC侧边栏容器
    const tocSidebar = $('<div class="toc-sidebar"></div>');
    const originalTocTitle = tocArticle.find('.toc-title').first().text().trim();
    const originalTocList = tocArticle.find('.toc').first();

    // 获取文章中的所有带ID的标题
    const headings = $('.article-entry').find('h1, h2, h3, h4, h5, h6').filter(function () {
        return $(this).attr('id') !== undefined && $(this).attr('id') !== '';
    });

    if (headings.length === 0) {
        createMobileTocPanel(originalTocTitle || '文章目录', originalTocList);
        bindMobileTocPanel();
        return;
    }

    // 输出调试信息
    console.log(`找到 ${headings.length} 个带ID的标题`);

    // 为每个标题创建横线指示器
    headings.each(function () {
        const tagName = $(this).prop('tagName').toLowerCase();
        const headingId = $(this).attr('id');

        // 创建横线指示器
        const indicator = $(`<div class="toc-sidebar-indicator toc-sidebar-${tagName}" data-target="${headingId}"></div>`);
        tocSidebar.append(indicator);
    });

    // 获取原始目录内容并复制
    const tocContent = $('<div class="toc-sidebar-content"></div>');

    // 添加目录标题
    const tocTitle = $('<div class="toc-title">' + originalTocTitle + '</div>');
    tocContent.append(tocTitle);

    // 复制目录内容
    const tocList = originalTocList.clone();
    tocContent.append(tocList);

    // 添加到浮动TOC侧边栏中
    tocSidebar.append(tocContent);

    // 将浮动TOC侧边栏添加到body
    $('body').append(tocSidebar);

    createMobileTocPanel(originalTocTitle, originalTocList);

    // 处理横线点击事件
    $('.toc-sidebar-indicator').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation(); // 防止事件冒泡触发hover效果

        const targetId = $(this).data('target');
        if (!targetId) return;

        // 使用 document.getElementById 以支持特殊字符的ID，更健壮
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            $('html, body').animate({
                scrollTop: $(targetElement).offset().top - 80
            }, 500);
        }
    });

    // 处理目录链接点击事件
    $('.toc-sidebar-content .toc-link').on('click', function (e) {
        e.preventDefault();

        const href = $(this).attr('href');
        if (!href || href.indexOf('#') === -1) return;

        // 解码URI组件以处理非ASCII字符的ID
        const targetId = decodeURIComponent(href.substring(1));

        // 使用 document.getElementById 以支持特殊字符的ID，更健壮
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            $('html, body').animate({
                scrollTop: $(targetElement).offset().top - 80
            }, 500);
        }
    });

    bindMobileTocPanel();

    // 监听滚动事件，高亮当前标题对应的指示器
    $(window).scroll(function () {
        const scrollTop = $(window).scrollTop();

        // 找到当前可见的标题
        let currentHeadingIndex = -1;
        headings.each(function (index) {
            const headingTop = $(this).offset().top;
            if (headingTop - 120 <= scrollTop) {
                currentHeadingIndex = index;
            }
        });

        if (currentHeadingIndex !== -1) {
            // 移除所有高亮
            $('.toc-sidebar-indicator').removeClass('active');

            // 高亮当前标题的指示器
            const currentId = $(headings[currentHeadingIndex]).attr('id');
            $(`.toc-sidebar-indicator[data-target="${currentId}"]`).addClass('active');

            // 同时高亮目录中的对应链接
            $('.toc-sidebar-content .toc-item').removeClass('active');

            // 遍历所有链接，解码后进行比较，以支持非 ASCII 字符的 ID
            $('.toc-sidebar-content .toc-link').each(function () {
                const link = $(this);
                const href = link.attr('href');
                if (href && href.startsWith('#')) {
                    try {
                        // 解码href以匹配原始ID
                        if (decodeURIComponent(href.substring(1)) === currentId) {
                            link.closest('.toc-item').addClass('active');
                            return false; // 找到匹配项，退出循环
                        }
                    } catch (e) {
                        // 如果解码失败，尝试直接比较（作为后备）
                        if (href.substring(1) === currentId) {
                            link.closest('.toc-item').addClass('active');
                            return false;
                        }
                    }
                }
            });
        }
    });

    // 初始触发滚动事件以设置初始高亮
    $(window).trigger('scroll');
}); 
