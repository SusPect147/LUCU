// ============================================================================
// Константы и глобальные переменные
// ============================================================================

const CONFIG = {
    CANVAS_ID: "particleCanvas",
    DEFAULT_SKIN: "classic",
    ANIMATION_DURATION: 3050,
    PROGRESS_DURATION: 3,
    API_BASE_URL: "https://backend12-production-1210.up.railway.app", // Начальное значение
    SKIN_PRICES: {
        negative: 5000,
        Emerald: 10000,
        Pixel: 150000
    },
    REFERRAL_BONUS: { default: 100, premium: 1000 },
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
// Утилиты
// ============================================================================

const Utils = {
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    getRandomInRange(range) {
        return Math.random() * (range.max - range.min) + range.min;
    },

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
    async fetch(url, options = {}) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, {
            headers: { "Content-Type": "application/json" },
            ...options
        });
        if (!response.ok) throw new Error(`Network error: ${response.status}`);
        return response.json();
    },

    getUserData(userId) {
        return this.fetch(`/get_user_data/${userId}`);
    },

    updateCoins(userId, amount, username) {
        return this.fetch("/update_coins", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, coins: amount, username })
        });
    },

    updateLuck(userId, luck, username) {
        return this.fetch("/update_luck", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, luck, username })
        });
    },

    updateSkin(userId, skinType) {
        return this.fetch("/update_skin", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, skin_type: skinType })
        });
    },

    buySkin(userId, skinType, cost) {
        return this.fetch("/buy_skin", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, skin_type: skinType, cost })
        });
    },

    updateRolls(userId) {
        return this.fetch("/update_rolls", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, rolls_increment: 1 })
        });
    },

    updateQuest(userId, quest, status) {
        return this.fetch("/update_quest", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, quest, status })
        });
    },

    updateProfile(userId, username, photoUrl) {
        return this.fetch("/update_profile", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, username, photo_url: photoUrl })
        });
    },

    getLeaderboard(type) {
        return this.fetch(`/leaderboard_${type}`);
    },

    getReferralCount(userId) {
        return this.fetch(`/get_referral_count/${userId}`);
    },

    async checkTelegramSubscription(userId, channel) {
        const response = await fetch(
            `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=@${channel}&user_id=${userId}`
        );
        const data = await response.json();
        return data.ok && ["member", "administrator", "creator"].includes(data.result.status);
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
        this.amount = 0;
        this.diameter = { min: 0, max: 0 };
        this.life = { min: 0, max: 0 };
        this.speed = { x: { min: 0, max: 0 }, y: { min: 0, max: 0 } };
        this.canvas.width = size.x;
        this.canvas.height = size.y;
    }

    createParticle() {
        const particle = new Particle(this.lastId.toString(), this);
        particle.position.x = Utils.getRandomInRange({ min: 0, max: this.size.x });
        particle.position.y = Utils.getRandomInRange({ min: 0, max: this.size.y });
        particle.diameter = Utils.getRandomInRange(this.diameter);
        particle.life = Utils.getRandomInRange(this.life);
        particle.speed.x = Utils.getRandomInRange(this.speed.x);
        particle.speed.y = Utils.getRandomInRange(this.speed.y);
        this.particles.set(this.lastId.toString(), particle);
        this.lastId++;
    }

    init() {
        const ctx = this.canvas.getContext("2d");
        ctx.fillStyle = "white";

        for (let i = 0; i < this.amount; i++) {
            this.createParticle();
        }

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
// Игра (Game) - Исправленный раздел с немедленным показом результата
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
        currentRainbow: false
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

        // Добавляем плавный переход для фона
        document.body.style.transition = "background 0.5s ease-in-out";

        this.elements.cube.removeEventListener("click", this.handleClick);
        this.elements.cube.addEventListener("click", this.handleClick.bind(this));
        this.updateGameData();
    },

    handleClick(event) {
        if (this.state.isAnimating) {
            console.log("Клик проигнорирован: анимация уже выполняется");
            event.preventDefault();
            return;
        }
        console.log("Клик зарегистрирован, начало rollCube");
        this.rollCube();
    },

    async rollCube() {
        if (this.state.isAnimating) {
            console.log("Повторный вызов rollCube заблокирован");
            return;
        }

        this.state.isAnimating = true;

        try {
            const isRainbow = Math.random() < 0.2;
            this.state.currentRainbow = isRainbow;
            const skinConfig = this.getSkinConfig();
            const initialSkin = `${skinConfig[this.state.equippedSkin][isRainbow ? "rainbow" : "default"]}`;

            // Немедленно показываем результат после клика
            const random = Math.random() * 100;
            const outcome = this.getOutcome(random, this.state.equippedSkin, isRainbow);
            this.elements.cube.src = outcome.src;
            console.log("Начало броска, изменение на кубик-1, кубик-2 и так далее:", outcome.src);

            // Запускаем прогресс-бар
            this.startProgress(3100);

            // Меняем фон во время анимации кубика (после начала анимации)
            await Utils.wait(100); // Небольшая задержка для плавности
            document.body.className = isRainbow ? "pink-gradient" : "gray-gradient";

            // Ждём окончания анимации
            await Utils.wait(2400); // 2500 - 100 = 2400, чтобы синхронизировать с прогресс-баром

            // Обновляем данные
            const serverData = await this.updateServerData();
            this.updateAchievementProgress(serverData?.total_rolls || 0);
            await this.updateBestLuck(random);
            await this.updateCoins(outcome.coins);

            // Возвращаем начальный скин и фон после анимации
            this.elements.cube.src = initialSkin;
            document.body.className = isRainbow ? "pink-gradient" : "gray-gradient";
            console.log("Конец броска, начисление монет, цикл идет заново, coins:", outcome.coins);
        } catch (error) {
            console.error("Ошибка в rollCube:", error);
        } finally {
            this.state.isAnimating = false;
            console.log("Анимация завершена, готов к новому клику");
        }
    },

    startProgress(duration) {
        if (!this.elements.progressBar) {
            console.error("Прогресс-бар не найден в DOM");
            return;
        }

        console.log(`Запуск прогресс-бара на ${duration} мс`);
        this.elements.progressBar.style.transition = `width ${duration / 1000}s linear`;
        this.elements.progressBar.style.width = "100%";

        setTimeout(() => {
            this.elements.progressBar.style.transition = "none";
            this.elements.progressBar.style.width = "0%";
            console.log("Прогресс-бар сброшен");
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

    getOutcome(random, skin, isRainbow) {
        const outcomes = {
            classic: {
                default: [
                    { range: 40, src: "pictures/cubics/классика/1-кубик.gif", coins: 1 },
                    { range: 65, src: "pictures/cubics/классика/2-кубик.gif", coins: 2 },
                    { range: 80, src: "pictures/cubics/классика/3-кубик.gif", coins: 3 },
                    { range: 90, src: "pictures/cubics/классика/4-кубик.gif", coins: 4 },
                    { range: 97, src: "pictures/cubics/классика/5-кубик.gif", coins: 5 },
                    { range: 100, src: "pictures/cubics/классика/6-кубик.gif", coins: 6 }
                ],
                rainbow: [
                    { range: 40, src: "pictures/cubics/классика/1-кубик.gif", coins: 2 },
                    { range: 65, src: "pictures/cubics/классика/2-кубик.gif", coins: 4 },
                    { range: 80, src: "pictures/cubics/классика/3-кубик.gif", coins: 6 },
                    { range: 90, src: "pictures/cubics/классика/4-кубик.gif", coins: 8 },
                    { range: 97, src: "pictures/cubics/классика/5-кубик.gif", coins: 10 },
                    { range: 100, src: "pictures/cubics/классика/6-кубик.gif", coins: 12 }
                ]
            },
            negative: {
                default: [
                    { range: 40, src: "pictures/cubics/негатив/1-кубик-негатив.gif", coins: 2 },
                    { range: 65, src: "pictures/cubics/негатив/2-кубик-негатив.gif", coins: 3 },
                    { range: 80, src: "pictures/cubics/негатив/3-кубик-негатив.gif", coins: 4 },
                    { range: 90, src: "pictures/cubics/негатив/4-кубик-негатив.gif", coins: 5 },
                    { range: 97, src: "pictures/cubics/негатив/5-кубик-негатив.gif", coins: 6 },
                    { range: 100, src: "pictures/cubics/негатив/6-кубик-негатив.gif", coins: 7 }
                ],
                rainbow: [
                    { range: 15, src: "pictures/cubics/негатив/1-кубик-негатив.gif", coins: 4 },
                    { range: 45, src: "pictures/cubics/негатив/2-кубик-негатив.gif", coins: 6 },
                    { range: 70, src: "pictures/cubics/негатив/3-кубик-негатив.gif", coins: 8 },
                    { range: 85, src: "pictures/cubics/негатив/4-кубик-негатив.gif", coins: 10 },
                    { range: 94, src: "pictures/cubics/негатив/5-кубик-негатив.gif", coins: 12 },
                    { range: 100, src: "pictures/cubics/негатив/6-кубик-негатив.gif", coins: 14 }
                ]
            },
            Emerald: {
                default: [
                    { range: 40, src: "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", coins: 3 },
                    { range: 65, src: "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", coins: 4 },
                    { range: 80, src: "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", coins: 5 },
                    { range: 90, src: "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", coins: 6 },
                    { range: 97, src: "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", coins: 7 },
                    { range: 100, src: "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", coins: 8 }
                ],
                rainbow: [
                    { range: 15, src: "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", coins: 6 },
                    { range: 45, src: "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", coins: 8 },
                    { range: 70, src: "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", coins: 10 },
                    { range: 85, src: "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", coins: 12 },
                    { range: 94, src: "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", coins: 14 },
                    { range: 100, src: "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", coins: 16 }
                ]
            },
            Pixel: {
                default: [
                    { range: 40, src: "pictures/cubics/пиксель/1-кубик-пиксель.gif", coins: 10 },
                    { range: 65, src: "pictures/cubics/пиксель/2-кубик-пиксель.gif", coins: 11 },
                    { range: 80, src: "pictures/cubics/пиксель/3-кубик-пиксель.gif", coins: 12 },
                    { range: 90, src: "pictures/cubics/пиксель/4-кубик-пиксель.gif", coins: 13 },
                    { range: 97, src: "pictures/cubics/пиксель/5-кубик-пиксель.gif", coins: 14 },
                    { range: 100, src: "pictures/cubics/пиксель/6-кубик-пиксель.gif", coins: 15 }
                ],
                rainbow: [
                    { range: 40, src: "pictures/cubics/пиксель/1-кубик-пиксель.gif", coins: 20 },
                    { range: 65, src: "pictures/cubics/пиксель/2-кубик-пиксель.gif", coins: 22 },
                    { range: 80, src: "pictures/cubics/пиксель/3-кубик-пиксель.gif", coins: 24 },
                    { range: 90, src: "pictures/cubics/пиксель/4-кубик-пиксель.gif", coins: 26 },
                    { range: 97, src: "pictures/cubics/пиксель/5-кубик-пиксель.gif", coins: 28 },
                    { range: 100, src: "pictures/cubics/пиксель/6-кубик-пиксель.gif", coins: 30 }
                ]
            }
        };

        const skinOutcomes = outcomes[skin][isRainbow ? "rainbow" : "default"];
        return skinOutcomes.find(outcome => random < outcome.range) || skinOutcomes[skinOutcomes.length - 1];
    },

    async updateServerData() {
        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) {
            console.error("Не удалось получить userId из Telegram Web App");
            return null;
        }
        try {
            return await API.updateRolls(userId);
        } catch (error) {
            console.error("Ошибка при обновлении rolls на сервере:", error);
            return null;
        }
    },

    async updateCoins(amount) {
        const userId = tg.initDataUnsafe?.user?.id;
        const username = tg.initDataUnsafe?.user?.username || tg.initDataUnsafe?.user?.first_name;
        try {
            const data = await API.updateCoins(userId, amount, username);
            this.state.coins = data.new_coins;
            this.elements.coinsDisplay.textContent = `${Utils.formatCoins(this.state.coins)} $LUCU`;
        } catch (error) {
            console.error("Ошибка при обновлении монет:", error);
            this.elements.coinsDisplay.textContent = "Error";
        }
    },

    async updateBestLuck(random) {
        if (random < this.state.bestLuck) {
            this.state.bestLuck = random;
            const userId = tg.initDataUnsafe?.user?.id;
            const username = tg.initDataUnsafe?.user?.username || tg.initDataUnsafe?.user?.first_name;
            try {
                await API.updateLuck(userId, this.state.bestLuck, username);
                this.elements.bestLuckDisplay.innerHTML = `Your Best MIN number: <span style="color: #F80000;">${Utils.formatNumber(this.state.bestLuck)}</span>`;
            } catch (error) {
                console.error("Ошибка при обновлении лучшей удачи:", error);
            }
        }
    },

    async updateGameData() {
        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) return;

        try {
            const data = await API.getUserData(userId);
            this.state.coins = data.coins || 0;
            this.state.bestLuck = data.min_luck === undefined || data.min_luck === null ? Infinity : data.min_luck;
            this.state.equippedSkin = data.equipped_skin || CONFIG.DEFAULT_SKIN;

            const skinConfig = this.getSkinConfig();
            this.elements.cube.src = `${skinConfig[this.state.equippedSkin].default}?t=${Date.now()}`;
            console.log("Установлен начальный скин:", this.elements.cube.src);

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
// Скины (Skins) - Исправленный раздел для синхронизации
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
        ownedSkins: [], // Храним актуальный список купленных скинов
        equippedSkin: CONFIG.DEFAULT_SKIN // Текущий выбранный скин
    },

    init() {
        this.elements.button.addEventListener("click", () => {
            UI.toggleMenu(this.elements.menu, true);
            // При открытии меню обновляем UI для уверенности
            this.syncSkins(this.state.ownedSkins, this.state.equippedSkin);
        });
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
        const cost = CONFIG.SKIN_PRICES[type] || 0; // Для "classic" стоимость 0
        const isOwned = this.state.ownedSkins.includes(type) || type === "classic"; // "classic" всегда доступен

        if (!isOwned) {
            // Покупка скина
            if (Game.state.coins >= cost) {
                const data = await API.buySkin(tg.initDataUnsafe?.user?.id, type, cost);
                if (data.message?.startsWith("✅")) {
                    Game.state.coins = data.new_coins;
                    this.state.ownedSkins = data.owned_skins;
                    this.equip(type); // Автоматически экипируем после покупки
                } else {
                    alert(`Purchase failed: ${data.message}`);
                }
            } else {
                alert("Not enough coins!");
            }
        } else {
            // Экипировка уже купленного скина
            this.equip(type);
        }
    },

    async equip(type) {
        if (this.state.equippedSkin === type) return;

        this.state.equippedSkin = type;
        const skinConfig = Game.getSkinConfig();
        Game.elements.cube.src = `${skinConfig[type].default}?t=${Date.now()}`;
        this.updateUI();

        // Синхронизируем с сервером
        try {
            await API.updateSkin(tg.initDataUnsafe?.user?.id, type);
            console.log(`Скин ${type} успешно экипирован`);
        } catch (error) {
            console.error("Ошибка при экипировке скина:", error);
        }
    },

    syncSkins(ownedSkins, equippedSkin) {
        // Синхронизируем локальное состояние с данными сервера
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

        console.log("UI обновлён, ownedSkins:", owned, "equippedSkin:", equipped);
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

        const data = await API.getUserData(userId);
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
        const isSubscribed = await API.checkTelegramSubscription(userId, CONFIG.CHANNEL_USERNAME);

        if (isSubscribed) {
            this.elements.subscribeButton.textContent = "✔️";
            this.elements.subscribeButton.classList.add("completed");
            this.elements.subscribeButton.style.background = "rgb(139, 0, 0)";
            this.elements.subscribeButton.style.cursor = "default";
            this.elements.subscribeButton.disabled = true;

            await API.updateQuest(userId, "subscription_quest", "yes");
            Game.updateCoins(250);
        }
    },

    async switchTab(tab) {  // Исправленный метод
        this.elements.questsTab.classList.toggle("active", tab === "quests");
        this.elements.achievementsTab.classList.toggle("active", tab === "achievements");
        this.elements.questsList.classList.toggle("hidden", tab !== "quests");
        this.elements.achievementsList.classList.toggle("hidden", tab !== "achievements");

        if (tab === "achievements") {
            try {
                const userId = tg.initDataUnsafe?.user?.id;
                if (!userId) {
                    Game.updateAchievementProgress(0);
                    return;
                }
                
                const userData = await API.getUserData(userId);
                const rolls = userData?.rolls || 0;
                Game.updateAchievementProgress(rolls);
            } catch (error) {
                console.error("Ошибка при загрузке данных для достижений:", error);
                Game.updateAchievementProgress(0);
            }
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
        const data = await API.getLeaderboard(type);
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
            const avatar = await this.getAvatar(player, i);
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
                        <img src="${avatar.src}" class="player-avatar" alt="Avatar" 
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
    },

    async getAvatar(player, index) {
        let photoUrl = player?.photo_url;
        if (!photoUrl || photoUrl === "undefined" || photoUrl === "null") {
            return { src: CONFIG.FALLBACK_AVATAR, bgClass: "" };
        }

        if (photoUrl.endsWith(".svg") || photoUrl.includes("t.me/")) {
            return {
                src: photoUrl,
                bgClass: index === 0 ? "rainbow-bg" : index <= 4 ? "gold-bg" : ""
            };
        }

        try {
            const response = await fetch(photoUrl);
            if (!response.ok) return { src: CONFIG.FALLBACK_AVATAR, bgClass: "" };
            const blob = await response.blob();
            return {
                src: URL.createObjectURL(blob),
                bgClass: index === 0 ? "rainbow-bg" : index <= 4 ? "gold-bg" : ""
            };
        } catch {
            return { src: CONFIG.FALLBACK_AVATAR, bgClass: "" };
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
            API.updateProfile(
                user.id,
                `${user.first_name}${user.last_name ? " " + user.last_name : ""}`,
                user.photo_url || CONFIG.FALLBACK_AVATAR
            );
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
            const bonus = tg.initDataUnsafe?.user?.premium ? CONFIG.REFERRAL_BONUS.premium : CONFIG.REFERRAL_BONUS.default;
            API.updateCoins(userId, bonus, tg.initDataUnsafe?.user?.first_name);
        }
    },

    async updateFriendsCount() {
        const data = await API.getReferralCount(tg.initDataUnsafe?.user?.id);
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

        Object.assign(particleSystem, {
            amount: 100,
            diameter: { min: 1, max: 3 },
            life: { min: 3, max: 7 },
            speed: { x: { min: -2, max: 2 }, y: { min: -2, max: 2 } }
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

document.addEventListener("DOMContentLoaded", async () => {
    await loadConfig();
    Particles.init();
    Game.init();
    Skins.init();
    Quests.init();
    Leaderboard.init();
    Profile.init();
    Friends.init();

    tg.expand();
    tg.requestFullscreen();
    tonConnectUI.uiOptions = { twaReturnUrl: "https://t.me/LuckyCubesbot" };
});
