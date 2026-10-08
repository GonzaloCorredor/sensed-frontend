// ============================================================
//  SENSED — supabase.js
//  Archivo compartido de autenticación con Supabase
//  Importado por index.html como <script src="supabase.js">
// ============================================================

const SUPABASE_URL  = "https://xtphewnkhdnpzpwykgka.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cGhld25raGRucHpwd3lrZ2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTA4MzMsImV4cCI6MjEwNzAyNjgzM30.IJgoZf7GnfqeKbg6ElncDpkx6byrkfQpo0CEgLxwMOg";

// ── Helpers básicos ──────────────────────────────────────────

async function sbFetch(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        headers: {
            "apikey":        SUPABASE_ANON,
            "Authorization": `Bearer ${SUPABASE_ANON}`,
            "Content-Type":  "application/json",
            "Prefer":        "return=representation",
            ...opts.headers,
        },
        ...opts,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

async function sbAuth(action, email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${action}`, {
        method:  "POST",
        headers: { "apikey": SUPABASE_ANON, "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
    });
    return res.json();
}

// ── API pública ──────────────────────────────────────────────

window.Sensed = {

    // Registrar nuevo usuario
    async register(username, password) {
        // Usamos username@sensed.es como email interno
        const email = `${username}@sensed.es`;
        const data  = await sbAuth("signup", email, password);
        if (data.error) return { ok: false, error: data.error.message };

        // Guardar perfil con username legible
        const userId = data.user?.id;
        if (userId) {
            await sbFetch("/profiles", {
                method: "POST",
                body:   JSON.stringify({ id: userId, username }),
            });
        }
        return { ok: true, user: { id: userId, username, isGuest: false, token: data.access_token } };
    },

    // Iniciar sesión
    async login(username, password) {
        const email = `${username}@sensed.es`;
        const data  = await sbAuth("token?grant_type=password", email, password);
        if (data.error) return { ok: false, error: data.error.message };

        const userId = data.user?.id;
        // Obtener username del perfil
        const prof = await sbFetch(`/profiles?id=eq.${userId}&select=username`, {
            headers: { "Authorization": `Bearer ${data.access_token}` }
        });
        const uname = prof.data?.[0]?.username || username;
        return { ok: true, user: { id: userId, username: uname, isGuest: false, token: data.access_token } };
    },

    // Guardar puntuación (solo usuarios registrados, no invitados)
    async saveScore(user, game, score) {
        if (!user || user.isGuest || !user.token) return;
        await sbFetch("/scores", {
            method:  "POST",
            headers: { "Authorization": `Bearer ${user.token}` },
            body:    JSON.stringify({ user_id: user.id, username: user.username, game, score }),
        });
    },

    // Obtener top 10 de un juego
    async getLeaderboard(game) {
        const res = await sbFetch(
            `/scores?game=eq.${game}&select=username,score&order=score.desc&limit=10`
        );
        return res.data || [];
    },

    // Sesión local
    saveSession(user)  { localStorage.setItem("sensed_user", JSON.stringify(user)); },
    loadSession()      { const s = localStorage.getItem("sensed_user"); return s ? JSON.parse(s) : null; },
    clearSession()     { localStorage.removeItem("sensed_user"); },
};
