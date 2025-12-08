// Supabase Configuration - CREDENCIALES PRECONFIGURADAS
const SUPABASE_URL = 'https://mytpwjkvtezixhggyxht.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHB3amt2dGV6aXhoZ2d5eGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTE1ODcsImV4cCI6MjA3OTA4NzU4N30.oMxZljrtvgM_3CZjOvMDcfJz8uB7T4N9JvQAphmp3HM';
let supabase = null;

// Initialize Supabase
function initSupabase() {
    try {
        const { createClient } = window.supabase;
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        return true;
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        return false;
    }
}

// Load products from Supabase
async function loadProductsFromSupabase() {
    if (!supabase) {
        console.warn('Supabase no configurado, usando productos de ejemplo');
        return false;
    }
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
            products = data.map(product => ({
                id: product.id,
                name: product.name,
                category: product.category_slug,
                description: product.description,
                price: product.price,
                badge: product.badge || 'Nuevo',
                image: product.image_url
            }));
            console.log(`✅ ${products.length} productos cargados desde Supabase`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error cargando productos desde Supabase:', error);
        return false;
    }
}

// Load categories from Supabase
async function loadCategoriesFromSupabase() {
    if (!supabase) return false;
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');
        if (error) throw error;
        if (data && data.length > 0) {
            updateFiltersWithCategories(data);
            console.log(`✅ ${data.length} categorías cargadas desde Supabase`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error cargando categorías:', error);
        return false;
    }
}

// Update filters with dynamic categories
function updateFiltersWithCategories(categories) {
    const filtersContainer = document.querySelector('.filters');
    let filtersHTML = '<button class="filter-btn active" data-category="todos">Todos</button>';
    categories.forEach(cat => {
        const displayName = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
        filtersHTML += `<button class="filter-btn" data-category="${cat.slug}">${displayName}</button>`;
    });
    filtersContainer.innerHTML = filtersHTML;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentProductIndex = 0;
            filterProducts();
        });
    });
}

// Products array
let products = [];

// Application State
let cart = [];
let currentSlide = 0;
let autoplayInterval;
let userLocation = null;

// Variables para carga infinita
let currentProductIndex = 0;
const PRODUCTS_PER_PAGE = 10;
let isLoadingProducts = false;
let currentSearchTerm = '';
let currentFilteredProducts = [];
let isNavigating = false;

// Particles Animation
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const particleCount = window.innerWidth > 768 ? 60 : 30;
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.2
        });
    }
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const isDark = document.body.classList.contains('dark-mode');
        const color = isDark ? '212, 165, 116' : '139, 115, 85';
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
            ctx.fill();
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        });
        requestAnimationFrame(animate);
    }
    animate();
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Carousel
function initCarousel() {
    const track = document.getElementById('carouselTrack');
    const controls = document.getElementById('carouselControls');
    const slides = document.querySelectorAll('.carousel-slide');
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
        dot.addEventListener('click', () => {
            goToSlide(index);
            // Reiniciar autoplay después de interacción manual
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
            }
            autoplayInterval = setInterval(nextSlide, 6000);
        });
        controls.appendChild(dot);
    });
    // Iniciar autoplay
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
    }
    autoplayInterval = setInterval(nextSlide, 6000);
}

function goToSlide(index) {
    const track = document.getElementById('carouselTrack');
    const dots = document.querySelectorAll('.carousel-dot');
    currentSlide = index;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

function nextSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    currentSlide = (currentSlide + 1) % slides.length;
    goToSlide(currentSlide);
}

// Función para manejar la entrada del usuario en la barra de búsqueda
function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    currentSearchTerm = searchTerm;
    const activeCategory = document.querySelector('.filter-btn.active').dataset.category;
    currentProductIndex = 0;
    renderProducts(activeCategory, searchTerm);
    // Scroll automático a la sección de productos al escribir
    if (searchTerm.length > 0) {
        isNavigating = true;
        const productosSection = document.getElementById('productos');
        const productsGrid = document.getElementById('productsGrid');
        if (productosSection && productsGrid) {
            const headerOffset = document.getElementById('header')?.offsetHeight || 80;
            const searchBarHeight = 100; // Espacio adicional para ver la barra de búsqueda
            const elementPosition = productsGrid.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset - searchBarHeight;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            // Reactivar carga después del scroll
            setTimeout(() => {
                isNavigating = false;
            }, 800);
        }
    }
}

