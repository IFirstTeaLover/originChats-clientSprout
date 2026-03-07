(function() {
    // Central abstraction for rendering different content types in the members list area
    window.MembersContent = {
        contentType: null, // 'profile' | 'members' | 'search' | etc.
        currentUsername: null, // Track current profile username to avoid re-renders

        // Main render function - delegates based on content type
        render: function(options) {
            const container = document.getElementById('members-list');
            if (!container) return;

            const newType = options.type || 'members';
            const newUsername = options.username || null;

            // If we're showing the same profile, don't re-render
            if (this.contentType === 'profile' && newType === 'profile' && this.currentUsername === newUsername) {
                return;
            }

            // Clear container only when content type is changing or username is different
            this.clearContainer(container);

            this.contentType = newType;
            this.currentUsername = newUsername;

            switch (this.contentType) {
                case 'profile':
                    this.renderProfile(container, options.username);
                    break;
                case 'members':
                    this.renderMembers(container, options);
                    break;
                case 'search':
                    this.renderSearch(container, options);
                    break;
                default:
                    this.renderMembers(container, options);
            }

            if (window.lucide) window.lucide.createIcons({ root: container });
        },

        clearContainer: function(container) {
            container.innerHTML = '';
            container.style.display = '';
            const serverChannelHeader = document.getElementById('server-channel-header');
            if (serverChannelHeader && window.state?.serverUrl === 'dms.mistium.com') {
                serverChannelHeader.style.display = 'none';
            }
        },

        // Render function for profile card
        renderProfile: function(container, username) {
            const profileContainer = document.createElement('div');
            profileContainer.className = 'account-profile-content';
            container.appendChild(profileContainer);

            this._fetchAndRenderProfile(profileContainer, username);
        },

        _fetchAndRenderProfile: function(container, username) {
            const cachedProfile = window.accountCache?.[username];
            if (cachedProfile && Date.now() - cachedProfile._timestamp < 60000) {
                this._renderProfileData(container, cachedProfile);
                return;
            }

            container.innerHTML = `<div class="account-loading"><div class="account-loading-spinner"></div><div class="account-loading-text">Loading profile...</div></div>`;

            const self = this;
            fetch(`https://api.rotur.dev/profile?include_posts=0&name=${encodeURIComponent(username)}`)
                .then(response => {
                    if (!response.ok) throw new Error('Profile not found');
                    return response.json();
                })
                .then(data => {
                    data._timestamp = Date.now();
                    if (!window.accountCache) window.accountCache = {};
                    window.accountCache[username] = data;
                    self._renderProfileData(container, data);
                })
                .catch(error => {
                    container.innerHTML = `
                        <div class="account-error">
                            <div style="font-size: 48px; margin-bottom: 16px;">😔</div>
                            <div>Could not load profile</div>
                            <div style="font-size: 12px; color: var(--text-dim); margin-top: 8px;">${error.message}</div>
                        </div>
                    `;
                });
        },

        _renderProfileData: function(container, data) {
            const joinedDate = new Date(data.created).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const bannerHtml = data.banner ? `<img src="${data.banner}" alt="Banner">` : '';
            const statusClass = this._getUserStatus(data.username);
            const isCurrentUser = window.state?.currentUser?.username === data.username;
            
            let userRoles = [];
            if (window.state?.serverUrl !== 'dms.mistium.com') {
                const serverUser = this._getUserByUsername(data.username, window.state?.serverUrl);
                if (serverUser?.roles?.length) userRoles = serverUser.roles;
            }

            container.innerHTML = `
                <div class="account-banner">${bannerHtml}</div>
                <div class="account-avatar-section">
                    <div class="account-avatar">
                        <img src="${data.pfp}" alt="${data.username}">
                        <div class="account-status-indicator ${statusClass}"></div>
                    </div>
                </div>
                </div>
                <div class="account-names-section">
                    <div class="account-username-text">${data.username}</div>
                    ${data.pronouns ? `<div class="account-global-name">${this._escapeHtml(data.pronouns)}</div>` : ''}
                </div>
                <div class="account-stats">
                    <div class="account-stat"><div class="account-stat-value">${data.followers || 0}</div><div class="account-stat-label">Followers</div></div>
                    <div class="account-stat"><div class="account-stat-value">${data.following || 0}</div><div class="account-stat-label">Following</div></div>
                    <div class="account-stat"><div class="account-stat-value">${data.currency ? data.currency.toLocaleString() : 0}</div><div class="account-stat-label">Credits</div></div>
                    <div class="account-stat"><div class="account-stat-value">${data.subscription || 'Free'}</div><div class="account-stat-label">Tier</div></div>
                </div>
                ${userRoles.length > 0 ? `
                <div class="account-section">
                    <div class="account-section-title">Roles</div>
                    <div class="account-roles">${userRoles.map(r => `<span class="account-role">${this._escapeHtml(r)}</span>`).join('')}</div>
                </div>` : ''}
                ${data.bio ? `
                <div class="account-section">
                    <div class="account-section-title">About Me</div>
                    <div class="account-bio">${this._escapeHtml(data.bio)}</div>
                </div>` : ''}
                <div class="account-section">
                    <div class="account-section-title">Member Since</div>
                    <div class="account-meta">
                        <div class="account-meta-item"><i data-lucide="calendar"></i><span>${joinedDate}</span></div>
                    </div>
                </div>
                ${isCurrentUser ? `
                <div class="account-section account-actions-section">
                    <button class="account-logout-button" onclick="window.logout()">
                        <i data-lucide="log-out"></i><span>Log Out</span>
                    </button>
                </div>` : ''}
            `;

            if (window.lucide) window.lucide.createIcons({ root: container });
        },

        // Render function for member list (existing functionality)
        renderMembers: function(container, options) {
            // This delegates to the existing renderMembers function
            // The existing function handles: owner/online/offline sections, member items
            if (options && options.channel) {
                window.originalRenderMembers?.(options.channel);
            }
        },

        // Render function for message search (future feature)
        renderSearch: function(container, options) {
            // Placeholder for future implementation
            container.innerHTML = `<div class="account-empty">Search feature coming soon</div>`;
        },

        // Helper functions
        _getUserStatus: function(username) {
            const user = this._getUserByUsername(username, window.state?.serverUrl);
            if (!user) return 'offline';
            return user.status === 'online' ? 'online' : user.status === 'idle' ? 'idle' : 'offline';
        },

        _getUserByUsername: function(username, serverUrl) {
            const targetUrl = serverUrl || window.state?.serverUrl;
            const users = window.state?.usersByServer?.[targetUrl] || {};
            const lower = username.toLowerCase();
            for (const [key, u] of Object.entries(users)) {
                if (key.toLowerCase() === lower) return u;
            }
            return null;
        },

        _escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // Reset state - call this when switching to a completely different channel/view
        reset: function() {
            this.contentType = null;
            this.currentUsername = null;
        }
    };
})();
