const AppConfig = {
    CANVAS_ID: "particleCanvas",
    DEFAULT_SKIN: "classic",
    ANIMATION_DURATION: 3450,
    PROGRESS_DURATION: 3,
    API_BASE_URL: "https://backend12-production-1210.up.railway.app",
    FALLBACK_AVATAR: "pictures/cubics/классика/начальный-кубик.gif"
};

const AppState = {
    userData: null,
    isPremium: false,
    userId: null,
    isInitialized: false
};

// Измененная функция loadConfig
async function loadConfig(token, tg) {
    try {
        const telegramInitData = window.Telegram.WebApp.initData || "";
        if (!telegramInitData) {
            throw new Error("Telegram initData is required for API requests");
        }
        const response = await fetch(`${AppConfig.API_BASE_URL}/get_config`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-Telegram-Init-Data": telegramInitData,
                "Authorization": `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const data = await response.json();
        Object.assign(AppConfig, {
            API_BASE_URL: data.API_BASE_URL,
            CHANNEL_USERNAME: data.CHANNEL_USERNAME
        });
    } catch (error) {
        console.error("Failed to load config:", error);
        if (tg && error.message.includes("401")) {
            tg.showPopup({
                message: "Authorization failed. Please restart the app.",
                buttons: [{ text: "OK", id: "ok" }]
            });
        }
        Object.assign(AppConfig, {
            API_BASE_URL: "https://backend12-production-1210.up.railway.app",
            CHANNEL_USERNAME: "LuckyCubesChannel"
        });
    }
}

const tg = window.Telegram?.WebApp;

// TON Connect UI
let tonConnectUI;
let tonConnectAttempts = 0;
const maxTonConnectAttempts = 2;

async function initializeTonConnect() {
    if (!window.TON_CONNECT_UI) {
        tonConnectAttempts++;
        if (tonConnectAttempts <= maxTonConnectAttempts) {
            console.warn(`TON Connect SDK is not loaded. Attempt ${tonConnectAttempts}/${maxTonConnectAttempts}. Retrying in 5 seconds...`);
            setTimeout(initializeTonConnect, 5000);
        } else {
            console.error("TON Connect SDK failed to load after maximum attempts.");
            Telegram.WebApp.showAlert("TON wallet integration unavailable. Please reload the page or continue without it.");
        }
        return;
    }

    try {
        tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
            manifestUrl: "https://suspect147.github.io/LUCU/manifest.json",
            buttonRootId: "ton-connect"
        });
        console.log("TON Connect UI initialized successfully");
        tonConnectUI.onStatusChange(walletInfo => {
            if (walletInfo) {
                console.log("Wallet connected:", walletInfo);
            } else {
                console.warn("Wallet disconnected");
                Telegram.WebApp.showAlert("Please connect your TON wallet to continue.");
            }
        });
    } catch (error) {
        console.error("Failed to initialize TON Connect UI:", error);
        Telegram.WebApp.showAlert("TON wallet unavailable. You can continue without it.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeTonConnect();
});

const Utils = {
    formatCoins(amount) {
        if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
        if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
        return amount.toString();
    },
    formatNumber(num) {
        return num >= 1 ? num.toFixed(4) : num.toPrecision(4);
    },
    formatWithCommas(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    adjustFontSize(element) {
        const parentWidth = element.parentElement.offsetWidth;
        let fontSize = 35;
        element.style.fontSize = `${fontSize}px`;
        while (element.scrollWidth > parentWidth && fontSize > 5) {
            element.style.fontSize = `${--fontSize}px`;
        }
    },
    copyToClipboard(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
    }
};

const API = {
    defaultHeaders: {},
    async fetch(endpoint, options = {}) {
        const url = `${AppConfig.API_BASE_URL}${endpoint}`;
        const telegramInitData = window.Telegram.WebApp.initData || "";
        if (!telegramInitData) {
            throw new Error("Telegram initData is required for API requests");
        }
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        ...API.defaultHeaders,
                        ...options.headers
                    }
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    const error = new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
                    error.status = response.status;
                    throw error;
                }
                return await response.json();
            } catch (error) {
                attempts++;
                if (attempts === maxAttempts) {
                    if (error.status === 500) {
                        throw new Error("Server is experiencing issues, please try again later.");
                    }
                    throw error;
                }
                await Utils.wait(1000 * attempts);
            }
        }
    }
};

class Particle {
    constructor(id, parent) {
        this.id = id;
        this.parent = parent;
        this.position = { x: 0, y: 0 };
        this.diameter = 0;
        this.life = 0;
        this.speed = { x: 0, y: 0 };
        this.init();
    }
    init() {
        const FPS = 60;
        const interval = setInterval(() => {
            this.position.x += (FPS * this.speed.x) / 1000;
            this.position.y -= (FPS * this.speed.y) / 1000;
            this.life -= 1 / FPS;
            if (this.life <= 0) {
                clearInterval(interval);
                this.parent.particles.delete(this.id);
            }
        }, 1000 / FPS);
    }
}

class ParticleSystem {
    constructor(canvas, size) {
        this.canvas = canvas;
        this.size = size;
        this.particles = new Map();
        this.lastId = 0;
        this.amount = 100;
        this.diameter = { min: 1, max: 3 };
        this.life = { min: 3, max: 7 };
        this.speed = { x: { min: -2, max: 2 }, y: { min: -2, max: 2 } };
        this.canvas.width = size.x;
        this.canvas.height = size.y;
    }
    createParticle() {
        const particle = new Particle(this.lastId.toString(), this);
        particle.position.x = Math.random() * this.size.x;
        particle.position.y = Math.random() * this.size.y;
        particle.diameter = Math.random() * (this.diameter.max - this.diameter.min) + this.diameter.min;
        particle.life = Math.random() * (this.life.max - this.life.min) + this.life.min;
        particle.speed.x = Math.random() * (this.speed.x.max - this.speed.x.min) + this.speed.x.min;
        particle.speed.y = Math.random() * (this.speed.y.max - this.speed.y.min) + this.speed.y.min;
        this.particles.set(this.lastId.toString(), particle);
        this.lastId++;
    }
    init() {
        const ctx = this.canvas.getContext("2d");
        ctx.fillStyle = "white";
        for (let i = 0; i < this.amount; i++) this.createParticle();
        setInterval(() => {
            if (this.particles.size < this.amount) this.createParticle();
        }, 1000 / 60);
        setInterval(() => {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.particles.forEach(particle => {
                ctx.beginPath();
                ctx.arc(particle.position.x, particle.position.y, particle.diameter / 2, 0, 2 * Math.PI);
                ctx.fill();
            });
        }, 1000 / 60);
    }
    resize(newSize, oldSize) {
        this.canvas.width = newSize.x;
        this.canvas.height = newSize.y;
        this.size = newSize;
        const ctx = this.canvas.getContext("2d");
        ctx.fillStyle = "white";
        this.particles.forEach(particle => {
            particle.position.x = (particle.position.x / oldSize.x) * newSize.x;
            particle.position.y = (particle.position.y / oldSize.y) * newSize.y;
        });
    }
}

const UI = {
    toggleMenu(menu, show) {
        menu.classList.toggle("hidden", !show);
        menu.classList.toggle("show", show);
        if (!show) {
            menu.classList.add("hide");
            setTimeout(() => menu.classList.remove("hide"), 400);
        }
    },
    addSwipeHandler(menu, onSwipeDown) {
        let startY;
        menu.addEventListener("touchstart", e => startY = e.touches[0].clientY);
        menu.addEventListener("touchmove", e => {
            const deltaY = e.touches[0].clientY - startY;
            if (deltaY > 50) onSwipeDown();
        });
    }
};

const Game = {
    elements: {
        cube: null,
        coinsDisplay: null,
        bestLuckDisplay: null,
        progressBar: null
    },
    state: {
        coins: 0,
        bestLuck: 1001,
        isAnimating: false,
        equippedSkin: AppConfig.DEFAULT_SKIN,
        rolls: 0
    },
    init() {
        this.elements.cube = document.getElementById("cube");
        this.elements.coinsDisplay = document.getElementById("coins") || document.getElementById("coins-display");
        this.elements.bestLuckDisplay = document.getElementById("bestLuck");
        this.elements.progressBar = document.querySelector("#progressBar div");
        if (!this.elements.cube || !this.elements.coinsDisplay || !this.elements.bestLuckDisplay || !this.elements.progressBar) {
            return;
        }
        document.body.style.transition = "background 0.5s ease-in-out, background-image 0.5s ease-in-out";
        this.elements.cube.addEventListener("click", this.handleClick.bind(this));
        this.updateFromAppState();
    },
    updateFromAppState() {
        const data = AppState.userData;
        if (!data) {
            return;
        }
        this.state.coins = data.coins || 0;
        this.state.bestLuck = data.min_luck === undefined || data.min_luck === null ? 1001 : data.min_luck;
        this.state.equippedSkin = data.equipped_skin || AppConfig.DEFAULT_SKIN;
        this.state.rolls = data.rolls || 0;
        const skinConfig = this.getSkinConfig();
        this.elements.cube.src = skinConfig[this.state.equippedSkin].initial + `?t=${Date.now()}`;
        this.elements.coinsDisplay.textContent = `${Utils.formatCoins(this.state.coins)} $LUCU`;
        this.elements.bestLuckDisplay.innerHTML = this.state.bestLuck === 1001
            ? `Your Best MIN number: <span style="color: #F80000;">N/A</span>`
            : `Your Best MIN number: <span style="color: #F80000;">${Utils.formatNumber(this.state.bestLuck)}</span>`;
    },
    setInitialCube() {
        const skinConfig = this.getSkinConfig();
        const initialSrc = skinConfig[this.state.equippedSkin].initial + `?t=${Date.now()}`;
        this.elements.cube.src = initialSrc;
    },
    handleClick(event) {
        if (this.state.isAnimating) {
            event.preventDefault();
            return;
        }
        this.rollCube();
    },
    async rollCube() {
        if (this.state.isAnimating) return;

        this.state.isAnimating = true;

        try {
            const userId = tg?.initDataUnsafe?.user?.id?.toString();
            if (!userId) throw new Error("User ID отсутствует в данных Telegram");

            const response = await API.fetch("/roll_cube", {
                method: "POST",
                headers: {
                    "X-Telegram-Init-Data": window.Telegram.WebApp.initData || ""
                },
                body: { user_id: userId }
            });

            if (!response.outcome_src || response.coins === undefined || response.luck === undefined) {
                throw new Error("Некорректный ответ от сервера: отсутствуют обязательные поля");
            }

            this.elements.cube.src = response.outcome_src;
            this.startProgress(AppConfig.ANIMATION_DURATION);

            AppState.userData = {
                ...AppState.userData,
                coins: response.coins,
                rolls: response.total_rolls,
                min_luck: Math.min(AppState.userData.min_luck || 1001, response.luck),
                equipped_skin: response.equipped_skin
            };

            if (AppState.userData.ban !== "yes") {
                document.body.classList.remove("pink-gradient", "gray-gradient");
                document.body.classList.add(response.is_rainbow ? "pink-gradient" : "gray-gradient");

                const coinUpdateDelay = AppConfig.ANIMATION_DURATION - 500;
                setTimeout(() => {
                    this.state.coins = response.coins;
                    this.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.coins)} $LUCU`;
                }, coinUpdateDelay);

                await Utils.wait(AppConfig.ANIMATION_DURATION);

                if (response.luck < this.state.bestLuck) {
                    this.state.bestLuck = response.luck;
                }
                this.state.rolls = response.total_rolls;
                this.state.equippedSkin = response.equipped_skin;

                this.elements.bestLuckDisplay.innerHTML = `Your Best MIN number: <span style="color: #F80000;">${Utils.formatNumber(this.state.bestLuck)}</span>`;
                this.updateAchievementProgress(response.total_rolls);

                if (response.is_rainbow) {
                    document.body.classList.remove("pink-gradient");
                    document.body.classList.add("gray-gradient");
                }
            } else {
                const coinUpdateDelay = AppConfig.ANIMATION_DURATION - 500;
                setTimeout(() => {
                    this.state.coins = response.coins;
                    this.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.coins)} $LUCU`;
                }, coinUpdateDelay);
                await Utils.wait(AppConfig.ANIMATION_DURATION);
            }

            this.setInitialCube();
        } catch (error) {
            console.error("Roll cube error:", error);

            if (error.message.includes("422")) {
                this.elements.coinsDisplay.textContent = "Invalid request data";
            } else if (error.message.includes("401")) {
                this.elements.coinsDisplay.textContent = "Unauthorized access";
            } else if (error.message.includes("403")) {
                this.elements.coinsDisplay.textContent = "You are banned";
            } else if (error.message.includes("429")) {
                this.elements.coinsDisplay.textContent = "Too many requests, wait a second";
            } else {
                this.elements.coinsDisplay.textContent = "Server error, try again later";
            }

            this.setInitialCube();
            await Utils.wait(2000);
        } finally {
            this.state.isAnimating = false;
        }
    },
    startProgress(duration) {
        this.elements.progressBar.style.transition = `width ${duration / 1000}s linear`;
        this.elements.progressBar.style.width = "100%";
        setTimeout(() => {
            this.elements.progressBar.style.transition = "none";
            this.elements.progressBar.style.width = "0%";
        }, duration);
    },
    getSkinConfig() {
        return {
            "banned": {
                "initial": "ban.gif",
                "default": [{"range": 100, "src": "ban.gif", "coins": -1}],
                "rainbow": [{"range": 100, "src": "ban.gif", "coins": -100}]
            },
            "classic": {
                "initial": "pictures/cubics/классика/начальный-кубик.gif",
                "default": [
                    {"range": 40, "src": "pictures/cubics/классика/1-кубик.gif", "coins": 1},
                    {"range": 65, "src": "pictures/cubics/классика/2-кубик.gif", "coins": 2},
                    {"range": 80, "src": "pictures/cubics/классика/3-кубик.gif", "coins": 3},
                    {"range": 90, "src": "pictures/cubics/классика/4-кубик.gif", "coins": 4},
                    {"range": 97, "src": "pictures/cubics/классика/5-кубик.gif", "coins": 5},
                    {"range": 100, "src": "pictures/cubics/классика/6-кубик.gif", "coins": 6}
                ],
                "rainbow": [
                    {"range": 40, "src": "pictures/cubics/классика/1-кубик.gif", "coins": 2},
                    {"range": 65, "src": "pictures/cubics/классика/2-кубик.gif", "coins": 4},
                    {"range": 80, "src": "pictures/cubics/классика/3-кубик.gif", "coins": 6},
                    {"range": 90, "src": "pictures/cubics/классика/4-кубик.gif", "coins": 8},
                    {"range": 97, "src": "pictures/cubics/классика/5-кубик.gif", "coins": 10},
                    {"range": 100, "src": "pictures/cubics/классика/6-кубик.gif", "coins": 12}
                ]
            },
            "negative": {
                "initial": "pictures/cubics/негатив/начальный-кубик-негатив.gif",
                "default": [
                    {"range": 40, "src": "pictures/cubics/негатив/1-кубик-негатив.gif", "coins": 2},
                    {"range": 65, "src": "pictures/cubics/негатив/2-кубик-негатив.gif", "coins": 3},
                    {"range": 80, "src": "pictures/cubics/негатив/3-кубик-негатив.gif", "coins": 4},
                    {"range": 90, "src": "pictures/cubics/негатив/4-кубик-негатив.gif", "coins": 5},
                    {"range": 97, "src": "pictures/cubics/негатив/5-кубик-негатив.gif", "coins": 6},
                    {"range": 100, "src": "pictures/cubics/негатив/6-кубик-негатив.gif", "coins": 7}
                ],
                "rainbow": [
                    {"range": 15, "src": "pictures/cubics/негатив/1-кубик-негатив.gif", "coins": 4},
                    {"range": 45, "src": "pictures/cubics/негатив/2-кубик-негатив.gif", "coins": 6},
                    {"range": 70, "src": "pictures/cubics/негатив/3-кубик-негатив.gif", "coins": 8},
                    {"range": 85, "src": "pictures/cubics/негатив/4-кубик-негатив.gif", "coins": 10},
                    {"range": 94, "src": "pictures/cubics/негатив/5-кубик-негатив.gif", "coins": 12},
                    {"range": 100, "src": "pictures/cubics/негатив/6-кубик-негатив.gif", "coins": 14}
                ]
            },
            "Emerald": {
                "initial": "pictures/cubics/перевернутый/начальный-кубик-перевернутый.gif",
                "default": [
                    {"range": 40, "src": "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", "coins": 3},
                    {"range": 65, "src": "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", "coins": 4},
                    {"range": 80, "src": "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", "coins": 5},
                    {"range": 90, "src": "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", "coins": 6},
                    {"range": 97, "src": "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", "coins": 7},
                    {"range": 100, "src": "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", "coins": 8}
                ],
                "rainbow": [
                    {"range": 15, "src": "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", "coins": 6},
                    {"range": 45, "src": "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", "coins": 8},
                    {"range": 70, "src": "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", "coins": 10},
                    {"range": 85, "src": "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", "coins": 12},
                    {"range": 94, "src": "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", "coins": 14},
                    {"range": 100, "src": "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", "coins": 16}
                ]
            },
            "Pixel": {
                "initial": "pictures/cubics/пиксель/начальный-кубик-пиксель.gif",
                "default": [
                    {"range": 40, "src": "pictures/cubics/пиксель/1-кубик-пиксель.gif", "coins": 10},
                    {"range": 65, "src": "pictures/cubics/пиксель/2-кубик-пиксель.gif", "coins": 11},
                    {"range": 80, "src": "pictures/cubics/пиксель/3-кубик-пиксель.gif", "coins": 12},
                    {"range": 90, "src": "pictures/cubics/пиксель/4-кубик-пиксель.gif", "coins": 13},
                    {"range": 97, "src": "pictures/cubics/пиксель/5-кубик-пиксель.gif", "coins": 14},
                    {"range": 100, "src": "pictures/cubics/пиксель/6-кубик-пиксель.gif", "coins": 15}
                ],
                "rainbow": [
                    {"range": 40, "src": "pictures/cubics/пиксель/1-кубик-пиксель.gif", "coins": 20},
                    {"range": 65, "src": "pictures/cubics/пиксель/2-кубик-пиксель.gif", "coins": 22},
                    {"range": 80, "src": "pictures/cubics/пиксель/3-кубик-пиксель.gif", "coins": 24},
                    {"range": 90, "src": "pictures/cubics/пиксель/4-кубик-пиксель.gif", "coins": 26},
                    {"range": 97, "src": "pictures/cubics/пиксель/5-кубик-пиксель.gif", "coins": 28},
                    {"range": 100, "src": "pictures/cubics/пиксель/6-кубик-пиксель.gif", "coins": 30}
                ]
            }
        };
    },
    updateAchievementProgress(rolls) {
        const targetRolls = 123456;
        const rollsProgress = Math.min((rolls / targetRolls) * 100, 100);
        const achievementRolls = document.querySelector("#achievements-list .achievement-item:nth-child(2)");
        if (achievementRolls) {
            achievementRolls.querySelector(".progress-circle").style.setProperty("--progress", `${rollsProgress}%`);
            achievementRolls.querySelector(".achievement-reward").textContent = rolls >= targetRolls
                ? "Achievement Completed! 123456 dice rolls made!"
                : `Make ${Utils.formatWithCommas(targetRolls - rolls)} more dice rolls to complete`;
        }
        const targetCoins = 100000;
        const coinsProgress = Math.min((this.state.coins / targetCoins) * 100, 100);
        const achievementCoins = document.querySelector("#achievements-list .achievement-item:nth-child(3)");
        if (achievementCoins) {
            achievementCoins.querySelector(".progress-circle").style.setProperty("--progress", `${coinsProgress}%`);
            achievementCoins.querySelector(".achievement-reward").textContent = this.state.coins >= targetCoins
                ? "Achievement Completed! 100,000+ $LUCU earned!"
                : `Earn ${Utils.formatWithCommas(targetCoins - this.state.coins)} more $LUCU to complete`;
        }
        const betaPlayer = AppState.userData.beta_player === "yes";
        const achievementBeta = document.querySelector("#achievements-list .achievement-item:nth-child(1)");
        if (achievementBeta) {
            achievementBeta.querySelector(".progress-circle").style.setProperty("--progress", betaPlayer ? "100%" : "0%");
            achievementBeta.querySelector(".achievement-reward").textContent = betaPlayer
                ? "Achievement Completed! You are a beta tester!"
                : "Become a beta tester to complete";
        }
    }
};

const Skins = {
    elements: {
        buyNegative: document.getElementById("buy-negative"),
        buyEmerald: document.getElementById("buy-Emerald"),
        buyPixel: document.getElementById("buy-Pixel"),
        equipClassic: document.getElementById("equip-classic"),
        menu: document.getElementById("skins-menu"),
        button: document.querySelector('.menu-item img[alt="Skins"]')
    },
    state: {
        ownedSkins: [],
        equippedSkin: AppConfig.DEFAULT_SKIN
    },
    init() {
        this.elements.button.addEventListener("click", () => UI.toggleMenu(this.elements.menu, true));
        this.elements.menu.addEventListener("click", e => {
            if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
        });
        UI.addSwipeHandler(this.elements.menu, () => UI.toggleMenu(this.elements.menu, false));
        this.elements.buyNegative.addEventListener("click", () => this.handleSkin("negative"));
        this.elements.buyEmerald.addEventListener("click", () => this.handleSkin("Emerald"));
        this.elements.buyPixel.addEventListener("click", () => this.handleSkin("Pixel"));
        this.elements.equipClassic.addEventListener("click", () => this.handleSkin("classic"));
        this.updateFromAppState();
    },
    updateFromAppState() {
        const data = AppState.userData;
        if (!data) {
            return;
        }
        this.state.ownedSkins = data.owned_skins || [];
        this.state.equippedSkin = data.equipped_skin || AppConfig.DEFAULT_SKIN;
        this.updateUI();
    },
    async handleSkin(type) {
        const userId = tg.initDataUnsafe?.user?.id?.toString();
        if (!userId) {
            Telegram.WebApp.showAlert("User ID not found. Please restart the app.");
            return;
        }

        if (AppState.userData.ban === "yes") {
            Telegram.WebApp.showAlert("You are banned and cannot purchase skins.");
            return;
        }

        const skinPrices = {
            "negative": 5000,
            "Emerald": 10000,
            "Pixel": 150000,
            "classic": 0
        };

        const price = skinPrices[type];
        if (price && AppState.userData.coins < price) {
            Telegram.WebApp.showAlert(`Not enough $LUCU! You need ${Utils.formatCoins(price)} $LUCU.`);
            return;
        }

        try {
            const response = await API.fetch("/handle_skin", {
                method: "POST",
                headers: {
                    "X-Telegram-Init-Data": window.Telegram.WebApp.initData || ""
                },
                body: { user_id: userId, skin_type: type }
            });

            if (response.success) {
                this.state.ownedSkins = response.owned_skins;
                this.state.equippedSkin = response.equipped_skin;
                this.updateUI();
                Game.state.coins = response.new_coins;
                Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.new_coins)} $LUCU`;
                Game.elements.cube.src = `${Game.getSkinConfig()[type].initial}?t=${Date.now()}`;
                AppState.userData = {
                    ...AppState.userData,
                    coins: response.new_coins,
                    owned_skins: response.owned_skins,
                    equipped_skin: response.equipped_skin
                };
                Telegram.WebApp.showAlert(`Skin ${type} successfully ${response.owned_skins.includes(type) ? "equipped" : "purchased and equipped"}!`);
            } else {
                Telegram.WebApp.showAlert(response.message || "Failed to handle skin purchase.");
            }
        } catch (error) {
            console.error("Skin purchase error:", error);
            if (error.status === 403) {
                Telegram.WebApp.showAlert("Access denied: You may be banned or lack permissions.");
            } else if (error.status === 400) {
                Telegram.WebApp.showAlert("Invalid request. Please try again.");
            } else {
                Telegram.WebApp.showAlert("Error purchasing skin: " + error.message);
            }
        }
    },
    updateUI() {
        const owned = this.state.ownedSkins;
        const equipped = this.state.equippedSkin;
        this.elements.buyNegative.textContent = owned.includes("negative")
            ? (equipped === "negative" ? "Equipped" : "Equip")
            : "Buy //5K $LUCU/";
        this.elements.buyEmerald.textContent = owned.includes("Emerald")
            ? (equipped === "Emerald" ? "Equipped" : "Equip")
            : "Buy //10K $LUCU/";
        this.elements.buyPixel.textContent = owned.includes("Pixel")
            ? (equipped === "Pixel" ? "Equipped" : "Equip")
            : "Buy //150K $LUCU/";
        this.elements.equipClassic.textContent = equipped === "classic" ? "Equipped" : "Equip";
    }
};

