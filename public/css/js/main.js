(function() {
    'use strict';

    const Utils = {
        debounce: function(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func(...args), wait);
            };
        },
        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) { func.apply(this, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); }
            };
        },
        safeJSONParse: function(str, fallback = null) {
            try { return JSON.parse(str); } catch { return fallback; }
        },
        formatNumber: function(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        },
        showToast: function(message, type = 'info', duration = 4000) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const icons = { success: 'bi-check-circle-fill', danger: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
            const toast = document.createElement('div');
            toast.className = `toast align-items-center text-white bg-${type} border-0 show mb-2`;
            toast.style.minWidth = '280px';
            toast.innerHTML = `<div class="d-flex align-items-center p-3"><i class="bi ${icons[type]} me-2 fs-5"></i><div class="toast-body fw-medium">${message}</div><button type="button" class="btn-close btn-close-white ms-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
            container.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
        },
        fetchJSON: async function(url, options = {}) {
            try {
                const response = await fetch(url, { headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', ...options });
                if (response.status === 401) { Utils.showToast('Please sign in', 'warning'); setTimeout(() => window.location.href = '/user/signin', 1500); return null; }
                if (!response.ok) { const error = await response.json().catch(() => ({ message: 'Error' })); throw new Error(error.message); }
                return await response.json();
            } catch (err) { Utils.showToast(err.message || 'Network error', 'danger'); return null; }
        }
    };

    const ThemeManager = {
        init: function() {
            const toggle = document.getElementById('themeToggle');
            if (!toggle) return;
            const saved = localStorage.getItem('blogify-theme') || 'light';
            this.apply(saved);
            toggle.addEventListener('click', () => {
                const current = document.body.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                this.apply(next);
                localStorage.setItem('blogify-theme', next);
            });
        },
        apply: function(theme) {
            document.body.setAttribute('data-theme', theme);
            const icon = document.getElementById('themeIcon');
            if (icon) icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
        }
    };

    const NavbarScroll = {
        init: function() {
            const navbar = document.getElementById('mainNavbar');
            if (!navbar) return;
            window.addEventListener('scroll', Utils.throttle(() => {
                navbar.classList.toggle('scrolled', window.scrollY > 10);
            }, 100));
        }
    };

    const SearchManager = {
        init: function() {
            const input = document.querySelector('.search-box input');
            if (!input) return;
            input.addEventListener('input', Utils.debounce(function() {
                if (this.value.trim().length > 2) this.closest('form').submit();
            }, 500));
            document.addEventListener('keydown', (e) => {
                if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault(); input.focus();
                }
            });
        }
    };

    const LikeSystem = {
        init: function() {
            document.querySelectorAll('.like-btn').forEach(btn => {
                if (btn.dataset.initialized) return;
                btn.dataset.initialized = 'true';
                btn.addEventListener('click', async function(e) {
                    e.preventDefault(); e.stopPropagation();
                    const blogId = this.dataset.blogId;
                    if (!blogId || this.dataset.processing === 'true') return;
                    this.dataset.processing = 'true';
                    const icon = this.querySelector('i');
                    const countSpan = this.querySelector('span');
                    this.classList.toggle('liked');
                    if (icon) { icon.classList.toggle('bi-heart'); icon.classList.toggle('bi-heart-fill'); }
                    try {
                        const data = await Utils.fetchJSON(`/blogs/${blogId}/like`, { method: 'POST' });
                        if (data) {
                            if (countSpan) countSpan.textContent = Utils.formatNumber(data.likes || 0);
                            document.querySelectorAll(`[data-blog-id="${blogId}"]`).forEach(other => {
                                if (other !== this) {
                                    other.classList.toggle('liked', this.classList.contains('liked'));
                                    const oi = other.querySelector('i');
                                    if (oi) { oi.classList.toggle('bi-heart', !this.classList.contains('liked')); oi.classList.toggle('bi-heart-fill', this.classList.contains('liked')); }
                                    const oc = other.querySelector('span');
                                    if (oc) oc.textContent = Utils.formatNumber(data.likes || 0);
                                }
                            });
                        } else {
                            this.classList.toggle('liked');
                            if (icon) { icon.classList.toggle('bi-heart'); icon.classList.toggle('bi-heart-fill'); }
                        }
                    } finally { this.dataset.processing = 'false'; }
                });
            });
        }
    };

    const FollowSystem = {
        init: function() {
            document.querySelectorAll('.follow-btn').forEach(btn => {
                if (btn.dataset.initialized) return;
                btn.dataset.initialized = 'true';
                btn.addEventListener('click', async function() {
                    const userId = this.dataset.userId;
                    if (!userId) return;
                    this.disabled = true;
                    const isFollowing = this.classList.contains('btn-primary');
                    const data = await Utils.fetchJSON(`/follow/${userId}/follow`, { method: 'POST' });
                    if (data) {
                        this.classList.toggle('btn-primary'); this.classList.toggle('btn-outline-primary');
                        this.innerHTML = isFollowing ? '<i class="bi bi-person-plus me-1"></i> Follow' : '<i class="bi bi-person-check-fill me-1"></i> Following';
                        Utils.showToast(isFollowing ? 'Unfollowed' : 'Now following!', 'success');
                    }
                    this.disabled = false;
                });
            });
        }
    };

    const NotificationSystem = {
        init: function() {
            this.fetchCount();
            setInterval(() => this.fetchCount(), 30000);
        },
        fetchCount: async function() {
            const badge = document.getElementById('notifBadge');
            if (!badge) return;
            try {
                const res = await fetch('/notifications/unread/count', { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' });
                if (res.ok) {
                    const data = await res.json();
                    const count = data.count || 0;
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.toggle('d-none', count === 0);
                }
            } catch {}
        }
    };

    const BookmarkSystem = {
        init: function() {
            const btn = document.getElementById('bookmarkBtn');
            if (!btn) return;
            const blogId = btn.dataset.blogId || window.location.pathname.split('/').pop();
            const bookmarks = Utils.safeJSONParse(localStorage.getItem('blogify-bookmarks'), []);
            if (bookmarks.includes(blogId)) {
                const icon = btn.querySelector('i');
                icon.classList.remove('bi-bookmark'); icon.classList.add('bi-bookmark-fill');
            }
            btn.addEventListener('click', function() {
                const icon = this.querySelector('i');
                const isSaved = icon.classList.contains('bi-bookmark-fill');
                let bookmarks = Utils.safeJSONParse(localStorage.getItem('blogify-bookmarks'), []);
                if (isSaved) {
                    bookmarks = bookmarks.filter(id => id !== blogId);
                    Utils.showToast('Removed from bookmarks', 'info');
                } else {
                    bookmarks.push(blogId);
                    Utils.showToast('Saved to bookmarks', 'success');
                }
                icon.classList.toggle('bi-bookmark'); icon.classList.toggle('bi-bookmark-fill');
                localStorage.setItem('blogify-bookmarks', JSON.stringify(bookmarks));
            });
        }
    };

    const FormValidation = {
        init: function() {
            document.querySelectorAll('form[data-validate]').forEach(form => {
                form.addEventListener('submit', function(e) {
                    let valid = true;
                    this.querySelectorAll('[required]').forEach(field => {
                        if (!field.value.trim()) {
                            valid = false; field.classList.add('is-invalid');
                            field.addEventListener('input', () => field.classList.remove('is-invalid'), { once: true });
                        }
                    });
                    if (!valid) { e.preventDefault(); Utils.showToast('Fill all required fields', 'warning'); }
                });
            });
        }
    };

    const SmoothScroll = {
        init: function() {
            document.querySelectorAll('a[href^="#"]').forEach(a => {
                a.addEventListener('click', function(e) {
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                });
            });
        }
    };

    function init() {
        ThemeManager.init();
        NavbarScroll.init();
        SearchManager.init();
        LikeSystem.init();
        FollowSystem.init();
        NotificationSystem.init();
        BookmarkSystem.init();
        FormValidation.init();
        SmoothScroll.init();
        console.log('✅ Blogify initialized');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
