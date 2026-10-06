/**
 * ==============================================================================
 * CAMPUS CONNECT - CORE CLIENT APPS & REUSABLE JAVASCRIPT
 * Complete, beginner-friendly, and fully functional vanilla JS frontend architecture
 * Connected to Express REST APIs & MongoDB Atlas
 * ==============================================================================
 */

// Centralized API Base Configuration
const API_URL = (typeof window !== 'undefined' && window.location.origin) 
  ? window.location.origin 
  : "http://localhost:5000";

// ==============================================================================
// 1. AUTHENTICATION & LOCAL STORAGE HELPERS
// ==============================================================================

function getToken() {
  return localStorage.getItem('campus_connect_token');
}

function setToken(token) {
  localStorage.setItem('campus_connect_token', token);
}

function getUser() {
  const userJson = localStorage.getItem('campus_connect_user');
  try {
    return userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('campus_connect_user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('campus_connect_token');
  localStorage.removeItem('campus_connect_user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

function isAuthenticated() {
  return !!getToken();
}

/**
 * Route protection guard for dashboard & module pages
 */
function protectPage(allowedRoles = []) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    alert(`Access Restricted: This section requires ${allowedRoles.join(' or ')} privileges.`);
    window.location.href = 'dashboard.html';
    return null;
  }

  return user;
}

// ==============================================================================
// 2. CENTRALIZED API REQUEST FUNCTION WITH JWT & ERROR HANDLING
// ==============================================================================

async function apiRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Attach JWT token in Authorization header
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = (url.startsWith('http://') || url.startsWith('https://'))
    ? url
    : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers
    });

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      data = { message: response.statusText || 'Server response error' };
    }

    if (!response.ok) {
      if (response.status === 401 && !url.includes('/login') && !url.includes('/register') && !url.includes('/demo-login')) {
        localStorage.removeItem('campus_connect_token');
        localStorage.removeItem('campus_connect_user');
        showToast('Please login again', 'error');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1000);
        throw new Error(data.message || 'Please login again');
      }

      if (response.status === 403) {
        throw new Error(data.message || 'Forbidden: You do not have permission for this action.');
      }

      if (response.status === 404) {
        throw new Error(data.message || 'Requested resource not found.');
      }

      if (response.status >= 500) {
        throw new Error(data.message || 'Internal server error. Please try again later.');
      }

      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      console.error('Network connection failure:', error);
      throw new Error('Unable to connect to server. Please ensure the backend is running.');
    }
    console.error(`API Request Error [${options.method || 'GET'} ${url}]:`, error.message);
    throw error;
  }
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  let path = endpoint;
  if (!path.startsWith('/api') && !path.startsWith('/register') && !path.startsWith('/login') && !path.startsWith('/demo-login')) {
    path = `/api${path.startsWith('/') ? '' : '/'}${path}`;
  }

  return await apiRequest(path, options);
}

// ==============================================================================
// 3. UI NOTIFICATIONS & TOASTS
// ==============================================================================

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  
  const iconMap = {
    success: '✓',
    error: '✕',
    info: '⚡'
  };

  toast.innerHTML = `<strong>${iconMap[type] || '•'}</strong> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==============================================================================
// 4. MODAL MANAGEMENT
// ==============================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('show');
  }
});

// ==============================================================================
// 5. COMMON APP INITIALIZATION (SIDEBAR, HEADER, NOTIFICATION BADGE)
// ==============================================================================

function initAppLayout() {
  const user = getUser();
  if (!user) return;

  const sidebarUserName = document.getElementById('sidebar-user-name');
  const sidebarUserRole = document.getElementById('sidebar-user-role');
  const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
  const navbarProfileBtn = document.querySelector('.navbar-right a[title="Profile"]');

  if (sidebarUserName) sidebarUserName.textContent = user.name || 'User';
  if (sidebarUserRole) {
    sidebarUserRole.textContent = user.role;
    sidebarUserRole.className = `user-role-badge role-${user.role}`;
  }

  // Update user avatars with images or initials
  const avatarUrl = user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'User')}&backgroundColor=ffd5dc,ffdfbf,d1d4f9`;

  if (sidebarUserAvatar) {
    sidebarUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
  }

  if (navbarProfileBtn) {
    navbarProfileBtn.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 9999px;">`;
  }

  const adminNavLinks = document.querySelectorAll('.admin-only-nav');
  adminNavLinks.forEach((link) => {
    link.style.display = user.role === 'admin' ? 'flex' : 'none';
  });

  const facultyAdminElements = document.querySelectorAll('.faculty-admin-only');
  facultyAdminElements.forEach((el) => {
    el.style.display = (user.role === 'faculty' || user.role === 'admin') ? 'inline-flex' : 'none';
  });

  const toggleBtn = document.getElementById('menu-toggle-btn');
  const sidebar = document.querySelector('.sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  fetchNotificationCount();
}

