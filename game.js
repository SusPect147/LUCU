// Проверяем, существует ли AppConfig, и если нет, создаем его
if (typeof AppConfig === "undefined") {
  var AppConfig = {
    CANVAS_ID: "particleCanvas",
    DEFAULT_SKIN: "classic",
    ANIMATION_DURATION: 3450,
    PROGRESS_DURATION: 3,
    API_BASE_URL: "https://backend12-p9bz.onrender.com",
    FALLBACK_AVATAR: "pictures/cubics/классика/начальный-кубик.gif",
  };
}

// Состояние приложения
const AppState = {
  userData: null,
  isPremium: false,
  userId: null,
  isInitialized: false,
  token: null,
};

/**
 * Загружает конфигурацию приложения с сервера или устанавливает значения по умолчанию при ошибке.
 * @param {Object} tg - Telegram WebApp объект
 * @returns {Promise<void>}
 */
async function loadConfig(tg) {
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
        Authorization: `Bearer ${AppState.token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    Object.assign(AppConfig, {
      API_BASE_URL: data.u || "https://backend12-p9bz.onrender.com",
      CHANNEL_USERNAME: data.c || "@LuckyCubesChannel", // Убедимся, что используем правильный канал
    });
  } catch (error) {
    console.error("Failed to load config:", error);
    Object.assign(AppConfig, {
      API_BASE_URL: "https://backend12-p9bz.onrender.com",
      CHANNEL_USERNAME: "@LuckyCubesChannel", // Значение по умолчанию
    });
  }
}

// Утилиты для работы с числами, DOM и асинхронностью
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
    return new Promise((resolve) => setTimeout(resolve, ms));
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
  },
};

/**
 * Выполняет HTTP-запрос к API с повторными попытками и кэшированием.
 * @param {string} endpoint - Конечная точка API
 * @param {Object} [options] - Настройки запроса
 * @returns {Promise<Object>} - Ответ от сервера
 */
const API = {
  baseUrl: "https://backend12-p9bz.onrender.com",
  defaultHeaders: {
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": window.Telegram.WebApp.initData || "",
  },
  pendingRequests: new Map(),

  async fetch(endpoint, options = {}) {
    const key = `${endpoint}:${JSON.stringify(options.body)}`;
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const telegramInitData = window.Telegram.WebApp.initData || "";
    if (!telegramInitData) {
      throw new Error("Telegram initData is required for API requests");
    }

    let attempts = 0;
    const maxAttempts = 3;

    if (!AppState.token) {
      console.warn("No token available, initializing...");
      await refreshToken();
      if (!AppState.token) {
        throw new Error("Failed to initialize token. Please reload the app.");
      }
    }

    const promise = (async () => {
      while (attempts < maxAttempts) {
        try {
          console.log("Fetching with token:", AppState.token);
          console.log("Request URL:", url);

          const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(5000),
            headers: {
              ...this.defaultHeaders,
              Authorization: `Bearer ${AppState.token}`,
              ...options.headers,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            error.status = response.status;

            if (error.status === 401 && attempts < maxAttempts - 1) {
              console.warn("Token invalid, attempting to refresh...");
              await refreshToken();
              attempts++;
              continue;
            }
            throw error;
          }

          const data = await response.json();
          this.pendingRequests.delete(key);
          return data;
        } catch (error) {
          attempts++;
          console.error(`Attempt ${attempts} failed for ${url}:`, error);

          if (attempts === maxAttempts) {
            if (error.name === "AbortError" || error.name === "TimeoutError") {
              throw new Error(`Request to ${url} timed out after 5 seconds. Check your network or server status.`);
            } else if (error.status === 401) {
              throw new Error("Authentication failed after multiple attempts. Please reload the app.");
            }
            throw error;
          }
          await Utils.wait(1000 * attempts);
        }
      }
    })();

    this.pendingRequests.set(key, promise);
    return promise;
  },
};

/**
 * Обновляет токен авторизации для API-запросов.
 * @returns {Promise<string>} - Новый токен
 */
async function refreshToken() {
  try {
    const telegramInitData = window.Telegram.WebApp.initData || "";
    if (!telegramInitData) {
      throw new Error("Telegram initData is unavailable for token refresh");
    }

    const userId = window.Telegram.WebApp.initDataUnsafe?.user?.id?.toString();
    if (!userId) {
      throw new Error("User ID is unavailable for token refresh");
    }

    const response = await fetch(`${AppConfig.API_BASE_URL}/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": telegramInitData,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Response from /init:", data);

    if (!data.t) {
      throw new Error("Server response did not include a token");
    }

    AppState.token = data.t;
    API.defaultHeaders["Authorization"] = `Bearer ${AppState.token}`;
    console.log("Token refreshed successfully:", AppState.token);
    return data.t;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    console.log("Authentication failed. Please restart the app.");
    throw error;
  }
}

