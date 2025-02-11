fetch("https://semga-production.up.railway.app/validate", {
  method: "POST",
  headers: {
      "Content-Type": "application/json"
  },
  body: JSON.stringify({ initData: window.Telegram.WebApp.initData })
})
.then(response => response.json())
.then(data => {
  if (data.success) {
      localStorage.setItem("user_id", data.user_data.id);
      coins = data.user_data.points;
      coinsDisplay.textContent = `${formatCoins(coins)} $LUCU`;
  } else {
      console.error("Ошибка валидации");
  }
});

const leaderboardList = document.getElementById('leaderboard-list');
   const mostLucuBtn = document.getElementById('most-lucu');
   const bestLuckBtn = document.getElementById('best-luck');
   mostLucuBtn.addEventListener('click', () => {
      mostLucuBtn.classList.add('active');
      bestLuckBtn.classList.remove('active');
   });
   
   bestLuckBtn.addEventListener('click', () => {
      bestLuckBtn.classList.add('active');
      mostLucuBtn.classList.remove('active');
   });

         const cube = document.getElementById('cube');
         const coinsDisplay = document.getElementById('coins');
         const bestLuckDisplay = document.getElementById('bestLuck');
         const progressBar = document.querySelector('#progressBar div');
         let coins = 0;
         let bestLuck = Infinity;
         let isAnimating = false;
         function getRandomInt(min, max) {
             return Math.floor(Math.random() * (max - min + 1)) + min;
         }
         function formatCoins(amount) {
    if (amount >= 1_000_000_000) {
        return (amount / 1_000_000_000).toFixed(1) + 'B';
    } else if (amount >= 1_000_000) {
        return (amount / 1_000_000).toFixed(1) + 'M';
    } else if (amount >= 1_000) {
        return (amount / 1_000).toFixed(1) + 'K';
    } else {
        return amount;
    }
}
function sendCoinsToServer(amount) {
    fetch("https://semga-production.up.railway.app/update_points", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: localStorage.getItem("user_id"),
            delta: amount
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Обновляем локальные монеты на случай, если сервер вернул изменённое значение
            coins = data.user_data.points;
            coinsDisplay.textContent = `${formatCoins(coins)} $LUCU`;
        } else {
            console.error("Ошибка обновления монет на сервере:", data.message);
        }
    })
    .catch(error => console.error("Ошибка:", error));
}

