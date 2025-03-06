// ============================================================================
// Константы и глобальные переменные
// ============================================================================

const CONFIG = {
    CANVAS_ID: "particleCanvas",
    DEFAULT_SKIN: "classic",
    ANIMATION_DURATION: 3050,
    PROGRESS_DURATION: 3,
    API_BASE_URL: "https://backend12-production-1210.up.railway.app",
    FALLBACK_AVATAR: "pictures/cubics/классика/начальный-кубик.gif"
};

async function loadConfig() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/get_config`);
        const data = await response.json();
        Object.assign(CONFIG, {
            API_BASE_URL: data.API_BASE_URL,
            TELEGRAM_BOT_TOKEN: data.TELEGRAM_BOT_TOKEN,
            CHANNEL_USERNAME: data.CHANNEL_USERNAME
        });
    } catch (error) {
        console.error("Ошибка загрузки конфигурации:", error);
    }
}

const tg = window.Telegram?.WebApp;
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: "https://suspect147.github.io/LUCU/manifest.json",
    buttonRootId: "ton-connect"
});

// ============================================================================
// Утилиты (только для UI)
// ============================================================================

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

// ============================================================================
// API Взаимодействие
// ============================================================================

const API = {
    async fetch(url, options = {}, retries = 2) {
        const initData = tg.initData;
        if (!initData) throw new Error("Telegram initData is missing");
        const headers = {
            "Content-Type": "application/json",
            "X-Telegram-Init-Data": initData
        };

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, {
                    headers: headers,
                    ...options
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    if (attempt === retries) throw new Error(`Network error: ${response.status} - ${errorText}`);
                    await Utils.wait(1000 * (attempt + 1));
                    continue;
                }
                return await response.json();
            } catch (error) {
                if (attempt === retries) throw error;
            }
        }
    }
};

// ============================================================================
// Частицы (Particle System)
// ============================================================================

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

// ============================================================================
// UI Управление
// ============================================================================

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

// ============================================================================
// Игра (Game)
// ============================================================================

const Game = {
    elements: {
        cube: null,
        coinsDisplay: null,
        bestLuckDisplay: null,
        progressBar: null
    },
    state: {
        coins: 0,
        bestLuck: Infinity,
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
            console.error("Не удалось найти один или несколько элементов DOM");
            return;
        }

        document.body.style.transition = "background 0.5s ease-in-out, background-image 0.5s ease-in-out";
        this.elements.cube.addEventListener("click", this.handleClick.bind(this));
        this.updateGameData();
    },

    handleClick(event) {
        if (this.state.isAnimating) {
            event.preventDefault();
            return;
        }
        this.rollCube();
    },

   async rollCube() {
    // Предотвращаем повторный вызов, если анимация уже идёт
    if (this.state.isAnimating) {
        console.log("rollCube: Анимация уже в процессе, вызов отклонён");
        return;
    }

    this.state.isAnimating = true;

    try {
        // Получаем userId из Telegram Web App
        const userId = tg?.initDataUnsafe?.user?.id;
        if (!userId) {
            throw new Error("User ID отсутствует в данных Telegram");
        }

        // Логируем запрос для диагностики
        console.log("rollCube: Отправка запроса на /roll_cube с userId:", userId);

        // Отправляем запрос к API, преобразуя userId в строку
        const response = await API.fetch("/roll_cube", {
            method: "POST",
            body: JSON.stringify({ user_id: String(userId) }) // Принудительно строка
        });

        // Проверяем, что ответ содержит все ожидаемые поля
        const { outcome_src, coins, luck, total_rolls, equipped_skin, is_rainbow } = response;
        if (!outcome_src || coins === undefined || luck === undefined || total_rolls === undefined || !equipped_skin) {
            throw new Error("Некорректный ответ от сервера: отсутствуют обязательные поля");
        }

        // Обновляем изображение кубика с результатом броска
        this.elements.cube.src = outcome_src;

        // Запускаем прогресс-бар
        this.startProgress(3100);

        // Ждём начала анимации
        await Utils.wait(100);

        // Обновляем фон в зависимости от результата (rainbow или нет)
        document.body.classList.remove("pink-gradient", "gray-gradient");
        document.body.classList.add(is_rainbow ? "pink-gradient" : "gray-gradient");

        // Ждём основную часть анимации
        await Utils.wait(2400);

        // Обновляем состояние игры
        this.state.coins = coins;
        this.state.bestLuck = luck;
        this.state.rolls = total_rolls;

        // Обновляем UI
        this.elements.coinsDisplay.textContent = `${Utils.formatCoins(coins)} $LUCU`;
        this.elements.bestLuckDisplay.innerHTML = `Your Best MIN number: <span style="color: #F80000;">${Utils.formatNumber(luck)}</span>`;
        this.updateAchievementProgress(total_rolls);

        // Обновляем изображение кубика в зависимости от скина и результата
        const skinConfig = this.getSkinConfig();
        if (!skinConfig[equipped_skin]) {
            throw new Error(`Неизвестный скин: ${equipped_skin}`);
        }
        const cubeVariant = is_rainbow ? "rainbow" : "default";
        this.elements.cube.src = `${skinConfig[equipped_skin][cubeVariant]}?t=${Date.now()}`;

        // Завершаем анимацию для rainbow-результата
        if (is_rainbow) {
            await Utils.wait(500);
            document.body.classList.remove("pink-gradient");
            document.body.classList.add("gray-gradient");
        }

        console.log("rollCube: Бросок успешно завершён", { coins, luck, total_rolls });
    } catch (error) {
        // Логируем ошибку с деталями
        console.error("Ошибка в rollCube:", error.message || error);

        // Обновляем UI при ошибке
        this.elements.coinsDisplay.textContent = "Error";
        const defaultSkinConfig = this.getSkinConfig()[this.state.equippedSkin]?.default;
        if (defaultSkinConfig) {
            this.elements.cube.src = `${defaultSkinConfig}?t=${Date.now()}`;
        } else {
            console.error("rollCube: Не удалось загрузить дефолтный скин для", this.state.equippedSkin);
        }
    } finally {
        // Сбрасываем флаг анимации
        this.state.isAnimating = false;
        console.log("rollCube: Анимация завершена");
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
            classic: {
                default: "pictures/cubics/классика/начальный-кубик.gif",
                rainbow: "pictures/cubics/классика/супер-начальный-кубик.gif"
            },
            negative: {
                default: "pictures/cubics/негатив/начальный-кубик-негатив.gif",
                rainbow: "pictures/cubics/негатив/супер-начальный-кубик-негатив.gif"
            },
            Emerald: {
                default: "pictures/cubics/перевернутый/начальный-кубик-перевернутый.gif",
                rainbow: "pictures/cubics/перевернутый/супер-начальный-кубик-перевернутый.gif"
            },
            Pixel: {
                default: "pictures/cubics/пиксель/начальный-кубик-пиксель.gif",
                rainbow: "pictures/cubics/пиксель/супер-начальный-кубик-пиксель.gif"
            }
        };
    },

    async updateGameData() {
        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) return;

        try {
            const data = await API.fetch(`/get_user_data/${userId}`);
            this.state.coins = data.coins || 0;
            this.state.bestLuck = data.min_luck === undefined || data.min_luck === null ? Infinity : data.min_luck;
            this.state.equippedSkin = data.equipped_skin || CONFIG.DEFAULT_SKIN;
            this.state.rolls = data.rolls || 0;

            this.elements.cube.src = `${this.getSkinConfig()[this.state.equippedSkin].default}?t=${Date.now()}`;
            this.elements.coinsDisplay.textContent = `${Utils.formatCoins(this.state.coins)} $LUCU`;
            this.elements.bestLuckDisplay.innerHTML = this.state.bestLuck === Infinity
                ? `Your Best MIN number: <span style="color: #F80000;">N/A</span>`
                : `Your Best MIN number: <span style="color: #F80000;">${Utils.formatNumber(this.state.bestLuck)}</span>`;
            Skins.syncSkins(data.owned_skins || [], this.state.equippedSkin);
        } catch (error) {
            console.error("Ошибка при обновлении игровых данных:", error);
            this.elements.cube.src = `${this.getSkinConfig().classic.default}?t=${Date.now()}`;
        }
    },

    updateAchievementProgress(rolls) {
        const targetRolls = 123456;
        const progress = Math.min((rolls / targetRolls) * 100, 100);
        const achievement = document.querySelector("#achievements-list .achievement-item:nth-child(2)");
        if (achievement) {
            achievement.querySelector(".progress-circle").style.setProperty("--progress", `${progress}%`);
            achievement.querySelector(".achievement-reward").textContent = rolls >= targetRolls
                ? "Achievement Completed! 123456 dice rolls made!"
                : `Make ${Utils.formatWithCommas(targetRolls - rolls)} more dice rolls to complete`;
        }
    }
};

// ============================================================================
// Скины (Skins)
// ============================================================================

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
    },

    async handleSkin(type) {
        const userId = tg.initDataUnsafe?.user?.id;
        try {
            const response = await API.fetch("/handle_skin", {
                method: "POST",
                body: JSON.stringify({ user_id: userId, skin_type: type })
            });
            if (response.success) {
                this.state.ownedSkins = response.owned_skins;
                this.state.equippedSkin = response.equipped_skin;
                this.updateUI();
                Game.state.coins = response.new_coins;
                Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.new_coins)} $LUCU`;
                Game.elements.cube.src = `${Game.getSkinConfig()[type].default}?t=${Date.now()}`;
            } else {
                alert(response.message);
            }
        } catch (error) {
            console.error("Ошибка обработки скина:", error);
        }
    },

    syncSkins(ownedSkins, equippedSkin) {
        this.state.ownedSkins = ownedSkins;
        this.state.equippedSkin = equippedSkin;
        this.updateUI();
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

// ============================================================================
// Квесты (Quests)
// ============================================================================

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
        this.elements.button.addEventListener("click", async () => {
            await this.loadQuestStatus();
            UI.toggleMenu(this.elements.menu, true);
        });
        this.elements.menu.addEventListener("click", e => {
            if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
        });
        UI.addSwipeHandler(this.elements.menu, () => UI.toggleMenu(this.elements.menu, false));

        this.elements.subscribeButton.addEventListener("click", () => this.handleSubscription());
        this.elements.questsTab.addEventListener("click", () => this.switchTab("quests"));
        this.elements.achievementsTab.addEventListener("click", () => this.switchTab("achievements"));
    },

    async loadQuestStatus() {
        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) return;

        const data = await API.fetch(`/get_user_data/${userId}`);
        const isSubscribed = data?.quests?.subscription_quest === "yes";
        if (isSubscribed) {
            this.elements.subscribeButton.textContent = "✔️";
            this.elements.subscribeButton.classList.add("completed");
            this.elements.subscribeButton.style.background = "rgb(139, 0, 0)";
            this.elements.subscribeButton.style.cursor = "default";
            this.elements.subscribeButton.disabled = true;
        }
    },

    async handleSubscription() {
        if (this.elements.subscribeButton.classList.contains("completed")) return;

        window.open(`https://t.me/${CONFIG.CHANNEL_USERNAME}`, "_blank");
        const userId = tg.initDataUnsafe?.user?.id;
        try {
            const response = await API.fetch("/check_subscription", {
                method: "POST",
                body: JSON.stringify({ user_id: userId })
            });
            if (response.success) {
                this.elements.subscribeButton.textContent = "✔️";
                this.elements.subscribeButton.classList.add("completed");
                this.elements.subscribeButton.style.background = "rgb(139, 0, 0)";
                this.elements.subscribeButton.style.cursor = "default";
                this.elements.subscribeButton.disabled = true;

                const questResponse = await API.fetch("/update_quest", {
                    method: "POST",
                    body: JSON.stringify({ user_id: userId, quest: "subscription_quest", status: "yes" })
                });
                Game.state.coins = questResponse.new_coins;
                Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(questResponse.new_coins)} $LUCU`;
            }
        } catch (error) {
            console.error("Ошибка проверки подписки:", error);
        }
    },

    async switchTab(tab) {
        this.elements.questsTab.classList.toggle("active", tab === "quests");
        this.elements.achievementsTab.classList.toggle("active", tab === "achievements");
        this.elements.questsList.classList.toggle("hidden", tab !== "quests");
        this.elements.achievementsList.classList.toggle("hidden", tab !== "achievements");

        if (tab === "achievements") {
            Game.updateAchievementProgress(Game.state.rolls);
        }
    }
};

// ============================================================================
// Лидерборд (Leaderboard)
// ============================================================================

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
        const data = await API.fetch(`/leaderboard_${type}`);
        this.elements.list.innerHTML = "";

        const userId = tg.initDataUnsafe?.user?.id;
        const userIndex = data.findIndex(p => p.user_id == userId);
        this.elements.placeBadge.textContent = userIndex >= 0 ? `Your place #${userIndex + 1}` : "Your place #--";

        if (!data?.length) {
            this.elements.list.innerHTML = '<li class="coming-soon">No data available</li>';
            return;
        }

        for (let i = 0; i < data.length; i++) {
            const player = data[i];
            const isCurrentUser = userId && player.user_id == userId;

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
    }
};

// ============================================================================
// Профиль (Profile)
// ============================================================================

const Profile = {
    elements: {
        menu: document.getElementById("profile-menu"),
        button: document.getElementById("profile-button"),
        name: document.getElementById("profile-name")
    },

    init() {
        this.elements.name.textContent = `Hello, ${tg.initDataUnsafe?.user?.username || tg.initDataUnsafe?.user?.first_name || "NoName"}`;
        this.elements.button.addEventListener("click", () => UI.toggleMenu(this.elements.menu, true));
        this.elements.menu.addEventListener("click", e => {
            if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
        });
        UI.addSwipeHandler(this.elements.menu, () => UI.toggleMenu(this.elements.menu, false));

        const user = tg.initDataUnsafe?.user;
        if (user) {
            API.fetch("/update_profile", {
                method: "POST",
                body: JSON.stringify({
                    user_id: user.id,
                    username: `${user.first_name}${user.last_name ? " " + user.last_name : ""}`,
                    photo_url: user.photo_url || CONFIG.FALLBACK_AVATAR
                })
            });
        }
    }
};

// ============================================================================
// Друзья (Friends)
// ============================================================================

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
        const userId = tg.initDataUnsafe?.user?.id;
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
                body: JSON.stringify({ user_id: userId, referrer_id: referrerId })
            });
        }
    },

    async updateFriendsCount() {
        const userId = tg.initDataUnsafe?.user?.id;
        const data = await API.fetch(`/get_referral_count/${userId}`);
        this.elements.friendsCount.textContent = `Your friends: ${data.referral_count || 0}`;
    }
};

