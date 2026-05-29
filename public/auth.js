// maneja el login y la sesión
class Auth {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "null");
    }

    async login(email, password) {
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem("token", this.token);
                localStorage.setItem("user", JSON.stringify(this.user));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error("error en login:", error);
            return { success: false, error: "error al conectar con el servidor" };
        }
    }

    async register(nombre, email, password) {
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ nombre, email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem("token", this.token);
                localStorage.setItem("user", JSON.stringify(this.user));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error("error en registro:", error);
            return { success: false, error: "error al conectar con el servidor" };
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    async googleLogin(token) {
        try {
            const response = await fetch("/api/auth/google", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ token })
            });
            const data = await response.json();
            if (data.success) {
                this.saveSession(data.token, data.user);
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: "error de conexion" };
        }
    }

    saveSession(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem("token", this.token);
        localStorage.setItem("user", JSON.stringify(this.user));
    }
}

// creo la instancia para usarla en toda la app
const auth = new Auth();

// recibe la respuesta de entrada con google
async function handleGoogleLogin(response) {
    const result = await auth.googleLogin(response.credential);
    if (result.success) {
        window.location.href = "/";
    } else {
        alert("error en google login: " + result.error);
    }
}

// controla botones y campos de la página de entrada
if (document.getElementById("login-form")) {
    // para cambiar entre la pestaña de entrar y la de registrarse
    document.querySelectorAll(".auth-tab").forEach(tab => {
        tab.addEventListener("click", (e) => {
            const tabName = e.target.dataset.tab;

            document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));

            e.target.classList.add("active");
            document.getElementById(`${tabName}-form`).classList.add("active");
        });
    });

    // cuando el usuario le da a entrar
    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        const errorDiv = document.getElementById("login-error");

        errorDiv.style.display = "none";

        const result = await auth.login(email, password);

        if (result.success) {
            window.location.href = "/";
        } else {
            errorDiv.textContent = result.error;
            errorDiv.style.display = "block";
        }
    });

    // cuando alguien nuevo se quiere registrar
    document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("register-name").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const confirm = document.getElementById("register-confirm").value;
        const errorDiv = document.getElementById("register-error");

        errorDiv.style.display = "none";

        if (password !== confirm) {
            errorDiv.textContent = "las contraseñas no coinciden";
            errorDiv.style.display = "block";
            return;
        }

        if (password.length < 6) {
            errorDiv.textContent = "la contraseña es muy corta, pon al menos 6 letras o números";
            errorDiv.style.display = "block";
            return;
        }

        const result = await auth.register(nombre, email, password);

        if (result.success) {
            window.location.href = "/";
        } else {
            errorDiv.textContent = result.error;
            errorDiv.style.display = "block";
        }
    });
}
