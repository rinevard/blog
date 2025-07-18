/**
 * Insight search plugin
 * @author PPOffice { @link https://github.com/ppoffice }
 */
(function ($, CONFIG) {
    var $main = $('.ins-search');
    var $input = $main.find('.ins-search-input');
    var $wrapper = $main.find('.ins-section-wrapper');
    var $container = $main.find('.ins-section-container');
    $main.parent().remove('.ins-search');
    $('body').append($main);

    function section (title) {
        return $('<section>').addClass('ins-section')
            .append($('<header>').addClass('ins-section-header').text(title));
    }

    function searchItem (icon, title, slug, preview, url) {
        return $('<div>').addClass('ins-selectable').addClass('ins-search-item')
            .append($('<header>').append($('<i>').addClass('fa').addClass('fa-' + icon)).append(title != null && title != '' ? title : CONFIG.TRANSLATION['UNTITLED'])
                .append(slug ? $('<span>').addClass('ins-slug').text(slug) : null))
            .append(preview ? $('<p>').addClass('ins-search-preview').html(preview) : null)
            .attr('data-url', url);
    }

    function sectionFactory (keywords, type, array) {
        var sectionTitle;
        var $searchItems;
        var keywordArray = parseKeywords(keywords);
        if (array.length === 0) return null;
        sectionTitle = CONFIG.TRANSLATION[type];
        switch (type) {
            case 'POSTS':
            case 'PAGES':
                $searchItems = array.map(function (item) {
                    var firstOccur = item.firstOccur > 20 ? item.firstOccur - 20 : 0;
                    var preview = "";
                    delete item.firstOccur;
                    keywordArray.forEach(function(keyword){
                        var regS = new RegExp(keyword, "gi");
                        preview = item.text.replace(regS, "<em class=\"search-keyword\"> " + keyword + " </em>");
                    });
                    preview = preview ? preview.slice(firstOccur, firstOccur + 80) : item.text.slice(0, 80);
                    return searchItem('file', item.title, null, preview, CONFIG.ROOT_URL + item.path);
                });
                break;
            case 'CATEGORIES':
            case 'TAGS':
                $searchItems = array.map(function (item) {
                    return searchItem(type === 'CATEGORIES' ? 'folder' : 'tag', item.name, item.slug, null, item.permalink);
                });
                break;
            default:
                return null;
        }
        return section(sectionTitle).append($searchItems);
    }

    function extractToSet (json, key) {
        var values = {};
        var entries = json.pages.concat(json.posts);
        entries.forEach(function (entry) {
            if (entry[key]) {
                entry[key].forEach(function (value) {
                    values[value.name] = value;
                });
            }
        });
        var result = [];
        for (var key in values) {
            result.push(values[key]);
        }
        return result;
    }

    function parseKeywords (keywords) {
        return keywords.split(' ').filter(function (keyword) {
            return !!keyword;
        }).map(function (keyword) {
            return keyword.toUpperCase();
        });
    }

    /**
     * Judge if a given post/page/category/tag contains all of the keywords.
     * @param Object            obj     Object to be weighted
     * @param Array<String>     fields  Object's fields to find matches
     */
    function filter (keywords, obj, fields) {
        var result = false;
        var keywordArray = parseKeywords(keywords);
        var containKeywords = keywordArray.filter(function (keyword) {
            var containFields = fields.filter(function (field) {
                if (!obj.hasOwnProperty(field))
                    return false;
                var firstOccur = obj[field].toUpperCase().indexOf(keyword);
                if (firstOccur > -1) {
                    if (field == "text") obj["firstOccur"] = firstOccur;
                    return true;
                }
            });
            if (containFields.length > 0)
                return true;
            return false;
        });
        return containKeywords.length === keywordArray.length;
    }

    function filterFactory (keywords) {
        return {
            POST: function (obj) {
                return filter(keywords, obj, ['title', 'text']);
            },
            PAGE: function (obj) {
                return filter(keywords, obj, ['title', 'text']);
            },
            CATEGORY: function (obj) {
                return filter(keywords, obj, ['name', 'slug']);
            },
            TAG: function (obj) {
                return filter(keywords, obj, ['name', 'slug']);
            }
        };
    }

    /**
     * Calculate the weight of a matched post/page/category/tag.
     * @param Object            obj     Object to be weighted
     * @param Array<String>     fields  Object's fields to find matches
     * @param Array<Integer>    weights Weight of every field
     */
    function weight (keywords, obj, fields, weights) {
        var value = 0;
        parseKeywords(keywords).forEach(function (keyword) {
            var pattern = new RegExp(keyword, 'img'); // Global, Multi-line, Case-insensitive
            fields.forEach(function (field, index) {
                if (obj.hasOwnProperty(field)) {
                    var matches = obj[field].match(pattern);
                    value += matches ? matches.length * weights[index] : 0;
                }
            });
        });
        return value;
    }

    function weightFactory (keywords) {
        return {
            POST: function (obj) {
                return weight(keywords, obj, ['title', 'text'], [3, 1]);
            },
            PAGE: function (obj) {
                return weight(keywords, obj, ['title', 'text'], [3, 1]);
            },
            CATEGORY: function (obj) {
                return weight(keywords, obj, ['name', 'slug'], [1, 1]);
            },
            TAG: function (obj) {
                return weight(keywords, obj, ['name', 'slug'], [1, 1]);
            }
        };
    }

    function search (json, keywords) {
        var WEIGHTS = weightFactory(keywords);
        var FILTERS = filterFactory(keywords);
        var posts = json.posts;
        var pages = json.pages;
        var tags = extractToSet(json, 'tags');
        var categories = extractToSet(json, 'categories');
        return {
            posts: posts.filter(FILTERS.POST).sort(function (a, b) { return WEIGHTS.POST(b) - WEIGHTS.POST(a); }),
            pages: pages.filter(FILTERS.PAGE).sort(function (a, b) { return WEIGHTS.PAGE(b) - WEIGHTS.PAGE(a); }),
            categories: categories.filter(FILTERS.CATEGORY).sort(function (a, b) { return WEIGHTS.CATEGORY(b) - WEIGHTS.CATEGORY(a); }),
            tags: tags.filter(FILTERS.TAG).sort(function (a, b) { return WEIGHTS.TAG(b) - WEIGHTS.TAG(a); })
        };
    }

    function searchResultToDOM (keywords, searchResult) {
        $container.empty();
        for (var key in searchResult) {
            $container.append(sectionFactory(keywords, key.toUpperCase(), searchResult[key]));
        }
    }

    function scrollTo ($item) {
        if ($item.length === 0) return;
        var wrapperHeight = $wrapper[0].clientHeight;
        var itemTop = $item.position().top - $wrapper.scrollTop();
        var itemBottom = $item[0].clientHeight + $item.position().top;
        if (itemBottom > wrapperHeight + $wrapper.scrollTop()) {
            $wrapper.scrollTop(itemBottom - $wrapper[0].clientHeight);
        }
        if (itemTop < 0) {
            $wrapper.scrollTop($item.position().top);
        }
    }

    function selectItemByDiff (value) {
        var $items = $.makeArray($container.find('.ins-selectable'));
        var prevPosition = -1;
        $items.forEach(function (item, index) {
            if ($(item).hasClass('active')) {
                prevPosition = index;
                return;
            }
        });
        var nextPosition = ($items.length + prevPosition + value) % $items.length;
        $($items[prevPosition]).removeClass('active');
        $($items[nextPosition]).addClass('active');
        scrollTo($($items[nextPosition]));
    }

    function gotoLink ($item) {
        if ($item && $item.length) {
            location.href = $item.attr('data-url');
        }
    }

    $.getJSON(CONFIG.CONTENT_URL, function (json) {
        if (location.hash.trim() === '#ins-search') {
            $main.addClass('show');
        }
        $input.on('input', function () {
            var keywords = $(this).val();
            searchResultToDOM(keywords, search(json, keywords));
        });
        $input.trigger('input');
    });


    $(document).on('click focus', '.search-form-input', function () {
        $main.addClass('show');
        $main.find('.ins-search-input').focus();
    }).on('click', '.ins-search-item', function () {
        gotoLink($(this));
    }).on('click', '.ins-close', function () {
        $main.removeClass('show');
    }).on('keydown', function (e) {
        if (!$main.hasClass('show')) return;
        switch (e.keyCode) {
            case 27: // ESC
                $main.removeClass('show'); break;
            case 38: // UP
                selectItemByDiff(-1); break;
            case 40: // DOWN
                selectItemByDiff(1); break;
            case 13: //ENTER
                gotoLink($container.find('.ins-selectable.active').eq(0)); break;
        }
    });
    
    // 添加点击搜索框外部区域关闭搜索框的功能
    $(document).on('click', '.ins-search-mask', function(e) {
        if ($(e.target).hasClass('ins-search-mask')) {
            $main.removeClass('show');
        }
    });
})(jQuery, window.INSIGHT_CONFIG);