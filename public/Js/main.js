/**
 * Blogify - Main Frontend JavaScript
 * Production-ready with smooth interactions, error handling, and performance optimizations
 */

(function() {
    'use strict';

    // ===================== UTILITY FUNCTIONS =====================

    const Utils = {
        // Debounce function for performance
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Throttle function for scroll events
        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Safe JSON parse
        safeJSONParse: function(str, fallback = null) {
            try {
                return JSON.parse(str);
            } catch {
                return fallback;
            }
        },

        // Format numbers (1.2K, 1.5M)
        formatNumber: function(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        },

        // Show toast notification
        showToast: function(message, type = 'info', duration = 4000) {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const icons = {
                success: 'bi-check-circle-fill',
                danger: 'bi-x-circle-fill',
                warning: 'bi-exclamation-triangle-fill',
                info: 'bi-info-circle-fill'
            };

            const toast = document.createElement('div');
            toast.className = `toast align-items-center text-white bg-${type} border-0 show mb-2`;
            toast.style.minWidth = '280px';
            toast.innerHTML = `
                <div class="d-flex align-items-center p-3">
                    <i class="bi ${icons[type] || icons.info} me-2 fs-5"></i>
                    <div class="toast-body fw-medium">${message}</div>
                    <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            `;

            container.appendChild(toast);

            // Auto remove
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);

            // Manual close
            toast.querySelector('.btn-close').addEventListener('click', () => toast.remove());
        },

        // AJAX helper with error handling
        fetchJSON: async function(url, options = {}) {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            };

            try {
                const response = await fetch(url, { ...defaultOptions, ...options });

                if (response.status === 401) {
                    Utils.showToast('Please sign in to continue', 'warning');
                    setTimeout(() => window.location.href = '/user/signin', 1500);
                    return null;
                }

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ message: 'Something went wrong' }));
                    throw new Error(error.message || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (err) {
                console.error('Fetch error:', err);
                Utils.showToast(err.message || 'Network error. Please try again.', 'danger');
                return null;
            }
        }
    };

    // ===================== THEME MANAGEMENT =====================

    const ThemeManager = {
        init: function() {
            const toggle = document.getElementById('themeToggle');
            const icon = document.getElementById('themeIcon');
            if (!toggle) return;

            // Load saved theme
            const savedTheme = localStorage.getItem('blogify-theme') || 'light';
            this.apply(savedTheme);

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
            if (icon) {
                icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
            }
        }
    };

    // ===================== NAVBAR SCROLL EFFECT =====================

    const NavbarScroll = {
        init: function() {
            const navbar = document.getElementById('mainNavbar');
            if (!navbar) return;

            window.addEventListener('scroll', Utils.throttle(() => {
                if (window.scrollY > 10) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }, 100));
        }
    };

    // ===================== SEARCH FUNCTIONALITY =====================

    const SearchManager = {
        init: function() {
            const searchInput = document.querySelector('.search-box input');
            if (!searchInput) return;

            // Debounced search
            searchInput.addEventListener('input', Utils.debounce(function() {
                const query = this.value.trim();
                if (query.length > 2) {
                    this.closest('form').submit();
                }
            }, 500));

            // Keyboard shortcut: / to focus search
            document.addEventListener('keydown', (e) => {
                if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    searchInput.focus();
                }
            });
        }
    };

    // ===================== LIKE SYSTEM =====================

    const LikeSystem = {
        init: function() {
            document.querySelectorAll('.like-btn').forEach(btn => {
                // Skip if already initialized
                if (btn.dataset.initialized) return;
                btn.dataset.initialized = 'true';

                btn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    const blogId = this.dataset.blogId;
                    if (!blogId) return;

                    // Prevent double-click
                    if (this.dataset.processing === 'true') return;
                    this.dataset.processing = 'true';

                    const icon = this.querySelector('i');
                    const countSpan = this.querySelector('span');
                    const isLiked = this.classList.contains('liked');

                    // Optimistic UI update
                    this.classList.toggle('liked');
                    if (icon) {
                        icon.classList.toggle('bi-heart');
                        icon.classList.toggle('bi-heart-fill');
                    }

                    try {
                        const data = await Utils.fetchJSON(`/blogs/${blogId}/like`, { method: 'POST' });
                        if (data) {
                            if (countSpan) countSpan.textContent = Utils.formatNumber(data.likes || 0);

                            // Sync all like buttons for this blog
                            document.querySelectorAll(`[data-blog-id="${blogId}"]`).forEach(otherBtn => {
                                if (otherBtn !== this) {
                                    otherBtn.classList.toggle('liked', this.classList.contains('liked'));
                                    const otherIcon = otherBtn.querySelector('i');
                                    if (otherIcon) {
                                        otherIcon.classList.toggle('bi-heart', !this.classList.contains('liked'));
                                        otherIcon.classList.toggle('bi-heart-fill', this.classList.contains('liked'));
                                    }
                                    const otherCount = otherBtn.querySelector('span');
                                    if (otherCount) otherCount.textContent = Utils.formatNumber(data.likes || 0);
                                }
                            });
                        } else {
                            // Revert on error
                            this.classList.toggle('liked');
                            if (icon) {
                                icon.classList.toggle('bi-heart');
                                icon.classList.toggle('bi-heart-fill');
                            }
                        }
                    } finally {
                        this.dataset.processing = 'false';
                    }
                });
            });
        }
    };

    // ===================== COMMENT SYSTEM =====================

    const CommentSystem = {
        init: function() {
            this.initForm();
            this.initReplies();
        },

        initForm: function() {
            const form = document.getElementById('commentForm');
            if (!form) return;

            form.addEventListener('submit', async function(e) {
                e.preventDefault();

                const blogId = this.dataset.blogId;
                const textarea = document.getElementById('commentBody');
                const body = textarea.value.trim();
                const submitBtn = this.querySelector('button[type="submit"]');

                if (!body) {
                    Utils.showToast('Please write a comment first', 'warning');
                    return;
                }

                // Loading state
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Posting...';

                const data = await Utils.fetchJSON(`/comments/blog/${blogId}`, {
                    method: 'POST',
                    body: JSON.stringify({ body })
                });

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;

                if (data) {
                    textarea.value = '';
                    Utils.showToast('Comment posted successfully!', 'success');

                    // Add comment to DOM without reload
                    CommentSystem.addCommentToDOM(data.comment || data);

                    // Update count
                    const countBadge = document.getElementById('commentCount');
                    if (countBadge) {
                        const current = parseInt(countBadge.textContent) || 0;
                        countBadge.textContent = current + 1;
                    }
                }
            });
        },

        addCommentToDOM: function(comment) {
            const list = document.getElementById('commentsList');
            const noComments = document.getElementById('noComments');
            if (noComments) noComments.remove();

            const div = document.createElement('div');
            div.className = 'comment-box animate-fade-in-up';
            div.id = `comment-${comment._id}`;
            div.innerHTML = `
                <div class="d-flex gap-3">
                    <img src="${comment.createdBy?.profileImageURL || '/imgs/default.png'}" 
                         alt="${comment.createdBy?.fullName || 'Anonymous'}" 
                         class="comment-avatar flex-shrink-0"
                         onerror="this.src='/imgs/default.png';">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <span class="fw-semibold">${comment.createdBy?.fullName || 'Anonymous'}</span>
                                <small class="text-muted ms-2">Just now</small>
                            </div>
                        </div>
                        <p class="mb-2 mt-1">${comment.body}</p>
                        <div class="d-flex gap-3">
                            <button class="btn btn-sm btn-link text-muted p-0 text-decoration-none" onclick="likeComment('${comment._id}')">
                                <i class="bi bi-hand-thumbs-up"></i> 0
                            </button>
                            <button class="btn btn-sm btn-link text-muted p-0 text-decoration-none" onclick="replyComment('${comment._id}')">
                                <i class="bi bi-reply"></i> Reply
                            </button>
                        </div>
                    </div>
                </div>
            `;
            list.insertBefore(div, list.firstChild);
        },

        initReplies: function() {
            // Reply functionality placeholder
            window.replyComment = function(commentId) {
                const textarea = document.getElementById('commentBody');
                if (textarea) {
                    textarea.focus();
                    textarea.value = `@comment-${commentId} `;
                }
            };

            window.deleteComment = async function(commentId) {
                if (!confirm('Are you sure you want to delete this comment?')) return;

                const data = await Utils.fetchJSON(`/comments/${commentId}`, { method: 'DELETE' });
                if (data) {
                    const el = document.getElementById(`comment-${commentId}`);
                    if (el) {
                        el.style.opacity = '0';
                        el.style.transform = 'translateX(-20px)';
                        setTimeout(() => el.remove(), 300);
                    }
                    Utils.showToast('Comment deleted', 'success');

                    const countBadge = document.getElementById('commentCount');
                    if (countBadge) {
                        const current = parseInt(countBadge.textContent) || 0;
                        if (current > 0) countBadge.textContent = current - 1;
                    }
                }
            };

            window.editComment = function(commentId) {
                const textEl = document.getElementById(`comment-text-${commentId}`);
                if (!textEl) return;

                const currentText = textEl.textContent;
                const textarea = document.createElement('textarea');
                textarea.className = 'form-control mb-2';
                textarea.rows = 3;
                textarea.value = currentText;

                const saveBtn = document.createElement('button');
                saveBtn.className = 'btn btn-sm btn-primary';
                saveBtn.innerHTML = '<i class="bi bi-check"></i> Save';

                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
                cancelBtn.innerHTML = '<i class="bi bi-x"></i> Cancel';

                const wrapper = document.createElement('div');
                wrapper.appendChild(textarea);
                wrapper.appendChild(saveBtn);
                wrapper.appendChild(cancelBtn);

                textEl.replaceWith(wrapper);

                saveBtn.addEventListener('click', async () => {
                    const newBody = textarea.value.trim();
                    if (!newBody) return;

                    const data = await Utils.fetchJSON(`/comments/${commentId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ body: newBody })
                    });

                    if (data) {
                        const p = document.createElement('p');
                        p.className = 'mb-2 mt-1';
                        p.id = `comment-text-${commentId}`;
                        p.textContent = newBody;
                        wrapper.replaceWith(p);
                        Utils.showToast('Comment updated', 'success');
                    }
                });

                cancelBtn.addEventListener('click', () => {
                    const p = document.createElement('p');
                    p.className = 'mb-2 mt-1';
                    p.id = `comment-text-${commentId}`;
                    p.textContent = currentText;
                    wrapper.replaceWith(p);
                });
            };

            window.likeComment = async function(commentId) {
                const data = await Utils.fetchJSON(`/comments/${commentId}/like`, { method: 'POST' });
                if (data) {
                    Utils.showToast('Comment liked!', 'success');
                }
            };
        }
    };

    // ===================== FOLLOW SYSTEM =====================

    const FollowSystem = {
        init: function() {
            document.querySelectorAll('.follow-btn').forEach(btn => {
                if (btn.dataset.initialized) return;
                btn.dataset.initialized = 'true';

                btn.addEventListener('click', async function() {
                    const userId = this.dataset.userId;
                    if (!userId) return;

                    this.disabled = true;
                    const isFollowing = this.classList.contains('following');

                    const data = await Utils.fetchJSON(`/follow/${userId}/follow`, { method: 'POST' });

                    if (data) {
                        this.classList.toggle('following');
                        this.classList.toggle('btn-primary');
                        this.classList.toggle('btn-outline-primary');
                        this.innerHTML = isFollowing 
                            ? '<i class="bi bi-person-plus me-1"></i> Follow'
                            : '<i class="bi bi-person-check-fill me-1"></i> Following';

                        Utils.showToast(isFollowing ? 'Unfollowed' : 'Now following!', 'success');
                    }

                    this.disabled = false;
                });
            });
        }
    };

    // ===================== NOTIFICATION SYSTEM =====================

    const NotificationSystem = {
        init: function() {
            this.fetchUnreadCount();
            // Poll every 30 seconds
            setInterval(() => this.fetchUnreadCount(), 30000);
        },

        fetchUnreadCount: async function() {
            const badge = document.getElementById('notifBadge');
            if (!badge) return;

            try {
                const response = await fetch('/notifications/unread/count', {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin'
                });

                if (response.ok) {
                    const data = await response.json();
                    const count = data.count || 0;

                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : count;
                        badge.classList.remove('d-none');
                    } else {
                        badge.classList.add('d-none');
                    }
                }
            } catch (err) {
                // Silently fail for notifications
            }
        }
    };

    // ===================== INFINITE SCROLL (for blog lists) =====================

    const InfiniteScroll = {
        init: function() {
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (!loadMoreBtn) return;

            loadMoreBtn.addEventListener('click', async function() {
                const nextPage = parseInt(this.dataset.nextPage) || 2;
                const sort = this.dataset.sort || 'newest';

                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

                try {
                    const response = await fetch(`/?page=${nextPage}&sort=${sort}&ajax=1`);
                    const html = await response.text();

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const newBlogs = doc.querySelectorAll('.blog-card');

                    const container = document.getElementById('blogsContainer');
                    newBlogs.forEach(blog => {
                        blog.classList.add('animate-fade-in-up');
                        container.appendChild(blog);
                    });

                    this.dataset.nextPage = nextPage + 1;

                    // Hide if no more pages
                    if (newBlogs.length === 0) {
                        this.style.display = 'none';
                    }
                } catch (err) {
                    Utils.showToast('Failed to load more blogs', 'danger');
                } finally {
                    this.disabled = false;
                    this.innerHTML = 'Load More <i class="bi bi-arrow-down ms-1"></i>';
                }
            });
        }
    };

    // ===================== IMAGE LAZY LOADING =====================

    const LazyImages = {
        init: function() {
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src || img.src;
                            img.classList.remove('lazy');
                            imageObserver.unobserve(img);
                        }
                    });
                }, { rootMargin: '50px' });

                document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
            }
        }
    };

    // ===================== FORM VALIDATION =====================

    const FormValidation = {
        init: function() {
            document.querySelectorAll('form[data-validate]').forEach(form => {
                form.addEventListener('submit', function(e) {
                    let isValid = true;

                    this.querySelectorAll('[required]').forEach(field => {
                        if (!field.value.trim()) {
                            isValid = false;
                            field.classList.add('is-invalid');

                            // Remove error on input
                            field.addEventListener('input', function() {
                                this.classList.remove('is-invalid');
                            }, { once: true });
                        }
                    });

                    if (!isValid) {
                        e.preventDefault();
                        Utils.showToast('Please fill in all required fields', 'warning');
                    }
                });
            });
        }
    };

    // ===================== SMOOTH ANCHOR SCROLL =====================

    const SmoothScroll = {
        init: function() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        }
    };

    // ===================== BOOKMARK SYSTEM =====================

    const BookmarkSystem = {
        init: function() {
            const btn = document.getElementById('bookmarkBtn');
            if (!btn) return;

            btn.addEventListener('click', async function() {
                const blogId = this.dataset.blogId || window.location.pathname.split('/').pop();

                // Toggle visual state
                const icon = this.querySelector('i');
                const isBookmarked = icon.classList.contains('bi-bookmark-fill');

                icon.classList.toggle('bi-bookmark');
                icon.classList.toggle('bi-bookmark-fill');

                // Save to localStorage
                let bookmarks = Utils.safeJSONParse(localStorage.getItem('blogify-bookmarks'), []);

                if (isBookmarked) {
                    bookmarks = bookmarks.filter(id => id !== blogId);
                    Utils.showToast('Removed from bookmarks', 'info');
                } else {
                    bookmarks.push(blogId);
                    Utils.showToast('Added to bookmarks', 'success');
                }

                localStorage.setItem('blogify-bookmarks', JSON.stringify(bookmarks));
            });

            // Restore state
            const blogId = btn.dataset.blogId || window.location.pathname.split('/').pop();
            const bookmarks = Utils.safeJSONParse(localStorage.getItem('blogify-bookmarks'), []);
            if (bookmarks.includes(blogId)) {
                const icon = btn.querySelector('i');
                icon.classList.remove('bi-bookmark');
                icon.classList.add('bi-bookmark-fill');
            }
        }
    };

    // ===================== READING TIME ESTIMATE =====================

    const ReadingTime = {
        init: function() {
            const content = document.querySelector('.blog-content');
            if (!content) return;

            const text = content.textContent || '';
            const words = text.trim().split(/\s+/).length;
            const minutes = Math.ceil(words / 200);

            const display = document.getElementById('readingTimeDisplay');
            if (display) display.textContent = `${minutes} min read`;
        }
    };

    // ===================== INITIALIZE EVERYTHING =====================

    function init() {
        ThemeManager.init();
        NavbarScroll.init();
        SearchManager.init();
        LikeSystem.init();
        CommentSystem.init();
        FollowSystem.init();
        NotificationSystem.init();
        InfiniteScroll.init();
        LazyImages.init();
        FormValidation.init();
        SmoothScroll.init();
        BookmarkSystem.init();
        ReadingTime.init();

        console.log('✅ Blogify frontend initialized');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-initialize after AJAX content loads
    document.addEventListener('contentLoaded', init);

})();
