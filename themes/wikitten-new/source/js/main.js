(function ($) {
    // 初始化变量
    // Caption
    $('.article-entry').each(function (i) {
        $(this).find('img').each(function () {
            if (this.alt && !(!!$.prototype.justifiedGallery && $(this).parent('.justified-gallery').length)) {
                $(this).after('<span class="caption">' + this.alt + '</span>');
            }

            // 对于已经包含在链接内的图片不适用lightGallery
            if ($(this).parent().prop("tagName") !== 'A') {
                $(this).wrap('<a href="' + this.src + '" title="' + this.alt + '" class="gallery-item"></a>');
            }
        });
    });
    if (lightGallery) {
        var options = {
            selector: '.gallery-item',
        };
        $('.article-entry').each(function (i, entry) {
            lightGallery(entry, options);
        });
        lightGallery($('.article-gallery')[0], options);
    }
    if (!!$.prototype.justifiedGallery) {  // if justifiedGallery method is defined
        var options = {
            rowHeight: 140,
            margins: 4,
            lastRow: 'justify'
        };
        $('.justified-gallery').justifiedGallery(options);
    }

    // Profile card
    $(document).on('click', function () {
        $('#profile').removeClass('card');
    }).on('click', '#profile-anchor', function (e) {
        e.stopPropagation();
        $('#profile').toggleClass('card');
    }).on('click', '.profile-inner', function (e) {
        e.stopPropagation();
    });

    // 回到顶部按钮逻辑已移至layout.ejs中

    // Task lists in markdown
    $('.article-entry ul > li').each(function () {
        var taskList = {
            field: this.textContent.substring(0, 2),
            check: function (str) {
                var re = new RegExp(str);
                return this.field.match(re);
            }
        }
        var string = [/\[ \]/, [/\[x\]/, "checked"]];
        var checked = taskList.check(string[1][0]);
        var unchecked = taskList.check(string[0]);
        var $current = $(this);
        function update(str, check) {
            var click = ["disabled", ""];
            $current.html($current.html().replace(
                str, "<input type='checkbox' " + check + " " + click[1] + " >")
            )
        }
        if (checked || unchecked) {
            this.classList.add("task-list");
            if (checked) {
                update(string[1][0], string[1][1]);
                this.classList.add("check");
            } else {
                update(string[0], "");
            }
        }
    })
    $(document).on('click', 'input[type="checkbox"]', function (event) {
        event.preventDefault();
    });
})(jQuery);
