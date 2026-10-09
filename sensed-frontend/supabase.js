// ============================================================
//  SENSED — supabase.js  (sin confirmación de email)
// ============================================================

const SUPABASE_URL  = "https://xtphewnkhdnpzpwykgka.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cGhld25raGRucHpwd3lrZ2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTA4MzMsImV4cCI6MjEwNzAyNjgzM30.IJgoZf7GnfqeKbg6ElncDpkx6byrkfQpo0CEgLxwMOg";

async function sbRequest(path, opts = {}) {
    const token = opts.token || SUPABASE_ANON;
    const res = await fetch(`${SUPABASE_URL}${path}`, {
        headers: {
            "apikey":        SUPABASE_ANON,
            "Authorization": `Bearer ${token}`,
            "Content-Type":  "application/json",
            "Prefer":        "return=representation",
            ...(opts.headers || {}),
        },
        method:  opts.method  || "GET",
        body:    opts.body    || undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return { ok: res.ok, status: res.status, data };
}

window.Sensed = {

    // ── Registro ─────────────────────────────────────────
    async register(username, password) {
        // Email ficticio único basado en el username
        const email = `${username.toLowerCase().replace(/[^a-z0-9]/g,"")}@sensed.es`;

        // 1. Crear cuenta en Supabase Auth
        const authRes = await sbRequest("/auth/v1/signup", {
            method: "POST",
            body: JSON.stringify({ email, password, options: { emailRedirectTo: null } }),
        });

        if (!authRes.ok || authRes.data?.error) {
            const msg = authRes.data?.error?.message || authRes.data?.msg || "Error al registrar";
            // Si el email ya existe, intentar login directamente
            if (msg.includes("already") || msg.includes("registered")) {
                return { ok: false, error: "Ese nombre de usuario ya existe." };
            }
            return { ok: false, error: msg };
        }

        const userId = authRes.data?.user?.id || authRes.data?.id;
        const token  = authRes.data?.access_token;

        if (!userId) return { ok: false, error: "No se pudo crear la cuenta." };

        // 2. Guardar perfil con username legible
        await sbRequest("/rest/v1/profiles", {
            method: "POST",
            token,
            body: JSON.stringify({ id: userId, username }),
        });

        return { ok: true, user: { id: userId, username, isGuest: false, token } };
    },

    // ── Login ─────────────────────────────────────────────
    async login(username, password) {
        const email = `${username.toLowerCase().replace(/[^a-z0-9]/g,"")}@sensed.es`;

        const authRes = await sbRequest("/auth/v1/token?grant_type=password", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        if (!authRes.ok || authRes.data?.error) {
            return { ok: false, error: "Usuario o contraseña incorrectos." };
        }

        const userId = authRes.data?.user?.id;
        const token  = authRes.data?.access_token;

        // Obtener username real del perfil
        const profRes = await sbRequest(`/rest/v1/profiles?id=eq.${userId}&select=username`, { token });
        const uname = profRes.data?.[0]?.username || username;

        return { ok: true, user: { id: userId, username: uname, isGuest: false, token } };
    },

    // ── Guardar puntuación ────────────────────────────────
    async saveScore(user, game, score) {
        if (!user || user.isGuest || !user.token) return;
        await sbRequest("/rest/v1/scores", {
            method: "POST",
            token:  user.token,
            body:   JSON.stringify({ user_id: user.id, username: user.username, game, score }),
        });
    },

    // ── Top 10 de un juego ────────────────────────────────
    async getLeaderboard(game) {
        const res = await sbRequest(
            `/rest/v1/scores?game=eq.${game}&select=username,score&order=score.desc&limit=10`
        );
        return res.data || [];
    },

    // ── Sesión local ──────────────────────────────────────
    saveSession(user)  { localStorage.setItem("sensed_user", JSON.stringify(user)); },
    loadSession()      { const s = localStorage.getItem("sensed_user"); return s ? JSON.parse(s) : null; },
    clearSession()     { localStorage.removeItem("sensed_user"); },
};
