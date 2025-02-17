window.onload = () => {
    const canvas = document.getElementById("particleCanvas");
    if (canvas) {
       const particleSystem = new ParticleSystem(canvas, {
          x: window.innerWidth,
          y: window.innerHeight
       });
       particleSystem.amount = 60; // Количество частиц
       particleSystem.diameter = {
          min: 2,
          max: 5
       }; // Размер частиц
       particleSystem.life = {
          min: 3,
          max: 7
       }; // Время жизни
       particleSystem.speed = {
          x: {
             min: -2,
             max: 2
          },
          y: {
             min: -2,
             max: 2
          }
       }; // Скорость
       particleSystem.init();
    }
 };
 
 window.addEventListener("resize", () => {
    const canvas = document.getElementById("particleCanvas");
    if (canvas) {
       canvas.width = window.innerWidth;
       canvas.height = window.innerHeight;
    }
 });
 
 window.onload = () => {
    const canvas = document.getElementById("particleCanvas");
    if (canvas) {
       const particleSystem = new ParticleSystem(canvas, {
          x: window.innerWidth,
          y: window.innerHeight
       });
       particleSystem.amount = 100;
       particleSystem.diameter = {
          min: 1,
          max: 3
       };
       particleSystem.life = {
          min: 3,
          max: 7
       };
       particleSystem.speed = {
          x: {
             min: -2,
             max: 2
          },
          y: {
             min: -2,
             max: 2
          }
       };
       particleSystem.init();
 
       // Добавляем обработчик изменения размера экрана
       window.addEventListener("resize", () => {
          const oldSize = {
             x: particleSystem.size.x,
             y: particleSystem.size.y
          };
          particleSystem.resize({
             x: window.innerWidth,
             y: window.innerHeight
          }, oldSize);
       });
    }
 };
 
 class Particle {
    constructor(id, parent) {
       this.parent = parent;
       this.id = id;
       this.position = {
          x: 0,
          y: 0
       };
       this.diameter = 0;
       this.life = 0;
       this.speed = {
          x: 0,
          y: 0
       };
       this.init();
    }
 
    init() {
       let interval = setInterval(() => {
          this.position.x += (60 * this.speed.x) / 1000;
          this.position.y -= (60 * this.speed.y) / 1000;
          this.life -= 1 / 60;
 
          if (this.life <= 0) {
             clearInterval(interval);
             this.parent.particles.delete(this.id);
          }
       }, 1000 / 60);
    }
 }
 
 class ParticleSystem {
    constructor(canvas, size) {
       this.canvas = canvas;
       this.size = size;
       this.lastId = 0;
       this.amount = 0;
       this.particles = new Map();
       this.diameter = {
          min: 0,
          max: 0
       };
       this.life = {
          min: 0,
          max: 0
       };
       this.speed = {
          x: {
             min: 0,
             max: 0
          },
          y: {
             min: 0,
             max: 0
          }
       };
 
       canvas.width = size.x;
       canvas.height = size.y;
    }
 
    static getRandomNumberInInterval(range) {
       return Math.random() * (range.max - range.min) + range.min;
    }
 
    createParticle() {
       let particle = new Particle(this.lastId.toString(), this);
       particle.position.x = ParticleSystem.getRandomNumberInInterval({
          min: 0,
          max: this.size.x
       });
       particle.position.y = ParticleSystem.getRandomNumberInInterval({
          min: 0,
          max: this.size.y
       });
       particle.diameter = ParticleSystem.getRandomNumberInInterval(this.diameter);
       particle.life = ParticleSystem.getRandomNumberInInterval(this.life);
       particle.speed.x = ParticleSystem.getRandomNumberInInterval(this.speed.x);
       particle.speed.y = ParticleSystem.getRandomNumberInInterval(this.speed.y);
 
       this.particles.set(this.lastId.toString(), particle);
       this.lastId++;
    }
 
    init() {
       let ctx = this.canvas.getContext("2d");
       ctx.fillStyle = "white";
 
       for (let i = 0; i < this.amount; i++) {
          this.createParticle();
       }
 
       setInterval(() => {
          if (this.particles.size < this.amount) {
             this.createParticle();
          }
       }, 1000 / 60);
 
       setInterval(() => {
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.particles.forEach((particle) => {
             ctx.beginPath();
             ctx.arc(particle.position.x, particle.position.y, particle.diameter / 2, 0, 2 * Math.PI);
             ctx.closePath();
             ctx.fill();
          });
       }, 1000 / 60);
    }
 
    resize(newSize, oldSize) {
       this.canvas.width = newSize.x;
       this.canvas.height = newSize.y;
       let ctx = this.canvas.getContext("2d");
       ctx.fillStyle = "white";
       this.particles.forEach((particle) => {
          particle.position.x = (particle.position.x / oldSize.x) * newSize.x;
          particle.position.y = (particle.position.y / oldSize.y) * newSize.y;
       });
 
       this.size = newSize;
    }
 }
 
 window.particlex = {
    ParticleSystem,
    Particle
 };
 
 const tg = window.Telegram.WebApp;
 const leaderboardList = document.getElementById("leaderboard-list");
 const mostLucuBtn = document.getElementById("most-lucu");
 const bestLuckBtn = document.getElementById("best-luck");
 
 mostLucuBtn.addEventListener("click", () => {
    mostLucuBtn.classList.add("active");
    bestLuckBtn.classList.remove("active");
    loadLeaderboardCoins(); // Загружаем лидерборд по монетам
 });
 
 bestLuckBtn.addEventListener("click", () => {
    bestLuckBtn.classList.add("active");
    mostLucuBtn.classList.remove("active");
    loadLeaderboardLuck(); // Загружаем лидерборд по удаче
 });
 
 const leaderboardMenu = document.getElementById('leaderboard-menu');
 const leaderboardButton = document.querySelector('.menu-item img[alt="Leaderboard"]');
 
 leaderboardButton.addEventListener('click', () => {
    leaderboardMenu.style.display = 'flex';
    // При открытии меню по умолчанию загружаем лидерборд по монетам
    loadLeaderboardCoins();
 });
 
 leaderboardMenu.addEventListener('click', (e) => {
    if (e.target === leaderboardMenu) {
       leaderboardMenu.style.display = 'none';
    }
 });
 
 // Загружаем лидерборд по монетам (от большего к меньшему)
 function loadLeaderboardCoins() {
    fetch("https://backend12-production-1210.up.railway.app/leaderboard_coins")
       .then(response => {
          if (!response.ok) {
             throw new Error("Ошибка сети: " + response.status);
          }
          return response.json();
       })
       .then(data => {
          leaderboardList.innerHTML = ""; // Очищаем список
          if (data.length === 0) {
             leaderboardList.innerHTML = '<li class="coming-soon">No data available</li>';
             return;
          }
          data.forEach((player, index) => {
             const li = document.createElement("li");
             li.classList.add("leaderboard-item");
             li.innerHTML = `${index + 1}. ${player.username} - ${formatCoins(player.coins)} $LUCU`;
             leaderboardList.appendChild(li);
          });
       })
       .catch(error => {
          console.error("Ошибка загрузки лидерборда по монетам:", error);
       });
 }
 
 // Загружаем лидерборд по удаче (от меньшей удачи к большей)
 function loadLeaderboardLuck() {
    fetch("https://backend12-production-1210.up.railway.app/leaderboard_luck")
       .then(response => {
          if (!response.ok) {
             throw new Error("Ошибка сети: " + response.status);
          }
          return response.json();
       })
       .then(data => {
          leaderboardList.innerHTML = ""; // Очищаем список
          if (data.length === 0) {
             leaderboardList.innerHTML = '<li class="coming-soon">No data available</li>';
             return;
          }
          data.forEach((player, index) => {
             let luckValue = parseFloat(player.min_luck);
             if (!isFinite(luckValue) || isNaN(luckValue)) {
                luckValue = "N/A"; // Заменяем некорректные значения
             } else {
                luckValue = formatNumber(luckValue); // Применяем форматирование
             }
 
             const li = document.createElement("li");
             li.classList.add("leaderboard-item");
             li.innerHTML = `${index + 1}. ${player.username} - ${luckValue}`;
             leaderboardList.appendChild(li);
          });
       })
       .catch(error => {
          console.error("Ошибка загрузки лидерборда по удаче:", error);
       });
 }
 
 
 const cube = document.getElementById("cube");
 const coinsDisplay = document.getElementById("coins");
 const bestLuckDisplay = document.getElementById("bestLuck");
 const progressBar = document.querySelector("#progressBar div");
 let coins = 0;
 let bestLuck = Infinity;
 let isAnimating = false;
 
 const userId = tg.initDataUnsafe?.user?.id;
 
 // Получаем никнейм: если username отсутствует, используем first_name
 const username = tg.initDataUnsafe?.user?.username || tg.initDataUnsafe?.user?.first_name;
 
 if (!userId) {
    console.error("User ID не найден в Telegram Web App");
 }
 
 function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
 }
 
 function formatCoins(amount) {
    if (amount >= 1_000_000_000) {
       return (amount / 1_000_000_000).toFixed(1) + "B";
    } else if (amount >= 1_000_000) {
       return (amount / 1_000_000).toFixed(1) + "M";
    } else if (amount >= 1_000) {
       return (amount / 1_000).toFixed(1) + "K";
    } else {
       return amount;
    }
 }
 
 function updateCoins(amount) {
    // Отправляем на сервер только приращение, не изменяя локальную переменную coins сразу
    sendCoinsToServer(amount).then(data => {
       // Ожидаем, что сервер вернёт объект с полем new_coins
       coins = data.new_coins; // обновляем глобальную переменную coins согласно серверу
       coinsDisplay.textContent = `${formatCoins(coins)} $LUCU`;
       // Обновляем UI, если нужно (например, если на сервере произошли другие изменения)
       updateGameData();
    });
 }
 
 function updateBestLuck() {
    const min = 0.0000000000001;
    const max = 1000;
    let randomLuck = Math.random() * (max - min) + min;
    if (bestLuck === null || randomLuck < bestLuck) {
       bestLuck = randomLuck;
       // Убираем мгновенное обновление отображения удачи:
       // const formattedLuck = formatNumber(bestLuck);
       // bestLuckDisplay.innerHTML = `Your Best MIN Luck: <span style="color: #F80000;">${formattedLuck}</span>`;
       // adjustFontSizeToFit(bestLuckDisplay);
 
       // Отправляем данные на сервер и после успешного ответа обновляем UI,
       // который отобразит удачу согласно данным из базы.
       sendLuckToServer().then(() => {
          updateGameData();
       });
    }
 }
 
 function updateGameData() {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
       console.error("User ID не найден");
       return;
    }
 
    fetch(`https://backend12-production-1210.up.railway.app/get_user_data/${userId}`)
       .then(response => {
          if (!response.ok) {
             throw new Error("Ошибка сети: " + response.status);
          }
          return response.json();
       })
       .then(data => {
          const {
             coins,
             min_luck,
             owned_skins = [],
             equipped_skin = "classic"
          } = data;
 
          coinsDisplay.textContent = `${formatCoins(coins)} $LUCU`;
 
          bestLuckDisplay.innerHTML = min_luck === Infinity ?
             `Your Best MIN Luck: <span style="color: #F80000;">N/A</span>` :
             `Your Best MIN Luck: <span style="color: #F80000;">${formatNumber(min_luck)}</span>`;
 
          console.log("Данные игры обновлены:", data);
 
          updateSkinsUI(owned_skins, equipped_skin);
 
          // Только если загруженный скин отличается от текущего — меняем его
          if (equippedSkin !== equipped_skin) {
             equipSkin(equipped_skin, false); // false = не отправлять сразу на сервер
          }
       })
       .catch(error => {
          console.error("Ошибка при получении данных с сервера:", error);
       });
 }
 
 function updateSkinsUI(ownedSkins, equippedSkin) {
    hasBoughtNegative = ownedSkins.includes("negative");
    hasBoughtEmerald = ownedSkins.includes("Emerald");
 
    // Обновляем кнопки в зависимости от купленных скинов
    buyNegativeButton.textContent = hasBoughtNegative ?
       (equippedSkin === "negative" ? "Equipped" : "Equip") :
       "Buy (599)";
 
    buyEmeraldButton.textContent = hasBoughtEmerald ?
       (equippedSkin === "Emerald" ? "Equipped" : "Equip") :
       "Buy (1100)";
 
    equipClassicButton.textContent = equippedSkin === "classic" ? "Equipped" : "Equip";
 }
 
 // Вызываем обновление данных при загрузке страницы
 updateGameData();
 
 function sendCoinsToServer(amount) {
    if (!userId) {
       console.error("User ID не найден");
       return Promise.reject("User ID не найден");
    }
    // Определяем username, если он ещё не объявлен в глобальной области
    const username =
       window.Telegram.WebApp.initDataUnsafe?.user?.username ||
       window.Telegram.WebApp.initDataUnsafe?.user?.first_name ||
       "Unknown"; // на случай, если ни одно из полей не задано
 
    return fetch("https://backend12-production-1210.up.railway.app/update_coins", {
          method: "POST",
          headers: {
             "Content-Type": "application/json",
          },
          // Отправляем приращение монет и имя пользователя
          body: JSON.stringify({
             user_id: userId,
             username: username,
             coins: amount
          })
       })
       .then(response => {
          if (!response.ok) {
             throw new Error(`Ошибка сети: ${response.status}`);
          }
          return response.json();
       })
       .then(data => {
          console.log("Монеты обновлены на сервере", data);
          return data; // data должна содержать новое значение монет, например, data.new_coins
       })
       .catch(error => {
          console.error("Ошибка при отправке монет на сервер:", error);
          throw error;
       });
 }
 
 
 function sendLuckToServer() {
    if (!userId) {
       console.error("User ID не найден");
       return Promise.reject("User ID не найден");
    }
 
    return fetch("https://backend12-production-1210.up.railway.app/update_luck", {
          method: "POST",
          headers: {
             "Content-Type": "application/json",
          },
          // Отправляем удачу и имя пользователя
          body: JSON.stringify({
             user_id: userId,
             username: username,
             luck: bestLuck
          })
       })
       .then(response => response.json())
       .then(data => {
          console.log("Удача обновлена на сервере", data);
          return data;
       })
       .catch(error => {
          console.error("Ошибка при отправке удачи на сервер:", error);
          throw error;
       });
 }
 
 window.addEventListener("load", updateGameData);
 
 function formatNumber(number) {
    if (number >= 1) {
       return number.toFixed(4);
    }
    return number.toPrecision(4);
 }
 
 function adjustFontSizeToFit(element) {
    const parentWidth = element.parentElement.offsetWidth;
    let fontSize = 35;
    element.style.fontSize = `${fontSize}px`;
    while (element.scrollWidth > parentWidth && fontSize > 5) {
       fontSize -= 1;
       element.style.fontSize = `${fontSize}px`;
    }
 }
 
 function startProgress(duration) {
    progressBar.style.transition = `width ${duration}s linear`;
    progressBar.style.width = "100%";
    setTimeout(() => {
       progressBar.style.transition = "none";
       progressBar.style.width = "0%";
    }, duration * 1000);
 }
 const skinsMenu = document.getElementById('skins-menu');
 const skinsButton = document.querySelector('.menu-item img[alt="Skins"]');
 const buyNegativeButton = document.getElementById('buy-negative');
 const buyEmeraldButton = document.getElementById('buy-Emerald');
 const equipClassicButton = document.getElementById('equip-classic');
 let hasBoughtNegative = false;
 let hasBoughtEmerald = false;
 let equippedSkin = 'classic';
 
 // Предполагаем, что глобальные переменные userId, coins и функция updateCoins() уже определены
 
 skinsButton.addEventListener('click', () => {
    skinsMenu.style.display = 'flex';
 });
 
 skinsMenu.addEventListener('click', (e) => {
    if (e.target === skinsMenu) {
       skinsMenu.style.display = 'none';
    }
 });
 
 buyNegativeButton.addEventListener('click', () => {
    if (!hasBoughtNegative) {
       if (coins >= 5000) {
          // Отправляем запрос на сервер для покупки "negative" скина
          fetch('https://backend12-production-1210.up.railway.app/buy_skin', {
                method: 'POST',
                headers: {
                   'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                   user_id: userId,
                   skin_type: 'negative',
                   cost: 5000
                })
             })
             .then(response => response.json())
             .then(data => {
                if (data.message && data.message.startsWith("✅")) {
                   // Обновляем локальное значение монет на основе ответа сервера
                   coins = data.new_coins;
                   updateCoins(0); // Обновляем UI
                   hasBoughtNegative = true;
                   buyNegativeButton.textContent = 'Equip';
                } else {
                   alert("Purchase failed: " + data.message);
                }
             })
             .catch(err => {
                console.error("Error purchasing negative skin:", err);
             });
       } else {
          alert("Not enough coins!");
       }
    } else {
       equipSkin('negative');
    }
 });
 
 buyEmeraldButton.addEventListener('click', () => {
    if (!hasBoughtEmerald) {
       if (coins >= 10000) {
          // Отправляем запрос на сервер для покупки "Emerald" скина
          fetch('https://backend12-production-1210.up.railway.app/buy_skin', {
                method: 'POST',
                headers: {
                   'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                   user_id: userId,
                   skin_type: 'Emerald',
                   cost: 10000
                })
             })
             .then(response => response.json())
             .then(data => {
                if (data.message && data.message.startsWith("✅")) {
                   // Обновляем локальное значение монет на основе ответа сервера
                   coins = data.new_coins;
                   updateCoins(0);
                   hasBoughtEmerald = true;
                   buyEmeraldButton.textContent = 'Equip';
                } else {
                   alert("Purchase failed: " + data.message);
                }
             })
             .catch(err => {
                console.error("Error purchasing Emerald skin:", err);
             });
       } else {
          alert("Not enough coins!");
       }
    } else {
       equipSkin('Emerald');
    }
 });
 
 equipClassicButton.addEventListener('click', () => {
    equipSkin('classic');
 });
 
 function equipSkin(type, sendToServer = true) {
    if (equippedSkin === type) return; // Предотвращаем лишние запросы
 
    equippedSkin = type;
    cube.src = type === "negative" ?
       "pictures/cubics/негатив/начальный-кубик-негатив.gif" :
       type === "Emerald" ?
       "pictures/cubics/перевернутый/начальный-кубик-перевернутый.gif" :
       "pictures/cubics/классика/начальный-кубик.gif";
 
    buyNegativeButton.textContent = hasBoughtNegative ? (type === "negative" ? "Equipped" : "Equip") : "Buy (599)";
    buyEmeraldButton.textContent = hasBoughtEmerald ? (type === "Emerald" ? "Equipped" : "Equip") : "Buy (1100)";
    equipClassicButton.textContent = type === "classic" ? "Equipped" : "Equip";
 
    if (sendToServer) {
       sendSkinToServer(type);
    }
 }
 
 function sendSkinToServer(skinType) {
    fetch('https://backend12-production-1210.up.railway.app/update_skin', {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json'
          },
          body: JSON.stringify({
             user_id: userId,
             skin_type: skinType
          })
       })
       .then(response => response.json())
       .then(data => {
          console.log("Skin updated on server:", data);
       })
       .catch(error => {
          console.error("Error updating skin on server:", error);
       });
 }
 
 
 function rollCube() {
    let isRainbow = Math.random() < 0.2;
    document.body.className = isRainbow ? 'pink-gradient' : 'gray-gradient';
    if (equippedSkin === 'classic') {
       cube.src = isRainbow ? 'pictures/cubics/классика/супер-начальный-кубик.gif' : 'pictures/cubics/классика/начальный-кубик.gif';
    } else if (equippedSkin === 'negative') {
       cube.src = isRainbow ? 'pictures/cubics/негатив/супер-начальный-кубик-негатив.gif' : 'pictures/cubics/негатив/начальный-кубик-негатив.gif';
    } else if (equippedSkin === 'Emerald') {
       cube.src = isRainbow ? 'pictures/cubics/перевернутый/супер-начальный-кубик-перевернутый.gif' : 'pictures/cubics/перевернутый/начальный-кубик-перевернутый.gif';
    }
    cube.onclick = async () => {
       if (isAnimating) return;
       isAnimating = true;
       startProgress(3);
       let random = Math.random() * 100;
       let outcome;
       if (isRainbow && equippedSkin === 'negative') {
          cube.src = 'pictures/cubics/негатив/супер-начальный-кубик-негатив.gif'; // Установим начальный скин
          if (random < 15) outcome = {
             src: 'pictures/cubics/негатив/1-кубик-негатив.gif',
             coins: 4
          };
          else if (random < 45) outcome = {
             src: 'pictures/cubics/негатив/2-кубик-негатив.gif',
             coins: 6
          };
          else if (random < 70) outcome = {
             src: 'pictures/cubics/негатив/3-кубик-негатив.gif',
             coins: 8
          };
          else if (random < 85) outcome = {
             src: 'pictures/cubics/негатив/4-кубик-негатив.gif',
             coins: 10
          };
          else if (random < 94) outcome = {
             src: 'pictures/cubics/негатив/5-кубик-негатив.gif',
             coins: 12
          };
          else outcome = {
             src: 'pictures/cubics/негатив/6-кубик-негатив.gif',
             coins: 14
          };
       } else if (equippedSkin === 'negative') {
          cube.src = 'pictures/cubics/негатив/начальный-кубик-негатив.gif'; // Установим начальный скин
          if (random < 40) outcome = {
             src: 'pictures/cubics/негатив/1-кубик-негатив.gif',
             coins: 2
          };
          else if (random < 65) outcome = {
             src: 'pictures/cubics/негатив/2-кубик-негатив.gif',
             coins: 3
          };
          else if (random < 80) outcome = {
             src: 'pictures/cubics/негатив/3-кубик-негатив.gif',
             coins: 4
          };
          else if (random < 90) outcome = {
             src: 'pictures/cubics/негатив/4-кубик-негатив.gif',
             coins: 5
          };
          else if (random < 97) outcome = {
             src: 'pictures/cubics/негатив/5-кубик-негатив.gif',
             coins: 6
          };
          else outcome = {
             src: 'pictures/cubics/негатив/6-кубик-негатив.gif',
             coins: 7
          };
       } else if (isRainbow && equippedSkin === 'Emerald') {
          cube.src = 'pictures/cubics/перевернутый/супер-начальный-кубик-перевернутый.gif'; // Установим начальный скин
          if (random < 15) outcome = {
             src: 'pictures/cubics/перевернутый/1-кубик-перевернутый.gif',
             coins: 6
          };
          else if (random < 45) outcome = {
             src: 'pictures/cubics/перевернутый/2-кубик-перевернутый.gif',
             coins: 8
          };
          else if (random < 70) outcome = {
             src: 'pictures/cubics/перевернутый/3-кубик-перевернутый.gif',
             coins: 10
          };
          else if (random < 85) outcome = {
             src: 'pictures/cubics/перевернутый/4-кубик-перевернутый.gif',
             coins: 12
          };
          else if (random < 94) outcome = {
             src: 'pictures/cubics/перевернутый/5-кубик-перевернутый.gif',
             coins: 14
          };
          else outcome = {
             src: 'pictures/cubics/перевернутый/6-кубик-перевернутый.gif',
             coins: 16
          };
       } else if (equippedSkin === 'Emerald') {
          cube.src = 'pictures/cubics/перевернутый/начальный-кубик-перевернутый.gif'; // Установим начальный скин
          if (random < 40) outcome = {
             src: 'pictures/cubics/перевернутый/1-кубик-перевернутый.gif',
             coins: 3
          };
          else if (random < 65) outcome = {
             src: 'pictures/cubics/перевернутый/2-кубик-перевернутый.gif',
             coins: 4
          };
          else if (random < 80) outcome = {
             src: 'pictures/cubics/перевернутый/3-кубик-перевернутый.gif',
             coins: 5
          };
          else if (random < 90) outcome = {
             src: 'pictures/cubics/перевернутый/4-кубик-перевернутый.gif',
             coins: 6
          };
          else if (random < 97) outcome = {
             src: 'pictures/cubics/перевернутый/5-кубик-перевернутый.gif',
             coins: 7
          };
          else outcome = {
             src: 'pictures/cubics/перевернутый/6-кубик-перевернутый.gif',
             coins: 8
          };
       } else if (isRainbow) {
          cube.src = 'pictures/cubics/классика/супер-начальный-кубик.gif'; // Установим начальный скин
          if (random < 40) outcome = {
             src: 'pictures/cubics/классика/1-кубик.gif',
             coins: 2
          };
          else if (random < 65) outcome = {
             src: 'pictures/cubics/классика/2-кубик.gif',
             coins: 4
          };
          else if (random < 80) outcome = {
             src: 'pictures/cubics/классика/3-кубик.gif',
             coins: 6
          };
          else if (random < 90) outcome = {
             src: 'pictures/cubics/классика/4-кубик.gif',
             coins: 8
          };
          else if (random < 97) outcome = {
             src: 'pictures/cubics/классика/5-кубик.gif',
             coins: 10
          };
          else outcome = {
             src: 'pictures/cubics/классика/6-кубик.gif',
             coins: 12
          };
       } else {
          cube.src = 'pictures/cubics/классика/начальный-кубик.gif'; // Установим начальный скин
          if (random < 40) outcome = {
             src: 'pictures/cubics/классика/1-кубик.gif',
             coins: 1
          };
          else if (random < 65) outcome = {
             src: 'pictures/cubics/классика/2-кубик.gif',
             coins: 2
          };
          else if (random < 80) outcome = {
             src: 'pictures/cubics/классика/3-кубик.gif',
             coins: 3
          };
          else if (random < 90) outcome = {
             src: 'pictures/cubics/классика/4-кубик.gif',
             coins: 4
          };
          else if (random < 97) outcome = {
             src: 'pictures/cubics/классика/5-кубик.gif',
             coins: 5
          };
          else outcome = {
             src: 'pictures/cubics/классика/6-кубик.gif',
             coins: 6
          };
       }
       cube.src = outcome.src;
       await new Promise((resolve) => setTimeout(resolve, 2000));
       updateBestLuck();
       updateCoins(outcome.coins);
       setTimeout(() => {
          rollCube();
          isAnimating = false;
       }, 1150);
    };
 }
 rollCube();
 // Подключение TON Connect
 const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://suspect147.github.io/LUCU/manifest.json',
    buttonRootId: 'ton-connect'
 });
 
 tonConnectUI.uiOptions = {
    twaReturnUrl: 'https://t.me/LuckyCubesbot'
 };
 
 // Работа с профилем
 const profileButton = document.getElementById("profile-button");
 const profileMenu = document.getElementById("profile-menu");
 const profileName = document.getElementById("profile-name");
 
 const userName = tg.initDataUnsafe?.user?.username || "NoName"; // Используем tg
 profileName.textContent = `Hello, ${userName}`;
 
 profileButton.addEventListener("click", () => {
    profileMenu.style.display = "flex";
 });
 
 profileMenu.addEventListener("click", (e) => {
    if (e.target === profileMenu) {
       profileMenu.style.display = "none";
    }
 });
 
 // Применяем режим полного экрана для мини-приложения
 window.Telegram.WebApp.expand();
 window.Telegram.WebApp.requestFullscreen(); // Используем requestFullscreen()
 
 // Настройка темы
 tg.expand(); // Открыть приложение на весь экран
 
 document.addEventListener("DOMContentLoaded", async () => {
    const friendMenu = document.getElementById("friend-menu");
    const friendButton = document.querySelector('.menu-item img[alt="Friend"]') || document.getElementById("open-friend-menu");
    const referralInput = document.getElementById("referral-link");
    const copyButton = document.getElementById("copy-referral");
    const shareButton = document.getElementById("share-link");
    const friendsCountElement = document.querySelector(".friends-count");

    const telegram = window.Telegram?.WebApp;
    const userId = telegram?.initDataUnsafe?.user?.id || "unknown";
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get("start");

    if (referrerId && referrerId !== userId) {
        try {
            const response = await fetch("https://backend12-production-1210.up.railway.app/update_coins", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: userId,
                    coins: 100
                })
            });
            const result = await response.json();
            console.log("Referral bonus added:", result);
        } catch (error) {
            console.error("Failed to update coins:", error);
        }
    }

    async function updateFriendsCount() {
        try {
            const response = await fetch(`https://backend12-production-1210.up.railway.app/get_referral_count/${userId}`);
            const data = await response.json();
            friendsCountElement.textContent = `Your friends: ${data.referral_count}`;
        } catch (error) {
            console.error("Failed to fetch referral count:", error);
            friendsCountElement.textContent = "Your friends: 0";
        }
    }

    if (friendMenu && friendButton && referralInput && copyButton && friendsCountElement && shareButton) {
        const referralLink = `t.me/LuckyCubesbot?start=${userId}`;
        referralInput.value = referralLink;

        friendButton.addEventListener("click", () => {
            friendMenu.style.display = "flex";
            updateFriendsCount();
        });
        friendMenu.addEventListener('click', (e) => {
            if (e.target === friendMenu) {
                friendMenu.style.display = 'none';
            }
         });
        copyButton.addEventListener("click", () => {
            copyToClipboard(referralInput.value);
        });
shareButton.addEventListener("click", () => {
    const shareText = "Want to try your luck? Check out this game and join me!";
    const telegramLink = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
    
    // Открытие ссылки в Telegram
    telegram?.openTelegramLink(telegramLink);
});




        function copyToClipboard(text) {
            fallbackCopy(text);
        }

        function fallbackCopy(text) {
            const tempTextArea = document.createElement("textarea");
            tempTextArea.value = text;
            tempTextArea.style.position = "absolute";
            tempTextArea.style.left = "-9999px";
            document.body.appendChild(tempTextArea);
            tempTextArea.select();

            try {
                if (document.execCommand("copy")) {
                    showCopySuccess();
                } else {
                    throw new Error("execCommand failed");
                }
            } catch (err) {
                console.error("Fallback copy failed:", err);
            }

            document.body.removeChild(tempTextArea);
        }

        function showCopySuccess() {
            copyButton.textContent = "Copied!";
            setTimeout(() => {
                copyButton.textContent = "Copy";
            }, 1500);
        }
    }
});