function updateCoins(amount) {
    coins += amount;
    coinsDisplay.textContent = `${formatCoins(coins)} $LUCU`;
    sendCoinsToServer(amount);
}




         function updateBestLuck() {
             const min = 0.0000000000001;
             const max = 1000;
             let randomLuck = Math.random() * (max - min) + min;
             if (bestLuck === null || randomLuck < bestLuck) {
                 bestLuck = randomLuck;
                 const formattedLuck = formatNumber(bestLuck);
                 bestLuckDisplay.innerHTML = `Your Best MIN Luck: <span style="color: #F80000;">${formattedLuck}</span>`;
                 adjustFontSizeToFit(bestLuckDisplay);
             }
         }
         function formatNumber(number) {
         if (number >= 1) {
           return number.toFixed(4); // Форматируем с 4 знаками после запятой, если число >= 1
         }
         return number.toPrecision(4); // Форматируем с 4 значащими цифрами, если число < 1
         }
         
         
         
         const skinsMenu = document.getElementById('skins-menu');
         const skinsButton = document.querySelector('.menu-item img[alt="Skins"]');
         const buyNegativeButton = document.getElementById('buy-negative');
         const buyEmeraldButton = document.getElementById('buy-Emerald');
         const equipClassicButton = document.getElementById('equip-classic');
         let hasBoughtNegative = false;
         let hasBoughtEmerald = false;
         let equippedSkin = 'classic';
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
                 if (coins >= 599) {
                     coins -= 599;
                     updateCoins(0); // Покупка Negative Skin
                     hasBoughtNegative = true;
                     buyNegativeButton.textContent = 'Equip';
                 }
             } else {
                 equipSkin('negative');
             }
         });
         buyEmeraldButton.addEventListener('click', () => {
             if (!hasBoughtEmerald) {
                 if (coins >= 1100) {
                     coins -= 1100;
                     updateCoins(0); // Покупка Emerald Skin
                     hasBoughtEmerald = true;
                     buyEmeraldButton.textContent = 'Equip';
                 }
             } else {
                 equipSkin('Emerald');
             }
         });
         equipClassicButton.addEventListener('click', () => {
             equipSkin('classic');
         });
         function equipSkin(type) {
             equippedSkin = type;
             if (type === 'negative') {
                 cube.src = 'pictures/cubics/негатив/начальный-кубик-негатив.gif';
             } else if (type === 'Emerald') {
                 cube.src = 'pictures/cubics/перевернутый/начальный-кубик-перевернутый.gif';
             } else {
                 cube.src = 'pictures/cubics/классика/начальный-кубик.gif';
             }
             if (hasBoughtNegative) {
                 buyNegativeButton.textContent = type === 'negative' ? 'Equipped' : 'Equip';
             }
             if (hasBoughtEmerald) {
                 buyEmeraldButton.textContent = type === 'Emerald' ? 'Equipped' : 'Equip';
             }
             equipClassicButton.textContent = type === 'classic' ? 'Equipped' : 'Equip';
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
             progressBar.style.width = '100%';
             setTimeout(() => {
                 progressBar.style.transition = 'none';
                 progressBar.style.width = '0%';
             }, duration * 1000);
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
         if (isRainbow && equippedSkin === 'negative'){
           cube.src = 'pictures/cubics/негатив/супер-начальный-кубик-негатив.gif';  // Установим начальный скин
           if (random < 15) outcome = { src: 'pictures/cubics/негатив/1-кубик-негатив.gif', coins: 2 };
           else if (random < 45) outcome = { src: 'pictures/cubics/негатив/2-кубик-негатив.gif', coins: 4 };
           else if (random < 70) outcome = { src: 'pictures/cubics/негатив/3-кубик-негатив.gif', coins: 6 };
           else if (random < 85) outcome = { src: 'pictures/cubics/негатив/4-кубик-негатив.gif', coins: 8 };
           else if (random < 94) outcome = { src: 'pictures/cubics/негатив/5-кубик-негатив.gif', coins: 10 };
           else outcome = { src: 'pictures/cubics/негатив/6-кубик-негатив.gif', coins: 12 };
         } 
           else if (equippedSkin === 'negative') {
           cube.src = 'pictures/cubics/негатив/начальный-кубик-негатив.gif';  // Установим начальный скин
           if (random < 40) outcome = { src: 'pictures/cubics/негатив/1-кубик-негатив.gif', coins: 1 };
           else if (random < 65) outcome = { src: 'pictures/cubics/негатив/2-кубик-негатив.gif', coins: 2 };
           else if (random < 80) outcome = { src: 'pictures/cubics/негатив/3-кубик-негатив.gif', coins: 3 };
           else if (random < 90) outcome = { src: 'pictures/cubics/негатив/4-кубик-негатив.gif', coins: 4 };
           else if (random < 97) outcome = { src: 'pictures/cubics/негатив/5-кубик-негатив.gif', coins: 5 };
           else outcome = { src: 'pictures/cubics/негатив/6-кубик-негатив.gif', coins: 6 };
         } 
           else if (isRainbow && equippedSkin === 'Emerald'){
           cube.src = 'pictures/cubics/перевернутый/супер-начальный-кубик-перевернутый.gif';  // Установим начальный скин
           if (random < 15) outcome = { src: 'pictures/cubics/перевернутый/1-кубик-перевернутый.gif', coins: 2 };
           else if (random < 45) outcome = { src: 'pictures/cubics/перевернутый/2-кубик-перевернутый.gif', coins: 4 };
           else if (random < 70) outcome = { src: 'pictures/cubics/перевернутый/3-кубик-перевернутый.gif', coins: 6 };
           else if (random < 85) outcome = { src: 'pictures/cubics/перевернутый/4-кубик-перевернутый.gif', coins: 8 };
           else if (random < 94) outcome = { src: 'pictures/cubics/перевернутый/5-кубик-перевернутый.gif', coins: 10 };
           else outcome = { src: 'pictures/cubics/перевернутый/6-кубик-перевернутый.gif', coins: 12 };
         } 
           else if (equippedSkin === 'Emerald') {
           cube.src = 'pictures/cubics/перевернутый/начальный-кубик-перевернутый.gif';  // Установим начальный скин
           if (random < 40) outcome = { src: 'pictures/cubics/перевернутый/1-кубик-перевернутый.gif', coins: 1 };
           else if (random < 65) outcome = { src: 'pictures/cubics/перевернутый/2-кубик-перевернутый.gif', coins: 2 };
           else if (random < 80) outcome = { src: 'pictures/cubics/перевернутый/3-кубик-перевернутый.gif', coins: 3 };
           else if (random < 90) outcome = { src: 'pictures/cubics/перевернутый/4-кубик-перевернутый.gif', coins: 4 };
           else if (random < 97) outcome = { src: 'pictures/cubics/перевернутый/5-кубик-перевернутый.gif', coins: 5 };
           else outcome = { src: 'pictures/cubics/перевернутый/6-кубик-перевернутый.gif', coins: 6 };
         } 
         else if (isRainbow)  {
          cube.src = 'pictures/cubics/классика/супер-начальный-кубик.gif';  // Установим начальный скин
           if (random < 40) outcome = { src: 'pictures/cubics/классика/1-кубик.gif', coins: 2 };
           else if (random < 65) outcome = { src: 'pictures/cubics/классика/2-кубик.gif', coins: 4 };
           else if (random < 80) outcome = { src: 'pictures/cubics/классика/3-кубик.gif', coins: 6 };
           else if (random < 90) outcome = { src: 'pictures/cubics/классика/4-кубик.gif', coins: 8 };
           else if (random < 97) outcome = { src: 'pictures/cubics/классика/5-кубик.gif', coins: 10 };
           else outcome = { src: 'pictures/cubics/классика/6-кубик.gif', coins: 12 };
         } 
         else {
          cube.src = 'pictures/cubics/классика/начальный-кубик.gif';  // Установим начальный скин
           if (random < 40) outcome = { src: 'pictures/cubics/классика/1-кубик.gif', coins: 1 };
           else if (random < 65) outcome = { src: 'pictures/cubics/классика/2-кубик.gif', coins: 2 };
           else if (random < 80) outcome = { src: 'pictures/cubics/классика/3-кубик.gif', coins: 3 };
           else if (random < 90) outcome = { src: 'pictures/cubics/классика/4-кубик.gif', coins: 4 };
           else if (random < 97) outcome = { src: 'pictures/cubics/классика/5-кубик.gif', coins: 5 };
           else outcome = { src: 'pictures/cubics/классика/6-кубик.gif', coins: 6 };
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
         const leaderboardMenu = document.getElementById('leaderboard-menu');
         const leaderboardButton = document.querySelector('.menu-item img[alt="Leaderboard"]');
         leaderboardButton.addEventListener('click', () => {
         leaderboardMenu.style.display = 'flex';
         });
         leaderboardMenu.addEventListener('click', (e) => {
         if (e.target === leaderboardMenu) {
             leaderboardMenu.style.display = 'none';
         }
         });
         const questsMenu = document.getElementById('quests-menu');
         const questsButton = document.querySelector('.menu-item img[alt="Quests"]');
         questsButton.addEventListener('click', () => {
         questsMenu.style.display = 'flex';
         });
         questsMenu.addEventListener('click', (e) => {
         if (e.target === questsMenu) {
           questsMenu.style.display = 'none';
         }
         });
         document.addEventListener("DOMContentLoaded", () => {
         const friendMenu = document.getElementById('friend-menu');
         const friendButton = document.querySelector('.menu-item img[alt="Friend"]');
         
         if (friendMenu && friendButton) {
         friendButton.addEventListener('click', () => {
         friendMenu.style.display = 'flex';
         });
         
         friendMenu.addEventListener('click', (e) => {
         if (e.target === friendMenu) {
           friendMenu.style.display = 'none';
         }
         });
         }
         });
         
         const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
         manifestUrl: 'https://suspect147.github.io/LUCU/manifest.json',
         buttonRootId: 'ton-connect'
         });
         tonConnectUI.uiOptions = {
         twaReturnUrl: 'https://t.me/LuckyCubesbot'
         };
         const profileButton = document.getElementById("profile-button");
         const profileMenu = document.getElementById("profile-menu");
         const profileName = document.getElementById("profile-name");
         
         const tg = window.Telegram.WebApp;
         const userName = tg.initDataUnsafe?.user?.username || "NoName";
         profileName.textContent = `Hello, ${userName}`;
         profileButton.addEventListener("click", () => {
         profileMenu.style.display = "flex";
         });
         profileMenu.addEventListener("click", (e) => {
         if (e.target === profileMenu) {
           profileMenu.style.display = "none";
         }
         });
         window.onload = () => {
               const canvas = document.getElementById("particleCanvas");
               if (canvas) {
                   const particleSystem = new ParticleSystem(canvas, { x: window.innerWidth, y: window.innerHeight });
                   particleSystem.amount = 60; // Количество частиц
                   particleSystem.diameter = { min: 2, max: 5 }; // Размер частиц
                   particleSystem.life = { min: 3, max: 7 }; // Время жизни
                   particleSystem.speed = { x: { min: -2, max: 2 }, y: { min: -2, max: 2 } }; // Скорость
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
           const particleSystem = new ParticleSystem(canvas, { x: window.innerWidth, y: window.innerHeight });
           particleSystem.amount = 100;
           particleSystem.diameter = { min: 1, max: 3 };
           particleSystem.life = { min: 3, max: 7 };
           particleSystem.speed = { x: { min: -2, max: 2 }, y: { min: -2, max: 2 } };
           particleSystem.init();
         
           // Добавляем обработчик изменения размера экрана
           window.addEventListener("resize", () => {
               const oldSize = { x: particleSystem.size.x, y: particleSystem.size.y };
               particleSystem.resize({ x: window.innerWidth, y: window.innerHeight }, oldSize);
           });
         }
         };
         
         class Particle {
         constructor(id, parent) {
           this.parent = parent;
           this.id = id;
           this.position = { x: 0, y: 0 };
           this.diameter = 0;
           this.life = 0;
           this.speed = { x: 0, y: 0 };
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
           this.diameter = { min: 0, max: 0 };
           this.life = { min: 0, max: 0 };
           this.speed = { x: { min: 0, max: 0 }, y: { min: 0, max: 0 } };
         
           canvas.width = size.x;
           canvas.height = size.y;
         }
         
         static getRandomNumberInInterval(range) {
           return Math.random() * (range.max - range.min) + range.min;
         }
         
         createParticle() {
           let particle = new Particle(this.lastId.toString(), this);
           particle.position.x = ParticleSystem.getRandomNumberInInterval({ min: 0, max: this.size.x });
           particle.position.y = ParticleSystem.getRandomNumberInInterval({ min: 0, max: this.size.y });
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
         
         window.particlex = { ParticleSystem, Particle };
         
// Применяем режим полного экрана для мини-приложения
    window.Telegram.WebApp.expand();
    window.Telegram.WebApp.requestFullscreen();

// Настройка темы
tg.expand(); // Открыть приложение на весь экран