function filterByCategoryAndScroll(categorySlug) {
    // Marcar que estamos navegando
    isNavigating = true;
    console.log('🚫 Navegación a productos - carga pausada');
    // 1. Activar el botón de filtro correspondiente
    const filterBtn = document.querySelector(`.filter-btn[data-category="${categorySlug}"]`);
    if (filterBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        filterBtn.classList.add('active');
    }
    // 2. Aplicar el filtro (esto llama a renderProducts internamente)
    currentSearchTerm = '';
    currentProductIndex = 0;
    renderProducts(categorySlug, '');
    // 3. Desplazarse suavemente a la sección de productos
    const productosSection = document.getElementById('productos');
    if (productosSection) {
        const headerOffset = document.getElementById('header')?.offsetHeight || 80;
        const elementPosition = productosSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        // Listener para cuando termine el scroll
        const onScrollEnd = () => {
            setTimeout(() => {
                isNavigating = false;
                console.log('✅ Navegación a productos completada');
            }, 500);
            window.removeEventListener('scrollend', onScrollEnd);
        };
        if ('onscrollend' in window) {
            window.addEventListener('scrollend', onScrollEnd, { once: true });
        } else {
            setTimeout(() => {
                isNavigating = false;
            }, 2000);
        }
        setTimeout(() => {
            if (isNavigating) {
                isNavigating = false;
            }
        }, 3000);
    } else {
        isNavigating = false;
    }
}

// Función para renderizar productos con carga inicial
function renderProducts(category = 'todos', searchTerm = '') {
    const grid = document.getElementById('productsGrid');
    let filtered = products;
    if (category !== 'todos') {
        filtered = filtered.filter(p => p.category === category);
    }
    if (searchTerm) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm)
        );
    }
    currentFilteredProducts = filtered;
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-light);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🔍</div>
                <p style="font-size: 1.2rem;">No se encontraron productos</p>
            </div>
        `;
        return;
    }
    // Mostrar solo los primeros 10 productos
    const productsToShow = filtered.slice(0, PRODUCTS_PER_PAGE);
    currentProductIndex = PRODUCTS_PER_PAGE;
    grid.innerHTML = productsToShow.map(product => createProductCard(product)).join('');
    // Agregar indicador de carga al final si hay más productos
    if (currentProductIndex < filtered.length) {
        grid.innerHTML += `
            <div id="loadingIndicator" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-light); display: none;">
                <div class="spinner"></div>
                <p style="margin-top: 1rem;">Cargando más productos...</p>
            </div>
        `;
    }
}

// Función para crear tarjeta de producto
function createProductCard(product) {
    return `
        <div class="product-card">
            <div class="product-image-container">
                <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
                <span class="product-badge">${product.badge}</span>
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <div class="product-price">$U ${product.price}</div>
                    <div class="product-actions">
                        <button class="share-btn" onclick="shareProduct(${product.id}, 'whatsapp')" title="Compartir en WhatsApp">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </button>
                        <button class="add-to-cart-btn" onclick="addToCart(${product.id})">Agregar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Función para cargar más productos
function loadMoreProducts() {
    if (isLoadingProducts || isNavigating || currentProductIndex >= currentFilteredProducts.length) return;
    isLoadingProducts = true;
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) indicator.style.display = 'block';
    // Simular delay de carga
    setTimeout(() => {
        const grid = document.getElementById('productsGrid');
        const nextProducts = currentFilteredProducts.slice(
            currentProductIndex,
            currentProductIndex + PRODUCTS_PER_PAGE
        );
        // Remover indicador temporal
        if (indicator) indicator.remove();
        // Agregar nuevos productos
        nextProducts.forEach(product => {
            grid.insertAdjacentHTML('beforeend', createProductCard(product));
        });
        currentProductIndex += PRODUCTS_PER_PAGE;
        // Agregar indicador de nuevo si hay más productos
        if (currentProductIndex < currentFilteredProducts.length) {
            grid.insertAdjacentHTML('beforeend', `
                <div id="loadingIndicator" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-light); display: none;">
                    <div class="spinner"></div>
                    <p style="margin-top: 1rem;">Cargando más productos...</p>
                </div>
            `);
        }
        isLoadingProducts = false;
    }, 500);
}

