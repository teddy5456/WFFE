document.addEventListener('DOMContentLoaded', function() {
  // ================ GLOBAL VARIABLES ================
  const body = document.body;
  const html = document.documentElement;

  // DOM Elements cache
  const domElements = {
    navBtns: document.querySelector('.nav-btns'),
    announcementBar: document.querySelector('.announcement-bar'),
    mobileMenu: document.getElementById('mobileMenu'),
    header: document.querySelector('.main-header'),
    searchContainer: document.querySelector('.search-container'),
    cartContainer: document.querySelector('.cart-container'),
    // Add other elements as needed
  };
  
  // ================ UTILITY FUNCTIONS ================
  const debounce = (func, wait = 100) => {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, wait);
    };
  };

  const throttle = (func, limit = 100) => {
    let lastFunc;
    let lastRan;
    return function() {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  };

  function getCookieValue(name) {
    const cookies = document.cookie.split('; ');
    for (let cookie of cookies) {
      const [key, value] = cookie.split('=');
      if (key === name) {
        return value;
      }
    }
    return null;
  }

  // ================ AUTHENTICATION STATE MANAGEMENT ================
  const authState = {
    isChecking: true,
    isAuthenticated: false,
    user: null,
    lastChecked: 0
  };

  // Cache management functions
  function cacheAuthState(user) {
    try {
      const authData = {
        user,
        timestamp: Date.now()
      };
      // Use sessionStorage for temporary cache (cleared when browser closes)
      sessionStorage.setItem('authCache', JSON.stringify(authData));
      // Use localStorage for longer persistence (but verify with server)
      localStorage.setItem('authCache', JSON.stringify(authData));
    } catch (error) {
      console.error('Failed to cache auth state:', error);
    }
  }

  function getCachedAuthState() {
    try {
      // First check sessionStorage
      let cached = sessionStorage.getItem('authCache');
      if (!cached) {
        // Fall back to localStorage
        cached = localStorage.getItem('authCache');
      }
      
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      
      // Consider cache valid for 15 minutes (can be adjusted)
      const CACHE_VALIDITY_PERIOD = 15 * 60 * 1000; // 15 minutes
      if (Date.now() - data.timestamp > CACHE_VALIDITY_PERIOD) {
        clearAuthCache();
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to retrieve cached auth state:', error);
      return null;
    }
  }

  function clearAuthCache() {
    sessionStorage.removeItem('authCache');
    localStorage.removeItem('authCache');
  }

  // ================ AUTHENTICATION FUNCTIONS ================
  async function checkAuthStatus() {
    try {
      const sessionId = getCookieValue('session_id');
      const response = await fetch('http://localhost:8000/api/check-auth', {
        method: 'GET',
        headers: {
          'Authorization': sessionId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Authentication check failed');
      }
      
      const result = await response.json();
      
      // Update cache if authenticated
      if (result.authenticated && result.user) {
        cacheAuthState(result.user);
      } else {
        clearAuthCache();
      }
      
      return result;
    } catch (error) {
      console.error('Error checking authentication:', error);
      clearAuthCache();
      return { authenticated: false };
    }
  }

  async function logout() {
    try {
      const sessionId = getCookieValue('session_id'); // <-- Add this line
      const response = await fetch('http://localhost:8000/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': sessionId || '',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
  
      if (response.ok) {
        document.cookie = 'session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        clearAuthCache();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }
  

  // ================ AUTH UI MANAGEMENT ================
  function showAuthLoading() {
    if (domElements.navBtns) {
      domElements.navBtns.innerHTML = `
        <div class="auth-loading">
          <div class="spinner"></div>
        </div>
      `;
    }
  }

  function updateAuthUI() {
    if (authState.isChecking && !getCachedAuthState()) {
      showAuthLoading();
      return;
    }

    const mainLinks = document.querySelectorAll('.main-nav-link, .mobile-main-link');
    const shopLinks = document.querySelectorAll('.shop-nav-link, .mobile-shop-link');

    if (authState.isAuthenticated) {
      renderAuthenticatedUI(authState.user);
      
      // Update main/dashboard links
      mainLinks.forEach(link => {
        link.style.display = authState.user?.role === 'admin' ? 'block' : 'none';
        link.textContent = 'Dashboard';
      });

      // Update shop/dashboard buttons
      shopLinks.forEach(link => {
        link.textContent = authState.user?.role === 'admin' ? 'Dashboard' : 'Shop';
      });
    } else {
      renderUnauthenticatedUI();
      mainLinks.forEach(link => link.style.display = 'none');
      shopLinks.forEach(link => link.textContent = 'Shop');
    }
  }

  function renderAuthenticatedUI(user) {
    if (!domElements.navBtns) return;
    
    domElements.navBtns.innerHTML = '';
    


    // Create logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-outline';
    logoutBtn.innerHTML = '<a href="#" id="logout-link">Logout</a>';
    domElements.navBtns.appendChild(logoutBtn);

    // Create dashboard or shop button based on role
    const roleButton = document.createElement('button');
    roleButton.className = 'btn btn-primary';

    if (user?.role === 'admin') {
      roleButton.innerHTML = '<a href="/dashboard/index.html">Dashboard</a>';
    } else {
      roleButton.innerHTML = '<a href="/products/product-landing.html">Shop</a>';
    }

    domElements.navBtns.appendChild(roleButton);

    // Add logout handler
    document.getElementById('logout-link').addEventListener('click', async function(e) {
      e.preventDefault();
      const success = await logout();
      if (success) {
        authState.isAuthenticated = false;
        authState.user = null;
        updateAuthUI();
        // Optional: Redirect to home page after logout
        window.location.href = '/products/product-landing.html';
      }
    });
  }

  function renderUnauthenticatedUI() {
    if (!domElements.navBtns) return;
    
    domElements.navBtns.innerHTML = `
      <button class="btn btn-outline">
        <a href="/auth/login.html">Login</a>
      </button>
      <button class="btn btn-primary">
        <a href="/auth/register.html">Get Started</a>
      </button>
    `;
  }

  // ================ INITIALIZATION ================
  async function initializeAuth() {
    // First check cache for immediate UI update
    const cachedAuth = getCachedAuthState();
    if (cachedAuth) {
      authState.isChecking = false;
      authState.isAuthenticated = true;
      authState.user = cachedAuth.user;
      updateAuthUI();
    }

    // Then verify with server
    try {
      const authStatus = await checkAuthStatus();
      authState.isChecking = false;
      authState.isAuthenticated = authStatus.authenticated;
      authState.user = authStatus.user || null;
      
      if (!authStatus.authenticated) {
        clearAuthCache();
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      authState.isChecking = false;
      authState.isAuthenticated = false;
      clearAuthCache();
    }
    
    updateAuthUI();
  }

  // ================ MAIN INITIALIZATION ================
  function init() {
    initializeAuth();
    
    // Initialize other components
    initAnnouncementBar();
    initMobileMenu();
    initHeaderScroll();
    initSearch();
    initCart();
  }

  // ================ COMPONENT INITIALIZERS ================
  function initAnnouncementBar() {
    const announcementClose = document.querySelector('.announcement-close');
    if (announcementClose && domElements.announcementBar) {
      announcementClose.addEventListener('click', () => {
        domElements.announcementBar.style.display = 'none';
        localStorage.setItem('announcementDismissed', 'true');
      });

      if (localStorage.getItem('announcementDismissed') === 'true') {
        domElements.announcementBar.style.display = 'none';
      }
    }
  }

  function initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');

    if (mobileMenuToggle && domElements.mobileMenu) {
      mobileMenuToggle.addEventListener('click', () => {
        domElements.mobileMenu.classList.add('active');
        body.style.overflow = 'hidden';
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
      });
    }

    if (mobileMenuClose && domElements.mobileMenu) {
      mobileMenuClose.addEventListener('click', () => {
        domElements.mobileMenu.classList.remove('active');
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      });
    }

    mobileDropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const parent = toggle.closest('.mobile-dropdown');
        parent.classList.toggle('active');
      });
    });
  }

  function initHeaderScroll() {
    if (domElements.header) {
      let lastScroll = 0;

      const handleHeaderScroll = throttle(() => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 100) {
          domElements.header.classList.remove('scrolled');
        } else {
          domElements.header.classList.add('scrolled');
          
          if (currentScroll > lastScroll && currentScroll > 200) {
            domElements.header.style.transform = 'translateY(-100%)';
          } else {
            domElements.header.style.transform = 'translateY(0)';
          }
        }
        
        lastScroll = currentScroll;
      }, 100);

      window.addEventListener('scroll', handleHeaderScroll);
    }
  }

  function initSearch() {
    const searchToggle = document.querySelector('.search-toggle');
    const searchDropdown = document.querySelector('.search-dropdown');

    if (searchToggle && domElements.searchContainer) {
      searchToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        domElements.searchContainer.classList.toggle('active');
        
        if (domElements.searchContainer.classList.contains('active') && searchDropdown) {
          searchDropdown.querySelector('input').focus();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container') && domElements.searchContainer) {
        domElements.searchContainer.classList.remove('active');
      }
    });
  }

  function initCart() {
    // Initialize cart functionality
    // ... (existing cart implementation)
  }

  // Start the application
  init();
});