async function fetchNotificationCount() {
  if (!isAuthenticated()) return;
  try {
    const data = await apiRequest(`${API_URL}/api/notifications`);
    const badge = document.getElementById('nav-notification-badge');
    if (badge) {
      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('Failed to update notification count:', e);
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(undefined, options);
  } catch (e) {
    return dateString;
  }
}

// ==============================================================================
// 6. DASHBOARD MODULE
// ==============================================================================

async function loadDashboard() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  const welcomeText = document.getElementById('welcome-heading');
  if (welcomeText) {
    welcomeText.textContent = `Welcome back, ${user.name}!`;
  }

  try {
    const statsData = await apiRequest(`${API_URL}/api/admin/stats`);
    if (statsData.success) {
      document.getElementById('stat-announcements').textContent = statsData.stats.totalAnnouncements || 0;
      document.getElementById('stat-events').textContent = statsData.stats.totalEvents || 0;
      document.getElementById('stat-clubs').textContent = statsData.stats.totalClubs || 0;
      document.getElementById('stat-resources').textContent = statsData.stats.totalResources || 0;
    }

    const announcementsData = await apiRequest(`${API_URL}/api/announcements`);
    const announcementsContainer = document.getElementById('dashboard-announcements-list');
    if (announcementsContainer) {
      const topAnnouncements = (announcementsData.announcements || []).slice(0, 3);
      if (topAnnouncements.length === 0) {
        announcementsContainer.innerHTML = `<div class="empty-state"><p>No announcements yet.</p></div>`;
      } else {
        announcementsContainer.innerHTML = topAnnouncements.map((a) => `
          <div class="item-card" style="margin-bottom: 12px; padding: 16px;">
            <div class="item-card-header">
              <h4 class="item-card-title">${a.title}</h4>
              <span class="badge badge-${a.priority.toLowerCase()}">${a.priority}</span>
            </div>
            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 8px;">${a.description.substring(0, 100)}...</p>
            <div class="item-card-meta">
              <span class="meta-item">📁 ${a.category}</span>
              <span class="meta-item">👤 ${a.createdBy?.name || 'Staff'}</span>
              <span class="meta-item">🕒 ${formatDate(a.createdAt)}</span>
            </div>
          </div>
        `).join('');
      }
    }

    const eventsData = await apiRequest(`${API_URL}/api/events`);
    const eventsContainer = document.getElementById('dashboard-events-list');
    if (eventsContainer) {
      const topEvents = (eventsData.events || []).slice(0, 3);
      if (topEvents.length === 0) {
        eventsContainer.innerHTML = `<div class="empty-state"><p>No upcoming events scheduled.</p></div>`;
      } else {
        eventsContainer.innerHTML = topEvents.map((ev) => `
          <div class="item-card" style="margin-bottom: 12px; padding: 16px;">
            <div class="item-card-header">
              <h4 class="item-card-title">${ev.title}</h4>
              <span class="badge badge-category">${ev.category}</span>
            </div>
            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 8px;">📍 ${ev.venue} | 📅 ${ev.date} (${ev.startTime} - ${ev.endTime})</p>
            <div class="item-card-meta">
              <span class="meta-item">👥 ${ev.registeredUsers?.length || 0} / ${ev.maxParticipants} Registered</span>
            </div>
          </div>
        `).join('');
      }
    }

    const notifData = await apiRequest(`${API_URL}/api/notifications`);
    const notifContainer = document.getElementById('dashboard-notifications-list');
    if (notifContainer) {
      const topNotifs = (notifData.notifications || []).slice(0, 4);
      if (topNotifs.length === 0) {
        notifContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No recent alerts.</p>`;
      } else {
        notifContainer.innerHTML = topNotifs.map((n) => `
          <div style="padding: 10px 0; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <strong style="font-size: 14px; color: var(--text-main);">${n.title}</strong>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${n.message}</p>
            </div>
            <span style="font-size: 11px; color: var(--text-light);">${formatDate(n.createdAt)}</span>
          </div>
        `).join('');
      }
    }

  } catch (error) {
    showToast('Failed to load dashboard: ' + error.message, 'error');
  }
}

// ==============================================================================
// 7. ANNOUNCEMENTS MODULE
// ==============================================================================

async function loadAnnouncements() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  const searchInput = document.getElementById('announcement-search');
  const categoryFilter = document.getElementById('announcement-category-filter');
  const priorityFilter = document.getElementById('announcement-priority-filter');

  async function fetchAndRender() {
    try {
      const search = searchInput ? searchInput.value : '';
      const category = categoryFilter ? categoryFilter.value : 'All';
      const priority = priorityFilter ? priorityFilter.value : 'All';

      const data = await apiRequest(`${API_URL}/api/announcements?search=${encodeURIComponent(search)}&category=${category}&priority=${priority}`);
      const listContainer = document.getElementById('announcements-container');

      if (!listContainer) return;

      if (!data.announcements || data.announcements.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">📢</div>
            <h4>No Announcements Found</h4>
            <p>Try clearing your filters or check back later.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = data.announcements.map((a) => {
        const canManage = user.role === 'admin' || (user.role === 'faculty' && a.createdBy?._id === user.id);
        return `
          <div class="item-card">
            <div class="item-card-header">
              <h3 class="item-card-title">${a.title}</h3>
              <span class="badge badge-${a.priority.toLowerCase()}">${a.priority}</span>
            </div>
            <div class="item-card-body">
              <p>${a.description}</p>
              ${a.attachment ? `<div style="margin-top: 10px;"><a href="${a.attachment}" target="_blank" class="btn btn-secondary btn-sm">📎 View Attachment</a></div>` : ''}
            </div>
            <div class="item-card-meta">
              <span class="meta-item">📁 <strong>${a.category}</strong></span>
              <span class="meta-item">👤 ${a.createdBy?.name || 'Faculty Staff'} (${a.createdBy?.role || 'Staff'})</span>
              <span class="meta-item">🕒 ${formatDate(a.createdAt)}</span>
            </div>
            ${canManage ? `
              <div class="item-card-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteAnnouncement('${a._id}')">Delete</button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    } catch (err) {
      showToast('Error loading announcements: ' + err.message, 'error');
    }
  }

  if (searchInput) searchInput.addEventListener('input', fetchAndRender);
  if (categoryFilter) categoryFilter.addEventListener('change', fetchAndRender);
  if (priorityFilter) priorityFilter.addEventListener('change', fetchAndRender);

  fetchAndRender();
}

async function handleCreateAnnouncement(event) {
  event.preventDefault();
  const title = document.getElementById('ann-title').value;
  const description = document.getElementById('ann-description').value;
  const category = document.getElementById('ann-category').value;
  const priority = document.getElementById('ann-priority').value;
  const attachment = document.getElementById('ann-attachment').value;

  try {
    await apiRequest(`${API_URL}/api/announcements`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        category,
        priority,
        attachment
      })
    });

    showToast('Announcement published successfully!', 'success');
    closeModal('create-announcement-modal');
    document.getElementById('create-announcement-form').reset();
    loadAnnouncements();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Are you sure you want to delete this announcement?')) return;
  try {
    await apiRequest(`${API_URL}/api/announcements/${id}`, { method: 'DELETE' });
    showToast('Announcement deleted', 'success');
    loadAnnouncements();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 8. EVENTS MODULE
// ==============================================================================

async function loadEvents() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  const searchInput = document.getElementById('event-search');
  const categoryFilter = document.getElementById('event-category-filter');

  async function fetchAndRender() {
    try {
      const search = searchInput ? searchInput.value : '';
      const category = categoryFilter ? categoryFilter.value : 'All';

      const data = await apiRequest(`${API_URL}/api/events?search=${encodeURIComponent(search)}&category=${category}`);
      const listContainer = document.getElementById('events-container');

      if (!listContainer) return;

      if (!data.events || data.events.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🎉</div>
            <h4>No Events Found</h4>
            <p>No events match your search criteria.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = data.events.map((ev) => {
        const isRegistered = ev.registeredUsers.some((u) => u._id === user.id || u === user.id);
        const isFull = ev.registeredUsers.length >= ev.maxParticipants;
        const canManage = user.role === 'admin' || (user.role === 'faculty' && ev.createdBy?._id === user.id);

        return `
          <div class="item-card">
            <div class="item-card-header">
              <h3 class="item-card-title">${ev.title}</h3>
              <span class="badge badge-category">${ev.category}</span>
            </div>
            <div class="item-card-body">
              <p>${ev.description}</p>
              <div style="margin-top: 12px; background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-md); font-size: 13px;">
                <div>📍 <strong>Venue:</strong> ${ev.venue}</div>
                <div>📅 <strong>Date:</strong> ${ev.date} (${ev.startTime} - ${ev.endTime})</div>
                <div>🏢 <strong>Organizer:</strong> ${ev.organizer}</div>
                ${ev.registrationDeadline ? `<div>⏰ <strong>Deadline:</strong> ${ev.registrationDeadline}</div>` : ''}
              </div>
            </div>
            <div class="item-card-meta">
              <span class="meta-item">👥 <strong>${ev.registeredUsers.length}</strong> / ${ev.maxParticipants} Seats Filled</span>
            </div>
            <div class="item-card-actions">
              ${isRegistered ? `
                <button class="btn btn-secondary btn-sm" onclick="cancelEventRegistration('${ev._id}')">✓ Registered (Cancel)</button>
              ` : `
                <button class="btn btn-primary btn-sm" ${isFull ? 'disabled' : ''} onclick="registerForEvent('${ev._id}')">
                  ${isFull ? 'Event Full' : 'Register Now'}
                </button>
              `}
              ${canManage ? `
                <button class="btn btn-secondary btn-sm" onclick="viewEventAttendees('${ev._id}')">Attendees (${ev.registeredUsers.length})</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEvent('${ev._id}')">Delete</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      showToast('Error loading events: ' + err.message, 'error');
    }
  }

  if (searchInput) searchInput.addEventListener('input', fetchAndRender);
  if (categoryFilter) categoryFilter.addEventListener('change', fetchAndRender);

  fetchAndRender();
}

async function handleCreateEvent(event) {
  event.preventDefault();
  const title = document.getElementById('ev-title').value;
  const description = document.getElementById('ev-description').value;
  const category = document.getElementById('ev-category').value;
  const date = document.getElementById('ev-date').value;
  const startTime = document.getElementById('ev-starttime').value;
  const endTime = document.getElementById('ev-endtime').value;
  const venue = document.getElementById('ev-venue').value;
  const organizer = document.getElementById('ev-organizer').value;
  const maxParticipants = document.getElementById('ev-max').value;
  const registrationDeadline = document.getElementById('ev-deadline').value;

  try {
    await apiRequest(`${API_URL}/api/events`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        category,
        date,
        startTime,
        endTime,
        venue,
        organizer,
        maxParticipants,
        registrationDeadline
      })
    });

    showToast('Event created successfully!', 'success');
    closeModal('create-event-modal');
    document.getElementById('create-event-form').reset();
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function registerForEvent(id) {
  try {
    await apiRequest(`${API_URL}/api/events/${id}/register`, { method: 'POST' });
    showToast('Registration confirmed for this event!', 'success');
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelEventRegistration(id) {
  if (!confirm('Are you sure you want to cancel your registration?')) return;
  try {
    await apiRequest(`${API_URL}/api/events/${id}/register`, { method: 'DELETE' });
    showToast('Registration cancelled.', 'info');
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewEventAttendees(id) {
  try {
    const data = await apiRequest(`${API_URL}/api/events/${id}/attendees`);
    const modalBody = document.getElementById('attendees-modal-body');
    if (!modalBody) return;

    if (!data.attendees || data.attendees.length === 0) {
      modalBody.innerHTML = '<p class="text-muted">No students have registered yet for this event.</p>';
    } else {
      modalBody.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Department</th>
                <th>Year</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${data.attendees.map((u) => `
                <tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${u.studentId || 'N/A'}</td>
                  <td>${u.department || 'N/A'}</td>
                  <td>${u.year || 'N/A'}</td>
                  <td>${u.email}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    openModal('attendees-modal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  try {
    await apiRequest(`${API_URL}/api/events/${id}`, { method: 'DELETE' });
    showToast('Event deleted successfully.', 'success');
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 9. CLUBS MODULE
// ==============================================================================

async function loadClubs() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  const searchInput = document.getElementById('club-search');

  async function fetchAndRender() {
    try {
      const search = searchInput ? searchInput.value : '';
      const data = await apiRequest(`${API_URL}/api/clubs?search=${encodeURIComponent(search)}`);
      const listContainer = document.getElementById('clubs-container');

      if (!listContainer) return;

      if (!data.clubs || data.clubs.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🤝</div>
            <h4>No Clubs Found</h4>
            <p>Create a new club or search with a different keyword.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = data.clubs.map((club) => {
        const isMember = club.members.some((m) => m._id === user.id || m === user.id);
        const canManage = user.role === 'admin' || user.role === 'faculty';

        return `
          <div class="item-card">
            <div class="item-card-header">
              <h3 class="item-card-title">${club.name}</h3>
              <span class="badge badge-category">${club.category}</span>
            </div>
            <div class="item-card-body">
              <p>${club.description}</p>
              <div style="margin-top: 12px; background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-md); font-size: 13px;">
                <div>👨‍🏫 <strong>Coordinator:</strong> ${club.coordinator || 'N/A'}</div>
                <div>📍 <strong>Location:</strong> ${club.meetingLocation || 'Campus Activity Hub'}</div>
                <div>📅 <strong>Schedule:</strong> ${club.meetingSchedule || 'Weekly'}</div>
                <div>✉️ <strong>Contact:</strong> ${club.contactEmail || 'N/A'}</div>
              </div>
            </div>
            <div class="item-card-meta">
              <span class="meta-item">👥 <strong>${club.members.length}</strong> Active Members</span>
            </div>
            <div class="item-card-actions">
              ${isMember ? `
                <button class="btn btn-secondary btn-sm" onclick="leaveClub('${club._id}')">✓ Member (Leave)</button>
              ` : `
                <button class="btn btn-primary btn-sm" onclick="joinClub('${club._id}')">Join Club</button>
              `}
              ${canManage ? `
                <button class="btn btn-danger btn-sm" onclick="deleteClub('${club._id}')">Delete</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      showToast('Error loading clubs: ' + err.message, 'error');
    }
  }

  if (searchInput) searchInput.addEventListener('input', fetchAndRender);
  fetchAndRender();
}

async function handleCreateClub(event) {
  event.preventDefault();
  const name = document.getElementById('club-name').value;
  const description = document.getElementById('club-desc').value;
  const category = document.getElementById('club-category').value;
  const coordinator = document.getElementById('club-coord').value;
  const meetingLocation = document.getElementById('club-loc').value;
  const meetingSchedule = document.getElementById('club-sched').value;
  const contactEmail = document.getElementById('club-email').value;

  try {
    await apiRequest(`${API_URL}/api/clubs`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        category,
        coordinator,
        meetingLocation,
        meetingSchedule,
        contactEmail
      })
    });

    showToast('Club registered successfully!', 'success');
    closeModal('create-club-modal');
    document.getElementById('create-club-form').reset();
    loadClubs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function joinClub(id) {
  try {
    await apiRequest(`${API_URL}/api/clubs/${id}/join`, { method: 'POST' });
    showToast('You are now a member of this club!', 'success');
    loadClubs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function leaveClub(id) {
  if (!confirm('Are you sure you want to leave this club?')) return;
  try {
    await apiRequest(`${API_URL}/api/clubs/${id}/join`, { method: 'DELETE' });
    showToast('You left the club.', 'info');
    loadClubs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteClub(id) {
  if (!confirm('Are you sure you want to delete this club?')) return;
  try {
    await apiRequest(`${API_URL}/api/clubs/${id}`, { method: 'DELETE' });
    showToast('Club removed.', 'success');
    loadClubs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 10. RESOURCES MODULE
// ==============================================================================

async function loadResources() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  const searchInput = document.getElementById('resource-search');
  const deptFilter = document.getElementById('resource-dept-filter');
  const yearFilter = document.getElementById('resource-year-filter');
  const typeFilter = document.getElementById('resource-type-filter');

  async function fetchAndRender() {
    try {
      const search = searchInput ? searchInput.value : '';
      const dept = deptFilter ? deptFilter.value : 'All';
      const year = yearFilter ? yearFilter.value : 'All';
      const type = typeFilter ? typeFilter.value : 'All';

      const data = await apiRequest(`${API_URL}/api/resources?search=${encodeURIComponent(search)}&department=${dept}&year=${year}&type=${type}`);
      const listContainer = document.getElementById('resources-container');

      if (!listContainer) return;

      if (!data.resources || data.resources.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">📚</div>
            <h4>No Academic Resources Found</h4>
            <p>Try adjusting your search and filter criteria.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = data.resources.map((res) => {
        const canManage = user.role === 'admin' || (user.role === 'faculty' && res.uploadedBy?._id === user.id);

        return `
          <div class="item-card">
            <div class="item-card-header">
              <h3 class="item-card-title">${res.title}</h3>
              <span class="badge badge-category">${res.type}</span>
            </div>
            <div class="item-card-body">
              <p>${res.description || 'No additional description provided.'}</p>
              <div style="margin-top: 10px; font-size: 13px; color: var(--text-muted);">
                <div>📖 <strong>Subject:</strong> ${res.subject}</div>
                <div>🏛️ <strong>Department:</strong> ${res.department} | ${res.year}</div>
              </div>
            </div>
            <div class="item-card-meta">
              <span class="meta-item">👤 Uploaded by: ${res.uploadedBy?.name || 'Staff'}</span>
              <span class="meta-item">🕒 ${formatDate(res.createdAt)}</span>
            </div>
            <div class="item-card-actions">
              <a href="${res.fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                ⬇ Open / Download
              </a>
              ${canManage ? `
                <button class="btn btn-danger btn-sm" onclick="deleteResource('${res._id}')">Delete</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      showToast('Error loading resources: ' + err.message, 'error');
    }
  }

  if (searchInput) searchInput.addEventListener('input', fetchAndRender);
  if (deptFilter) deptFilter.addEventListener('change', fetchAndRender);
  if (yearFilter) yearFilter.addEventListener('change', fetchAndRender);
  if (typeFilter) typeFilter.addEventListener('change', fetchAndRender);

  fetchAndRender();
}

async function handleUploadResource(event) {
  event.preventDefault();
  const title = document.getElementById('res-title').value;
  const description = document.getElementById('res-desc').value;
  const subject = document.getElementById('res-subject').value;
  const department = document.getElementById('res-dept').value;
  const year = document.getElementById('res-year').value;
  const type = document.getElementById('res-type').value;
  const fileUrl = document.getElementById('res-url').value;

  try {
    await apiRequest(`${API_URL}/api/resources`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        subject,
        department,
        year,
        type,
        fileUrl
      })
    });

    showToast('Resource uploaded successfully!', 'success');
    closeModal('upload-resource-modal');
    document.getElementById('upload-resource-form').reset();
    loadResources();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteResource(id) {
  if (!confirm('Are you sure you want to delete this resource?')) return;
  try {
    await apiRequest(`${API_URL}/api/resources/${id}`, { method: 'DELETE' });
    showToast('Resource removed.', 'success');
    loadResources();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 11. LOST & FOUND MODULE
// ==============================================================================

async function loadLostFound() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  const searchInput = document.getElementById('lf-search');
  const typeFilter = document.getElementById('lf-type-filter');
  const statusFilter = document.getElementById('lf-status-filter');

  async function fetchAndRender() {
    try {
      const search = searchInput ? searchInput.value : '';
      const type = typeFilter ? typeFilter.value : 'All';
      const status = statusFilter ? statusFilter.value : 'All';

      const data = await apiRequest(`${API_URL}/api/lostfound?search=${encodeURIComponent(search)}&type=${type}&status=${status}`);
      const listContainer = document.getElementById('lostfound-container');

      if (!listContainer) return;

      if (!data.items || data.items.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🔍</div>
            <h4>No Lost & Found Items</h4>
            <p>No listings match your search criteria.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = data.items.map((item) => {
        const canManage = user.role === 'admin' || item.postedBy?._id === user.id;

        return `
          <div class="item-card">
            <div class="item-card-header">
              <h3 class="item-card-title">${item.itemName}</h3>
              <div style="display: flex; gap: 6px;">
                <span class="badge badge-${item.type.toLowerCase()}">${item.type}</span>
                <span class="badge badge-${item.status.toLowerCase()}">${item.status}</span>
              </div>
            </div>
            <div class="item-card-body">
              <p>${item.description}</p>
              <div style="margin-top: 10px; background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-md); font-size: 13px;">
                <div>📍 <strong>Location:</strong> ${item.location}</div>
                <div>📅 <strong>Date:</strong> ${item.date}</div>
                <div>📞 <strong>Contact:</strong> ${item.contact}</div>
                <div>👤 <strong>Posted by:</strong> ${item.postedBy?.name || 'Campus Member'}</div>
              </div>
            </div>
            <div class="item-card-meta">
              <span class="meta-item">🕒 Listed on ${formatDate(item.createdAt)}</span>
            </div>
            ${canManage ? `
              <div class="item-card-actions">
                ${item.status === 'Open' ? `
                  <button class="btn btn-success btn-sm" onclick="markLostFoundResolved('${item._id}')">Mark Resolved</button>
                ` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteLostFound('${item._id}')">Delete</button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    } catch (err) {
      showToast('Error loading Lost & Found: ' + err.message, 'error');
    }
  }

  if (searchInput) searchInput.addEventListener('input', fetchAndRender);
  if (typeFilter) typeFilter.addEventListener('change', fetchAndRender);
  if (statusFilter) statusFilter.addEventListener('change', fetchAndRender);

  fetchAndRender();
}

async function handlePostLostFound(event) {
  event.preventDefault();
  const type = document.getElementById('lf-type').value;
  const itemName = document.getElementById('lf-itemname').value;
  const description = document.getElementById('lf-desc').value;
  const date = document.getElementById('lf-date').value;
  const location = document.getElementById('lf-location').value;
  const contact = document.getElementById('lf-contact').value;

  try {
    await apiRequest(`${API_URL}/api/lostfound`, {
      method: 'POST',
      body: JSON.stringify({
        type,
        itemName,
        description,
        date,
        location,
        contact
      })
    });

    showToast(`${type} item listing posted!`, 'success');
    closeModal('post-lostfound-modal');
    document.getElementById('post-lostfound-form').reset();
    loadLostFound();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markLostFoundResolved(id) {
  try {
    await apiRequest(`${API_URL}/api/lostfound/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Resolved' })
    });
    showToast('Listing marked as resolved!', 'success');
    loadLostFound();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteLostFound(id) {
  if (!confirm('Are you sure you want to delete this listing?')) return;
  try {
    await apiRequest(`${API_URL}/api/lostfound/${id}`, { method: 'DELETE' });
    showToast('Listing deleted.', 'success');
    loadLostFound();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 12. FEEDBACK MODULE
// ==============================================================================

async function loadFeedback() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  try {
    const data = await apiRequest(`${API_URL}/api/feedback`);
    const listContainer = document.getElementById('feedback-container');

    if (!listContainer) return;

    if (!data.feedbacks || data.feedbacks.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <h4>No Feedback Submitted</h4>
          <p>Submit your thoughts or issues to campus administration using the form below.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = data.feedbacks.map((fb) => `
      <div class="item-card" style="margin-bottom: 16px;">
        <div class="item-card-header">
          <div>
            <h3 class="item-card-title">${fb.subject}</h3>
            <span style="font-size: 13px; color: var(--text-muted);">Category: <strong>${fb.category}</strong> | Rating: ⭐ ${fb.rating}/5</span>
          </div>
          <span class="badge badge-${fb.status.toLowerCase().replace(' ', '-')}">${fb.status}</span>
        </div>
        <div class="item-card-body">
          <p>${fb.description}</p>
          ${fb.adminResponse ? `
            <div style="margin-top: 10px; background: var(--bg-subtle); border-left: 3px solid var(--primary); padding: 8px 12px; font-size: 13px;">
              <strong>Admin Response:</strong> ${fb.adminResponse}
            </div>
          ` : ''}
        </div>
        <div class="item-card-meta">
          <span class="meta-item">👤 Submitted by: ${fb.anonymous ? 'Anonymous Student' : (fb.submittedBy?.name || 'Student')}</span>
          <span class="meta-item">🕒 ${formatDate(fb.createdAt)}</span>
        </div>
        ${user.role === 'admin' ? `
          <div class="item-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="openFeedbackStatusModal('${fb._id}', '${fb.status}', '${fb.adminResponse || ''}')">Update Status</button>
            <button class="btn btn-danger btn-sm" onclick="deleteFeedback('${fb._id}')">Delete</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    showToast('Error loading feedback: ' + err.message, 'error');
  }
}

async function handleSubmitFeedback(event) {
  event.preventDefault();
  const subject = document.getElementById('fb-subject').value;
  const category = document.getElementById('fb-category').value;
  const rating = document.getElementById('fb-rating').value;
  const description = document.getElementById('fb-description').value;
  const anonymous = document.getElementById('fb-anonymous').checked;

  try {
    await apiRequest(`${API_URL}/api/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        subject,
        category,
        rating,
        description,
        anonymous
      })
    });

    showToast('Feedback submitted successfully. Thank you!', 'success');
    document.getElementById('submit-feedback-form').reset();
    loadFeedback();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openFeedbackStatusModal(id, currentStatus, currentResponse) {
  document.getElementById('edit-fb-id').value = id;
  document.getElementById('edit-fb-status').value = currentStatus;
  document.getElementById('edit-fb-response').value = currentResponse;
  openModal('feedback-status-modal');
}

async function handleUpdateFeedbackStatus(event) {
  event.preventDefault();
  const id = document.getElementById('edit-fb-id').value;
  const status = document.getElementById('edit-fb-status').value;
  const adminResponse = document.getElementById('edit-fb-response').value;

  try {
    await apiRequest(`${API_URL}/api/feedback/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminResponse })
    });
    showToast('Feedback status updated!', 'success');
    closeModal('feedback-status-modal');
    loadFeedback();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteFeedback(id) {
  if (!confirm('Are you sure you want to delete this feedback?')) return;
  try {
    await apiRequest(`${API_URL}/api/feedback/${id}`, { method: 'DELETE' });
    showToast('Feedback removed.', 'success');
    loadFeedback();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 13. NOTIFICATIONS MODULE
// ==============================================================================

async function loadNotificationsPage() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  try {
    const data = await apiRequest(`${API_URL}/api/notifications`);
    const container = document.getElementById('notifications-full-list');

    if (!container) return;

    if (!data.notifications || data.notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <h4>No Notifications</h4>
          <p>You are all caught up with campus updates!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.notifications.map((n) => `
      <div style="background: ${n.isRead ? '#ffffff' : '#fffbeb'}; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong style="font-size: 15px; color: var(--text-main);">${n.title}</strong>
            <span class="badge badge-category" style="font-size: 11px;">${n.type}</span>
            ${!n.isRead ? `<span style="background: var(--primary); color: white; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 9999px;">NEW</span>` : ''}
          </div>
          <p style="font-size: 13px; color: var(--text-muted);">${n.message}</p>
          <span style="font-size: 11px; color: var(--text-light); margin-top: 4px; display: block;">${formatDate(n.createdAt)}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          ${n.link ? `<a href="${n.link}" class="btn btn-secondary btn-sm">View</a>` : ''}
          ${!n.isRead ? `<button class="btn btn-secondary btn-sm" onclick="markNotificationRead('${n._id}')">Mark Read</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast('Error loading notifications: ' + err.message, 'error');
  }
}

async function markNotificationRead(id) {
  try {
    await apiRequest(`${API_URL}/api/notifications/${id}/read`, { method: 'PUT' });
    loadNotificationsPage();
    fetchNotificationCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markAllNotificationsRead() {
  try {
    await apiRequest(`${API_URL}/api/notifications/read-all`, { method: 'PUT' });
    showToast('All notifications marked as read.', 'success');
    loadNotificationsPage();
    fetchNotificationCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 14. PROFILE MODULE (CUSTOMIZATION, AVATARS, SKILLS, BIO)
// ==============================================================================

async function loadProfile() {
  const user = protectPage();
  if (!user) return;
  initAppLayout();

  try {
    const data = await apiRequest(`${API_URL}/api/auth/me`);
    const profile = data.user || user;

    document.getElementById('profile-name-display').textContent = profile.name || 'User';
    document.getElementById('profile-role-display').textContent = (profile.role || 'student').toUpperCase();
    document.getElementById('profile-email-display').textContent = profile.email || '';
    if (document.getElementById('profile-dept-display')) {
      document.getElementById('profile-dept-display').textContent = profile.department || 'General';
    }

    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarLive = document.getElementById('avatar-live-preview');
    const avatarUrl = profile.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name || 'User')}&backgroundColor=ffd5dc,ffdfbf,d1d4f9`;
    
    if (avatarImg) avatarImg.src = avatarUrl;
    if (avatarLive) avatarLive.src = avatarUrl;
    if (document.getElementById('prof-avatar-url')) {
      document.getElementById('prof-avatar-url').value = profile.profileImage || '';
    }

    document.getElementById('prof-name').value = profile.name || '';
    document.getElementById('prof-email').value = profile.email || '';
    document.getElementById('prof-studentid').value = profile.studentId || '';
    document.getElementById('prof-department').value = profile.department || 'Computer Science & Engineering';
    document.getElementById('prof-year').value = profile.year || '';
    document.getElementById('prof-phone').value = profile.phone || '';
    
    if (document.getElementById('prof-bio')) {
      document.getElementById('prof-bio').value = profile.bio || '';
    }
    if (document.getElementById('prof-github')) {
      document.getElementById('prof-github').value = profile.github || '';
    }
    if (document.getElementById('prof-linkedin')) {
      document.getElementById('prof-linkedin').value = profile.linkedin || '';
    }
    if (document.getElementById('prof-skills')) {
      const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];
      document.getElementById('prof-skills').value = skillsArray.join(', ');
      renderSkillsTags(skillsArray);
    }
  } catch (err) {
    showToast('Error loading profile: ' + err.message, 'error');
  }
}

function renderSkillsTags(skills) {
  const container = document.getElementById('skills-display-tags');
  if (!container) return;
  if (!skills || skills.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = skills.map(s => `<span class="skill-tag">🏷️ ${s.trim()}</span>`).join('');
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const name = document.getElementById('prof-name').value;
  const phone = document.getElementById('prof-phone').value;
  const department = document.getElementById('prof-department').value;
  const year = document.getElementById('prof-year').value;
  const bio = document.getElementById('prof-bio') ? document.getElementById('prof-bio').value : '';
  const github = document.getElementById('prof-github') ? document.getElementById('prof-github').value : '';
  const linkedin = document.getElementById('prof-linkedin') ? document.getElementById('prof-linkedin').value : '';
  const skillsInput = document.getElementById('prof-skills') ? document.getElementById('prof-skills').value : '';
  
  const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const res = await apiRequest(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        phone,
        department,
        year,
        bio,
        github,
        linkedin,
        skills
      })
    });

    setUser(res.user);
    showToast('Profile information saved successfully!', 'success');
    loadProfile();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveProfileAvatar() {
  const avatarUrl = document.getElementById('prof-avatar-url').value.trim();
  if (!avatarUrl) {
    showToast('Please choose an avatar preset or enter an image link.', 'error');
    return;
  }

  try {
    const res = await apiRequest(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      body: JSON.stringify({
        profileImage: avatarUrl
      })
    });

    setUser(res.user);
    showToast('Avatar updated and saved to profile!', 'success');
    loadProfile();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleChangePassword(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('pw-current').value;
  const newPassword = document.getElementById('pw-new').value;
  const confirmPassword = document.getElementById('pw-confirm').value;

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  try {
    await apiRequest(`${API_URL}/api/auth/change-password`, {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    showToast('Password changed successfully!', 'success');
    document.getElementById('change-password-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 15. ADMIN PANEL MODULE
// ==============================================================================

async function loadAdminPanel() {
  const user = protectPage(['admin']);
  if (!user) return;
  initAppLayout();

  try {
    const statsData = await apiRequest(`${API_URL}/api/admin/stats`);
    if (statsData.success) {
      document.getElementById('adm-total-users').textContent = statsData.stats.totalUsers;
      document.getElementById('adm-total-students').textContent = statsData.stats.totalStudents;
      document.getElementById('adm-total-faculty').textContent = statsData.stats.totalFaculty;
      document.getElementById('adm-total-announcements').textContent = statsData.stats.totalAnnouncements;
      document.getElementById('adm-total-events').textContent = statsData.stats.totalEvents;
      document.getElementById('adm-total-clubs').textContent = statsData.stats.totalClubs;
      document.getElementById('adm-total-resources').textContent = statsData.stats.totalResources;
      document.getElementById('adm-total-feedback').textContent = statsData.stats.totalFeedback;
      document.getElementById('adm-total-lostfound').textContent = statsData.stats.totalLostFound;
    }
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }

  const searchInput = document.getElementById('user-search');
  const roleFilter = document.getElementById('user-role-filter');

  async function fetchUsers() {
    try {
      const search = searchInput ? searchInput.value : '';
      const role = roleFilter ? roleFilter.value : 'All';

      const data = await apiRequest(`${API_URL}/api/admin/users?search=${encodeURIComponent(search)}&role=${role}`);
      const tbody = document.getElementById('admin-users-tbody');

      if (!tbody) return;

      if (!data.users || data.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No users found.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.users.map((u) => `
        <tr>
          <td>
            <strong>${u.name}</strong>
            <div style="font-size: 12px; color: var(--text-muted);">${u.email}</div>
          </td>
          <td>${u.studentId || 'N/A'}</td>
          <td>${u.department || 'N/A'} (${u.year || 'N/A'})</td>
          <td>
            <select class="filter-select" style="padding: 4px 8px; font-size: 12px;" onchange="changeUserRole('${u._id}', this.value)">
              <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
              <option value="faculty" ${u.role === 'faculty' ? 'selected' : ''}>Faculty</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td>${formatDate(u.createdAt)}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteUserAccount('${u._id}')">Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading users: ' + err.message, 'error');
    }
  }

  if (searchInput) searchInput.addEventListener('input', fetchUsers);
  if (roleFilter) roleFilter.addEventListener('change', fetchUsers);

  fetchUsers();
}

async function changeUserRole(userId, newRole) {
  try {
    await apiRequest(`${API_URL}/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    showToast('User role updated successfully.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    loadAdminPanel();
  }
}

async function deleteUserAccount(userId) {
  if (!confirm('Are you sure you want to delete this user account?')) return;
  try {
    await apiRequest(`${API_URL}/api/admin/users/${userId}`, { method: 'DELETE' });
    showToast('User account deleted.', 'success');
    loadAdminPanel();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSendBroadcast(event) {
  event.preventDefault();
  const title = document.getElementById('bc-title').value;
  const message = document.getElementById('bc-message').value;
  const type = document.getElementById('bc-type').value;

  try {
    await apiRequest(`${API_URL}/api/notifications`, {
      method: 'POST',
      body: JSON.stringify({ title, message, type })
    });
    showToast('Broadcast notification dispatched to campus!', 'success');
    closeModal('broadcast-modal');
    document.getElementById('broadcast-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 16. AUTHENTICATION (LOGIN, REGISTER, 1-CLICK DEMO SIGN-IN)
// ==============================================================================

/**
 * 1-Click Instant Demo Sign-In
 * Supports 'student', 'faculty', and 'admin' roles
 */
async function handleDemoLogin(role) {
  try {
    showToast(`Signing in as Demo ${role.toUpperCase()}...`, 'info');
    const res = await apiRequest(`${API_URL}/api/auth/demo-login`, {
      method: 'POST',
      body: JSON.stringify({ role })
    });

    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      showToast(`Welcome, ${res.user.name}! Access granted.`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    }
  } catch (err) {
    showToast(err.message || 'Demo login failed.', 'error');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('Please fill in both email and password.', 'error');
    return;
  }

  try {
    const res = await apiRequest(`${API_URL}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      showToast(`Welcome back, ${res.user.name}! Redirecting...`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      showToast('Authentication succeeded but user data was missing.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Invalid email or password.', 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const studentId = document.getElementById('reg-studentid').value;
  const department = document.getElementById('reg-department').value;
  const year = document.getElementById('reg-year').value;
  const phone = document.getElementById('reg-phone').value;
  const role = document.getElementById('reg-role') ? document.getElementById('reg-role').value : 'student';

  if (!name || !email || !password) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters long.', 'error');
    return;
  }

  try {
    const res = await apiRequest(`${API_URL}/register`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        studentId,
        department,
        year,
        phone,
        role
      })
    });

    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      showToast('Registration successful! Welcome to Campus Connect.', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    } else {
      showToast('Registration completed. Please log in.', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 600);
    }
  } catch (err) {
    showToast(err.message || 'Registration failed. Please check your details.', 'error');
  }
}