const Quests = {
    elements: {
        menu: document.getElementById("quests-menu"),
        button: document.querySelector('.menu-item img[alt="Quests"]'),
        questsTab: document.getElementById("quests-tab"),
        achievementsTab: document.getElementById("achievements-tab"),
        questsList: document.getElementById("quests-list"),
        achievementsList: document.getElementById("achievements-list")
    },
    init() {
        Telegram.WebApp.ready();

        this.elements.button.addEventListener("click", () => {
            UI.toggleMenu(this.elements.menu, true);
            this.updateQuestStatus();
            this.refreshUserData();
        });

        this.elements.menu.addEventListener("click", e => {
            if (e.target === this.elements.menu) {
                UI.toggleMenu(this.elements.menu, false);
            }
        });

        UI.addSwipeHandler(this.elements.menu, () => UI.toggleMenu(this.elements.menu, false));

        this.elements.questsList.querySelectorAll(".quest-btn").forEach(button => {
            button.addEventListener("click", () => {
                const questName = button.getAttribute("data-quest");
                if (questName) {
                    this.handleQuest(questName);
                } else {
                    console.error("Quest name is null or undefined");
                }
            });
        });

        this.elements.questsTab.addEventListener("click", () => this.switchTab("quests"));
        this.elements.achievementsTab.addEventListener("click", () => this.switchTab("achievements"));

        this.refreshInterval = setInterval(async () => {
            if (!this.elements.menu.classList.contains("hidden")) {
                await this.refreshUserData();
                this.updateQuestStatus();
            }
        }, 30000);

        tg.onEvent("viewport_changed", async () => {
            const userId = tg?.initDataUnsafe?.user?.id?.toString();
            if (userId) await this.checkPendingQuests(userId);
        });

        this.refreshUserData();

        Telegram.WebApp.MainButton.onClick(async () => {
            await this.handleDiceStatus(tg.initDataUnsafe.user?.id?.toString());
        });
    },
    async refreshUserData() {
        const userId = tg?.initDataUnsafe?.user?.id?.toString();
        if (!userId) return;
        try {
            const userData = await API.fetch(`/get_user_data_new/${userId}`);
            if (JSON.stringify(AppState.userData) !== JSON.stringify(userData)) {
                AppState.userData = { ...AppState.userData, ...userData };
                this.updateQuestStatus();
            }
        } catch (error) {
            console.error("Failed to refresh user data:", error);
        }
    },
    updateQuestStatus() {
        const data = AppState.userData;
        if (!data || !data.quests) return;

        const questButtons = {
            "subscription_quest": this.elements.questsList.querySelector('[data-quest="subscription_quest"]'),
            "forward_message": this.elements.questsList.querySelector('[data-quest="forward_message"]'),
            "dice_status": this.elements.questsList.querySelector('[data-quest="dice_status"]'),
            "dice_nickname": this.elements.questsList.querySelector('[data-quest="dice_nickname"]'),
            "boost_channel": this.elements.questsList.querySelector('[data-quest="boost_channel"]')
        };

        Object.entries(questButtons).forEach(([quest, button]) => {
            if (!button) return;
            const status = data.quests[quest] || "no";
            button.disabled = false;
            if (status === "yes") {
                button.textContent = "Done!";
                button.classList.add("completed");
                button.style.background = "rgb(139, 0, 0)";
                button.style.cursor = "default";
                button.disabled = true;
            } else if (status === "pending") {
                button.textContent = "Claim";
                button.classList.remove("completed");
                button.style.background = "rgb(0, 139, 0)";
                button.style.cursor = "pointer";
            } else {
                button.textContent = "Go";
                button.classList.remove("completed");
                button.style.background = "";
                button.style.cursor = "pointer";
            }
        });
    },
    async handleQuest(questName) {
        const userId = tg?.initDataUnsafe?.user?.id?.toString();
        if (!userId) return;

        const questStatus = AppState.userData.quests[questName] || "no";
        if (questStatus === "yes") return;

        try {
            if (questStatus === "pending") {
                await this.completeQuest(userId, questName);
            } else {
                switch (questName) {
                    case "subscription_quest":
                        await this.handleSubscription(userId);
                        break;
                    case "forward_message":
                        await this.handleForwardMessage(userId);
                        break;
                    case "dice_status":
                        await this.handleDiceStatus(userId);
                        break;
                    case "dice_nickname":
                        await this.handleDiceNickname(userId);
                        break;
                    case "boost_channel":
                        await this.handleBoostChannel(userId);
                        break;
                    default:
                        console.error(`Unknown quest: ${questName}`);
                }
            }
        } catch (error) {
            console.error(`Error handling quest ${questName}:`, error);
        }
    },
    async handleSubscription(userId) {
        await this.refreshUserData();
        try {
            const subscriptionResponse = await API.fetch("/check_subscription", {
                method: "POST",
                body: { user_id: userId }
            });
            console.log("Subscription check response:", subscriptionResponse);

            if (subscriptionResponse.success || AppState.userData.quests["subscription_quest"] === "pending") {
                await this.completeQuest(userId, "subscription_quest");
                Telegram.WebApp.showAlert("Subscribed successfully! You earned 250 $LUCU.");
            } else {
                Telegram.WebApp.showAlert("Please subscribe to the channel to complete this quest.");
                tg.openLink(`https://t.me/${AppConfig.CHANNEL_USERNAME}`);
                setTimeout(async () => {
                    await this.checkPendingQuests(userId);
                    const userData = await API.fetch(`/get_user_data_new/${userId}`);
                    if (userData.quests["subscription_quest"] === "pending") {
                        await this.completeQuest(userId, "subscription_quest");
                    }
                }, 6000);
            }
        } catch (error) {
            console.error("Error checking subscription:", error);
            Telegram.WebApp.showAlert("An error occurred while checking your subscription. Please try again.");
        }
    },
    async handleForwardMessage(userId) {
        const message = `Hey, bro! Let's play this game together! 🎲\n\nOpen game: https://t.me/LuckyCubesbot`;
        tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(message)}`);
        Telegram.WebApp.showAlert("Please forward the message to any chat and wait 6 seconds to claim your reward.");
        setTimeout(async () => {
            await this.refreshUserData();
            const userData = await API.fetch(`/get_user_data_new/${userId}`);
            if (userData.quests["forward_message"] === "pending") {
                await this.completeQuest(userId, "forward_message");
                Telegram.WebApp.showAlert("Message forwarded! You earned 500 $LUCU.");
            } else {
                Telegram.WebApp.showAlert("Please forward the message to claim your reward.");
            }
        }, 6000);
    },
    async handleDiceStatus(userId) {
        const tg = window.Telegram.WebApp;
        try {
            if (!AppState.isPremium) {
                tg.showPopup({
                    message: "This quest requires Telegram Premium. Please upgrade your account to proceed.",
                    buttons: [{ text: "OK", id: "ok" }]
                });
                return;
            }

            const response = await Quests.completeQuest(String(userId), "dice_status");
            tg.setEmojiStatus({ custom_emoji_id: "5384541907051357217" });
            tg.showPopup({
                message: "Quest completed successfully!",
                buttons: [{ text: "OK", id: "ok" }]
            });
        } catch (error) {
            console.error("Failed to set emoji status or complete quest:", error);
            tg.showPopup({
                message: `Error: ${error.message}. Please try again.`,
                buttons: [{ text: "OK", id: "ok" }]
            });
        }
    },
    async handleDiceNickname(userId) {
        try {
            const response = await API.fetch("/check_dice_nickname", {
                method: "POST",
                body: { user_id: userId }
            });

            if (typeof response.success !== "boolean") {
                throw new Error("Invalid server response: 'success' field missing or invalid");
            }

            if (response.success) {
                await this.completeQuest(userId, "dice_nickname");
                Telegram.WebApp.showAlert("Dice nickname quest completed! You earned 100 $LUCU.");
            } else {
                Telegram.WebApp.showAlert(
                    "Please add the 🎲 emoji to your Telegram nickname (username, first name, or last name) and try again."
                );
            }
        } catch (error) {
            console.error("Error checking dice nickname:", error);
            Telegram.WebApp.showAlert("Error verifying nickname: " + error.message);
        }
    },
    async handleBoostChannel(userId) {
        tg.openLink(`https://t.me/${AppConfig.CHANNEL_USERNAME}?boost`);
        setTimeout(() => this.checkPendingQuests(userId), 6000);
    },
    async completeQuest(userId, questName) {
        try {
            const response = await API.fetch("/update_quest_new", {
                method: "POST",
                body: {
                    user_id: String(userId),
                    quest: questName,
                    status: "yes"
                }
            });
            if (response.message !== "Quest updated successfully") {
                throw new Error(`Failed to complete quest ${questName}: ${response.message}`);
            }
            AppState.userData.coins = response.new_coins;
            Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.new_coins)} $LUCU`;
            Quests.refreshUserData();
            return response;
        } catch (error) {
            console.error(`Error completing quest ${questName}:`, error);
            throw error;
        }
    },
    async checkPendingQuests(userId) {
        await this.refreshUserData();
        const userData = AppState.userData;
        if (!userData || !userData.quests) return;

        for (const quest in userData.quests) {
            if (userData.quests[quest] === "pending") {
                console.log(`Checking pending quest: ${quest}`);
                let canComplete = false;

                switch (quest) {
                    case "subscription_quest":
                        const subResponse = await API.fetch("/check_subscription", {
                            method: "POST",
                            body: { user_id: userId }
                        });
                        canComplete = subResponse.success;
                        break;
                    case "dice_nickname":
                        const diceResponse = await API.fetch("/check_dice_nickname", {
                            method: "POST",
                            body: { user_id: userId }
                        });
                        canComplete = diceResponse.success;
                        break;
                    default:
                        console.warn(`No condition check defined for quest: ${quest}`);
                        continue;
                }

                if (canComplete) {
                    try {
                        await this.completeQuest(userId, quest);
                        Telegram.WebApp.showAlert(`Quest ${quest} completed successfully!`);
                    } catch (error) {
                        console.log(`Quest ${quest} conditions met but completion failed: ${error.message}`);
                    }
                } else {
                    console.log(`Conditions for quest ${quest} not met. Skipping completion.`);
                }
                await Utils.wait(1000);
            }
        }
    },
    getQuestReward(questName) {
        const rewards = {
            "subscription_quest": 250,
            "forward_message": 500,
            "dice_status": 500,
            "dice_nickname": 100,
            "boost_channel": 500
        };
        return rewards[questName] || 0;
    },
    switchTab(tab) {
        this.elements.questsTab.classList.toggle("active", tab === "quests");
        this.elements.achievementsTab.classList.toggle("active", tab === "achievements");
        this.elements.questsList.classList.toggle("hidden", tab !== "quests");
        this.elements.achievementsList.classList.toggle("hidden", tab === "quests");
        if (tab === "achievements") {
            Game.updateAchievementProgress(Game.state.rolls);
        }
    }
};

const Leaderboard = {
    elements: {
        menu: document.getElementById("leaderboard-menu"),
        button: document.querySelector('.menu-item img[alt="Leaderboard"]'),
        list: document.getElementById("leaderboard-list"),
        mostLucuBtn: document.getElementById("most-lucu"),
        bestLuckBtn: document.getElementById("best-luck"),
        placeBadge: document.getElementById("player-place-badge"),
        topSection: document.querySelector(".top-section")
    },
    init() {
        this.elements.button.addEventListener("click", () => {
            UI.toggleMenu(this.elements.menu, true);
            this.load("coins");
        });
        this.elements.menu.addEventListener("click", e => {
            if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
        });
        UI.addSwipeHandler(this.elements.topSection, () => UI.toggleMenu(this.elements.menu, false));
        this.elements.mostLucuBtn.addEventListener("click", () => {
            this.elements.mostLucuBtn.classList.add("active");
            this.elements.bestLuckBtn.classList.remove("active");
            this.load("coins");
        });
        this.elements.bestLuckBtn.addEventListener("click", () => {
            this.elements.bestLuckBtn.classList.add("active");
            this.elements.mostLucuBtn.classList.remove("active");
            this.load("luck");
        });
        this.elements.list.addEventListener("scroll", () => {
            this.elements.menu.classList.toggle("scrolled", this.elements.list.scrollTop > 20);
        });
    },
    async load(type) {
        try {
            const data = await API.fetch(`/leaderboard_${type}`);
            this.elements.list.innerHTML = "";
            const userId = tg.initDataUnsafe?.user?.id?.toString();
            const userIndex = data.findIndex(p => p.user_id === userId);
            this.elements.placeBadge.textContent = userIndex >= 0 ? `Your place #${userIndex + 1}` : "Your place #--";
            if (!data?.length) {
                this.elements.list.innerHTML = '<li class="coming-soon">No data available</li>';
                return;
            }
            for (let i = 0; i < data.length; i++) {
                const player = data[i];
                const isCurrentUser = userId && player.user_id === userId;
                const li = document.createElement("li");
                li.classList.add("leaderboard-item");
                if (isCurrentUser) li.classList.add("highlight");
                const value = type === "coins" ? Utils.formatCoins(player.coins) + " $LUCU" : Utils.formatNumber(player.min_luck) || "N/A";
                li.innerHTML = `
                    <div class="leaderboard-item-content">
                        <div class="player-left">
                            <span class="player-${type}">${value}</span>
                        </div>
                        <div class="player-right">
                            <img src="${player.photo_url || AppConfig.FALLBACK_AVATAR}" class="player-avatar" alt="Avatar" 
                                 onerror="this.src='${AppConfig.FALLBACK_AVATAR}'">
                            <div class="player-info">
                                <span class="player-name">${player.username}</span>
                                <span class="player-rank">#${i + 1}</span>
                            </div>
                        </div>
                    </div>
                `;
                this.elements.list.appendChild(li);
            }
        } catch (error) {
            this.elements.list.innerHTML = '<li class="coming-soon">Failed to load leaderboard</li>';
        }
    }
};

