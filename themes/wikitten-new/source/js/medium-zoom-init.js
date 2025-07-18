// 初始化 Medium Zoom 图片查看
(function () {
    // 当文档准备就绪时初始化
    document.addEventListener('DOMContentLoaded', function () {
        // 确保 mediumZoom 已加载
        if (typeof mediumZoom === 'function') {
            // 首先清理旧的 lightGallery 相关结构
            document.querySelectorAll('.article-entry img').forEach(function (img) {
                // 如果图片被 <a> 标签包裹，而且这个 <a> 标签有 gallery-item 类
                let parent = img.parentNode;
                if (parent.tagName === 'A' && parent.classList.contains('gallery-item')) {
                    // 将图片从链接中提取出来
                    parent.parentNode.insertBefore(img, parent);
                    parent.remove();
                }
            });

            // 选择所有文章内容中的图片
            const zoom = mediumZoom('.article-entry img:not(.no-zoom)', {
                margin: 24,          // 图片与边缘的边距
                background: 'rgba(255, 255, 255, 0.95)', // 稍微透明的白色背景
                scrollOffset: 40,    // 滚动偏移量
            });

            // 为所有可缩放的图片添加样式
            document.querySelectorAll('.article-entry img:not(.no-zoom)').forEach(function (img) {
                // 设置鼠标悬停样式
                img.style.cursor = 'zoom-in';
                img.classList.add('zoom-img');

                // 创建图片容器和可选的图片说明
                const parent = img.parentNode;
                if (parent.tagName !== 'DIV' || !parent.classList.contains('image-container')) {
                    // 创建容器
                    const container = document.createElement('div');
                    container.className = 'image-container';

                    // 获取 alt 属性作为可能的说明文本
                    const altText = img.getAttribute('alt');

                    // 检查是否已有标题元素
                    let captionElement = img.nextElementSibling;
                    let existingCaption = captionElement && captionElement.classList.contains('caption')
                        ? captionElement : null;

                    // 替换图片
                    parent.replaceChild(container, img);
                    container.appendChild(img);

                    // 如果已有标题，移动它到容器中
                    if (existingCaption) {
                        parent.removeChild(existingCaption);
                        container.appendChild(existingCaption);
                    }
                    // 否则，如果有 alt 文本，添加为说明
                    else if (altText && altText.trim() !== '') {
                        const caption = document.createElement('span');
                        caption.className = 'image-caption';
                        caption.textContent = altText;
                        container.appendChild(caption);
                    }
                }
            });

            console.log('Medium Zoom 初始化成功');
        } else {
            console.warn('Medium Zoom 未加载');
        }
    });
})(); 