// Detectar scroll para carga infinita
function handleInfiniteScroll() {
    // No cargar si estamos navegando
    if (isNavigating || isLoadingProducts) return;
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    // Solo cargar si estamos en la sección de productos
    const productsSection = document.getElementById('productos');
    if (!productsSection) return;
    const rect = productsSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    // Verificar si estamos realmente EN la sección productos (no solo pasando)
    const isInProductsSection = rect.top < windowHeight && rect.bottom > 0;
    if (!isInProductsSection) return;
    const gridBottom = grid.getBoundingClientRect().bottom;
    // Cargar más cuando falten 400px para llegar al final
    if (gridBottom - windowHeight < 400 && gridBottom > 0) {
        loadMoreProducts();
    }
}

// Cart Functions
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCart();
    animateCartIcon();
}

function animateCartIcon() {
    const cartBtn = document.getElementById('cartBtn');
    cartBtn.style.transform = 'scale(1.2)';
    setTimeout(() => {
        cartBtn.style.transform = 'scale(1)';
    }, 300);
}

function updateCart() {
    const container = document.getElementById('cartItemsContainer');
    const badge = document.getElementById('cartBadge');
    const total = document.getElementById('totalAmount');
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <p class="empty-cart-text">Tu carrito está vacío</p>
            </div>
        `;
        badge.style.display = 'none';
    } else {
        badge.style.display = 'flex';
        badge.textContent = itemCount;
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price} × ${item.quantity}</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="remove-btn" onclick="removeFromCart(${item.id})">Eliminar</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    total.textContent = `${totalAmount}`;
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
}

function shareProduct(productId, platform) {
    const product = products.find(p => p.id === productId);
    const url = encodeURIComponent(window.location.origin + window.location.pathname);
    const message = `¡Mirá este producto de Quesería y Almacén Natural VyC! ${product.name} - ${product.price}%0A%0A${url}`;
    if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${message}`, '_blank');
    } else if (platform === 'instagram') {
        alert('Para compartir en Instagram, tomá captura y publicá en tus historias 📸');
    }
}

// UI Controls
document.getElementById('themeToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
});

document.getElementById('menuToggle').addEventListener('click', function() {
    this.classList.toggle('active');
    document.getElementById('sideMenu').classList.toggle('active');
});

// Mejorar los links del menú para evitar carga infinita durante navegación
document.querySelectorAll('.menu-link, .desktop-nav a, a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        // Si es un anchor link
        if (href && href.startsWith('#')) {
            e.preventDefault();
            // Marcar que estamos navegando INMEDIATAMENTE
            isNavigating = true;
            console.log('🚫 Navegación bloqueada - carga de productos pausada');
            // Cerrar menú móvil si está abierto
            document.getElementById('sideMenu').classList.remove('active');
            document.getElementById('menuToggle').classList.remove('active');
            // Obtener la sección destino
            const targetId = href.substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                const headerOffset = document.getElementById('header')?.offsetHeight || 80;
                const elementPosition = targetSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                // Listener para cuando termine el scroll
                const onScrollEnd = () => {
                    setTimeout(() => {
                        isNavigating = false;
                        console.log('✅ Navegación completada - carga de productos reactivada');
                    }, 500); // Medio segundo extra después de terminar
                    window.removeEventListener('scrollend', onScrollEnd);
                };
                // Usar scrollend si está disponible
                if ('onscrollend' in window) {
                    window.addEventListener('scrollend', onScrollEnd, { once: true });
                } else {
                    // Fallback para navegadores que no soportan scrollend
                    setTimeout(() => {
                        isNavigating = false;
                        console.log('✅ Navegación completada (fallback) - carga de productos reactivada');
                    }, 2000);
                }
                // Timeout de seguridad por si algo falla
                setTimeout(() => {
                    if (isNavigating) {
                        isNavigating = false;
                        console.log('⏱️ Timeout de seguridad - carga reactivada');
                    }
                }, 3000);
            } else {
                isNavigating = false;
            }
        }
    });
});

document.getElementById('cartBtn').addEventListener('click', () => {
    document.getElementById('cartPanel').classList.add('active');
});

document.getElementById('closeCartBtn').addEventListener('click', () => {
    document.getElementById('cartPanel').classList.remove('active');
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    document.getElementById('checkoutModal').classList.add('active');
});

document.getElementById('locationBtn').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            alert('✓ Ubicación capturada correctamente');
        }, () => {
            alert('No se pudo obtener la ubicación. Por favor ingresá tu dirección manualmente.');
        });
    } else {
        alert('Tu navegador no soporta geolocalización.');
    }
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('checkoutModal').classList.remove('active');
});

