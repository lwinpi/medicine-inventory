import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import {
    LogOut,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
    Minus,
    Receipt,
    History,
    Package,
    Eye,
    EyeOff,
    Pill,
    BarChart3,
    Wallet,
    RefreshCw,
} from "lucide-react";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat("my-MM", {
        style: "currency",
        currency: "MMK",
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
};

const formatDateTime = (dateValue) => {
    return new Date(dateValue).toLocaleString("my-MM", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function App() {
    const [session, setSession] = useState(null);
    const [authMode, setAuthMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [medicines, setMedicines] = useState([]);
    const [sales, setSales] = useState([]);
    const [cart, setCart] = useState([]);

    const [searchText, setSearchText] = useState("");
    const [medicineName, setMedicineName] = useState("");
    const [medicinePrice, setMedicinePrice] = useState("");
    const [medicineQuantity, setMedicineQuantity] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");

    const [message, setMessage] = useState("");
    const [page, setPage] = useState("inventory");
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session?.user) {
            loadAllData();
        } else {
            setMedicines([]);
            setSales([]);
            setCart([]);
        }
    }, [session]);

    const userId = session?.user?.id;

    const showMessage = (text) => {
        setMessage(text);
        window.clearTimeout(showMessage.timeoutId);
        showMessage.timeoutId = window.setTimeout(() => setMessage(""), 3500);
    };

    const filteredMedicines = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) {
            return medicines;
        }

        return medicines.filter((medicine) =>
            medicine.name.toLowerCase().includes(query)
        );
    }, [medicines, searchText]);

    const cartTotal = useMemo(() => {
        return cart.reduce(
            (total, item) => total + Number(item.price) * Number(item.sellQuantity),
            0
        );
    }, [cart]);

    const changeAmount = Math.max((Number(paymentAmount) || 0) - cartTotal, 0);

    const inventoryValue = useMemo(() => {
        return medicines.reduce(
            (total, medicine) => total + Number(medicine.price) * Number(medicine.quantity),
            0
        );
    }, [medicines]);

    const todaySalesTotal = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);

        return sales
            .filter((sale) => sale.created_at.slice(0, 10) === today)
            .reduce((total, sale) => total + Number(sale.total_amount), 0);
    }, [sales]);

    const lowStockCount = useMemo(() => {
        return medicines.filter((medicine) => medicine.quantity > 0 && medicine.quantity <= 5).length;
    }, [medicines]);

    async function loadAllData() {
        setDataLoading(true);
        await Promise.all([loadMedicines(), loadSales()]);
        setDataLoading(false);
    }

    async function handleAuth(event) {
        event.preventDefault();
        setLoading(true);

        try {
            if (authMode === "register") {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) {
                    showMessage(error.message);
                    return;
                }

                showMessage("Account created. If email confirmation is on, check your email. If not, log in now.");
                setAuthMode("login");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    showMessage(error.message);
                    return;
                }

                showMessage("Logged in successfully.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        setPage("inventory");
        showMessage("Logged out.");
    }

    async function loadMedicines() {
        const { data, error } = await supabase
            .from("medicines")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            showMessage(error.message);
            return;
        }

        setMedicines(data || []);
    }

    async function loadSales() {
        const { data, error } = await supabase
            .from("sales")
            .select("*, sale_items(*)")
            .order("created_at", { ascending: false });

        if (error) {
            showMessage(error.message);
            return;
        }

        setSales(data || []);
    }

    async function handleAddMedicine(event) {
        event.preventDefault();

        const name = medicineName.trim();
        const price = Number(medicinePrice);
        const quantity = Number(medicineQuantity);

        if (!name || price <= 0 || quantity < 0 || !Number.isFinite(price) || !Number.isFinite(quantity)) {
            showMessage("ဆေးနာမည်၊ ဈေးနှုန်း၊ အရေအတွက်။");
            return;
        }

        setLoading(true);

        try {
            const existingMedicine = medicines.find(
                (medicine) => medicine.name.toLowerCase() === name.toLowerCase()
            );

            if (existingMedicine) {
                const { error } = await supabase
                    .from("medicines")
                    .update({
                        price,
                        quantity: Number(existingMedicine.quantity) + quantity,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingMedicine.id);

                if (error) {
                    showMessage(error.message);
                    return;
                }

                showMessage("ရှိပြီးသားဆေးကို stock ထပ်တိုးပြီး ဈေးနှုန်း updateပြီ။");
            } else {
                const { error } = await supabase.from("medicines").insert({
                    user_id: userId,
                    name,
                    price,
                    quantity,
                });

                if (error) {
                    showMessage(error.message);
                    return;
                }

                showMessage("ဆေးအသစ်ကို သိမ်းပြီးပါပြီ။");
            }

            setMedicineName("");
            setMedicinePrice("");
            setMedicineQuantity("");
            await loadMedicines();
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteMedicine(id) {
        const confirmed = window.confirm("ဒီဆေးကို inventory ထဲမှ ဖျက်ချင်တာ သေချာပါသလား။");

        if (!confirmed) {
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.from("medicines").delete().eq("id", id);

            if (error) {
                showMessage(error.message);
                return;
            }

            setCart((currentCart) => currentCart.filter((item) => item.id !== id));
            showMessage("ဆေးကို ဖျက်ပြီးပါပြီ။");
            await loadMedicines();
        } finally {
            setLoading(false);
        }
    }

    function addToCart(medicine) {
        if (medicine.quantity <= 0) {
            showMessage("Stock မရှိတော့ပါ။");
            return;
        }

        const existingItem = cart.find((item) => item.id === medicine.id);

        if (existingItem) {
            if (existingItem.sellQuantity >= medicine.quantity) {
                showMessage("Stock ထက် ပိုရောင်းလို့မရပါ။");
                return;
            }

            setCart((currentCart) =>
                currentCart.map((item) =>
                    item.id === medicine.id
                        ? { ...item, sellQuantity: item.sellQuantity + 1 }
                        : item
                )
            );
        } else {
            setCart((currentCart) => [
                ...currentCart,
                {
                    ...medicine,
                    sellQuantity: 1,
                },
            ]);
        }

        showMessage(`${medicine.name} ကို cart ထဲထည့်ပြီးပါပြီ။`);
    }

    function changeCartQuantity(id, nextQuantity) {
        const medicine = medicines.find((item) => item.id === id);

        if (!medicine) {
            return;
        }

        if (nextQuantity <= 0) {
            setCart((currentCart) => currentCart.filter((item) => item.id !== id));
            return;
        }

        if (nextQuantity > medicine.quantity) {
            showMessage("Stock ထက် ပိုမရောင်းပါ။");
            return;
        }

        setCart((currentCart) =>
            currentCart.map((item) =>
                item.id === id ? { ...item, sellQuantity: nextQuantity } : item
            )
        );
    }

    function removeFromCart(id) {
        setCart((currentCart) => currentCart.filter((item) => item.id !== id));
    }

    async function handleCheckout() {
        if (cart.length === 0) {
            showMessage("Cart ထဲတွင် ဆေးမရှိသေးပါ။");
            return;
        }

        const payment = Number(paymentAmount) || 0;

        if (payment < cartTotal) {
            showMessage("Customer ပေးသောငွေသည် စုစုပေါင်းဈေးထက် နည်းနေပါသည်။");
            return;
        }

        const stockProblem = cart.find((cartItem) => {
            const medicine = medicines.find((item) => item.id === cartItem.id);
            return !medicine || cartItem.sellQuantity > medicine.quantity;
        });

        if (stockProblem) {
            showMessage("Stock မလုံလောက်သော ဆေးရှိနေပါသည်။ Refresh လုပ်ပြီး ပြန်စစ်ပါ။");
            return;
        }

        setLoading(true);

        try {
            const { data: sale, error: saleError } = await supabase
                .from("sales")
                .insert({
                    user_id: userId,
                    total_amount: cartTotal,
                    payment_amount: payment,
                    change_amount: payment - cartTotal,
                })
                .select()
                .single();

            if (saleError) {
                showMessage(saleError.message);
                return;
            }

            const saleItems = cart.map((item) => ({
                sale_id: sale.id,
                user_id: userId,
                medicine_id: item.id,
                medicine_name: item.name,
                price: Number(item.price),
                quantity: item.sellQuantity,
                subtotal: Number(item.price) * Number(item.sellQuantity),
            }));

            const { error: itemError } = await supabase.from("sale_items").insert(saleItems);

            if (itemError) {
                showMessage(itemError.message);
                return;
            }

            for (const item of cart) {
                const newQuantity = Number(item.quantity) - Number(item.sellQuantity);

                const { error: updateError } = await supabase
                    .from("medicines")
                    .update({
                        quantity: newQuantity,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", item.id);

                if (updateError) {
                    showMessage(updateError.message);
                    return;
                }
            }

            setCart([]);
            setPaymentAmount("");
            showMessage("Checkout. Sale history သိမ်းပြီး stock update လုပ်ပြီးပါပြီ။");
            await loadAllData();
            setPage("sales");
        } finally {
            setLoading(false);
        }
    }

    if (!session) {
        return (
            <main className="auth-page">
                <Styles />
                <section className="auth-card">
                    <div className="brand-mark">
                        <Pill size={28} />
                    </div>
                    <p className="eyebrow dark">Medicine POS</p>
                    <h1>{authMode === "login" ? "Welcome back" : "Create account"}</h1>
                    <p className="muted auth-copy">
                        ဆေး Inventory, Checkout, Sales History ကို  database ထဲတွင်သိမ်းရန် login ဝင်ပါ။
                    </p>

                    {message && <div className="message">{message}</div>}

                    <form onSubmit={handleAuth} className="form-stack">
                        <label>
                            Email
                            <input
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                type="email"
                                placeholder="you@example.com"
                                required
                            />
                        </label>

                        <label>
                            Password
                            <div className="password-wrap">
                                <input
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="At least 6 characters"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </label>

                        <button disabled={loading} className="primary-button">
                            {loading
                                ? "Loading..."
                                : authMode === "login"
                                  ? "Login"
                                  : "Create Account"}
                        </button>
                    </form>

                    <button
                        className="text-button"
                        onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                    >
                        {authMode === "login"
                            ? "Account မရှိသေးပါက Create Account"
                            : "Account ရှိပြီးပါက Login"}
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className="app-shell">
            <Styles />

            <div className="container">
                <header className="hero">
                    <div>
                        <p className="eyebrow">မြန်မာဆေးဆိုင် POS</p>
                        <h1>Medicine Inventory & Checkout</h1>
                        <p className="hero-text">
                            User account တစ်ခုချင်းစီအတွက် inventory, checkout, sales history ကို Supabase database ထဲမှာ သိမ်းထားပေးသော full-stack system။
                        </p>
                    </div>

                    <div className="hero-actions">
                        <div className="user-pill">{session.user.email}</div>
                        <button onClick={handleLogout} className="secondary-button">
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </header>

                {message && <div className="message">{message}</div>}

                <nav className="nav">
                    <button
                        className={page === "inventory" ? "active" : ""}
                        onClick={() => setPage("inventory")}
                    >
                        <Package size={18} />
                        Inventory
                    </button>
                    <button
                        className={page === "checkout" ? "active" : ""}
                        onClick={() => setPage("checkout")}
                    >
                        <ShoppingCart size={18} />
                        Checkout
                        {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
                    </button>
                    <button
                        className={page === "sales" ? "active" : ""}
                        onClick={() => setPage("sales")}
                    >
                        <History size={18} />
                        Sales
                    </button>
                    <button onClick={loadAllData} className="refresh-button" disabled={dataLoading}>
                        <RefreshCw size={17} className={dataLoading ? "spin" : ""} />
                        Refresh
                    </button>
                </nav>

                <section className="stats">
                    <StatCard icon={<Pill size={22} />} title="ဆေးအမျိုးအစား" value={`${medicines.length} မျိုး`} color="blue" />
                    <StatCard icon={<Package size={22} />} title="Inventory တန်ဖိုး" value={formatCurrency(inventoryValue)} color="green" />
                    <StatCard icon={<BarChart3 size={22} />} title="ယနေ့ Sales" value={formatCurrency(todaySalesTotal)} color="purple" />
                    <StatCard icon={<Wallet size={22} />} title="Low Stock" value={`${lowStockCount} မျိုး`} color="amber" />
                </section>

                {page === "inventory" && (
                    <section className="grid-two">
                        <div className="panel compact-panel">
                            <div className="panel-title-row">
                                <div>
                                    <h2>ဆေးအသစ်ထည့်ရန်</h2>
                                    <p>Medicine name, price, stock quantity ထည့်ပါ။</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddMedicine} className="form-stack">
                                <label>
                                    ဆေးနာမည်
                                    <input
                                        value={medicineName}
                                        onChange={(event) => setMedicineName(event.target.value)}
                                        placeholder="Paracetamol"
                                    />
                                </label>

                                <label>
                                    ဈေးနှုန်း
                                    <input
                                        value={medicinePrice}
                                        onChange={(event) => setMedicinePrice(event.target.value)}
                                        type="number"
                                        min="0"
                                        placeholder="500"
                                    />
                                </label>

                                <label>
                                    Quantity
                                    <input
                                        value={medicineQuantity}
                                        onChange={(event) => setMedicineQuantity(event.target.value)}
                                        type="number"
                                        min="0"
                                        placeholder="100"
                                    />
                                </label>

                                <button disabled={loading} className="primary-button">
                                    <Plus size={18} />
                                    သိမ်းမည်
                                </button>
                            </form>
                        </div>

                        <InventoryTable
                            medicines={filteredMedicines}
                            searchText={searchText}
                            setSearchText={setSearchText}
                            addToCart={addToCart}
                            deleteMedicine={handleDeleteMedicine}
                            loading={loading}
                        />
                    </section>
                )}

                {page === "checkout" && (
                    <section className="grid-two checkout-grid">
                        <InventoryTable
                            medicines={filteredMedicines}
                            searchText={searchText}
                            setSearchText={setSearchText}
                            addToCart={addToCart}
                            deleteMedicine={handleDeleteMedicine}
                            loading={loading}
                        />

                        <div className="panel checkout-panel">
                            <div className="panel-title-row">
                                <div>
                                    <h2>Checkout</h2>
                                    <p>Cart quantity ပြင်ပြီး sale complete လုပ်ပါ။</p>
                                </div>
                            </div>

                            {cart.length === 0 ? (
                                <div className="empty">Cart ထဲတွင် ဆေးမရှိသေးပါ။</div>
                            ) : (
                                <div className="cart-list">
                                    {cart.map((item) => (
                                        <div key={item.id} className="cart-item">
                                            <div className="cart-info">
                                                <strong>{item.name}</strong>
                                                <p>{formatCurrency(item.price)} each</p>
                                            </div>

                                            <div className="qty-controls">
                                                <button
                                                    onClick={() => changeCartQuantity(item.id, item.sellQuantity - 1)}
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus size={16} />
                                                </button>

                                                <input
                                                    value={item.sellQuantity}
                                                    type="number"
                                                    min="1"
                                                    onChange={(event) =>
                                                        changeCartQuantity(item.id, Number(event.target.value))
                                                    }
                                                />

                                                <button
                                                    onClick={() => changeCartQuantity(item.id, item.sellQuantity + 1)}
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            <strong className="cart-subtotal">
                                                {formatCurrency(Number(item.price) * Number(item.sellQuantity))}
                                            </strong>

                                            <button className="mini-delete" onClick={() => removeFromCart(item.id)}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="total-box">
                                <span>စုစုပေါင်း</span>
                                <strong>{formatCurrency(cartTotal)}</strong>
                            </div>

                            <label className="input-label">
                                Customer ပေးသောငွေ
                                <input
                                    value={paymentAmount}
                                    onChange={(event) => setPaymentAmount(event.target.value)}
                                    type="number"
                                    min="0"
                                    placeholder="10000"
                                />
                            </label>

                            <div className="change-box">
                                <span>ပြန်အမ်းငွေ</span>
                                <strong>{formatCurrency(changeAmount)}</strong>
                            </div>

                            <button disabled={loading} onClick={handleCheckout} className="black-button">
                                <Receipt size={18} />
                                Checkout ပြီးဆုံးမည်
                            </button>
                        </div>
                    </section>
                )}

                {page === "sales" && (
                    <section className="panel">
                        <div className="panel-title-row">
                            <div>
                                <h2>Sales History</h2>
                                <p>Supabase database ထဲသို့ သိမ်းထားသော sales records။</p>
                            </div>
                        </div>

                        {sales.length === 0 ? (
                            <div className="empty">Sales history မရှိသေးပါ။</div>
                        ) : (
                            <div className="sales-list">
                                {sales.map((sale) => (
                                    <div key={sale.id} className="sale-card">
                                        <div className="sale-head">
                                            <strong>{formatDateTime(sale.created_at)}</strong>
                                            <strong>{formatCurrency(sale.total_amount)}</strong>
                                        </div>

                                        <div className="sale-lines">
                                            {(sale.sale_items || []).map((item) => (
                                                <div key={item.id} className="sale-line">
                                                    <span>{item.medicine_name} × {item.quantity}</span>
                                                    <span>{formatCurrency(item.subtotal)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="sale-footer">
                                            <span>လက်ခံငွေ: {formatCurrency(sale.payment_amount)}</span>
                                            <span>ပြန်အမ်းငွေ: {formatCurrency(sale.change_amount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}

function StatCard({ icon, title, value, color }) {
    return (
        <div className={`stat-card ${color}`}>
            <div className="stat-icon">{icon}</div>
            <div>
                <p>{title}</p>
                <h3>{value}</h3>
            </div>
        </div>
    );
}

function InventoryTable({ medicines, searchText, setSearchText, addToCart, deleteMedicine, loading }) {
    return (
        <div className="panel inventory-panel">
            <div className="table-header">
                <div>
                    <h2>Inventory</h2>
                    <p>Search, add to cart, or delete medicines.</p>
                </div>

                <div className="search">
                    <Search size={17} />
                    <input
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder="ဆေးရှာရန်"
                    />
                </div>
            </div>

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>ဆေးနာမည်</th>
                            <th>ဈေးနှုန်း</th>
                            <th>Stock</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {medicines.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="empty-cell">
                                    Inventory ထဲတွင် ဆေးမရှိသေးပါ။
                                </td>
                            </tr>
                        ) : (
                            medicines.map((medicine) => (
                                <tr key={medicine.id}>
                                    <td>
                                        <strong>{medicine.name}</strong>
                                    </td>
                                    <td>{formatCurrency(medicine.price)}</td>
                                    <td>
                                        <span
                                            className={
                                                medicine.quantity <= 0
                                                    ? "badge red"
                                                    : medicine.quantity <= 5
                                                      ? "badge yellow"
                                                      : "badge green"
                                            }
                                        >
                                            {medicine.quantity}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button
                                            onClick={() => addToCart(medicine)}
                                            className="small-button"
                                            disabled={medicine.quantity <= 0 || loading}
                                        >
                                            Cart
                                        </button>
                                        <button
                                            onClick={() => deleteMedicine(medicine.id)}
                                            className="delete-button"
                                            disabled={loading}
                                            aria-label="Delete medicine"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Styles() {
    return (
        <style>{`
            :root {
                font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
                color: #0f172a;
                background: #eef4ff;
                --ink: #0f172a;
                --muted: #64748b;
                --line: #dbe4f0;
                --blue: #2563eb;
                --blue-dark: #1e40af;
                --green: #10b981;
                --green-dark: #047857;
                --purple: #7c3aed;
                --amber: #f59e0b;
                --red: #ef4444;
                --shadow: 0 24px 70px rgba(15, 23, 42, 0.10);
                --shadow-soft: 0 14px 34px rgba(15, 23, 42, 0.075);
            }

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                background: #eef4ff;
            }

            button,
            input {
                font: inherit;
            }

            button {
                border: none;
            }

            .app-shell,
            .auth-page {
                min-height: 100vh;
                background:
                    radial-gradient(circle at 8% 8%, rgba(37, 99, 235, 0.20), transparent 32%),
                    radial-gradient(circle at 92% 4%, rgba(16, 185, 129, 0.18), transparent 30%),
                    radial-gradient(circle at 50% 105%, rgba(6, 182, 212, 0.13), transparent 42%),
                    linear-gradient(135deg, #eef4ff 0%, #f8fafc 46%, #ecfdf5 100%);
                padding: 32px 18px 60px;
            }

            .auth-page {
                display: grid;
                place-items: center;
            }

            .auth-card {
                width: min(460px, 100%);
                background: rgba(255, 255, 255, 0.94);
                border: 1px solid rgba(148, 163, 184, 0.34);
                border-radius: 34px;
                padding: 34px;
                box-shadow: var(--shadow);
                backdrop-filter: blur(22px);
            }

            .brand-mark {
                width: 58px;
                height: 58px;
                display: grid;
                place-items: center;
                border-radius: 20px;
                color: white;
                background: linear-gradient(135deg, var(--blue), var(--green));
                box-shadow: 0 16px 30px rgba(37, 99, 235, 0.24);
                margin-bottom: 18px;
            }

            .auth-card h1 {
                margin: 0;
                color: var(--ink);
                font-size: 46px;
                line-height: 0.96;
                letter-spacing: -0.06em;
                font-weight: 950;
            }

            .auth-copy {
                margin-bottom: 22px;
            }

            .container {
                width: min(1240px, 100%);
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .hero {
                position: relative;
                overflow: hidden;
                display: flex;
                justify-content: space-between;
                gap: 28px;
                align-items: center;
                padding: 46px;
                border-radius: 38px;
                background:
                    linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(30, 64, 175, 0.94) 55%, rgba(4, 120, 87, 0.92)),
                    #0f172a;
                border: 1px solid rgba(255, 255, 255, 0.18);
                box-shadow: 0 30px 90px rgba(15, 23, 42, 0.24);
            }

            .hero::before {
                content: "";
                position: absolute;
                inset: auto -90px -130px auto;
                width: 360px;
                height: 360px;
                border-radius: 999px;
                background: rgba(125, 211, 252, 0.22);
                filter: blur(8px);
            }

            .hero::after {
                content: "";
                position: absolute;
                inset: -110px auto auto 45%;
                width: 280px;
                height: 280px;
                border-radius: 999px;
                background: rgba(52, 211, 153, 0.18);
            }

            .hero > * {
                position: relative;
                z-index: 1;
            }

            .eyebrow {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin: 0 0 14px;
                padding: 8px 12px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.12);
                color: #dbeafe;
                font-size: 12px;
                font-weight: 950;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }

            .eyebrow.dark {
                background: #eaf2ff;
                color: var(--blue-dark);
            }

            .hero h1 {
                margin: 0;
                max-width: 780px;
                color: white;
                font-size: clamp(40px, 6vw, 72px);
                line-height: 0.94;
                letter-spacing: -0.07em;
                font-weight: 950;
            }

            .hero-text,
            .muted {
                color: #dbeafe;
                line-height: 1.7;
                font-weight: 600;
            }

            .muted {
                color: var(--muted);
            }

            .hero-text {
                margin: 20px 0 0;
                max-width: 710px;
                font-size: 18px;
            }

            .hero-actions {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 12px;
            }

            .user-pill {
                max-width: 280px;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 11px 16px;
                border-radius: 999px;
                color: #dbeafe;
                background: rgba(255, 255, 255, 0.12);
                border: 1px solid rgba(255, 255, 255, 0.24);
                font-size: 13px;
                font-weight: 850;
                white-space: nowrap;
            }

            .message {
                background: #dbeafe;
                color: #1e3a8a;
                border: 1px solid #93c5fd;
                padding: 14px 16px;
                border-radius: 20px;
                font-weight: 850;
                box-shadow: 0 12px 30px rgba(37, 99, 235, 0.10);
            }

            .form-stack {
                display: flex;
                flex-direction: column;
                gap: 14px;
            }

            label,
            .input-label {
                display: flex;
                flex-direction: column;
                gap: 8px;
                font-weight: 900;
                color: #334155;
            }

            input {
                width: 100%;
                border-radius: 17px;
                border: 1px solid #cbd5e1;
                background: rgba(255, 255, 255, 0.96);
                color: var(--ink);
                padding: 13px 14px;
                outline: none;
                font-weight: 650;
                transition: 0.18s ease;
            }

            input::placeholder {
                color: #94a3b8;
                font-weight: 560;
            }

            input:focus {
                border-color: rgba(37, 99, 235, 0.72);
                box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
            }

            .password-wrap {
                position: relative;
            }

            .password-wrap input {
                padding-right: 48px;
            }

            .password-toggle {
                position: absolute;
                right: 8px;
                top: 50%;
                width: 36px;
                height: 36px;
                display: grid;
                place-items: center;
                transform: translateY(-50%);
                border-radius: 50%;
                background: #eef4ff;
                color: var(--blue-dark);
                cursor: pointer;
            }

            .primary-button,
            .secondary-button,
            .black-button,
            .small-button,
            .delete-button,
            .text-button,
            .refresh-button,
            .mini-delete {
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border-radius: 999px;
                font-weight: 950;
                transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
            }

            button:hover:not(:disabled) {
                transform: translateY(-1px);
                filter: brightness(1.02);
            }

            button:disabled {
                opacity: 0.55;
                cursor: not-allowed;
            }

            .primary-button,
            .black-button {
                width: 100%;
                padding: 13px 18px;
                color: white;
            }

            .primary-button {
                background: linear-gradient(135deg, var(--blue), #1d4ed8);
                box-shadow: 0 12px 26px rgba(37, 99, 235, 0.28);
            }

            .black-button {
                margin-top: 12px;
                background: linear-gradient(135deg, #0f172a, #1e293b);
                box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
            }

            .secondary-button {
                background: rgba(255, 255, 255, 0.96);
                color: #0f172a;
                border: 1px solid rgba(255, 255, 255, 0.42);
                padding: 12px 18px;
                box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
            }

            .text-button {
                margin-top: 18px;
                background: transparent;
                color: var(--blue);
            }

            .nav {
                display: flex;
                gap: 10px;
                align-items: center;
                background: rgba(255, 255, 255, 0.92);
                border: 1px solid rgba(148, 163, 184, 0.34);
                border-radius: 999px;
                padding: 8px;
                width: fit-content;
                box-shadow: var(--shadow-soft);
            }

            .nav button {
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 11px 18px;
                border-radius: 999px;
                cursor: pointer;
                background: transparent;
                font-weight: 950;
                color: #334155;
            }

            .nav button.active {
                background: linear-gradient(135deg, var(--blue), var(--green));
                color: white;
                box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22);
            }

            .cart-count {
                min-width: 22px;
                height: 22px;
                display: inline-grid;
                place-items: center;
                padding: 0 6px;
                border-radius: 999px;
                background: white;
                color: var(--blue-dark);
                font-size: 12px;
            }

            .refresh-button {
                background: #f1f7ff !important;
                color: var(--blue-dark) !important;
                border: 1px solid #bfdbfe;
            }

            .spin {
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
            }

            .stat-card,
            .panel {
                background: rgba(255, 255, 255, 0.92);
                border: 1px solid rgba(148, 163, 184, 0.30);
                border-radius: 30px;
                padding: 24px;
                box-shadow: var(--shadow-soft);
                backdrop-filter: blur(22px);
            }

            .stat-card {
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: center;
                gap: 15px;
                min-height: 118px;
            }

            .stat-card::before {
                content: "";
                position: absolute;
                inset: 0 auto 0 0;
                width: 5px;
                background: var(--blue);
            }

            .stat-card.green::before { background: var(--green); }
            .stat-card.purple::before { background: var(--purple); }
            .stat-card.amber::before { background: var(--amber); }

            .stat-icon {
                flex: 0 0 auto;
                width: 46px;
                height: 46px;
                display: grid;
                place-items: center;
                border-radius: 17px;
                background: #eaf2ff;
                color: var(--blue);
            }

            .stat-card.green .stat-icon {
                background: #ecfdf5;
                color: var(--green-dark);
            }

            .stat-card.purple .stat-icon {
                background: #f3e8ff;
                color: var(--purple);
            }

            .stat-card.amber .stat-icon {
                background: #fef3c7;
                color: #92400e;
            }

            .stat-card p {
                margin: 0;
                color: var(--muted);
                font-size: 13px;
                font-weight: 850;
            }

            .stat-card h3 {
                margin: 6px 0 0;
                color: var(--ink);
                font-size: 25px;
                letter-spacing: -0.04em;
                font-weight: 950;
            }

            .grid-two {
                display: grid;
                grid-template-columns: 0.78fr 1.22fr;
                gap: 18px;
                align-items: start;
            }

            .checkout-grid {
                grid-template-columns: 1.18fr 0.82fr;
            }

            .compact-panel,
            .checkout-panel {
                position: sticky;
                top: 18px;
            }

            .panel-title-row,
            .table-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
                margin-bottom: 18px;
            }

            .panel h2,
            .table-header h2 {
                margin: 0;
                color: var(--ink);
                font-size: 24px;
                letter-spacing: -0.04em;
                font-weight: 950;
            }

            .panel-title-row p,
            .table-header p {
                margin: 6px 0 0;
                color: var(--muted);
                font-size: 14px;
                font-weight: 650;
            }

            .search {
                min-width: 270px;
                height: 46px;
                display: flex;
                align-items: center;
                gap: 9px;
                padding: 0 14px;
                border-radius: 999px;
                background: #eef6ff;
                color: var(--blue);
                border: 1px solid #bfdbfe;
            }

            .search input {
                border: none;
                box-shadow: none;
                background: transparent;
                padding: 0;
            }

            .table-wrap {
                overflow: auto;
                border-radius: 22px;
                border: 1px solid #dbe4f0;
                background: white;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                min-width: 650px;
                background: white;
            }

            th,
            td {
                padding: 16px;
                border-bottom: 1px solid #e5edf7;
                text-align: left;
                color: #1e293b;
                font-size: 14px;
            }

            th {
                color: #334155;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                background: #f1f7ff;
                font-weight: 950;
            }

            tbody tr:nth-child(even) {
                background: #f8fafc;
            }

            tbody tr:hover {
                background: #eef6ff;
            }

            tr:last-child td {
                border-bottom: none;
            }

            td strong {
                color: var(--ink);
                font-weight: 950;
            }

            .empty-cell,
            .empty {
                text-align: center;
                color: #64748b;
                font-weight: 820;
            }

            .empty-cell {
                padding: 38px;
            }

            .empty {
                border: 1px dashed #94a3b8;
                padding: 30px;
                border-radius: 20px;
                background: #f8fafc;
            }

            .actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }

            .small-button {
                min-height: 34px;
                padding: 8px 14px;
                background: var(--green);
                color: white;
                box-shadow: 0 10px 20px rgba(16, 185, 129, 0.18);
            }

            .delete-button,
            .mini-delete {
                width: 38px;
                height: 38px;
                background: #fee2e2;
                color: #b91c1c;
            }

            .mini-delete {
                width: 34px;
                height: 34px;
            }

            .badge {
                display: inline-flex;
                min-width: 42px;
                justify-content: center;
                padding: 7px 11px;
                border-radius: 999px;
                font-weight: 950;
            }

            .badge.green {
                background: #dcfce7;
                color: #166534;
            }

            .badge.yellow {
                background: #fef3c7;
                color: #92400e;
            }

            .badge.red {
                background: #fee2e2;
                color: #991b1b;
            }

            .cart-list,
            .sales-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .cart-list {
                max-height: 390px;
                overflow: auto;
                padding-right: 4px;
            }

            .cart-item,
            .sale-card {
                background: #f8fafc;
                border: 1px solid #dbe4f0;
                border-radius: 22px;
                padding: 16px;
            }

            .cart-item {
                display: grid;
                grid-template-columns: 1fr auto auto auto;
                gap: 12px;
                align-items: center;
            }

            .cart-info strong,
            .cart-subtotal,
            .sale-card strong {
                color: var(--ink);
                font-weight: 950;
            }

            .cart-info p {
                margin: 5px 0 0;
                color: var(--muted);
                font-weight: 700;
            }

            .qty-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .qty-controls button {
                width: 36px;
                height: 36px;
                display: grid;
                place-items: center;
                border-radius: 50%;
                cursor: pointer;
                background: #dbeafe;
                color: var(--blue-dark);
            }

            .qty-controls input {
                width: 70px;
                text-align: center;
                padding: 9px;
            }

            .total-box,
            .change-box {
                display: flex;
                justify-content: space-between;
                margin: 16px 0;
                padding: 18px;
                border-radius: 22px;
                font-size: 18px;
                font-weight: 950;
            }

            .total-box {
                background: linear-gradient(135deg, #0f172a, var(--blue));
                color: white;
                box-shadow: 0 14px 30px rgba(37, 99, 235, 0.20);
            }

            .change-box {
                background: #dcfce7;
                color: #166534;
                border: 1px solid #86efac;
            }

            .sale-head,
            .sale-line,
            .sale-footer {
                display: flex;
                justify-content: space-between;
                gap: 12px;
            }

            .sale-lines {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 14px;
            }

            .sale-line {
                color: #334155;
                font-weight: 720;
            }

            .sale-footer {
                border-top: 1px solid #dbe4f0;
                margin-top: 14px;
                padding-top: 12px;
                color: #334155;
                font-size: 14px;
                font-weight: 820;
            }

            @media (max-width: 980px) {
                .hero,
                .panel-title-row,
                .table-header {
                    flex-direction: column;
                    align-items: stretch;
                }

                .hero {
                    padding: 34px;
                }

                .hero-actions {
                    align-items: stretch;
                }

                .stats,
                .grid-two,
                .checkout-grid {
                    grid-template-columns: 1fr;
                }

                .compact-panel,
                .checkout-panel {
                    position: static;
                }

                .search {
                    min-width: 0;
                    width: 100%;
                }

                .nav {
                    width: 100%;
                    overflow: auto;
                }

                .cart-item {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 560px) {
                .app-shell,
                .auth-page {
                    padding: 18px 12px 44px;
                }

                .hero,
                .panel,
                .stat-card,
                .auth-card {
                    border-radius: 25px;
                    padding: 20px;
                }

                .hero h1 {
                    font-size: 38px;
                    letter-spacing: -0.055em;
                }

                .stats {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
            }
        `}</style>
    );
}