// ============================================================================
// Инициализация Particle System
// ============================================================================

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

// ============================================================================
// Инициализация приложения
// ============================================================================

async function initializeApp() {
    if (!window.Telegram?.WebApp) {
        document.body.innerHTML = "<p style='text-align: center;'>Please open this app in Telegram</p>";
        return;
    }
    const tg = window.Telegram.WebApp;

    const loadingScreen = document.getElementById('loading-screen');
    const loadingText = document.getElementById('loading-text');
    const loadingCube = document.getElementById('loading-cube');
    const playerInfo = document.getElementById('player-info');
    const playerCoins = document.getElementById('player-coins');
    const playerBestLuck = document.getElementById('player-best-luck');

    if (!loadingScreen || !loadingText || !loadingCube || !playerInfo || !playerCoins || !playerBestLuck) {
        console.error("Не найдены элементы загрузочного экрана или информации игрока");
        document.body.innerHTML = "<p>Error: Missing UI elements</p>";
        return;
    }

    loadingScreen.style.display = 'flex';
    loadingText.textContent = 'Loading 0%';
    loadingCube.style.display = 'block';

    try {
        await loadConfig();
        if (!CONFIG.API_BASE_URL) throw new Error("Failed to load API configuration");

        Particles.init();

        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) throw new Error("User ID not found in Telegram init data");

        const data = await API.fetch(`/get_user_data/${userId}`);
        loadingText.textContent = 'Loading 50%';

        loadingCube.src = `${Game.getSkinConfig()[data.equipped_skin || "classic"].default}?t=${Date.now()}`;
        playerCoins.textContent = `Coins: ${Utils.formatCoins(data.coins || 0)} $LUCU`;
        playerBestLuck.textContent = `Best Luck: ${data.min_luck === Infinity ? 'N/A' : Utils.formatNumber(data.min_luck)}`;
        playerInfo.classList.remove('hidden');

        loadingText.textContent = 'Press to enter the game';
        await Promise.race([
            new Promise(resolve => loadingScreen.addEventListener('click', () => resolve(), { once: true })),
            Utils.wait(10000).then(() => console.log("Auto-continuing after 10s"))
        ]);

        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            try {
                Game.init();
                Skins.init();
                Quests.init();
                Leaderboard.init();
                Profile.init();
                Friends.init();
            } catch (initError) {
                console.error("Ошибка инициализации модулей:", initError);
            }
            tg.expand();
            tg.requestFullscreen();
            tonConnectUI.uiOptions = { twaReturnUrl: "https://t.me/LuckyCubesbot" };
        }, 500);
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        loadingText.textContent = `Error: ${error.message}. Click to refresh.`;
        loadingScreen.addEventListener('click', () => window.location.reload(), { once: true });
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
