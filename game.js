const CONFIG = {
    CANVAS_ID: "particleCanvas",
    DEFAULT_SKIN: "classic",
    ANIMATION_DURATION: 3550,
    PROGRESS_DURATION: 3,
    API_BASE_URL: "https://backend12-production-1210.up.railway.app",
    FALLBACK_AVATAR: "pictures/cubics/классика/начальный-кубик.gif"
};

async function loadConfig() {
    try {
        const response = await API.fetch("/get_config");
        const data = await response;
        Object.assign(CONFIG, {
            API_BASE_URL: data.API_BASE_URL,
            CHANNEL_USERNAME: data.CHANNEL_USERNAME
        });
    } catch (error) {}
}

const tg = window.Telegram?.WebApp;
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: "https://suspect147.github.io/LUCU/manifest.json",
    buttonRootId: "ton-connect"
});

const AppState = {
    userData: null
};

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
    async fetch(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const telegramInitData = window.Telegram.WebApp.initData || "";
        if (!telegramInitData) {
            throw new Error("Telegram initData is required for API requests");
        }
        const defaultHeaders = {
            "Content-Type": "application/json",
            "X-Telegram-Init-Data": telegramInitData
        };
        const config = {
            method: "GET",
            headers: { ...defaultHeaders, ...options.headers },
            ...options
        };
        if (options.body) config.body = JSON.stringify(options.body);
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            try {
                const response = await fetch(url, config);
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
        equippedSkin: CONFIG.DEFAULT_SKIN,
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
        this.state.equippedSkin = data.equipped_skin || CONFIG.DEFAULT_SKIN;
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
        if (this.state.isAnimating) {
            return;
        }
        this.state.isAnimating = true;
        try {
            const userId = tg?.initDataUnsafe?.user?.id?.toString();
            if (!userId) throw new Error("User ID отсутствует в данных Telegram");
            const response = await API.fetch("/roll_cube", {
                method: "POST",
                body: { user_id: userId }
            });
            if (!response.outcome_src || response.coins === undefined || response.luck === undefined) {
                throw new Error("Некорректный ответ от сервера: отсутствуют обязательные поля");
            }
            this.elements.cube.src = response.outcome_src;
            this.startProgress(CONFIG.ANIMATION_DURATION);
            if (AppState.userData.ban !== "yes") {
                document.body.classList.remove("pink-gradient", "gray-gradient");
                document.body.classList.add(response.is_rainbow ? "pink-gradient" : "gray-gradient");
                const coinUpdateDelay = CONFIG.ANIMATION_DURATION - 500;
                setTimeout(() => {
                    this.state.coins = response.coins;
                    this.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.coins)} $LUCU`;
                }, coinUpdateDelay);
                await Utils.wait(CONFIG.ANIMATION_DURATION);
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
                const coinUpdateDelay = CONFIG.ANIMATION_DURATION - 500;
                setTimeout(() => {
                    this.state.coins = response.coins;
                    this.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.coins)} $LUCU`;
                    AppState.userData.coins = response.coins;
                }, coinUpdateDelay);
                await Utils.wait(CONFIG.ANIMATION_DURATION);
            }
            this.setInitialCube();
        } catch (error) {
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
        equippedSkin: CONFIG.DEFAULT_SKIN
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
        this.state.equippedSkin = data.equipped_skin || CONFIG.DEFAULT_SKIN;
        this.updateUI();
    },
    async handleSkin(type) {
        const userId = tg.initDataUnsafe?.user?.id?.toString();
        if (!userId) {
            return;
        }
        try {
            const response = await API.fetch("/handle_skin", {
                method: "POST",
                body: { user_id: userId, skin_type: type }
            });
            if (response.success) {
                this.state.ownedSkins = response.owned_skins;
                this.state.equippedSkin = response.equipped_skin;
                this.updateUI();
                Game.state.coins = response.new_coins;
                Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.new_coins)} $LUCU`;
                Game.elements.cube.src = `${Game.getSkinConfig()[type].initial}?t=${Date.now()}`;
                AppState.userData.coins = response.new_coins;
                AppState.userData.owned_skins = response.owned_skins;
                AppState.userData.equipped_skin = response.equipped_skin;
            } else {
                alert(response.message);
            }
        } catch (error) {}
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
        subscribeButton: document.querySelector(".quest-item .quest-btn"),
        questsTab: document.getElementById("quests-tab"),
        achievementsTab: document.getElementById("achievements-tab"),
        questsList: document.getElementById("quests-list"),
        achievementsList: document.getElementById("achievements-list")
    },
    init() {
        this.elements.button.addEventListener("click", () => {
            this.updateQuestStatus();
            UI.toggleMenu(this.elements.menu, true);
        });
        this.elements.menu.addEventListener("click", e => {
            if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
        });
        UI.addSwipeHandler(this.elements.menu, () => UI.toggleMenu(this.elements.menu, false));
        this.elements.subscribeButton.addEventListener("click", () => this.handleSubscription());
        this.elements.questsTab.addEventListener("click", () => this.switchTab("quests"));
        this.elements.achievementsTab.addEventListener("click", () => this.switchTab("achievements"));
        this.updateQuestStatus();
    },
    updateQuestStatus() {
        const data = AppState.userData;
        if (!data) {
            return;
        }
        const isSubscribed = data?.quests?.subscription_quest === "yes";
        if (isSubscribed) {
            this.elements.subscribeButton.textContent = "Done!";
            this.elements.subscribeButton.classList.add("completed");
            this.elements.subscribeButton.style.background = "rgb(139, 0, 0)";
            this.elements.subscribeButton.style.cursor = "default";
            this.elements.subscribeButton.disabled = true;
        }
    },
    async handleSubscription() {
        try {
            const userId = tg?.initDataUnsafe?.user?.id?.toString();
            if (!userId) throw new Error("User ID отсутствует в данных Telegram");
            const subscriptionResponse = await API.fetch("/check_subscription", {
                method: "POST",
                body: { user_id: userId }
            });
            if (subscriptionResponse.success) {
                const questResponse = await API.fetch("/update_quest", {
                    method: "POST",
                    body: {
                        user_id: userId,
                        quest: "subscription_quest",
                        status: "yes"
                    }
                });
                AppState.userData.coins = questResponse.new_coins;
                AppState.userData.quests = AppState.userData.quests || {};
                AppState.userData.quests.subscription_quest = "yes";
                Game.state.coins = questResponse.new_coins;
                Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(questResponse.new_coins)} $LUCU`;
                this.updateQuestStatus();
            } else {
                tg.openTelegramLink(`https://t.me/${CONFIG.CHANNEL_USERNAME}`);
                setTimeout(() => this.handleSubscription(), 10000);
            }
        } catch (error) {}
    },
    switchTab(tab) {
        this.elements.questsTab.classList.toggle("active", tab === "quests");
        this.elements.achievementsTab.classList.toggle("active", tab === "achievements");
        this.elements.questsList.classList.toggle("hidden", tab !== "quests");
        this.elements.achievementsList.classList.toggle("hidden", tab !== "achievements");
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
                            <img src="${player.photo_url || CONFIG.FALLBACK_AVATAR}" class="player-avatar" alt="Avatar" 
                                 onerror="this.src='${CONFIG.FALLBACK_AVATAR}'">
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
        const canvas = document.getElementById(CONFIG.CANVAS_ID);
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

async function initializeApp() {
    if (!window.Telegram?.WebApp?.initData) {
        document.body.innerHTML = "<p style='text-align: center;'>Please open this app in Telegram</p>";
        return;
    }
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|iphone|ipad|ipod|windows phone|mobile/i.test(ua);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const isSmallScreen = screenWidth <= 768 && screenHeight <= 1024;

    const isMobileDevice = (isMobileUA || isTouchDevice) && isSmallScreen;

    if (!isMobileDevice) {
        const tg = window.Telegram?.WebApp;
        const username = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name || "User";
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff; font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <p style="font-size: 18px; margin-bottom: 20px;">
                    Hey, ${username}! Playing from desktop Telegram is boring! Join via your <span style="color: red;">phone</span>!
                </p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://t.me/LuckyCubesbot&color=FF0000&bgcolor=000000" alt="QR Code" style="margin: 20px 0;">
                <p style="font-size: 18px; margin-top: 20px;">
                    Scan this QR code with your phone to join the game!
                </p>
            </div>
        `;
        return;
    }

    const tg = window.Telegram.WebApp;
    const loadingScreen = document.getElementById('loading-screen');
    const loadingText = document.getElementById('loading-text');
    const loadingCube = document.getElementById('loading-cube');
    const playerInfo = document.getElementById('player-info');
    const playerCoins = document.getElementById('player-coins');
    const playerBestLuck = document.getElementById('player-best-luck');
    loadingScreen.style.display = 'flex';
    loadingText.textContent = 'Loading 0%';
    loadingCube.style.display = 'block';
    loadingScreen.offsetHeight;

    try {
        tg.expand();
        tg.requestFullscreen();
    } catch (fullscreenError) {}

    try {
        // Инициализация с JWT
        const initResponse = await fetch(`${CONFIG.API_BASE_URL}/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData
            }
        });
        if (!initResponse.ok) {
            throw new Error('Failed to initialize session');
        }
        const { token } = await initResponse.json();
        localStorage.setItem('authToken', token);

        const skinConfig = Game.getSkinConfig();
        const imagesToPreload = [
            ...Object.values(skinConfig).flatMap(skin => 
                [...skin.default.map(item => item.src), ...skin.rainbow.map(item => item.src)]
            ),
            CONFIG.FALLBACK_AVATAR,
            "pictures/other png/друзья.png",
            "pictures/other png/квесты.png",
            "pictures/other png/магазин.png",
            "pictures/other png/таблица лидеров.png",
            "pictures/cubics/cubeee.png"
        ].filter((value, index, self) => self.indexOf(value) === index);

        const preloadImages = async (imageUrls) => {
            const totalImages = imageUrls.length;
            if (totalImages === 0) {
                loadingText.textContent = 'Loading 40%';
                return;
            }
            let loadedImages = 0;
            const loadImageWithTimeout = (url) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = url;
                    const timeout = setTimeout(() => {
                        loadedImages++;
                        const progress = Math.round((loadedImages / totalImages) * 40);
                        loadingText.textContent = `Loading ${progress}%`;
                        resolve();
                    }, 5000);
                    img.onload = () => {
                        clearTimeout(timeout);
                        loadedImages++;
                        const progress = Math.round((loadedImages / totalImages) * 40);
                        loadingText.textContent = `Loading ${progress}%`;
                        resolve();
                    };
                    img.onerror = () => {
                        clearTimeout(timeout);
                        loadedImages++;
                        const progress = Math.round((loadedImages / totalImages) * 40);
                        loadingText.textContent = `Loading ${progress}%`;
                        resolve();
                    };
                });
            };
            await Promise.all(imageUrls.map(url => loadImageWithTimeout(url)));
        };

        await preloadImages(imagesToPreload);
        await loadConfig();
        if (!CONFIG.API_BASE_URL) throw new Error("Failed to load API configuration");
        loadingText.textContent = 'Loading 50%';
        Particles.init();
        loadingText.textContent = 'Loading 60%';

        const userId = tg.initDataUnsafe?.user?.id?.toString();
        if (!userId) throw new Error("User ID not found in Telegram init data");

        // Используем JWT-токен для запроса данных пользователя
        const userData = await API.fetch(`/get_user_data/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        AppState.userData = userData;

        if (userData.ban === "yes") {
            loadingText.textContent = "You are banned, but are you sure you want to enter the game?";
            loadingCube.src = "ban.gif";
            playerInfo.classList.add('hidden');
            await Promise.race([
                new Promise(resolve => loadingScreen.addEventListener('click', () => resolve(), { once: true })),
                Utils.wait(10000)
            ]);
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                Game.init();
                Skins.init();
                Quests.init();
                Leaderboard.init();
                Profile.init();
                Friends.init();
                Game.state.equippedSkin = "banned";
                Game.setInitialCube();
            }, 500);
            return;
        }

        loadingText.textContent = 'Loading 75%';
        const user = tg.initDataUnsafe.user;
        const username = `${user.first_name}${user.last_name ? " " + user.last_name : ""}` || "Unknown";
        const photoUrl = user.photo_url || CONFIG.FALLBACK_AVATAR;

        // Обновление профиля с использованием JWT
        const updateProfileResponse = await API.fetch("/debug_update_profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ user_id: userId, username: username, photo_url: photoUrl })
        });

        AppState.userData.username = username;
        AppState.userData.photo_url = photoUrl;

        // Получение данных о рефералах с JWT
        const referralData = await API.fetch(`/get_referral_count/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        AppState.userData.referral_count = referralData.referral_count || 0;

        const equippedSkin = userData.equipped_skin || "classic";
        loadingCube.src = skinConfig[equippedSkin].initial + `?t=${Date.now()}`;
        playerCoins.textContent = `Coins: ${Utils.formatCoins(userData.coins || 0)} $LUCU`;
        playerBestLuck.textContent = `Best Luck: ${userData.min_luck === 1001 || userData.min_luck === undefined ? 'N/A' : Utils.formatNumber(userData.min_luck)}`;
        playerInfo.classList.remove('hidden');
        loadingText.textContent = 'Press to enter the game';

        await Promise.race([
            new Promise(resolve => loadingScreen.addEventListener('click', () => resolve(), { once: true })),
            Utils.wait(10000)
        ]);
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            Game.init();
            Skins.init();
            Quests.init();
            Leaderboard.init();
            Profile.init();
            Friends.init();
            tonConnectUI.uiOptions = { twaReturnUrl: "https://t.me/LuckyCubesbot" };
        }, 500);
    } catch (error) {
        if (error.message.includes("Server is experiencing issues")) {
            loadingText.textContent = "Server error: Please try again later.";
        } else {
            loadingText.textContent = `Error: ${error.message}. Click to refresh.`;
        }
        loadingScreen.addEventListener('click', () => window.location.reload(), { once: true });
    }
}

initializeApp();