const Profile = {
    elements: {
        menu: document.getElementById("profile-menu"),
        button: document.getElementById("profile-button"),
        name: document.getElementById("profile-name")
    },
    init() {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            this.elements.name.textContent = "Hello, Guest";
        } else {
            this.elements.name.textContent = `Hello, ${user.username || user.first_name || "NoName"}`;
        }
        this.elements.button.addEventListener("click", () => UI.toggleMenu(this.elements.menu, true));
        this.elements.menu.addEventListener("click", e => {
            if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
        });
        UI.addSwipeHandler(this.elements.menu, () => UI.toggleMenu(this.elements.menu, false));
    }
};

const Friends = {
    elements: {
        menu: document.getElementById("friend-menu"),
        button: document.querySelector('.menu-item img[alt="Friend"]') || document.getElementById("open-friend-menu"),
        referralInput: document.getElementById("referral-link"),
        copyButton: document.getElementById("copy-referral"),
        shareButton: document.getElementById("share-link"),
        friendsCount: document.querySelector(".friends-count")
    },
    init() {
        const userId = tg.initDataUnsafe?.user?.id?.toString();
        if (!userId) {
            return;
        }
        const referralLink = `t.me/LuckyCubesbot?start=${userId}`;
        this.elements.referralInput.value = referralLink;
        this.elements.button.addEventListener("click", () => {
            UI.toggleMenu(this.elements.menu, true);
            this.updateFriendsCount();
        });
        this.elements.menu.addEventListener("click", e => {
            if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
        });
        UI.addSwipeHandler(this.elements.menu, () => UI.toggleMenu(this.elements.menu, false));
        this.elements.copyButton.addEventListener("click", () => {
            Utils.copyToClipboard(referralLink);
            this.elements.copyButton.textContent = "Copied!";
            setTimeout(() => this.elements.copyButton.textContent = "Copy", 1500);
        });
        this.elements.shareButton.addEventListener("click", () => {
            const shareText = "Want to try your luck? Check out this game and join me!";
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`);
        });
        const referrerId = new URLSearchParams(window.location.search).get("start");
        if (referrerId && userId && referrerId !== userId) {
            API.fetch("/handle_referral", {
                method: "POST",
                body: { user_id: userId, referrer_id: referrerId }
            }).catch(error => {});
        }
        this.updateFriendsCount();
    },
    updateFriendsCount() {
        const data = AppState.userData;
        if (!data || data.referral_count === undefined) {
            this.elements.friendsCount.textContent = "Your friends: 0";
            return;
        }
        this.elements.friendsCount.textContent = `Your friends: ${data.referral_count || 0}`;
    }
};

const Particles = {
    init() {
        const canvas = document.getElementById(AppConfig.CANVAS_ID);
        if (!canvas) return;
        const particleSystem = new ParticleSystem(canvas, {
            x: window.innerWidth,
            y: window.innerHeight
        });
        particleSystem.init();
        window.addEventListener("resize", () => {
            const oldSize = { x: particleSystem.size.x, y: particleSystem.size.y };
            particleSystem.resize({ x: window.innerWidth, y: window.innerHeight }, oldSize);
        });
    }
};

const outcomes = {
    "banned": {
        "default": [{"range": 100, "src": "ban.gif", "coins": -1}],
        "rainbow": [{"range": 100, "src": "ban.gif", "coins": -100}]
    },
    "classic": {
        "default": [
            {"range": 40, "src": "pictures/cubics/классика/1-кубик.gif", "coins": 1},
            {"range": 65, "src": "pictures/cubics/классика/2-кубик.gif", "coins": 2},
            {"range": 80, "src": "pictures/cubics/классика/3-кубик.gif", "coins": 3},
            {"range": 90, "src": "pictures/cubics/классика/4-кубик.gif", "coins": 4},
            {"range": 97, "src": "pictures/cubics/классика/5-кубик.gif", "coins": 5},
            {"range": 100, "src": "pictures/cubics/классика/6-кубик.gif", "coins": 6}
        ],
        "rainbow": [
            {"range": 40, "src": "pictures/cubics/классика/1-кубик.gif", "coins": 2},
            {"range": 65, "src": "pictures/cubics/классика/2-кубик.gif", "coins": 4},
            {"range": 80, "src": "pictures/cubics/классика/3-кубик.gif", "coins": 6},
            {"range": 90, "src": "pictures/cubics/классика/4-кубик.gif", "coins": 8},
            {"range": 97, "src": "pictures/cubics/классика/5-кубик.gif", "coins": 10},
            {"range": 100, "src": "pictures/cubics/классика/6-кубик.gif", "coins": 12}
        ]
    },
    "negative": {
        "default": [
            {"range": 40, "src": "pictures/cubics/негатив/1-кубик-негатив.gif", "coins": 2},
            {"range": 65, "src": "pictures/cubics/негатив/2-кубик-негатив.gif", "coins": 3},
            {"range": 80, "src": "pictures/cubics/негатив/3-кубик-негатив.gif", "coins": 4},
            {"range": 90, "src": "pictures/cubics/негатив/4-кубик-негатив.gif", "coins": 5},
            {"range": 97, "src": "pictures/cubics/негатив/5-кубик-негатив.gif", "coins": 6},
            {"range": 100, "src": "pictures/cubics/негатив/6-кубик-негатив.gif", "coins": 7}
        ],
        "rainbow": [
            {"range": 15, "src": "pictures/cubics/негатив/1-кубик-негатив.gif", "coins": 4},
            {"range": 45, "src": "pictures/cubics/негатив/2-кубик-негатив.gif", "coins": 6},
            {"range": 70, "src": "pictures/cubics/негатив/3-кубик-негатив.gif", "coins": 8},
            {"range": 85, "src": "pictures/cubics/негатив/4-кубик-негатив.gif", "coins": 10},
            {"range": 94, "src": "pictures/cubics/негатив/5-кубик-негатив.gif", "coins": 12},
            {"range": 100, "src": "pictures/cubics/негатив/6-кубик-негатив.gif", "coins": 14}
        ]
    },
    "Emerald": {
        "default": [
            {"range": 40, "src": "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", "coins": 3},
            {"range": 65, "src": "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", "coins": 4},
            {"range": 80, "src": "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", "coins": 5},
            {"range": 90, "src": "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", "coins": 6},
            {"range": 97, "src": "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", "coins": 7},
            {"range": 100, "src": "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", "coins": 8}
        ],
        "rainbow": [
            {"range": 15, "src": "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", "coins": 6},
            {"range": 45, "src": "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", "coins": 8},
            {"range": 70, "src": "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", "coins": 10},
            {"range": 85, "src": "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", "coins": 12},
            {"range": 94, "src": "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", "coins": 14},
            {"range": 100, "src": "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", "coins": 16}
        ]
    },
    "Pixel": {
        "default": [
            {"range": 40, "src": "pictures/cubics/пиксель/1-кубик-пиксель.gif", "coins": 10},
            {"range": 65, "src": "pictures/cubics/пиксель/2-кубик-пиксель.gif", "coins": 11},
            {"range": 80, "src": "pictures/cubics/пиксель/3-кубик-пиксель.gif", "coins": 12},
            {"range": 90, "src": "pictures/cubics/пиксель/4-кубик-пиксель.gif", "coins": 13},
            {"range": 97, "src": "pictures/cubics/пиксель/5-кубик-пиксель.gif", "coins": 14},
            {"range": 100, "src": "pictures/cubics/пиксель/6-кубик-пиксель.gif", "coins": 15}
        ],
        "rainbow": [
            {"range": 40, "src": "pictures/cubics/пиксель/1-кубик-пиксель.gif", "coins": 20},
            {"range": 65, "src": "pictures/cubics/пиксель/2-кубик-пиксель.gif", "coins": 22},
            {"range": 80, "src": "pictures/cubics/пиксель/3-кубик-пиксель.gif", "coins": 24},
            {"range": 90, "src": "pictures/cubics/пиксель/4-кубик-пиксель.gif", "coins": 26},
            {"range": 97, "src": "pictures/cubics/пиксель/5-кубик-пиксель.gif", "coins": 28},
            {"range": 100, "src": "pictures/cubics/пиксель/6-кубик-пиксель.gif", "coins": 30}
        ]
    }
};

const additionalImages = [
    "pictures/other png/$LUCU.png",
    "pictures/other png/Logo.png",
    "pictures/other png/friends-11.png",
    "pictures/other png/telegram-logo.png",
    "pictures/other png/друзья.png",
    "pictures/other png/квесты.png",
    "pictures/other png/магазин.png",
    "pictures/other png/таблица лидеров.png",
    "pictures/other png/телега.jpg"
];

const imageAssets = new Set();
Object.keys(outcomes).forEach(type => {
    Object.keys(outcomes[type]).forEach(variant => {
        outcomes[type][variant].forEach(outcome => {
            imageAssets.add(outcome.src);
        });
    });
});
additionalImages.forEach(img => imageAssets.add(img));

const imageAssetsArray = Array.from(imageAssets);

async function preloadImages(imageUrls) {
    const promises = imageUrls.map(url => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(url);
            img.onerror = () => {
                console.warn(`Failed to preload image: ${url}`);
                resolve(url);
            }
        });
    });
    return Promise.all(promises);
}

function updateProgress(percentage) {
    const progressElement = document.getElementById("loading-text");
    if (progressElement) {
        progressElement.textContent = `Loading ${percentage}%`;
        if (percentage === 100) {
            setTimeout(() => {
                const loadingScreen = document.getElementById("loading-screen");
                if (loadingScreen) loadingScreen.style.display = "none";
            }, 500);
        }
    }
    console.log(`Initialization progress: ${percentage}%`);
}

async function preloadImagesWithProgress(imageUrls, onProgress) {
    let loadedCount = 0;
    const total = imageUrls.length;
    const promises = imageUrls.map(url => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                loadedCount++;
                onProgress(Math.min((loadedCount / total) * 100, 100));
                resolve(url);
            };
            img.onerror = () => {
                loadedCount++;
                onProgress(Math.min((loadedCount / total) * 100, 100));
                console.warn(`Failed to load image: ${url}`);
                resolve(url);
            }
        });
    });
    await Promise.all(promises);
    onProgress(100);
}

async function minimalInit(tg) {
    updateProgress(10);

    if (!tg) {
        console.error("Telegram WebApp API is not available");
        return false;
    }

    tg.ready();
    tg.expand();

    API.defaultHeaders = {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": tg.initData
    };

    AppState.userId = tg.initDataUnsafe?.user?.id?.toString();
    AppState.isPremium = tg.initDataUnsafe?.user?.is_premium === true;
    AppState.userData = null;

    try {
        updateProgress(20);
        let token = null;

        const initResponse = await fetch(`${AppConfig.API_BASE_URL}/init`, {
            method: "POST",
            headers: API.defaultHeaders,
            signal: AbortSignal.timeout(5000)
        });

        if (!initResponse.ok) {
            const errorText = await initResponse.text();
            console.warn(`API initialization failed: ${initResponse.status} - ${errorText}`);
            token = null;
        } else {
            const initData = await initResponse.json();
            token = initData.token;
            API.defaultHeaders["Authorization"] = `Bearer ${token}`;
        }

        updateProgress(25);
        await loadConfig(token, tg);

        const userDataResponse = await API.fetch(`/get_user_data_new/${AppState.userId}`, {
            signal: AbortSignal.timeout(5000)
        });
        AppState.userData = userDataResponse || {
            coins: 0,
            rolls: 0,
            min_luck: 1001,
            owned_skins: [],
            equipped_skin: AppConfig.DEFAULT_SKIN,
            quests: {},
            referral_count: 0,
            beta_player: "no",
            ban: "no"
        };

        updateProgress(30);
        return true;
    } catch (error) {
        console.error("Minimal initialization error:", error);
        tg.showPopup({
            message: `Failed to connect to server. Using offline mode. Some features may be unavailable.`,
            buttons: [{ text: "OK", id: "ok" }]
        });
        AppState.userData = {
            coins: 0,
            rolls: 0,
            min_luck: 1001,
            owned_skins: [],
            equipped_skin: AppConfig.DEFAULT_SKIN,
            quests: {},
            referral_count: 0,
            beta_player: "no",
            ban: "no"
        };
        return true;
    }
}

async function fullInit(tg) {
    updateProgress(30);

    Game.init();
    Skins.init();
    Quests.init();
    Leaderboard.init();
    Profile.init();
    Friends.init();
    Particles.init();

    updateProgress(50);

    try {
        const userDataResponse = await API.fetch(`/get_user_data_new/${AppState.userId}`, {
            signal: AbortSignal.timeout(5000)
        });

        if (!userDataResponse || userDataResponse.error) {
            throw new Error("Failed to load user data");
        }

        AppState.userData = { ...AppState.userData, ...userDataResponse };
        localStorage.setItem("userData", JSON.stringify(AppState.userData));

        Game.updateFromAppState();
        Skins.updateFromAppState();
        Friends.updateFriendsCount();
    } catch (error) {
        console.error("User data fetch error:", error);
        if (!AppState.userData) {
            AppState.userData = {
                coins: 0,
                rolls: 0,
                min_luck: 1001,
                owned_skins: [],
                equipped_skin: AppConfig.DEFAULT_SKIN,
                quests: {},
                referral_count: 0,
                beta_player: "no",
                ban: "no"
            };
            localStorage.setItem("userData", JSON.stringify(AppState.userData));
        }
    }

    updateProgress(60);

    const baseUrl = "https://suspect147.github.io/LUCU/";
    const imageAssetsArrayWithBase = imageAssetsArray.map(img => baseUrl + img);

    await preloadImagesWithProgress(imageAssetsArrayWithBase, (progress) => {
        const adjustedProgress = 60 + (progress * 0.4);
        updateProgress(Math.round(adjustedProgress));
    });

    await Quests.refreshUserData();
    await Quests.checkPendingQuests(AppState.userId);

    AppState.isInitialized = true;
    console.log("App fully initialized");
}

async function initializeApp() {
    const loadingScreen = document.getElementById("loading-screen");
    const loadingText = document.getElementById("loading-text");

    const updateProgress = (percent) => {
        console.log(`Initialization progress: ${percent}%`);
        if (loadingText) loadingText.textContent = `Loading ${percent}%`;
    };

    updateProgress(0);

    if (!window.Telegram || !window.Telegram.WebApp) {
        console.error("This app must be opened in Telegram.");
        const errorMessage = document.createElement("div");
        errorMessage.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; background: #333; padding: 20px; border-radius: 10px;";
        errorMessage.textContent = "Please open this app in Telegram to play.";
        document.body.appendChild(errorMessage);
        return;
    }

    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    updateProgress(10);

    const minimalSuccess = await minimalInit(tg);
    if (!minimalSuccess) return;

    updateProgress(50);

    document.body.classList.add("gray-gradient");
    await fullInit(tg); // Вызов исправленной функции fullInit

    if (loadingScreen) {
        loadingScreen.style.transition = "opacity 0.5s";
        loadingScreen.style.opacity = "0";
        setTimeout(() => loadingScreen.style.display = "none", 500);
    }

    const baseUrl = "https://suspect147.github.io/LUCU/";
    const imageAssetsArrayWithBase = imageAssetsArray.map(img => baseUrl + img);
    preloadImagesWithProgress(imageAssetsArrayWithBase, (progress) => {
        const adjustedProgress = 75 + (progress * 0.25);
        updateProgress(Math.round(adjustedProgress));
    }).then(() => {
        console.log("All images preloaded");
        AppState.isInitialized = true;
    }).catch(error => {
        console.error("Image preloading failed:", error);
        AppState.isInitialized = true;
    });

    console.log("App initialized");
}

document.addEventListener("DOMContentLoaded", initializeApp);