// Класс для управления частицами
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
    this.position.x = Math.random() * this.parent.size.x;
    this.position.y = Math.random() * this.parent.size.y;
    this.diameter = Math.random() * (this.parent.diameter.max - this.parent.diameter.min) + this.parent.diameter.min;
    this.life = Math.random() * (this.parent.life.max - this.parent.life.min) + this.parent.life.min;
    this.speed.x = Math.random() * (this.parent.speed.x.max - this.parent.speed.x.min) + this.parent.speed.x.min;
    this.speed.y = Math.random() * (this.parent.speed.y.max - this.parent.speed.y.min) + this.parent.speed.y.min;
  }

  update(deltaTime) {
    this.position.x += this.speed.x * deltaTime;
    this.position.y -= this.speed.y * deltaTime;
    this.life -= deltaTime;
    return this.life > 0;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.diameter / 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Система частиц
class ParticleSystem {
  constructor(canvas, size) {
    if (!canvas || typeof canvas.getContext !== "function") {
      console.error("Invalid canvas provided:", canvas);
      throw new Error("Invalid or missing canvas element provided to ParticleSystem");
    }

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
    this.ctx = this.canvas.getContext("2d");
    this.lastTime = 0;
  }

  createParticle() {
    const particle = new Particle(this.lastId.toString(), this);
    this.particles.set(this.lastId.toString(), particle);
    this.lastId++;
  }

  init() {
    this.ctx.fillStyle = "white";
    for (let i = 0; i < this.amount; i++) {
      this.createParticle();
    }
    this.animate(performance.now());
  }

  animate(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach((particle) => {
      if (!particle.update(deltaTime)) {
        this.particles.delete(particle.id);
      } else {
        particle.draw(this.ctx);
      }
    });

    while (this.particles.size < this.amount) {
      this.createParticle();
    }

    requestAnimationFrame((time) => this.animate(time));
  }

  resize(newSize, oldSize) {
    this.canvas.width = newSize.x;
    this.canvas.height = newSize.y;
    this.size = newSize;
    this.ctx.fillStyle = "white";
    this.particles.forEach((particle) => {
      particle.position.x = (particle.position.x / oldSize.x) * newSize.x;
      particle.position.y = (particle.position.y / oldSize.y) * newSize.y;
    });
  }
}

// Управление интерфейсом
const UI = {
  toggleMenu(menu, show) {
    menu.classList.toggle("hidden", !show);
    menu.classList.toggle("show", show);
    if (!show) {
      menu.classList.add("hide");
      setTimeout(() => menu.classList.remove("hide"), 400);
    }
  },

  addSwipeHandler(element, onSwipeDown, withinList = false) {
    let startY;
    element.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
    });

    element.addEventListener("touchmove", (e) => {
      const deltaY = e.touches[0].clientY - startY;
      const target = e.target;
      const isWithinList =
        withinList && (target.closest("#quests-list") || target.closest("#achievements-list"));
      if (deltaY > 50 && !isWithinList) {
        onSwipeDown();
      }
    });
  },
};

/**
 * Возвращает случайный результат из массива исходов на основе вероятностей.
 * @param {Array} outcomes - Массив объектов с полями {p, s, c}
 * @returns {Object} - Выбранный исход
 */
function getRandomOutcome(outcomes) {
  const rand = Math.random();
  let cumulativeProbability = 0;

  for (const outcome of outcomes) {
    cumulativeProbability += outcome.p;
    if (rand <= cumulativeProbability) {
      return outcome;
    }
  }
  return outcomes[outcomes.length - 1];
}