document.getElementById('checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const address = document.getElementById('addressInput').value;
    const payment = document.querySelector('input[name="payment"]:checked').value;
    let message = '🛒 *Nuevo Pedido - Quesería y Almacén Natural V&C*\n';
    cart.forEach(item => {
        message += `• ${item.quantity}x ${item.name} - ${item.price * item.quantity}\n`;
    });
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `\n*Total: ${total}*\n`;
    message += `💳 Pago: ${payment}\n`;
    message += `📍 Dirección: ${address}\n`;
    if (userLocation) {
        message += `🗺️ Ubicación: https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}\n`;
    }
    const phoneNumber = '+598 99 015 691';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    cart = [];
    updateCart();
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('cartPanel').classList.remove('active');
    document.getElementById('checkoutForm').reset();
});

document.getElementById('checkoutModal').addEventListener('click', (e) => {
    if (e.target.id === 'checkoutModal') {
        e.target.classList.remove('active');
    }
});

// Header scroll effect y barra de búsqueda fija / lupa flotante
let searchOriginalOffset = 0;
let searchContainer = null;
let searchFloatBtn = null;

window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    // Inicializar referencias
    if (!searchContainer) {
        searchContainer = document.querySelector('.search-container');
        searchFloatBtn = document.getElementById('searchFloatBtn');
        if (searchContainer && !searchContainer.classList.contains('expanded')) {
            const rect = searchContainer.getBoundingClientRect();
            searchOriginalOffset = rect.top + window.scrollY;
            console.log('📏 Offset de búsqueda:', searchOriginalOffset);
        }
    }
    if (searchContainer && searchOriginalOffset > 0) {
        // Detectar si es móvil vertical
        const isMobilePortrait = window.innerWidth <= 768 && window.matchMedia("(orientation: portrait)").matches;
        if (window.scrollY >= searchOriginalOffset - 100) {
            if (isMobilePortrait) {
                // MÓVIL VERTICAL: mostrar lupa flotante en vez de barra fija
                if (!searchContainer.classList.contains('expanded')) {
                    searchContainer.classList.add('fixed');
                    if (searchFloatBtn && !searchFloatBtn.classList.contains('active')) {
                        searchFloatBtn.classList.add('active');
                        console.log('🔍 Lupa activada');
                    }
                }
            } else {
                // ESCRITORIO Y MÓVIL HORIZONTAL: barra fija normal
                if (!searchContainer.classList.contains('fixed')) {
                    searchContainer.classList.add('fixed');
                }
                if (searchFloatBtn) {
                    searchFloatBtn.classList.remove('active');
                }
            }
        } else {
            // Volver a estado normal
            searchContainer.classList.remove('fixed');
            if (searchFloatBtn) {
                searchFloatBtn.classList.remove('active');
            }
        }
    }
    // Carga infinita solo si NO estamos navegando
    if (!isNavigating) {
        handleInfiniteScroll();
    }
});

