// Apple风格交互效果

document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化轮播，确保所有元素都已加载
    setTimeout(() => {
        initHeroSlideshow();
    }, 500);
    
    // 导航栏滚动效果
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.8)';
        }
    });

    // 卡片悬停效果增强
    const cards = document.querySelectorAll('.feature-card, .course-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// 英雄区域背景轮播功能
function initHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-bg-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    if (slides.length === 0 || indicators.length === 0) {
        return;
    }
    
    let currentSlide = 0;
    let slideInterval;
    
    // 切换到指定幻灯片
    function switchToSlide(index) {
        // 移除所有active类
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // 添加active类到指定元素
        slides[index].classList.add('active');
        indicators[index].classList.add('active');
        
        currentSlide = index;
    }
    
    // 下一张幻灯片
    function nextSlide() {
        const next = (currentSlide + 1) % slides.length;
        switchToSlide(next);
    }
    
    // 开始自动轮播
    function startSlideshow() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 3000); // 每3秒切换一次
    }
    
    // 停止自动轮播
    function stopSlideshow() {
        clearInterval(slideInterval);
    }
    
    // 为每个指示器添加点击事件
    indicators.forEach((indicator, index) => {
        indicator.onclick = function(e) {
            e.preventDefault();
            stopSlideshow();
            switchToSlide(index);
            startSlideshow(); // 重新开始自动轮播
        };
        
        // 确保样式
        indicator.style.cursor = 'pointer';
        indicator.style.pointerEvents = 'auto';
    });
    
    // 鼠标悬停时暂停轮播
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroSection.addEventListener('mouseenter', stopSlideshow);
        heroSection.addEventListener('mouseleave', startSlideshow);
    }
    
    // 页面可见性变化时的处理
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopSlideshow();
        } else {
            startSlideshow();
        }
    });
    
    // 初始化第一张幻灯片并开始轮播
    switchToSlide(0);
    startSlideshow();
}

// 模态框功能
function openModal(courseId) {
    const modal = document.getElementById('courseModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    // 这里应该根据courseId获取课程数据
    // 暂时使用占位符内容
    modalTitle.textContent = `课程 ${courseId}`;
    modalContent.innerHTML = `<p>课程 ${courseId} 的详细内容...</p>`;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('courseModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('courseModal');
    if (event.target === modal) {
        closeModal();
    }
}

// 用户菜单切换功能
function toggleUserMenu(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

// 点击页面其他地方关闭用户菜单
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && dropdown && !userMenu.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// 移动端菜单切换
function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}