// Управление игровой логикой
const Game = {
  elements: {
    cube: null,
    coinsDisplay: null,
    bestLuckDisplay: null,
    progressBar: null,
  },
  state: {
    coins: 0,
    bestLuck: 1001,
    isAnimating: false,
    equippedSkin: AppConfig.DEFAULT_SKIN,
    rolls: 0,
    animationTimeout: null,
  },

  init() {
    this.elements.cube = document.getElementById("cube");
    this.elements.coinsDisplay = document.getElementById("coins") || document.getElementById("coins-display");
    this.elements.bestLuckDisplay = document.getElementById("bestLuck");
    this.elements.progressBar = document.querySelector("#progressBar div");

    const missingElements = [];
    if (!this.elements.cube) missingElements.push("cube");
    if (!this.elements.coinsDisplay) missingElements.push("coinsDisplay");
    if (!this.elements.bestLuckDisplay) missingElements.push("bestLuckDisplay");
    if (!this.elements.progressBar) missingElements.push("progressBar");

    if (missingElements.length > 0) {
      console.error("Game.init failed: Required DOM elements are missing:", missingElements);
      return false;
    }

    document.body.style.transition = "background 0.5s ease-in-out, background-image 0.5s ease-in-out";
    try {
      console.log("Adding click listener to cube:", this.elements.cube);
      this.elements.cube.addEventListener("click", this.handleClick.bind(this));
    } catch (error) {
      console.error("Error adding event listener to cube:", error);
      return false;
    }

    this.updateFromAppState();
    const initialSrc = this.getSkinConfig()[this.state.equippedSkin].initial + `?t=${Date.now()}`;
    this.elements.cube.src = initialSrc;

    console.log("Game initialized successfully");
    return true;
  },

  updateFromAppState() {
    const data = AppState.userData;
    if (!data) return;

    this.state.coins = data.coins || 0;
    this.state.bestLuck = data.min_luck === undefined || data.min_luck === null ? 1001 : data.min_luck;
    this.state.equippedSkin = data.equipped_skin || AppConfig.DEFAULT_SKIN;
    this.state.rolls = data.rolls || 0;
    this.setInitialCube();
  },

  setInitialCube() {
    const initialSrc = outcomes[this.state.equippedSkin]["default"][0].s + `?t=${Date.now()}`;
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
    clearTimeout(this.state.animationTimeout);

    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id?.toString();
    if (!userId) {
      console.error("User ID is missing in Telegram initData");
      this.state.isAnimating = false;
      this.elements.coinsDisplay.textContent = "User ID not found";
      return;
    }

    try {
      const userDataResponse = await API.fetch(`/get_user_data_new/${userId}`);
      this.state.coins = userDataResponse.coins || 0;
      AppState.userData = { ...AppState.userData, ...userDataResponse };

      const currentCoins = this.state.coins;
      const luck = Math.random() * 100;
      const isRainbow = Math.random() < 0.1;
      const skinOutcomes = outcomes[this.state.equippedSkin][isRainbow ? "rainbow" : "default"];
      const localOutcome = getRandomOutcome(skinOutcomes);

      this.elements.progressBar.style.transition = "none";
      this.elements.progressBar.style.width = "0%";
      this.elements.cube.src = localOutcome.s;

      this.startProgress(AppConfig.ANIMATION_DURATION);

      console.log("Sending roll_cube request:", {
        user_id: userId,
        skin: this.state.equippedSkin,
        luck: luck,
        coins: currentCoins,
        outcome_value: localOutcome.c,
      });

      const response = await API.fetch("/roll_cube", {
        method: "POST",
        headers: {
          "X-Telegram-Init-Data": window.Telegram.WebApp.initData || "",
        },
        body: JSON.stringify({
          user_id: userId,
          skin: this.state.equippedSkin,
          luck: luck,
          coins: currentCoins,
          outcome_value: localOutcome.c,
        }),
      });

      if (!response.success) {
        throw new Error(response.message || "Server failed to process roll");
      }

      const newCoins = response.c;
      const newRolls = response.tr;
      const serverLuck = response.l;
      const minLuck = response.ml || this.state.bestLuck;
      const serverIsRainbow = response.rb;

      if (AppState.userData.ban !== "yes") {
        document.body.classList.remove("pink-gradient", "gray-gradient");
        document.body.classList.add(serverIsRainbow ? "pink-gradient" : "gray-gradient");

        const coinUpdateDelay = AppConfig.ANIMATION_DURATION - 500;
        this.state.animationTimeout = setTimeout(() => {
          this.state.coins = newCoins;
          this.elements.coinsDisplay.textContent = `${Utils.formatCoins(newCoins)} $LUCU`;
        }, coinUpdateDelay);

        await Utils.wait(AppConfig.ANIMATION_DURATION);

        this.state.bestLuck = minLuck;
        this.state.rolls = newRolls;
        this.elements.bestLuckDisplay.innerHTML =
          this.state.bestLuck === 1001
            ? `Your Best MIN number: <span style="color: #F80000;">N/A</span>`
            : `Your Best MIN number: <span style="color: #F80000;">${Utils.formatNumber(this.state.bestLuck)}</span>`;
        this.updateAchievementProgress(newRolls);

        if (serverIsRainbow) {
          document.body.classList.remove("pink-gradient");
          document.body.classList.add("gray-gradient");
        }

        const initialSrc = this.getSkinConfig()[this.state.equippedSkin].initial + `?t=${Date.now()}`;
        this.elements.cube.src = initialSrc;
      }

      AppState.userData = {
        ...AppState.userData,
        coins: newCoins,
        rolls: newRolls,
        min_luck: minLuck,
        equipped_skin: this.state.equippedSkin,
      };
    } catch (error) {
      console.error("Roll cube error:", error);
      this.elements.coinsDisplay.textContent = error.status === 400 ? "Invalid roll, try again" : "Error, try again";
      await Utils.wait(AppConfig.ANIMATION_DURATION);
      const initialSrc = this.getSkinConfig()[this.state.equippedSkin].initial + `?t=${Date.now()}`;
      this.elements.cube.src = initialSrc;
    } finally {
      this.state.isAnimating = false;
    }
  },

  startProgress(duration) {
    this.elements.progressBar.style.transition = "none";
    this.elements.progressBar.style.width = "0%";
    requestAnimationFrame(() => {
      this.elements.progressBar.style.transition = `width ${duration / 1000}s linear`;
      this.elements.progressBar.style.width = "100%";
      this.state.animationTimeout = setTimeout(() => {
        this.elements.progressBar.style.transition = "none";
        this.elements.progressBar.style.width = "0%";
      }, duration);
    });
  },

  getSkinConfig() {
    return {
      classic: {
        initial: "pictures/cubics/классика/начальный-кубик.gif",
        outcomes: [
          { value: 1, src: "pictures/cubics/классика/1-кубик.gif", coins: 1, probability: 0.4 },
          { value: 2, src: "pictures/cubics/классика/2-кубик.gif", coins: 2, probability: 0.25 },
          { value: 3, src: "pictures/cubics/классика/3-кубик.gif", coins: 3, probability: 0.15 },
          { value: 4, src: "pictures/cubics/классика/4-кубик.gif", coins: 4, probability: 0.1 },
          { value: 5, src: "pictures/cubics/классика/5-кубик.gif", coins: 5, probability: 0.07 },
          { value: 6, src: "pictures/cubics/классика/6-кубик.gif", coins: 6, probability: 0.03 },
        ],
      },
      negative: {
        initial: "pictures/cubics/негатив/начальный-кубик-негатив.gif",
        outcomes: [
          { value: 1, src: "pictures/cubics/негатив/1-кубик-негатив.gif", coins: 2, probability: 0.3 },
          { value: 2, src: "pictures/cubics/негатив/2-кубик-негатив.gif", coins: 3, probability: 0.25 },
          { value: 3, src: "pictures/cubics/негатив/3-кубик-негатив.gif", coins: 4, probability: 0.2 },
          { value: 4, src: "pictures/cubics/негатив/4-кубик-негатив.gif", coins: 5, probability: 0.15 },
          { value: 5, src: "pictures/cubics/негатив/5-кубик-негатив.gif", coins: 6, probability: 0.07 },
          { value: 6, src: "pictures/cubics/негатив/6-кубик-негатив.gif", coins: 7, probability: 0.03 },
        ],
      },
      Emerald: {
        initial: "pictures/cubics/перевернутый/начальный-кубик-перевернутый.gif",
        outcomes: [
          { value: 1, src: "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", coins: 3, probability: 0.2 },
          { value: 2, src: "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", coins: 4, probability: 0.2 },
          { value: 3, src: "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", coins: 5, probability: 0.2 },
          { value: 4, src: "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", coins: 6, probability: 0.2 },
          { value: 5, src: "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", coins: 7, probability: 0.15 },
          { value: 6, src: "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", coins: 8, probability: 0.05 },
        ],
      },
      Pixel: {
        initial: "pictures/cubics/пиксель/начальный-кубик-пиксель.gif",
        outcomes: [
          { value: 1, src: "pictures/cubics/пиксель/1-кубик-пиксель.gif", coins: 10, probability: 0.1 },
          { value: 2, src: "pictures/cubics/пиксель/2-кубик-пиксель.gif", coins: 11, probability: 0.15 },
          { value: 3, src: "pictures/cubics/пиксель/3-кубик-пиксель.gif", coins: 12, probability: 0.2 },
          { value: 4, src: "pictures/cubics/пиксель/4-кубик-пиксель.gif", coins: 13, probability: 0.25 },
          { value: 5, src: "pictures/cubics/пиксель/5-кубик-пиксель.gif", coins: 14, probability: 0.2 },
          { value: 6, src: "pictures/cubics/пиксель/6-кубик-пиксель.gif", coins: 15, probability: 0.1 },
        ],
      },
    };
  },

  updateAchievementProgress(rolls) {
    const targetRolls = 123456;
    const rollsProgress = Math.min((rolls / targetRolls) * 100, 100);
    const achievementRolls = document.querySelector("#achievements-list .achievement-item:nth-child(2)");
    if (achievementRolls) {
      achievementRolls.querySelector(".progress-circle").style.setProperty("--progress", `${rollsProgress}%`);
      achievementRolls.querySelector(".achievement-reward").textContent =
        rolls >= targetRolls
          ? "Achievement Completed! 123456 dice rolls made!"
          : `Make ${Utils.formatWithCommas(targetRolls - rolls)} more dice rolls to complete`;
    }

    const targetCoins = 100000;
    const coinsProgress = Math.min((this.state.coins / targetCoins) * 100, 100);
    const achievementCoins = document.querySelector("#achievements-list .achievement-item:nth-child(3)");
    if (achievementCoins) {
      achievementCoins.querySelector(".progress-circle").style.setProperty("--progress", `${coinsProgress}%`);
      achievementCoins.querySelector(".achievement-reward").textContent =
        this.state.coins >= targetCoins
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
  },
};

// Управление скинами
const Skins = {
  elements: {
    buyNegative: document.getElementById("buy-negative"),
    buyEmerald: document.getElementById("buy-Emerald"),
    buyPixel: document.getElementById("buy-Pixel"),
    equipClassic: document.getElementById("equip-classic"),
    menu: document.getElementById("skins-menu"),
    button: document.querySelector('.menu-item img[alt="Skins"]'),
  },
  state: {
    ownedSkins: [],
    equippedSkin: AppConfig.DEFAULT_SKIN,
  },

  init() {
    if (!this.elements.button) {
      console.error(
        "Skins button not found in DOM. Expected element: .menu-item img[alt='Skins']. Skins menu functionality will be disabled."
      );
      return;
    }

    this.elements.button.addEventListener("click", () => UI.toggleMenu(this.elements.menu, true));
    this.elements.menu.addEventListener("click", (e) => {
      if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
    });

    this.elements.buyNegative.addEventListener("click", () => this.handleSkin("negative"));
    this.elements.buyEmerald.addEventListener("click", () => this.handleSkin("Emerald"));
    this.elements.buyPixel.addEventListener("click", () => this.handleSkin("Pixel"));
    this.elements.equipClassic.addEventListener("click", () => this.handleSkin("classic"));
    this.updateFromAppState();

    this.elements.menu.style.overflowY = "auto";
    this.elements.menu.style.height = "80vh";
    this.elements.menu.style.maxHeight = "80vh";
  },

  updateFromAppState() {
    const data = AppState.userData;
    if (!data) return;

    this.state.ownedSkins = data.owned_skins || [];
    this.state.equippedSkin = data.equipped_skin || AppConfig.DEFAULT_SKIN;
    this.updateUI();
  },

  async handleSkin(type) {
    const tg = window.Telegram?.WebApp;
    const userId = tg.initDataUnsafe?.user?.id?.toString();
    if (!userId) {
      console.log("User ID not found. Please restart the app.");
      return;
    }

    if (AppState.userData.ban === "yes") {
      console.log("You are banned and cannot purchase or equip skins.");
      return;
    }

    const skinPrices = {
      negative: 5000,
      Emerald: 10000,
      Pixel: 150000,
      classic: 0,
    };

    const price = skinPrices[type];
    const isOwned = this.state.ownedSkins.includes(type);

    if (!isOwned && price && AppState.userData.coins < price) {
      console.log(`Not enough $LUCU! You need ${Utils.formatCoins(price)} $LUCU to buy this skin.`);
      return;
    }

    try {
      const response = await API.fetch("/handle_skin", {
        method: "POST",
        headers: {
          "X-Telegram-Init-Data": window.Telegram.WebApp.initData || "",
        },
        body: JSON.stringify({ user_id: userId, skin_type: type }),
      });

      if (response.success) {
        this.state.ownedSkins = response.os;
        this.state.equippedSkin = response.es;
        this.updateUI();

        AppState.userData = {
          ...AppState.userData,
          coins: response.nc,
          owned_skins: response.os,
          equipped_skin: response.es,
        };
        Game.state.coins = response.nc;
        Game.state.equippedSkin = response.es;
        Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.nc)} $LUCU`;
        Game.elements.cube.src = `${Game.getSkinConfig()[type].initial}?t=${Date.now()}`;
        Game.updateFromAppState();

        console.log(`Skin ${type} successfully ${isOwned ? "equipped" : "purchased and equipped"}!`);
      } else {
        console.log(response.message || "Failed to handle skin action.");
      }
    } catch (error) {
      console.error("Skin action error:", error);

      if (error.status === 403) {
        console.log("Access denied: You may be banned or lack permissions.");
      } else if (error.status === 400) {
        console.log("Invalid request. Please try again.");
      } else {
        console.log("Error handling skin: " + error.message);
      }
    }
  },

  updateUI() {
    const owned = this.state.ownedSkins;
    const equipped = this.state.equippedSkin;

    this.elements.buyNegative.textContent = owned.includes("negative")
      ? equipped === "negative"
        ? "Equipped"
        : "Equip"
      : "Buy //5K $LUCU/";
    this.elements.buyEmerald.textContent = owned.includes("Emerald")
      ? equipped === "Emerald"
        ? "Equipped"
        : "Equip"
      : "Buy //10K $LUCU/";
    this.elements.buyPixel.textContent = owned.includes("Pixel")
      ? equipped === "Pixel"
        ? "Equipped"
        : "Equip"
      : "Buy //150K $LUCU/";
    this.elements.equipClassic.textContent = equipped === "classic" ? "Equipped" : "Equip";
  },
};

// Управление квестами
const Quests = {
  elements: {
    menu: document.getElementById("quests-menu"),
    button: document.querySelector('.menu-item img[alt="Quests"]'),
    questsTab: document.getElementById("quests-tab"),
    achievementsTab: document.getElementById("achievements-tab"),
    questsList: document.getElementById("quests-list"),
    achievementsList: document.getElementById("achievements-list"),
  },

  init() {
    const tg = window.Telegram?.WebApp;
    tg.ready();

    this.elements.button.addEventListener("click", () => {
      UI.toggleMenu(this.elements.menu, true);
      this.updateQuestStatus();
      this.refreshUserData();
    });

    this.elements.menu.addEventListener("click", (e) => {
      if (e.target === this.elements.menu) {
        UI.toggleMenu(this.elements.menu, false);
      }
    });

    UI.addSwipeHandler(this.elements.menu, () => UI.toggleMenu(this.elements.menu, false), true);

    this.elements.questsList.querySelectorAll(".quest-btn").forEach((button) => {
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

    tg.MainButton.onClick(async () => {
      await this.handleDiceStatus(tg.initDataUnsafe.user?.id?.toString());
    });
  },

  async refreshUserData() {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id?.toString();
    if (!userId) return;

    try {
      const response = await API.fetch(`/get_user_data_new/${userId}`, {
        method: "GET",
        headers: {
          "X-Telegram-Init-Data": window.Telegram.WebApp.initData || "",
        },
      });

      if (JSON.stringify(AppState.userData) !== JSON.stringify(response)) {
        AppState.userData = { ...AppState.userData, ...response };
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
      subscription_quest: this.elements.questsList.querySelector('[data-quest="subscription_quest"]'),
      forward_message: this.elements.questsList.querySelector('[data-quest="forward_message"]'),
      dice_status: this.elements.questsList.querySelector('[data-quest="dice_status"]'),
      dice_nickname: this.elements.questsList.querySelector('[data-quest="dice_nickname"]'),
      boost_channel: this.elements.questsList.querySelector('[data-quest="boost_channel"]'),
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
    const tg = window.Telegram?.WebApp;
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
    const tg = window.Telegram?.WebApp;
    tg.openLink(`https://t.me/${AppConfig.CHANNEL_USERNAME}`);
    setTimeout(async () => {
      const response = await API.fetch("/check_subscription", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      if (response.s) {
        await this.refreshUserData(); // Обновляем данные, так как сервер уже изменил статус
        console.log("Subscription quest completed");
      } else {
        console.log("Please subscribe to the channel and try again");
      }
    }, 6000); // Увеличиваем задержку до 6 секунд
  },

  async handleForwardMessage(userId) {
    const tg = window.Telegram?.WebApp;
    const message = `Hey, bro! Let's play this game together! 🎲\n\nOpen game: https://t.me/LuckyCubesbot`;
    tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(message)}`);
    setTimeout(async () => {
      const response = await API.fetch("/check_forward_message", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      if (response.s) {
        await this.refreshUserData();
        console.log("Forward message quest completed");
      }
    }, 6000);
  },

  async handleDiceStatus(userId) {
    try {
      if (!AppState.userData.is_premium) {
        console.log("This quest requires Telegram Premium. Please upgrade your account.");
        return;
      }
      const customEmojiId = "5384541907051357217";
      await Telegram.WebApp.setEmojiStatus(customEmojiId);
      setTimeout(async () => {
        const response = await API.fetch("/check_dice_status", {
          method: "POST",
          body: JSON.stringify({ user_id: userId }),
        });
        if (response.s) {
          await this.refreshUserData();
          console.log("Dice status quest completed");
        } else {
          console.log("Please set the dice emoji status and try again");
        }
      }, 6000);
    } catch (error) {
      console.error("Error setting emoji status:", error);
      if (error.message === "WebAppEmojiStatusRequested") {
        console.log("Emoji status request pending. Please confirm in Telegram.");
      }
    }
  },

  async handleDiceNickname(userId) {
    try {
      const response = await API.fetch("/check_dice_nickname", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      if (response.s) {
        await this.refreshUserData();
        console.log("Dice nickname quest completed");
      } else {
        console.log("Please add the 🎲 emoji to your Telegram nickname and wait a few seconds");
        setTimeout(async () => {
          const retryResponse = await API.fetch("/check_dice_nickname", {
            method: "POST",
            body: JSON.stringify({ user_id: userId }),
          });
          if (retryResponse.s) {
            await this.refreshUserData();
            console.log("Dice nickname quest completed on retry");
          } else {
            console.log("Dice emoji not detected in your nickname");
          }
        }, 6000);
      }
    } catch (error) {
      console.error("Error checking dice nickname:", error);
    }
  },

  async handleBoostChannel(userId) {
    const tg = window.Telegram?.WebApp;
    tg.openLink(`https://t.me/${AppConfig.CHANNEL_USERNAME}?boost`);
    setTimeout(async () => {
      const response = await API.fetch("/check_boost_channel", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      if (response.s) {
        await this.refreshUserData();
        console.log("Boost channel quest completed");
      } else {
        console.log("Please boost the channel and try again");
      }
    }, 6000);
  },

  async completeQuest(userId, questName) {
    try {
      const response = await API.fetch("/update_quest_new", {
        method: "POST",
        body: JSON.stringify({
          user_id: String(userId),
          quest: questName,
          status: "yes",
        }),
      });
      if (response.message === "Quest updated successfully") {
        AppState.userData.coins = response.new_coins;
        Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(response.new_coins)} $LUCU`;
        await this.refreshUserData();
        console.log(`Quest ${questName} completed successfully`);
      } else {
        console.error(`Failed to complete quest ${questName}: ${response.message}`);
      }
    } catch (error) {
      console.error(`Error completing quest ${questName}:`, error);
    }
  },

  async checkPendingQuests(userId) {
    await this.refreshUserData();
    const userData = AppState.userData;
    if (!userData || !userData.quests) return;

    for (const quest in userData.quests) {
      if (userData.quests[quest] === "pending") {
        let canComplete = false;
        switch (quest) {
          case "subscription_quest":
            const subResponse = await API.fetch("/check_subscription", {
              method: "POST",
              body: JSON.stringify({ user_id: userId }),
            });
            canComplete = subResponse.s;
            break;
          case "dice_nickname":
            const diceResponse = await API.fetch("/check_dice_nickname", {
              method: "POST",
              body: JSON.stringify({ user_id: userId }),
            });
            canComplete = diceResponse.s;
            break;
          case "boost_channel":
            const boostResponse = await API.fetch("/check_boost_channel", {
              method: "POST",
              body: JSON.stringify({ user_id: userId }),
            });
            canComplete = boostResponse.s;
            break;
          default:
            console.warn(`No condition check defined for quest: ${quest}`);
            continue;
        }
        if (canComplete) {
          await this.refreshUserData(); // Сервер уже обновил статус
          console.log(`Quest ${quest} conditions met and completed`);
        }
        await Utils.wait(1000);
      }
    }
  },

  getQuestReward(questName) {
    const rewards = {
      subscription_quest: 250,
      forward_message: 500,
      dice_status: 500,
      dice_nickname: 100,
      boost_channel: 500,
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
  },
};

// Управление таблицей лидеров
const Leaderboard = {
  elements: {
    menu: document.getElementById("leaderboard-menu"),
    button: document.querySelector('.menu-item img[alt="Leaderboard"]'),
    list: document.getElementById("leaderboard-list"),
    mostLucuBtn: document.getElementById("most-lucu"),
    bestLuckBtn: document.getElementById("best-luck"),
    placeBadge: document.getElementById("player-place-badge"),
    topSection: document.querySelector(".top-section"),
  },

  init() {
    this.elements.button.addEventListener("click", () => {
      UI.toggleMenu(this.elements.menu, true);
      this.load("coins");
    });

    this.elements.menu.addEventListener("click", (e) => {
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
      const tg = window.Telegram?.WebApp;
      const data = await API.fetch(`/leaderboard_${type}`);
      this.elements.list.innerHTML = "";
      const userId = tg.initDataUnsafe?.user?.id?.toString();
      const userIndex = data.findIndex((p) => p.u === userId);
      this.elements.placeBadge.textContent = userIndex >= 0 ? `Your place #${userIndex + 1}` : "Your place #--";

      if (!data?.length) {
        this.elements.list.innerHTML = '<li class="coming-soon">No data available</li>';
        return;
      }

      for (let i = 0; i < data.length; i++) {
        const player = data[i];
        const isCurrentUser = userId && player.u === userId;
        const li = document.createElement("li");
        li.classList.add("leaderboard-item");
        if (isCurrentUser) li.classList.add("highlight");

        const value = type === "coins" ? Utils.formatCoins(player.c) + " $LUCU" : Utils.formatNumber(player.ml) || "N/A";
        const username = player.u || "Unknown";

        li.innerHTML = `
          <div class="leaderboard-item-content">
            <div class="player-left">
              <span class="player-${type}">${value}</span>
            </div>
            <div class="player-right">
              <img src="${player.pu || AppConfig.FALLBACK_AVATAR}" class="player-avatar" alt="Avatar" 
                   onerror="this.src='${AppConfig.FALLBACK_AVATAR}'">
              <div class="player-info">
                <span class="player-name">${username}</span>
                <span class="player-rank">#${i + 1}</span>
              </div>
            </div>
          </div>
        `;
        this.elements.list.appendChild(li);
      }
    } catch (error) {
      console.error("Leaderboard load error:", error);
      this.elements.list.innerHTML = '<li class="coming-soon">Failed to load leaderboard</li>';
    }
  },
};

// Управление друзьями
const Friends = {
  elements: {
    menu: document.getElementById("friend-menu"),
    button: document.querySelector('.menu-item img[alt="Friend"]') || document.getElementById("open-friend-menu"),
    referralInput: document.getElementById("referral-link"),
    copyButton: document.getElementById("copy-referral"),
    shareButton: document.getElementById("share-link"),
    friendsCount: document.querySelector(".friends-count"),
  },

  init() {
    const tg = window.Telegram?.WebApp;
    const userId = tg.initDataUnsafe?.user?.id?.toString();
    if (!userId) return;

    const referralLink = `t.me/LuckyCubesbot?start=${userId}`;
    this.elements.referralInput.value = referralLink;

    this.elements.button.addEventListener("click", () => {
      UI.toggleMenu(this.elements.menu, true);
      this.updateFriendsCount();
    });

    this.elements.menu.addEventListener("click", (e) => {
      if (e.target === this.elements.menu) UI.toggleMenu(this.elements.menu, false);
    });

    this.elements.menu.style.overflowY = "auto";
    const img = this.elements.menu.querySelector("img");
    if (img) {
      img.style.position = "sticky";
      img.style.top = "0";
    }

    this.elements.copyButton.addEventListener("click", () => {
      Utils.copyToClipboard(referralLink);
      this.elements.copyButton.textContent = "Copied!";
      setTimeout(() => (this.elements.copyButton.textContent = "Copy"), 1500);
    });

    this.elements.shareButton.addEventListener("click", () => {
      const shareText = "Want to try your luck? Check out this game and join me!";
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`
      );
    });

    const referrerId = new URLSearchParams(window.location.search).get("start");
    if (referrerId && userId && referrerId !== userId) {
      API.fetch("/handle_referral", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, referrer_id: referrerId }),
      }).catch((error) => {});
    }

    this.updateFriendsCount();
  },

async updateFriendsCount() {
  const tg = window.Telegram?.WebApp;
  const userId = tg.initDataUnsafe?.user?.id?.toString();
  if (!userId || !this.elements.friendsCount) return;

  try {
    if (AppState.userData && typeof AppState.userData.rc !== "undefined") {
      this.elements.friendsCount.textContent = `${AppState.userData.rc} friends`;
    } else {
      const response = await API.fetch(`/get_user_data_new/${userId}`);
      if (response && typeof response.rc !== "undefined") {
        AppState.userData = { ...AppState.userData, rc: response.rc };
        this.elements.friendsCount.textContent = `${response.rc} friends`;
      } else {
        this.elements.friendsCount.textContent = "0 friends";
      }
    }
  } catch (error) {
    console.error("Failed to update friends count:", error);
    this.elements.friendsCount.textContent = "Error";
  }
},
};

// Инициализация частиц
const Particles = {
  init() {
    const canvas = document.getElementById(AppConfig.CANVAS_ID);
    if (!canvas) {
      console.error(
        `Canvas element with ID "${AppConfig.CANVAS_ID}" not found in DOM. Particle system will not initialize.`
      );
      return;
    }

    console.log("Canvas found:", canvas);
    const particleSystem = new ParticleSystem(canvas, {
      x: window.innerWidth,
      y: window.innerHeight,
    });
    particleSystem.init();
  },
};

// Возможные исходы для скинов
const outcomes = {
  banned: {
    default: [{ p: 1.0, s: "ban.gif", c: -1 }],
    rainbow: [{ p: 1.0, s: "ban.gif", c: -100 }],
  },
  classic: {
    default: [
      { p: 0.4, s: "pictures/cubics/классика/1-кубик.gif", c: 1 },
      { p: 0.25, s: "pictures/cubics/классика/2-кубик.gif", c: 2 },
      { p: 0.15, s: "pictures/cubics/классика/3-кубик.gif", c: 3 },
      { p: 0.1, s: "pictures/cubics/классика/4-кубик.gif", c: 4 },
      { p: 0.07, s: "pictures/cubics/классика/5-кубик.gif", c: 5 },
      { p: 0.03, s: "pictures/cubics/классика/6-кубик.gif", c: 6 },
    ],
    rainbow: [
      { p: 0.4, s: "pictures/cubics/классика/1-кубик.gif", c: 2 },
      { p: 0.25, s: "pictures/cubics/классика/2-кубик.gif", c: 4 },
      { p: 0.15, s: "pictures/cubics/классика/3-кубик.gif", c: 6 },
      { p: 0.1, s: "pictures/cubics/классика/4-кубик.gif", c: 8 },
      { p: 0.07, s: "pictures/cubics/классика/5-кубик.gif", c: 10 },
      { p: 0.03, s: "pictures/cubics/классика/6-кубик.gif", c: 12 },
    ],
  },
  negative: {
    default: [
      { p: 0.3, s: "pictures/cubics/негатив/1-кубик-негатив.gif", c: 2 },
      { p: 0.25, s: "pictures/cubics/негатив/2-кубик-негатив.gif", c: 3 },
      { p: 0.2, s: "pictures/cubics/негатив/3-кубик-негатив.gif", c: 4 },
      { p: 0.15, s: "pictures/cubics/негатив/4-кубик-негатив.gif", c: 5 },
      { p: 0.07, s: "pictures/cubics/негатив/5-кубик-негатив.gif", c: 6 },
      { p: 0.03, s: "pictures/cubics/негатив/6-кубик-негатив.gif", c: 7 },
    ],
    rainbow: [
      { p: 0.15, s: "pictures/cubics/негатив/1-кубик-негатив.gif", c: 4 },
      { p: 0.3, s: "pictures/cubics/негатив/2-кубик-негатив.gif", c: 6 },
      { p: 0.25, s: "pictures/cubics/негатив/3-кубик-негатив.gif", c: 8 },
      { p: 0.15, s: "pictures/cubics/негатив/4-кубик-негатив.gif", c: 10 },
      { p: 0.09, s: "pictures/cubics/негатив/5-кубик-негатив.gif", c: 12 },
      { p: 0.06, s: "pictures/cubics/негатив/6-кубик-негатив.gif", c: 14 },
    ],
  },
  Emerald: {
    default: [
      { p: 0.2, s: "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", c: 3 },
      { p: 0.2, s: "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", c: 4 },
      { p: 0.2, s: "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", c: 5 },
      { p: 0.2, s: "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", c: 6 },
      { p: 0.15, s: "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", c: 7 },
      { p: 0.05, s: "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", c: 8 },
    ],
    rainbow: [
      { p: 0.15, s: "pictures/cubics/перевернутый/1-кубик-перевернутый.gif", c: 6 },
      { p: 0.3, s: "pictures/cubics/перевернутый/2-кубик-перевернутый.gif", c: 8 },
      { p: 0.25, s: "pictures/cubics/перевернутый/3-кубик-перевернутый.gif", c: 10 },
      { p: 0.15, s: "pictures/cubics/перевернутый/4-кубик-перевернутый.gif", c: 12 },
      { p: 0.09, s: "pictures/cubics/перевернутый/5-кубик-перевернутый.gif", c: 14 },
      { p: 0.06, s: "pictures/cubics/перевернутый/6-кубик-перевернутый.gif", c: 16 },
    ],
  },
  Pixel: {
    default: [
      { p: 0.1, s: "pictures/cubics/пиксель/1-кубик-пиксель.gif", c: 10 },
      { p: 0.15, s: "pictures/cubics/пиксель/2-кубик-пиксель.gif", c: 11 },
      { p: 0.2, s: "pictures/cubics/пиксель/3-кубик-пиксель.gif", c: 12 },
      { p: 0.25, s: "pictures/cubics/пиксель/4-кубик-пиксель.gif", c: 13 },
      { p: 0.2, s: "pictures/cubics/пиксель/5-кубик-пиксель.gif", c: 14 },
      { p: 0.1, s: "pictures/cubics/пиксель/6-кубик-пиксель.gif", c: 15 },
    ],
    rainbow: [
      { p: 0.4, s: "pictures/cubics/пиксель/1-кубик-пиксель.gif", c: 20 },
      { p: 0.25, s: "pictures/cubics/пиксель/2-кубик-пиксель.gif", c: 22 },
      { p: 0.15, s: "pictures/cubics/пиксель/3-кубик-пиксель.gif", c: 24 },
      { p: 0.1, s: "pictures/cubics/пиксель/4-кубик-пиксель.gif", c: 26 },
      { p: 0.07, s: "pictures/cubics/пиксель/5-кубик-пиксель.gif", c: 28 },
      { p: 0.03, s: "pictures/cubics/пиксель/6-кубик-пиксель.gif", c: 30 },
    ],
  },
};

// Дополнительные изображения
const additionalImages = [
  "pictures/other png/$LUCU.png",
  "pictures/other png/Logo.png",
  "pictures/other png/friends-11.png",
  "pictures/other png/telegram-logo.png",
  "pictures/other png/друзья.png",
  "pictures/other png/квесты.png",
  "pictures/other png/магазин.png",
  "pictures/other png/таблица лидеров.png",
  "pictures/other png/телега.jpg",
];

// Формирование списка изображений для предзагрузки
const imageAssets = new Set();
Object.keys(outcomes).forEach((type) => {
  Object.keys(outcomes[type]).forEach((variant) => {
    outcomes[type][variant].forEach((outcome) => {
      imageAssets.add(outcome.s);
    });
  });
});
additionalImages.forEach((img) => imageAssets.add(img));
const imageAssetsArray = Array.from(imageAssets);

/**
 * Предзагружает изображения.
 * @param {string[]} imageUrls - Массив URL изображений
 * @returns {Promise<string[]>} - Массив загруженных URL
 */
async function preloadImages(imageUrls) {
  const promises = imageUrls.map((url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(url);
      img.onerror = () => {
        console.warn(`Failed to preload image: ${url}`);
        resolve(url);
      };
    });
  });
  return Promise.all(promises);
}

/**
 * Обновляет прогресс загрузки на экране.
 * @param {number} percentage - Процент загрузки
 */
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
}

/**
 * Предзагружает изображения с отображением прогресса.
 * @param {string[]} imageUrls - Массив URL изображений
 * @param {Function} onProgress - Коллбэк для обновления прогресса
 * @returns {Promise<void>}
 */
async function preloadImagesWithProgress(imageUrls, onProgress) {
  let loadedCount = 0;
  const total = imageUrls.length;

  const promises = imageUrls.map((url) => {
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
      };
    });
  });

  await Promise.all(promises);
  onProgress(100);
}

/**
 * Выполняет минимальную инициализацию приложения.
 * @param {Object} tg - Telegram WebApp объект
 * @returns {Promise<boolean>} - Успешность инициализации
 */
async function minimalInit(tg) {
  updateProgress(10);

  if (!tg) {
    console.error("Telegram WebApp API is not available");
    return false;
  }

  tg.ready();
  tg.expand();

  const userId = tg.initDataUnsafe?.user?.id?.toString();
  if (!userId) {
    console.error("User ID not found in Telegram initData");
    return false;
  }

  AppState.userId = userId;

  try {
    await refreshToken();
    if (!AppState.token) {
      throw new Error("Token was not set after refresh");
    }

    const userDataResponse = await API.fetch(`/get_user_data_new/${AppState.userId}`);
    if (!userDataResponse || userDataResponse.error) {
      throw new Error("Failed to load user data");
    }

    AppState.userData = userDataResponse;
    updateProgress(20);
    return true;
  } catch (error) {
    console.error("Minimal initialization error:", error);
    return false;
  }
}

/**
 * Выполняет полную инициализацию приложения.
 * @param {Object} tg - Telegram WebApp объект
 * @returns {Promise<void>}
 */
async function fullInit(tg) {
  updateProgress(30);
  await Utils.wait(100);
  console.log("DOM state before Game.init:", document.getElementById("cube"));

  const gameInitialized = Game.init();
  if (!gameInitialized) {
    console.error("Game initialization failed");
    console.log("Game failed to initialize. Please reload the app.");
    return;
  }

  Skins.init();
  Quests.init();
  Leaderboard.init();
  Friends.init();
  Particles.init();

  updateProgress(50);

  try {
    const userId = tg.initDataUnsafe?.user?.id?.toString();
    if (!userId) {
      throw new Error("User ID not found in Telegram init data");
    }
    AppState.userId = userId;

    const userDataResponse = await API.fetch(`/get_user_data_new/${userId}`, {
      signal: AbortSignal.timeout(1000),
      headers: {
        Authorization: `Bearer ${AppState.token}`,
        "X-Telegram-User-ID": userId,
      },
    });

    if (!userDataResponse || userDataResponse.error) {
      throw new Error("Failed to load user data: " + (userDataResponse?.error || "Unknown error"));
    }

    console.log("Received user data:", userDataResponse);
    AppState.userData = userDataResponse;

    Game.updateFromAppState();
    Game.elements.coinsDisplay.textContent = `${Utils.formatCoins(Game.state.coins)} $LUCU`;
    Game.elements.bestLuckDisplay.innerHTML =
      Game.state.bestLuck === 1001
        ? `Your Best MIN number: <span style="color: #F80000;">N/A</span>`
        : `Your Best MIN number: <span style="color: #F80000;">${Utils.formatNumber(Game.state.bestLuck)}</span>`;
    Skins.updateFromAppState();
    Friends.updateFriendsCount();

    const initialSrc = Game.getSkinConfig()[Game.state.equippedSkin].initial + `?t=${Date.now()}`;
    Game.elements.cube.src = initialSrc;
  } catch (error) {
    console.error("User data fetch error:", error);
    console.log("Failed to load user data. Please try again.");
    return;
  }

  updateProgress(60);

  const imageBaseUrl = "https://suspect147.github.io/LUCU/";
  const imageAssetsArrayWithBase = imageAssetsArray.map((img) => imageBaseUrl + img);

  await preloadImagesWithProgress(imageAssetsArrayWithBase, (progress) => {
    const adjustedProgress = 60 + progress * 0.4;
    updateProgress(Math.round(adjustedProgress));
  });

  await Quests.refreshUserData();
  await Quests.checkPendingQuests(AppState.userId);

  AppState.isInitialized = true;
  console.log("Full initialization completed successfully");
}

/**
 * Инициализирует приложение.
 * @returns {Promise<void>}
 */
async function initApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) {
    console.error("Telegram WebApp is not available");
    return;
  }

  try {
    if (tg.isVersionAtLeast && tg.isVersionAtLeast("7.7") && typeof tg.postEvent === "function") {
      tg.postEvent("web_app_setup_swipe_behavior", {
        allow_vertical_swipe: false,
      });
      console.log("Vertical swipes disabled via web_app_setup_swipe_behavior");
    } else {
      console.warn("Swipe behavior control not supported. Telegram version < 7.7 or postEvent unavailable.");
    }

    const minimalSuccess = await minimalInit(tg);
    if (!minimalSuccess) {
      console.log("Minimal initialization failed. Please reload the app.");
      return;
    }

    await loadConfig(tg);

    AppState.isPremium = tg.initDataUnsafe?.user?.is_premium || false;

    await fullInit(tg);

    if (AppState.userData.ban === "yes") {
      document.body.style.background = "linear-gradient(135deg, #000000, #ff0000)";
      document.getElementById("cube").src = "ban.gif";
      console.log("You are banned. Contact support for more information.");
    }
  } catch (error) {
    console.error("App initialization error:", error);
    console.log("Failed to initialize the app. Please reload the app.");
  }
}

// Слушатели событий
document.addEventListener("DOMContentLoaded", async () => {
  await initApp();

  const coinsDisplay = document.getElementById("coins") || document.getElementById("coins-display");
  if (coinsDisplay) {
    Utils.adjustFontSize(coinsDisplay);
    window.addEventListener("resize", () => Utils.adjustFontSize(coinsDisplay));
  }
});

window.addEventListener("load", () => {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen && AppState.isInitialized) {
    loadingScreen.style.display = "none";
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  console.log("An unexpected error occurred. Please reload the app.");
});
