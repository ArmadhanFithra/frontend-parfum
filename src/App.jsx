import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const ORDER_STATUSES = ['Diproses', 'Dikirim', 'Selesai', 'Dibatalkan'];

const emptyParfumForm = {
  id: null,
  kategori_id: '',
  nama_parfum: '',
  ukuran_ml: '',
  harga: '',
  stok: '',
  image_url: '',
};

const fallbackPerfumeImage =
  'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=900&q=80';

const emptyKategoriForm = {
  id: null,
  nama_kategori: '',
};

const emptyRegisterForm = {
  nama_pelanggan: '',
  email: '',
  no_whatsapp: '',
  username: '',
  password: '',
  password_confirmation: '',
};

const emptyAdminUserForm = {
  username: '',
  password: '',
};

const emptySearch = {
  parfum: '',
  katalog: '',
  orders: '',
  transaksi: '',
  pelanggan: '',
  kategori: '',
  users: '',
};

const matchesKeyword = (values, keyword) => {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) return true;

  return values
    .filter((value) => value !== null && value !== undefined)
    .some((value) => String(value).toLowerCase().includes(normalizedKeyword));
};

function App() {
  const [activeMenu, setActiveMenu] = useState('parfum');
  const [token, setToken] = useState(() => localStorage.getItem('parfum_token') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('parfum_role') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMessage, setRegisterMessage] = useState('');

  const [parfums, setParfums] = useState([]);
  const [kategoris, setKategoris] = useState([]);
  const [pelanggans, setPelanggans] = useState([]);
  const [transaksis, setTransaksis] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);

  const [form, setForm] = useState(emptyParfumForm);
  const [isEditing, setIsEditing] = useState(false);
  const [kategoriForm, setKategoriForm] = useState(emptyKategoriForm);
  const [isEditingKategori, setIsEditingKategori] = useState(false);
  const [adminUserForm, setAdminUserForm] = useState(emptyAdminUserForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState(emptySearch);
  const [cartItems, setCartItems] = useState([]);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSort, setCatalogSort] = useState('recommended');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState(null);
  const [isTransactionDetailLoading, setIsTransactionDetailLoading] = useState(false);

  const kategoriById = useMemo(() => {
    return kategoris.reduce((result, kategori) => {
      result[kategori.id] = kategori.nama_kategori;
      return result;
    }, {});
  }, [kategoris]);

  const pelangganById = useMemo(() => {
    return pelanggans.reduce((result, pelanggan) => {
      result[pelanggan.id] = pelanggan.nama_pelanggan;
      return result;
    }, {});
  }, [pelanggans]);

  const totalStok = useMemo(() => {
    return parfums.reduce((total, parfum) => total + Number(parfum.stok || 0), 0);
  }, [parfums]);

  const totalTransaksi = useMemo(() => {
    return transaksis.reduce((total, transaksi) => total + Number(transaksi.total_harga || 0), 0);
  }, [transaksis]);

  const filteredParfums = useMemo(() => {
    return parfums.filter((parfum) => {
      return matchesKeyword(
        [
          parfum.id,
          parfum.nama_parfum,
          parfum.nama_kategori || kategoriById[parfum.kategori_id],
          parfum.ukuran_ml,
          parfum.harga,
          parfum.stok,
        ],
        search.parfum,
      );
    });
  }, [kategoriById, parfums, search.parfum]);

  const catalogCategories = useMemo(() => {
    return [...new Set(parfums
      .map((parfum) => parfum.nama_kategori || kategoriById[parfum.kategori_id])
      .filter(Boolean))]
      .sort((first, second) => first.localeCompare(second));
  }, [kategoriById, parfums]);

  const filteredCatalogParfums = useMemo(() => {
    const filteredProducts = parfums.filter((parfum) => {
      const categoryName = parfum.nama_kategori || kategoriById[parfum.kategori_id];
      const matchesCategory = catalogCategory === 'all' || categoryName === catalogCategory;

      return matchesCategory && matchesKeyword(
        [
          parfum.id,
          parfum.nama_parfum,
          categoryName,
          parfum.ukuran_ml,
          parfum.harga,
          parfum.stok,
        ],
        search.katalog,
      );
    });

    return [...filteredProducts].sort((first, second) => {
      if (catalogSort === 'price-low') return Number(first.harga || 0) - Number(second.harga || 0);
      if (catalogSort === 'price-high') return Number(second.harga || 0) - Number(first.harga || 0);
      if (catalogSort === 'stock-high') return Number(second.stok || 0) - Number(first.stok || 0);
      return Number(first.id || 0) - Number(second.id || 0);
    });
  }, [catalogCategory, catalogSort, kategoriById, parfums, search.katalog]);

  const filteredCustomerOrders = useMemo(() => {
    return customerOrders.filter((order) => {
      return matchesKeyword(
        [
          order.id,
          order.tanggal_pembelian,
          order.total_harga,
          order.status_pesanan,
          ...(order.items || []).map((item) => item.nama_parfum),
        ],
        search.orders,
      );
    });
  }, [customerOrders, search.orders]);

  const filteredTransaksis = useMemo(() => {
    return transaksis.filter((transaksi) => {
      return matchesKeyword(
        [
          transaksi.id,
          pelangganById[transaksi.pelanggan_id],
          transaksi.tanggal_pembelian,
          transaksi.total_harga,
          transaksi.status_pesanan,
        ],
        search.transaksi,
      );
    });
  }, [pelangganById, search.transaksi, transaksis]);

  const filteredPelanggans = useMemo(() => {
    return pelanggans.filter((pelanggan) => {
      return matchesKeyword(
        [pelanggan.id, pelanggan.nama_pelanggan, pelanggan.email, pelanggan.no_whatsapp],
        search.pelanggan,
      );
    });
  }, [pelanggans, search.pelanggan]);

  const filteredKategoris = useMemo(() => {
    return kategoris.filter((kategori) => {
      return matchesKeyword([kategori.id, kategori.nama_kategori], search.kategori);
    });
  }, [kategoris, search.kategori]);

  const filteredAdminUsers = useMemo(() => {
    return adminUsers.filter((user) => {
      return matchesKeyword(
        [user.id, user.username, user.role],
        search.users,
      );
    });
  }, [adminUsers, search.users]);

  const cartDetails = useMemo(() => {
    return cartItems
      .map((item) => {
        const parfum = parfums.find((product) => product.id === item.parfum_id);
        if (!parfum) return null;

        return {
          ...item,
          parfum,
          subtotal: Number(parfum.harga || 0) * item.kuantitas,
        };
      })
      .filter(Boolean);
  }, [cartItems, parfums]);

  const cartTotal = useMemo(() => {
    return cartDetails.reduce((total, item) => total + item.subtotal, 0);
  }, [cartDetails]);

  const clearSession = useCallback(() => {
    localStorage.removeItem('parfum_token');
    localStorage.removeItem('parfum_role');
    setToken('');
    setUserRole('');
    setActiveMenu('parfum');
    setParfums([]);
    setKategoris([]);
    setPelanggans([]);
    setTransaksis([]);
    setAdminUsers([]);
    setCustomerProfile(null);
    setCustomerOrders([]);
    setSearch(emptySearch);
    setCatalogCategory('all');
    setCatalogSort('recommended');
    setSelectedProduct(null);
    setSelectedTransactionDetail(null);
    setCartItems([]);
    setMessage('');
    setError('');
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);
    }

    clearSession();
  }, [clearSession, token]);

  const apiRequest = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        clearSession();
        throw new Error('Sesi login habis atau token tidak valid. Silakan login ulang.');
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Request API gagal diproses.');
      }

      return data;
    },
    [clearSession, token],
  );

  const fetchAllData = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError('');

    try {
      if (userRole === 'pelanggan') {
        const [katalogData, profileData, ordersData] = await Promise.all([
          apiRequest('/katalog-pelanggan'),
          apiRequest('/customer/profile'),
          apiRequest('/customer/orders'),
        ]);

        setParfums(Array.isArray(katalogData) ? katalogData : []);
        setCustomerProfile(profileData && typeof profileData === 'object' ? profileData : null);
        setCustomerOrders(Array.isArray(ordersData) ? ordersData : []);
        setKategoris([]);
        setPelanggans([]);
        setTransaksis([]);
        setAdminUsers([]);
        return;
      }

      const [parfumData, kategoriData, pelangganData, transaksiData] = await Promise.all([
        apiRequest('/parfum'),
        apiRequest('/kategori'),
        apiRequest('/pelanggan'),
        apiRequest('/transaksi'),
      ]);

      const usersData = await apiRequest('/admin/users');

      setParfums(Array.isArray(parfumData) ? parfumData : []);
      setKategoris(Array.isArray(kategoriData) ? kategoriData : []);
      setPelanggans(Array.isArray(pelangganData) ? pelangganData : []);
      setTransaksis(Array.isArray(transaksiData) ? transaksiData : []);
      setAdminUsers(Array.isArray(usersData) ? usersData.filter((user) => user.role === 'admin') : []);
      setCustomerProfile(null);
      setCustomerOrders([]);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, token, userRole]);

  useEffect(() => {
    // Dashboard data must load as soon as a valid token exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => {
      setMessage('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  const handleLoginChange = (event) => {
    setLoginForm({ ...loginForm, [event.target.name]: event.target.value });
  };

  const handleRegisterChange = (event) => {
    setRegisterForm({ ...registerForm, [event.target.name]: event.target.value });
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setRegisterLoading(true);
    setLoginError('');
    setRegisterMessage('');

    try {
      if (registerForm.password.length < 8) {
        throw new Error('Password minimal 8 karakter.');
      }

      if (registerForm.password !== registerForm.password_confirmation) {
        throw new Error('Konfirmasi password tidak sama.');
      }

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Register gagal.');
      }

      setRegisterForm(emptyRegisterForm);
      setRegisterMessage(data.message || 'Register berhasil, silakan login.');
      setAuthMode('login');
    } catch (registerError) {
      setLoginError(registerError.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login gagal.');
      }

      localStorage.setItem('parfum_token', data.token);
      localStorage.setItem('parfum_role', data.role || 'admin');
      setToken(data.token);
      setUserRole(data.role || 'admin');
      setActiveMenu((data.role || 'admin') === 'pelanggan' ? 'katalog' : 'parfum');
      setLoginForm({ username: '', password: '' });
      setMessage('Login berhasil. Data dashboard sedang dimuat.');
    } catch (loginRequestError) {
      setLoginError(loginRequestError.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInputChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleKategoriInputChange = (event) => {
    setKategoriForm({ ...kategoriForm, [event.target.name]: event.target.value });
  };

  const handleAdminUserInputChange = (event) => {
    setAdminUserForm({ ...adminUserForm, [event.target.name]: event.target.value });
  };

  const handleSearchChange = (tableName) => (event) => {
    setSearch((currentSearch) => ({
      ...currentSearch,
      [tableName]: event.target.value,
    }));
  };

  const clearSearch = (tableName) => {
    setSearch((currentSearch) => ({
      ...currentSearch,
      [tableName]: '',
    }));
  };

  const addToCart = (parfum) => {
    const stock = Number(parfum.stok || 0);
    const existingItem = cartItems.find((item) => item.parfum_id === parfum.id);

    if (stock <= 0) {
      setError('Stok parfum ini sedang kosong.');
      return;
    }

    if (existingItem?.kuantitas >= stock) {
      setMessage('Jumlah di keranjang sudah mencapai stok tersedia.');
      return;
    }

    setError('');
    setCartItems((currentItems) =>
      existingItem
        ? currentItems.map((item) =>
            item.parfum_id === parfum.id
              ? { ...item, kuantitas: item.kuantitas + 1 }
              : item,
          )
        : [...currentItems, { parfum_id: parfum.id, kuantitas: 1 }],
    );
  };

  const updateCartQuantity = (parfumId, value) => {
    const parfum = parfums.find((product) => product.id === parfumId);
    const maxStock = Number(parfum?.stok || 1);
    const nextQuantity = Math.min(Math.max(Number(value) || 1, 1), maxStock);

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.parfum_id === parfumId
          ? { ...item, kuantitas: nextQuantity }
          : item,
      ),
    );
  };

  const removeCartItem = (parfumId) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.parfum_id !== parfumId));
  };

  const handleCheckout = async () => {
    setError('');
    setMessage('');

    if (!cartItems.length) {
      setError('Keranjang masih kosong.');
      return;
    }

    setIsCheckoutLoading(true);

    try {
      const data = await apiRequest('/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: cartItems,
        }),
      });

      setMessage(`${data?.message || 'Checkout berhasil'}. Total: ${formatRupiah(data?.total_harga || cartTotal)}.`);
      setCartItems([]);
      fetchAllData();
    } catch (checkoutError) {
      setError(checkoutError.message);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const openTransactionDetail = async (transaksiId) => {
    setError('');
    setIsTransactionDetailLoading(true);

    try {
      const data = await apiRequest(`/transaksi/${transaksiId}/detail`);
      setSelectedTransactionDetail(data);
    } catch (detailError) {
      setError(detailError.message);
    } finally {
      setIsTransactionDetailLoading(false);
    }
  };

  const handleOrderStatusChange = async (transaksi, nextStatus) => {
    setError('');
    setMessage('');

    try {
      const data = await apiRequest(`/transaksi/${transaksi.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status_pesanan: nextStatus }),
      });

      setTransaksis((currentTransaksis) =>
        currentTransaksis.map((item) =>
          item.id === transaksi.id ? { ...item, status_pesanan: nextStatus } : item,
        ),
      );
      setMessage(data?.message || 'Status pesanan berhasil diupdate.');
    } catch (statusError) {
      setError(statusError.message);
    }
  };

  const resetParfumForm = () => {
    setForm(emptyParfumForm);
    setIsEditing(false);
  };

  const resetKategoriForm = () => {
    setKategoriForm(emptyKategoriForm);
    setIsEditingKategori(false);
  };

  const handleAdminUserSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (adminUserForm.username.trim().length < 3) {
        throw new Error('Username admin minimal 3 karakter.');
      }

      if (adminUserForm.password.length < 8) {
        throw new Error('Password admin minimal 8 karakter.');
      }

      const data = await apiRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify(adminUserForm),
      });

      setAdminUserForm(emptyAdminUserForm);
      setMessage(data?.message || 'Akun admin berhasil dibuat.');
      fetchAllData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const path = isEditing ? `/parfum/${form.id}` : '/parfum';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      if (!form.nama_parfum.trim()) {
        throw new Error('Nama parfum wajib diisi.');
      }

      if (Number(form.ukuran_ml) <= 0) {
        throw new Error('Ukuran ml harus lebih dari 0.');
      }

      if (Number(form.harga) <= 0) {
        throw new Error('Harga harus lebih dari 0.');
      }

      if (Number(form.stok) < 0) {
        throw new Error('Stok tidak boleh minus.');
      }

      const payload = {
        kategori_id: form.kategori_id,
        nama_parfum: form.nama_parfum.trim(),
        ukuran_ml: form.ukuran_ml,
        harga: form.harga,
        stok: form.stok,
        image_url: form.image_url.trim(),
      };

      const data = await apiRequest(path, {
        method,
        body: JSON.stringify(payload),
      });

      setMessage(data?.message || 'Data parfum berhasil disimpan.');
      resetParfumForm();
      fetchAllData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const startEditParfum = (parfum) => {
    setForm({
      id: parfum.id,
      kategori_id: parfum.kategori_id || '',
      nama_parfum: parfum.nama_parfum || '',
      ukuran_ml: parfum.ukuran_ml || '',
      harga: parfum.harga || '',
      stok: parfum.stok || '',
      image_url: parfum.image_url || '',
    });
    setIsEditing(true);
    setActiveMenu('parfum');
  };

  const confirmDeleteParfum = (id) => {
    setItemToDelete({
      id,
      type: 'parfum',
      title: 'Hapus Produk?',
      message: 'Data parfum akan dihapus permanen.',
    });
    setIsModalOpen(true);
  };

  const handleKategoriSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const path = isEditingKategori ? `/kategori/${kategoriForm.id}` : '/kategori';
    const method = isEditingKategori ? 'PUT' : 'POST';

    try {
      const data = await apiRequest(path, {
        method,
        body: JSON.stringify({ nama_kategori: kategoriForm.nama_kategori }),
      });

      setMessage(data?.message || 'Data kategori berhasil disimpan.');
      resetKategoriForm();
      fetchAllData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const startEditKategori = (kategori) => {
    setKategoriForm({
      id: kategori.id,
      nama_kategori: kategori.nama_kategori || '',
    });
    setIsEditingKategori(true);
    setActiveMenu('kategori');
  };

  const confirmDeleteKategori = (id) => {
    setItemToDelete({
      id,
      type: 'kategori',
      title: 'Hapus Kategori?',
      message: 'Data kategori akan dihapus permanen.',
    });
    setIsModalOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    setError('');
    setMessage('');

    try {
      const data = await apiRequest(`/${itemToDelete.type}/${itemToDelete.id}`, { method: 'DELETE' });
      setMessage(data?.message || 'Data berhasil dihapus.');
      setIsModalOpen(false);
      setItemToDelete(null);
      fetchAllData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const formatRupiah = (value) => {
    const number = Number(value || 0);
    return `Rp ${number.toLocaleString('id-ID')}`;
  };

  const formatDateTime = (value) => {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(String(value).replace(' ', 'T')));
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className={`login-card ${authMode === 'register' ? 'is-register' : ''}`}>
          <section className="login-showcase">
            <div className="login-pattern" />
            <div className="login-showcase-header">
              <p>Donn's Parfum</p>
              <h1>Admin Atelier</h1>
            </div>

            <div className="perfume-visual" aria-hidden="true">
              <div className="perfume-bottle" />
              <div className="perfume-label" />
              <div className="perfume-neck" />
              <div className="perfume-cap" />
            </div>

            <div className="login-showcase-copy">
              <p>Noir, amber, vetiver.</p>
              <span>
                Dashboard butik dengan rasa tenang, rapi, dan sedikit mewah.
              </span>
            </div>
          </section>

          <div className="login-panel">
            <div className="login-heading">
              <div className="login-mark">DP</div>
              <p>Donn's Parfum</p>
              <h2>{authMode === 'login' ? 'Masuk ke akun' : 'Daftar'}</h2>
            </div>

          {loginError && (
            <div className="login-error">
              {loginError}
            </div>
          )}

          {registerMessage && (
            <div className="login-success">
              {registerMessage}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="login-form">
              <div className="login-field">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={loginForm.username}
                  onChange={handleLoginChange}
                  required
                  placeholder="Masukkan username"
                />
              </div>
              <div className="login-field">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                  placeholder="Masukkan password"
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="login-button"
              >
                {loginLoading ? 'Memproses...' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-form">
              <div className="login-field">
                <label>Nama Pelanggan</label>
                <input
                  type="text"
                  name="nama_pelanggan"
                  value={registerForm.nama_pelanggan}
                  onChange={handleRegisterChange}
                  required
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="login-field">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  required
                  placeholder="email@contoh.com"
                />
              </div>
              <div className="login-field">
                <label>No. WhatsApp</label>
                <input
                  type="text"
                  name="no_whatsapp"
                  value={registerForm.no_whatsapp}
                  onChange={handleRegisterChange}
                  required
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="login-field">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={registerForm.username}
                  onChange={handleRegisterChange}
                  required
                  minLength="3"
                  maxLength="30"
                  placeholder="Username login"
                />
              </div>
              <div className="login-field">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  required
                  minLength="8"
                  placeholder="Minimal 8 karakter"
                />
              </div>
              <div className="login-field">
                <label>Konfirmasi Password</label>
                <input
                  type="password"
                  name="password_confirmation"
                  value={registerForm.password_confirmation}
                  onChange={handleRegisterChange}
                  required
                  minLength="8"
                  placeholder="Ulangi password"
                />
              </div>
              <button
                type="submit"
                disabled={registerLoading}
                className="login-button"
              >
                {registerLoading ? 'Memproses...' : 'Daftar'}
              </button>
            </form>
          )}

            <button
              type="button"
              className="auth-switch-button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setLoginError('');
                setRegisterMessage('');
              }}
            >
              {authMode === 'login'
                ? 'Belum punya akun? Daftar sekarang'
                : 'Sudah punya akun? Login'}
            </button>

            <div className="login-footer">
              <span />
              Secure Admin
              <span />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <nav className="dashboard-topbar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-mark">DP</div>
          <div>
            <h2>DONN'S PARFUM</h2>
            <p>{userRole === 'pelanggan' ? 'Customer Atelier' : 'Admin Atelier'}</p>
          </div>
        </div>

        <div className="dashboard-nav">
          {(userRole === 'pelanggan'
            ? [
                ['katalog', 'Home'],
                ['orders', 'Pesanan'],
                ['profile', 'Profil'],
              ]
            : [
                ['parfum', 'Manajemen Parfum'],
                ['transaksi', 'Riwayat Transaksi'],
                ['pelanggan', 'Data Pelanggan'],
                ['kategori', 'Kategori Aroma'],
                ['users', 'Manajemen Admin'],
              ]
          ).map(([menuKey, label]) => (
            <button
              key={menuKey}
              onClick={() => setActiveMenu(menuKey)}
              className={`dashboard-nav-button ${activeMenu === menuKey ? 'is-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="dashboard-actions">
          <button
            onClick={fetchAllData}
            className="dashboard-button dashboard-button-secondary"
          >
            Refresh
          </button>
          <button
            onClick={logout}
            className="dashboard-button dashboard-button-primary"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <header className="dashboard-header">
            <div>
              <h1>{userRole === 'pelanggan' ? "Donn's Parfum" : 'Dashboard Parfum'}</h1>
            </div>
          </header>

          {message && (
            <div className="dashboard-toast">
              {message}
            </div>
          )}

          {error && (
            <div className="dashboard-alert dashboard-alert-error">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="dashboard-alert dashboard-alert-info dashboard-loading">
              Memuat data dari API...
            </div>
          )}

          {userRole === 'admin' && (
            <section className="dashboard-stats">
              <div className="dashboard-stat-card">
                <span>Produk Aktif</span>
                <strong>{parfums.length}</strong>
              </div>
              <div className="dashboard-stat-card">
                <span>Total Stok</span>
                <strong>{totalStok}</strong>
              </div>
              <div className="dashboard-stat-card">
                <span>Pelanggan</span>
                <strong>{pelanggans.length}</strong>
              </div>
              <div className="dashboard-stat-card">
                <span>Nilai Transaksi</span>
                <strong>{formatRupiah(totalTransaksi)}</strong>
              </div>
            </section>
          )}

          {userRole === 'admin' && activeMenu === 'parfum' && (
            <section className="dashboard-section">
              <h2>Manajemen Stok Parfum</h2>

              <form onSubmit={handleSubmit} className="dashboard-form">
                <div className="dashboard-field">
                  <label>Nama Parfum</label>
                  <input
                    type="text"
                    name="nama_parfum"
                    value={form.nama_parfum}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="dashboard-field">
                  <label>Kategori</label>
                  <select
                    name="kategori_id"
                    value={form.kategori_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Pilih --</option>
                    {kategoris.map((kategori) => (
                      <option key={kategori.id} value={kategori.id}>
                        {kategori.nama_kategori}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dashboard-field dashboard-field-wide">
                  <label>URL Gambar</label>
                  <input
                    type="url"
                    name="image_url"
                    value={form.image_url}
                    onChange={handleInputChange}
                    placeholder="https://contoh.com/gambar-parfum.jpg"
                  />
                </div>
                <div className="dashboard-field-group">
                  <div className="dashboard-field">
                    <label>ML</label>
                    <input
                      type="number"
                      name="ukuran_ml"
                      value={form.ukuran_ml}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="dashboard-field">
                    <label>Harga</label>
                    <input
                      type="number"
                      name="harga"
                      value={form.harga}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="dashboard-field">
                    <label>Stok</label>
                    <input
                      type="number"
                      name="stok"
                      value={form.stok}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="dashboard-form-actions">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetParfumForm}
                      className="dashboard-button dashboard-button-secondary"
                    >
                      Batal
                    </button>
                  )}
                  <button type="submit" className="dashboard-button dashboard-button-gold">
                    {isEditing ? 'Simpan Perubahan' : 'Tambah Produk'}
                  </button>
                </div>
              </form>

              <div className="dashboard-table-toolbar">
                <div>
                  <p>Daftar Produk</p>
                  <span>
                    Menampilkan {filteredParfums.length} dari {parfums.length} parfum
                  </span>
                </div>
                <div className="dashboard-search">
                  <input
                    type="search"
                    value={search.parfum}
                    onChange={handleSearchChange('parfum')}
                    placeholder="Cari nama, kategori, harga..."
                  />
                  {search.parfum && (
                    <button type="button" onClick={() => clearSearch('parfum')}>
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>

              <div className="dashboard-table-card">
                <table className="luxury-table">
                  <thead>
                    <tr>
                      <th className="p-4">Foto</th>
                      <th className="p-4">Nama Produk</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Ukuran</th>
                      <th className="p-4">Harga</th>
                      <th className="p-4 text-center">Stok</th>
                      <th className="p-4 text-center">Opsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParfums.map((parfum) => (
                      <tr key={parfum.id}>
                        <td>
                          <img
                            src={parfum.image_url || fallbackPerfumeImage}
                            alt={parfum.nama_parfum}
                            className="product-thumb"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.src = fallbackPerfumeImage;
                            }}
                          />
                        </td>
                        <td className="table-strong">{parfum.nama_parfum}</td>
                        <td>
                          <span className="dashboard-badge">
                            {parfum.nama_kategori || kategoriById[parfum.kategori_id] || `Kategori #${parfum.kategori_id}`}
                          </span>
                        </td>
                        <td>{parfum.ukuran_ml} ml</td>
                        <td>{formatRupiah(parfum.harga)}</td>
                        <td className="table-center table-strong">{parfum.stok}</td>
                        <td>
                          <div className="table-actions">
                            <button onClick={() => startEditParfum(parfum)} className="table-button table-button-edit">
                              Edit
                            </button>
                            <button onClick={() => confirmDeleteParfum(parfum.id)} className="table-button table-button-delete">
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredParfums.length && (
                      <tr>
                        <td colSpan="7" className="table-empty">
                          {parfums.length ? 'Tidak ada parfum yang cocok dengan pencarian.' : 'Belum ada data parfum.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeMenu === 'katalog' && (
            <section className="dashboard-section">
              <h2>Pilihan Parfum</h2>

              <div className="customer-layout">
                <div>
                  <div className="dashboard-table-toolbar">
                    <div>
                      <p>Pilih Parfum</p>
                      <span>
                        Menampilkan {filteredCatalogParfums.length} dari {parfums.length} parfum
                      </span>
                    </div>
                    <div className="dashboard-search">
                      <input
                        type="search"
                        value={search.katalog}
                        onChange={handleSearchChange('katalog')}
                        placeholder="Cari parfum atau kategori..."
                      />
                      {search.katalog && (
                        <button type="button" onClick={() => clearSearch('katalog')}>
                          Bersihkan
                        </button>
                      )}
                    </div>
                    <div className="catalog-controls">
                      <select
                        value={catalogCategory}
                        onChange={(event) => setCatalogCategory(event.target.value)}
                        aria-label="Filter kategori parfum"
                      >
                        <option value="all">Semua kategori</option>
                        {catalogCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <select
                        value={catalogSort}
                        onChange={(event) => setCatalogSort(event.target.value)}
                        aria-label="Urutkan katalog parfum"
                      >
                        <option value="recommended">Rekomendasi</option>
                        <option value="price-low">Harga termurah</option>
                        <option value="price-high">Harga termahal</option>
                        <option value="stock-high">Stok terbanyak</option>
                      </select>
                    </div>
                  </div>

                  <div className="catalog-grid">
                    {filteredCatalogParfums.map((parfum) => (
                      <article key={parfum.id} className="catalog-card">
                        <button
                          type="button"
                          className="catalog-image-wrap catalog-image-button"
                          onClick={() => setSelectedProduct(parfum)}
                        >
                          <img
                            src={parfum.image_url || fallbackPerfumeImage}
                            alt={parfum.nama_parfum}
                            className="catalog-image"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.src = fallbackPerfumeImage;
                            }}
                          />
                        </button>
                        <div>
                          <span className="dashboard-badge">
                            {parfum.nama_kategori || kategoriById[parfum.kategori_id] || `Kategori #${parfum.kategori_id}`}
                          </span>
                          <h3>{parfum.nama_parfum}</h3>
                          <p>{parfum.ukuran_ml} ml</p>
                        </div>
                        <div className="catalog-card-footer">
                          <div>
                            <strong>{formatRupiah(parfum.harga)}</strong>
                            <span>Stok {parfum.stok}</span>
                          </div>
                          <div className="catalog-card-actions">
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(parfum)}
                              className="dashboard-button dashboard-button-secondary"
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => addToCart(parfum)}
                              disabled={Number(parfum.stok || 0) <= 0}
                              className="dashboard-button dashboard-button-gold"
                            >
                              Pilih
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}

                    {!filteredCatalogParfums.length && (
                      <div className="catalog-empty">
                        {parfums.length ? 'Tidak ada parfum yang cocok dengan pencarian.' : 'Belum ada data parfum.'}
                      </div>
                    )}
                  </div>
                </div>

                <aside className="checkout-panel">
                  <div className="checkout-panel-header">
                    <p>Checkout</p>
                    <span>{cartDetails.length} item di keranjang</span>
                  </div>

                  <div className="cart-list">
                    {cartDetails.map((item) => (
                      <div key={item.parfum_id} className="cart-item">
                        <div>
                          <strong>{item.parfum.nama_parfum}</strong>
                          <span>{formatRupiah(item.parfum.harga)} / item</span>
                        </div>
                        <div className="cart-item-controls">
                          <input
                            type="number"
                            min="1"
                            max={item.parfum.stok}
                            value={item.kuantitas}
                            onChange={(event) => updateCartQuantity(item.parfum_id, event.target.value)}
                          />
                          <button type="button" onClick={() => removeCartItem(item.parfum_id)}>
                            Hapus
                          </button>
                        </div>
                        <small>{formatRupiah(item.subtotal)}</small>
                      </div>
                    ))}

                    {!cartDetails.length && (
                      <div className="cart-empty">
                        Keranjang masih kosong.
                      </div>
                    )}
                  </div>

                  <div className="checkout-total">
                    <span>Total</span>
                    <strong>{formatRupiah(cartTotal)}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isCheckoutLoading}
                    className="dashboard-button dashboard-button-primary checkout-button"
                  >
                    {isCheckoutLoading ? 'Memproses...' : 'Checkout'}
                  </button>
                </aside>
              </div>
            </section>
          )}

          {activeMenu === 'orders' && userRole === 'pelanggan' && (
            <section className="dashboard-section">
              <h2>Riwayat Pesanan</h2>

              <div className="dashboard-table-toolbar">
                <div>
                  <p>Pesanan Saya</p>
                  <span>
                    Menampilkan {filteredCustomerOrders.length} dari {customerOrders.length} pesanan
                  </span>
                </div>
                <div className="dashboard-search">
                  <input
                    type="search"
                    value={search.orders}
                    onChange={handleSearchChange('orders')}
                    placeholder="Cari nomor, status, atau parfum..."
                  />
                  {search.orders && (
                    <button type="button" onClick={() => clearSearch('orders')}>
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>

              <div className="orders-list">
                {filteredCustomerOrders.map((order) => (
                  <article key={order.id} className="order-card">
                    <div className="order-card-header">
                      <div>
                        <p>Pesanan #{order.id}</p>
                        <span>{formatDateTime(order.tanggal_pembelian)}</span>
                      </div>
                      <strong>{formatRupiah(order.total_harga)}</strong>
                    </div>

                    <div className="order-status-row">
                      <span className="dashboard-badge">{order.status_pesanan || 'Diproses'}</span>
                      <small>{(order.items || []).length} jenis parfum</small>
                    </div>

                    <div className="order-items">
                      {(order.items || []).map((item) => (
                        <div key={`${order.id}-${item.parfum_id}`} className="order-item">
                          <img
                            src={item.image_url || fallbackPerfumeImage}
                            alt={item.nama_parfum}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.src = fallbackPerfumeImage;
                            }}
                          />
                          <div>
                            <strong>{item.nama_parfum}</strong>
                            <span>
                              {item.nama_kategori || 'Parfum'} - {item.ukuran_ml} ml - {item.kuantitas} item
                            </span>
                          </div>
                          <small>{formatRupiah(Number(item.harga_satuan || 0) * Number(item.kuantitas || 0))}</small>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}

                {!filteredCustomerOrders.length && (
                  <div className="catalog-empty">
                    <p>
                      {customerOrders.length ? 'Tidak ada pesanan yang cocok dengan pencarian.' : 'Belum ada riwayat pesanan.'}
                    </p>
                    {!customerOrders.length && (
                      <button
                        type="button"
                        onClick={() => setActiveMenu('katalog')}
                        className="dashboard-button dashboard-button-gold empty-action-button"
                      >
                        Belanja Sekarang
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeMenu === 'profile' && userRole === 'pelanggan' && (
            <section className="dashboard-section profile-section">
              <h2>Profil Pelanggan</h2>

              <div className="profile-panel">
                <div className="profile-identity">
                  <div className="profile-avatar">
                    {(customerProfile?.nama_pelanggan || customerProfile?.username || 'P').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p>{customerProfile?.nama_pelanggan || 'Pelanggan'}</p>
                    <span>@{customerProfile?.username || '-'}</span>
                  </div>
                </div>

                <div className="profile-grid">
                  <div className="profile-field">
                    <span>Email</span>
                    <strong>{customerProfile?.email || '-'}</strong>
                  </div>
                  <div className="profile-field">
                    <span>No. WhatsApp</span>
                    <strong>{customerProfile?.no_whatsapp || '-'}</strong>
                  </div>
                  <div className="profile-field">
                    <span>Total Pesanan</span>
                    <strong>{customerOrders.length}</strong>
                  </div>
                  <div className="profile-field">
                    <span>Total Belanja</span>
                    <strong>
                      {formatRupiah(customerOrders.reduce((total, order) => total + Number(order.total_harga || 0), 0))}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeMenu === 'transaksi' && (
            userRole === 'admin' && <section className="dashboard-section">
              <h2>Data Transaksi</h2>
              <div className="dashboard-table-toolbar">
                <div>
                  <p>Riwayat Transaksi</p>
                  <span>
                    Menampilkan {filteredTransaksis.length} dari {transaksis.length} transaksi
                  </span>
                </div>
                <div className="dashboard-search">
                  <input
                    type="search"
                    value={search.transaksi}
                    onChange={handleSearchChange('transaksi')}
                    placeholder="Cari ID, pelanggan, status..."
                  />
                  {search.transaksi && (
                    <button type="button" onClick={() => clearSearch('transaksi')}>
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>
              <div className="dashboard-table-card">
                <table className="luxury-table">
                  <thead>
                    <tr>
                      <th className="p-4">ID TRX</th>
                      <th className="p-4">Pelanggan</th>
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Total Harga</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Opsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransaksis.map((transaksi) => (
                      <tr key={transaksi.id}>
                        <td>#{transaksi.id}</td>
                        <td className="table-strong">
                          {pelangganById[transaksi.pelanggan_id] || `Pelanggan #${transaksi.pelanggan_id}`}
                        </td>
                        <td>{transaksi.tanggal_pembelian || '-'}</td>
                        <td className="table-strong table-money">{formatRupiah(transaksi.total_harga)}</td>
                        <td>
                          <select
                            className="status-select"
                            value={transaksi.status_pesanan || 'Diproses'}
                            onChange={(event) => handleOrderStatusChange(transaksi, event.target.value)}
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              onClick={() => openTransactionDetail(transaksi.id)}
                              disabled={isTransactionDetailLoading}
                              className="table-button table-button-edit"
                            >
                              {isTransactionDetailLoading ? 'Memuat...' : 'Detail'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredTransaksis.length && (
                      <tr>
                        <td colSpan="6" className="table-empty">
                          {transaksis.length ? 'Tidak ada transaksi yang cocok dengan pencarian.' : 'Belum ada data transaksi.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeMenu === 'pelanggan' && (
            userRole === 'admin' && <section className="dashboard-section">
              <h2>Daftar Pelanggan</h2>

              <div className="dashboard-table-toolbar">
                <div>
                  <p>Kontak Pelanggan</p>
                  <span>
                    Menampilkan {filteredPelanggans.length} dari {pelanggans.length} pelanggan
                  </span>
                </div>
                <div className="dashboard-search">
                  <input
                    type="search"
                    value={search.pelanggan}
                    onChange={handleSearchChange('pelanggan')}
                    placeholder="Cari nama, email, WhatsApp..."
                  />
                  {search.pelanggan && (
                    <button type="button" onClick={() => clearSearch('pelanggan')}>
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>

              <div className="dashboard-table-card">
                <table className="luxury-table">
                  <thead>
                    <tr>
                      <th className="p-4">ID</th>
                      <th className="p-4">Nama Pelanggan</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">No. WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPelanggans.map((pelanggan) => (
                      <tr key={pelanggan.id}>
                        <td>{pelanggan.id}</td>
                        <td className="table-strong">{pelanggan.nama_pelanggan}</td>
                        <td>{pelanggan.email}</td>
                        <td>{pelanggan.no_whatsapp}</td>
                      </tr>
                    ))}
                    {!filteredPelanggans.length && (
                      <tr>
                        <td colSpan="4" className="table-empty">
                          {pelanggans.length ? 'Tidak ada pelanggan yang cocok dengan pencarian.' : 'Belum ada data pelanggan.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeMenu === 'kategori' && (
            userRole === 'admin' && <section className="dashboard-section">
              <h2>Kategori Aroma Produk</h2>

              <form onSubmit={handleKategoriSubmit} className="dashboard-form dashboard-form-compact">
                <div className="dashboard-field">
                  <label>Nama Kategori</label>
                  <input
                    type="text"
                    name="nama_kategori"
                    value={kategoriForm.nama_kategori}
                    onChange={handleKategoriInputChange}
                    required
                  />
                </div>
                <div className="dashboard-form-actions">
                  {isEditingKategori && (
                    <button
                      type="button"
                      onClick={resetKategoriForm}
                      className="dashboard-button dashboard-button-secondary"
                    >
                      Batal
                    </button>
                  )}
                  <button type="submit" className="dashboard-button dashboard-button-gold">
                    {isEditingKategori ? 'Simpan Perubahan' : 'Tambah Kategori'}
                  </button>
                </div>
              </form>

              <div className="dashboard-table-toolbar dashboard-table-toolbar-narrow">
                <div>
                  <p>Daftar Kategori</p>
                  <span>
                    Menampilkan {filteredKategoris.length} dari {kategoris.length} kategori
                  </span>
                </div>
                <div className="dashboard-search">
                  <input
                    type="search"
                    value={search.kategori}
                    onChange={handleSearchChange('kategori')}
                    placeholder="Cari kategori..."
                  />
                  {search.kategori && (
                    <button type="button" onClick={() => clearSearch('kategori')}>
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>

              <div className="dashboard-table-card dashboard-table-card-narrow">
                <table className="luxury-table">
                  <thead>
                    <tr>
                      <th className="p-4">ID</th>
                      <th className="p-4">Nama Kategori</th>
                      <th className="p-4">Opsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKategoris.map((kategori) => (
                      <tr key={kategori.id}>
                        <td>{kategori.id}</td>
                        <td className="table-strong">{kategori.nama_kategori}</td>
                        <td>
                          <div className="table-actions">
                            <button onClick={() => startEditKategori(kategori)} className="table-button table-button-edit">
                              Edit
                            </button>
                            <button onClick={() => confirmDeleteKategori(kategori.id)} className="table-button table-button-delete">
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredKategoris.length && (
                      <tr>
                        <td colSpan="3" className="table-empty">
                          {kategoris.length ? 'Tidak ada kategori yang cocok dengan pencarian.' : 'Belum ada data kategori.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeMenu === 'users' && (
            userRole === 'admin' && <section className="dashboard-section">
              <h2>Manajemen Admin</h2>

              <form onSubmit={handleAdminUserSubmit} className="dashboard-form dashboard-form-compact">
                <div className="dashboard-field">
                  <label>Username Admin</label>
                  <input
                    type="text"
                    name="username"
                    value={adminUserForm.username}
                    onChange={handleAdminUserInputChange}
                    required
                    minLength="3"
                    maxLength="30"
                    placeholder="Username untuk admin cabang"
                  />
                </div>
                <div className="dashboard-field">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={adminUserForm.password}
                    onChange={handleAdminUserInputChange}
                    required
                    minLength="8"
                    placeholder="Minimal 8 karakter"
                  />
                </div>
                <div className="dashboard-form-actions">
                  <button type="submit" className="dashboard-button dashboard-button-gold">
                    Tambah Admin
                  </button>
                </div>
              </form>

              <div className="dashboard-table-toolbar">
                <div>
                  <p>Daftar Akun</p>
                  <span>
                    Menampilkan {filteredAdminUsers.length} dari {adminUsers.length} akun
                  </span>
                </div>
                <div className="dashboard-search">
                  <input
                    type="search"
                    value={search.users}
                    onChange={handleSearchChange('users')}
                    placeholder="Cari ID atau username admin..."
                  />
                  {search.users && (
                    <button type="button" onClick={() => clearSearch('users')}>
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>

              <div className="dashboard-table-card">
                <table className="luxury-table">
                  <thead>
                    <tr>
                      <th className="p-4">ID</th>
                      <th className="p-4">Username</th>
                      <th className="p-4">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdminUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td className="table-strong">{user.username}</td>
                        <td>
                          <span className="dashboard-badge">{user.role}</span>
                        </td>
                      </tr>
                    ))}
                    {!filteredAdminUsers.length && (
                      <tr>
                        <td colSpan="3" className="table-empty">
                          {adminUsers.length ? 'Tidak ada akun yang cocok dengan pencarian.' : 'Belum ada data akun.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

      {selectedTransactionDetail && (
        <div className="modal-backdrop">
          <div className="transaction-modal-card">
            <div className="transaction-modal-header">
              <div>
                <span className="dashboard-badge">{selectedTransactionDetail.transaksi?.status_pesanan || 'Diproses'}</span>
                <h3>Transaksi #{selectedTransactionDetail.transaksi?.id}</h3>
                <p>{formatDateTime(selectedTransactionDetail.transaksi?.tanggal_pembelian)}</p>
              </div>
              <strong>{formatRupiah(selectedTransactionDetail.transaksi?.total_harga)}</strong>
            </div>

            <div className="transaction-customer">
              <div>
                <span>Pelanggan</span>
                <strong>{selectedTransactionDetail.transaksi?.nama_pelanggan || '-'}</strong>
              </div>
              <div>
                <span>Kontak</span>
                <strong>{selectedTransactionDetail.transaksi?.no_whatsapp || selectedTransactionDetail.transaksi?.email || '-'}</strong>
              </div>
            </div>

            <div className="order-items">
              {(selectedTransactionDetail.items || []).map((item) => (
                <div key={item.id} className="order-item">
                  <img
                    src={item.image_url || fallbackPerfumeImage}
                    alt={item.nama_parfum}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = fallbackPerfumeImage;
                    }}
                  />
                  <div>
                    <strong>{item.nama_parfum}</strong>
                    <span>
                      {item.nama_kategori || 'Parfum'} - {item.ukuran_ml} ml - {item.kuantitas} item
                    </span>
                  </div>
                  <small>{formatRupiah(Number(item.harga_satuan || 0) * Number(item.kuantitas || 0))}</small>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setSelectedTransactionDetail(null)}
                className="dashboard-button dashboard-button-secondary"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-backdrop">
          <div className="product-modal-card">
            <img
              src={selectedProduct.image_url || fallbackPerfumeImage}
              alt={selectedProduct.nama_parfum}
              className="product-modal-image"
              onError={(event) => {
                event.currentTarget.src = fallbackPerfumeImage;
              }}
            />
            <div className="product-modal-content">
              <span className="dashboard-badge">
                {selectedProduct.nama_kategori || kategoriById[selectedProduct.kategori_id] || `Kategori #${selectedProduct.kategori_id}`}
              </span>
              <h3>{selectedProduct.nama_parfum}</h3>
              <p>{selectedProduct.ukuran_ml} ml - Stok {selectedProduct.stok}</p>

              <div className="product-modal-price">
                <span>Harga</span>
                <strong>{formatRupiah(selectedProduct.harga)}</strong>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="dashboard-button dashboard-button-secondary"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={Number(selectedProduct.stok || 0) <= 0}
                  className="dashboard-button dashboard-button-gold"
                >
                  Tambah ke Keranjang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-mark">
              <span>!</span>
            </div>
            <h3>{itemToDelete?.title || 'Hapus Data?'}</h3>
            <p>{itemToDelete?.message || 'Data akan dihapus permanen.'}</p>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setItemToDelete(null);
                }}
                className="dashboard-button dashboard-button-secondary"
              >
                Batal
              </button>
              <button onClick={handleDeleteItem} className="dashboard-button dashboard-button-danger">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