// Función para manejar el botón flotante de búsqueda
function initSearchFloatButton() {
    const floatBtn = document.getElementById('searchFloatBtn');
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('searchInput');
    const closeBtn = document.getElementById('searchCloseBtn');
    if (!floatBtn || !searchContainer) {
        console.error('❌ No se encontraron los elementos de búsqueda');
        return;
    }
    console.log('✅ Botón de búsqueda inicializado');
    // Abrir barra al tocar lupa
    floatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🔍 Lupa clickeada');
        searchContainer.classList.add('expanded');
        searchContainer.classList.remove('fixed');
        floatBtn.style.opacity = '0';
        floatBtn.style.pointerEvents = 'none';
        setTimeout(() => {
            searchInput.focus();
        }, 300);
    });
    // Cerrar barra
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('❌ Cerrando búsqueda');
        searchContainer.classList.remove('expanded');
        searchInput.value = '';
        filterProducts();
        // Volver a mostrar lupa si ya pasamos el scroll
        setTimeout(() => {
            if (window.scrollY >= searchOriginalOffset - 100 && 
                window.innerWidth <= 768 && 
                window.matchMedia("(orientation: portrait)").matches) {
                floatBtn.style.opacity = '1';
                floatBtn.style.pointerEvents = 'auto';
            }
        }, 300);
    });
    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (searchContainer.classList.contains('expanded') &&
            !searchContainer.contains(e.target) &&
            !floatBtn.contains(e.target)) {
            console.log('👆 Click fuera, cerrando búsqueda');
            closeBtn.click();
        }
    });
    // Prevenir que el click en el input cierre la barra
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Control de música de fondo
function initBackgroundMusic() {
    const audio = document.getElementById('backgroundMusic');
    const toggleBtn = document.getElementById('musicToggle');
    let isPlaying = false;
    let musicStarted = false;
    audio.volume = 0.3;
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPlaying) {
            audio.pause();
            toggleBtn.textContent = '🔇';
            toggleBtn.classList.remove('playing');
            isPlaying = false;
        } else {
            audio.play().then(() => {
                toggleBtn.textContent = '🔊';
                toggleBtn.classList.add('playing');
                isPlaying = true;
                musicStarted = true;
            }).catch(err => {
                console.log('No se pudo reproducir la música:', err);
                alert('Por favor activa el sonido tocando el botón 🔊');
            });
        }
    });
    const startMusic = () => {
        if (!musicStarted) {
            audio.play().then(() => {
                isPlaying = true;
                musicStarted = true;
                toggleBtn.textContent = '🔊';
                toggleBtn.classList.add('playing');
                console.log('✅ Música iniciada correctamente');
                removeAllListeners();
            }).catch(err => {
                console.log('⚠️ Reproducción automática bloqueada:', err);
            });
        }
    };
    const removeAllListeners = () => {
        window.removeEventListener('scroll', startMusic);
        window.removeEventListener('touchstart', startMusic);
        window.removeEventListener('touchmove', startMusic);
        document.removeEventListener('click', startMusic);
        document.body.removeEventListener('touchend', startMusic);
    };
    audio.play().then(() => {
        isPlaying = true;
        musicStarted = true;
        toggleBtn.textContent = '🔊';
        toggleBtn.classList.add('playing');
        console.log('✅ Música iniciada automáticamente');
    }).catch(() => {
        console.log('⚠️ Reproducción bloqueada, esperando interacción del usuario');
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            toggleBtn.style.animation = 'pulse 2s infinite';
            console.log('📱 Dispositivo móvil detectado - pulsa para activar música');
        }
        window.addEventListener('scroll', startMusic, { passive: true });
        window.addEventListener('touchstart', startMusic, { passive: true });
        window.addEventListener('touchmove', startMusic, { passive: true, once: true });
        document.addEventListener('click', startMusic);
        document.body.addEventListener('touchend', startMusic, { passive: true, once: true });
        setTimeout(() => {
            if (!musicStarted) {
                removeAllListeners();
                console.log('⏱️ Timeout: listeners removidos');
            }
        }, 30000);
    });
}

// Pause carousel on hover con mejor manejo
const carouselContainer = document.querySelector('.carousel-container');
if (carouselContainer) {
    carouselContainer.addEventListener('mouseenter', () => {
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
            autoplayInterval = null;
        }
    });
    carouselContainer.addEventListener('mouseleave', () => {
        if (!autoplayInterval) {
            autoplayInterval = setInterval(nextSlide, 6000);
        }
    });
}

// Asegurar que el autoplay siempre esté activo (recuperación automática)
setInterval(() => {
    // Si no hay autoplay activo y no estamos con hover en el carrusel
    if (!autoplayInterval && carouselContainer && !carouselContainer.matches(':hover')) {
        autoplayInterval = setInterval(nextSlide, 6000);
        console.log('🔄 Autoplay del carrusel reactivado');
    }
}, 10000); // Verificar cada 10 segundos

// Prevenir que otros eventos detengan el carrusel
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !autoplayInterval) {
        autoplayInterval = setInterval(nextSlide, 6000);
        console.log('👁️ Autoplay reactivado al volver a la pestaña');
    }
});

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🧀 Quesería y Almacén Natural V&C - Inicializando...');
    const supabaseConnected = initSupabase();
    if (supabaseConnected) {
        console.log('✅ Supabase conectado');
        await loadCategoriesFromSupabase();
        const productsLoaded = await loadProductsFromSupabase();
        if (!productsLoaded) {
            console.warn('⚠️ No se pudieron cargar productos desde Supabase, usando productos de ejemplo');
        }
    } else {
        console.warn('⚠️ Supabase no configurado');
        console.warn('📦 Usando productos de ejemplo');
    }
    initParticles();
    initCarousel();
    renderProducts();
    updateCart();
    initBackgroundMusic();
    initSearchFloatButton();
    console.log('✅ Aplicación inicializada');
});