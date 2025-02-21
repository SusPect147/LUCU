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
document.addEventListener("DOMContentLoaded", () => {
   const questsMenu = document.getElementById("quests-menu");
   const questsButton = document.querySelector('.menu-item img[alt="Quests"]');

   questsButton.addEventListener("click", () => {
       questsMenu.classList.remove("hide", "hidden");
       questsMenu.classList.add("show");
   });

   questsMenu.addEventListener("click", (e) => {
       if (e.target === questsMenu) {
           questsMenu.classList.add("hide");
           questsMenu.classList.remove("show");
           setTimeout(() => {
               questsMenu.classList.add("hidden");
               questsMenu.classList.remove("hide");
           }, 400);
       }
   });
});
/*****************************
 * ИНИЦИАЛИЗАЦИЯ ЭЛЕМЕНТОВ
 *****************************/
const tg = window.Telegram?.WebApp;
const leaderboardMenu = document.getElementById('leaderboard-menu');
const leaderboardMenuContent = document.getElementById('leaderboard-menu-content');
const leaderboardList = document.getElementById("leaderboard-list");
const mostLucuBtn = document.getElementById("most-lucu");
const bestLuckBtn = document.getElementById("best-luck");
const placeBadge = document.getElementById("player-place-badge");

// Верхняя секция (фиксированная — заголовок, бейдж, кнопки)
const topSection = document.querySelector(".top-section");
// Трофей с тенями
const trophyImage = document.querySelector(".trophy");
const glowElement = document.querySelector(".glow");

// Кнопка для открытия лидерборда
const leaderboardButton = document.querySelector('.menu-item img[alt="Leaderboard"]');
leaderboardList.addEventListener("scroll", () => {
   if (leaderboardList.scrollTop > 20) {
     leaderboardMenu.classList.add("scrolled");
   } else {
     leaderboardMenu.classList.remove("scrolled");
   }
});

/***************************************
 * ФУНКЦИИ ФОРМАТИРОВАНИЯ ЧИСЕЛ
 ***************************************/
function formatCoins(value) {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K";
  }
  return value.toString();
}
function formatNumber(value) {
  return Number(value).toLocaleString();
}

/****************************************************
 * ОТКРЫТИЕ/ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА ЛИДЕРОВ
 ****************************************************/
leaderboardButton.addEventListener('click', () => {
  leaderboardMenu.classList.remove('hide', 'hidden');
  leaderboardMenu.classList.add('show');
  loadLeaderboardCoins();
});
leaderboardMenu.addEventListener('click', (e) => {
  if (e.target === leaderboardMenu) {
    leaderboardMenu.classList.add('hide');
    leaderboardMenu.classList.remove('show');
    setTimeout(() => {
      leaderboardMenu.classList.add('hidden');
      leaderboardMenu.classList.remove('hide');
    }, 400);
  }
});

/****************************************************
 * ОБНОВЛЕНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ (photo_url)
 ****************************************************/
function updateUserProfile() {
   const user = window.Telegram.WebApp.initDataUnsafe.user;
   if (user) {
     let photoUrl = user.photo_url || "pictures/cubics/классика/начальный-кубик.gif";

     // Если Telegram-аватар в формате SVG, заменяем его на JPG (если требуется)
     if (photoUrl.endsWith(".svg")) {
       photoUrl = photoUrl.replace(".svg", ".jpg");
     }

     console.log("Используемый аватар:", photoUrl); // Логируем URL для проверки

     fetch("https://backend12-production-1210.up.railway.app/update_profile", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         user_id: user.id,
         username: user.first_name + (user.last_name ? ' ' + user.last_name : ''),
         photo_url: photoUrl
       })
     })
     .then(response => response.json())
     .then(data => console.log("Профиль обновлён:", data))
     .catch(error => console.error("Ошибка обновления профиля:", error));
   }
}
updateUserProfile();

/****************************************************
 * FALLBACK-АВАТАРКА И КЛАСС ФОНА ДЛЯ ЛИДЕРОВ
 ****************************************************/
async function getFallbackAvatar(player, index) {
  const defaultAvatar = "pictures/cubics/классика/начальный-кубик.gif";
  let photoUrl = player?.photo_url;

  // Если URL отсутствует или равен "undefined"/"null" – возвращаем дефолт
  if (!photoUrl || photoUrl === null || photoUrl === undefined) {

    return { src: defaultAvatar, bgClass: "" };
  }

  // Если аватар в формате SVG или URL относится к Telegram, сразу возвращаем его
  if (photoUrl.toLowerCase().endsWith(".svg") || photoUrl.includes("t.me/")) {
    return { 
      src: photoUrl, 
      bgClass: index === 0 ? "rainbow-bg" : index <= 4 ? "gold-bg" : "" 
    };
  }

  // Для других форматов загружаем изображение через GET-запрос
  try {
    const response = await fetch(photoUrl);
    if (!response.ok) {
      console.warn(`Аватарка ${photoUrl} недоступна (Ошибка ${response.status}), заменяем на дефолт.`);
      return { src: defaultAvatar, bgClass: "" };
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    return { 
      src: objectUrl, 
      bgClass: index === 0 ? "rainbow-bg" : index <= 4 ? "gold-bg" : "" 
    };
  } catch (error) {
    console.error(`Ошибка загрузки ${photoUrl}:`, error);
    return { src: defaultAvatar, bgClass: "" };
  }
}

/****************************************************
 * ПЕРЕКЛЮЧЕНИЕ ТАБЛИЦ (Most $LUCU / Best LUCK)
 ****************************************************/
mostLucuBtn.addEventListener("click", () => {
  mostLucuBtn.classList.add("active");
  bestLuckBtn.classList.remove("active");
  loadLeaderboardCoins();
});
bestLuckBtn.addEventListener("click", () => {
  bestLuckBtn.classList.add("active");
  mostLucuBtn.classList.remove("active");
  loadLeaderboardLuck();
});

/****************************************************
 * ЗАГРУЗКА ЛИДЕРБОРДА ПО МОНЕТАМ (COINS)
 * Слева – монеты, справа – информация об игроке (аватар, имя, место).
 ****************************************************/
async function loadLeaderboardCoins() {
  try {
    const response = await fetch("https://backend12-production-1210.up.railway.app/leaderboard_coins");
    if (!response.ok) {
      throw new Error("Ошибка сети: " + response.status);
    }
    const data = await response.json();
    leaderboardList.innerHTML = "";

    const currentUser = window.Telegram.WebApp.initDataUnsafe.user;
    let currentUserIndex = -1;
    if (currentUser) {
      currentUserIndex = data.findIndex(p => p.user_id == currentUser.id);
    }
    placeBadge.textContent = (currentUserIndex >= 0)
      ? `Your place #${currentUserIndex + 1}`
      : "Your place #--";

    if (!data || !Array.isArray(data) || data.length === 0) {
      leaderboardList.innerHTML = '<li class="coming-soon">No data available</li>';
      return;
    }

    // Для каждого игрока получаем аватар через getFallbackAvatar
    for (let index = 0; index < data.length; index++) {
      const player = data[index];
      const avatar = await getFallbackAvatar(player, index);
      const avatarSrc = avatar.src;
      const isCurrentUser = currentUser && (player.user_id == currentUser.id);

      const li = document.createElement("li");
      li.classList.add("leaderboard-item");
      if (isCurrentUser) {
        li.classList.add("highlight");
      }

      li.innerHTML = `
        <div class="leaderboard-item-content">
          <div class="player-left">
            <span class="player-coins">${formatCoins(player.coins)} $LUCU</span>
          </div>
          <div class="player-right">
            <img src="${avatarSrc}" onerror="this.onerror=null; this.src='pictures/cubics/классика/начальный-кубик.gif';" class="player-avatar" alt="Avatar">

            <div class="player-info">
              <span class="player-name">${player.username}</span>
              <span class="player-rank">#${index + 1}</span>
            </div>
          </div>
        </div>
      `;
      leaderboardList.appendChild(li);
    }
  } catch (error) {
    console.error("Ошибка загрузки лидерборда по монетам:", error);
  }
}

/****************************************************
 * ЗАГРУЗКА ЛИДЕРБОРДА ПО УДАЧЕ (LUCK)
 * Слева – минимальное число, справа – информация об игроке (аватар, имя, место).
 ****************************************************/
async function loadLeaderboardLuck() {
  try {
    const response = await fetch("https://backend12-production-1210.up.railway.app/leaderboard_luck");
    if (!response.ok) {
      throw new Error("Ошибка сети: " + response.status);
    }
    const data = await response.json();
    leaderboardList.innerHTML = "";

    const currentUser = window.Telegram.WebApp.initDataUnsafe.user;
    let currentUserIndex = -1;
    if (currentUser) {
      currentUserIndex = data.findIndex(p => p.user_id == currentUser.id);
    }
    placeBadge.textContent = (currentUserIndex >= 0)
      ? `You #${currentUserIndex + 1}`
      : "You #--";

    if (!data || !Array.isArray(data) || data.length === 0) {
      leaderboardList.innerHTML = '<li class="coming-soon">No data available</li>';
      return;
    }

    for (let index = 0; index < data.length; index++) {
      const player = data[index];
      let luckValue = parseFloat(player.min_luck);
      if (!isFinite(luckValue) || isNaN(luckValue)) {
        luckValue = "N/A";
      } else {
        luckValue = formatNumber(luckValue);
      }
      const avatar = await getFallbackAvatar(player, index);
      const avatarSrc = avatar.src;
      const isCurrentUser = currentUser && (player.user_id == currentUser.id);

      const li = document.createElement("li");
      li.classList.add("leaderboard-item");
      if (isCurrentUser) {
        li.classList.add("highlight");
      }

      li.innerHTML = `
        <div class="leaderboard-item-content">
          <div class="player-left">
            <span class="player-luck">${luckValue}</span>
          </div>
          <div class="player-right">
            <img src="${avatarSrc}" onerror="this.onerror=null; this.src='pictures/cubics/классика/начальный-кубик.gif';" class="player-avatar" alt="Avatar">


            <div class="player-info">
              <span class="player-name">${player.username}</span>
              <span class="player-rank">#${index + 1}</span>
            </div>
          </div>
        </div>
      `;
      leaderboardList.appendChild(li);
    }
  } catch (error) {
    console.error("Ошибка загрузки лидерборда по удаче:", error);
  }
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
   return (Math.floor((amount / 1_000_000_000) * 10) / 10) + "B";
 } else if (amount >= 1_000_000) {
   return (Math.floor((amount / 1_000_000) * 10) / 10) + "M";
 } else if (amount >= 1_000) {
   return (Math.floor((amount / 1_000) * 10) / 10) + "K";
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
            `Your Best MIN number: <span style="color: #F80000;">N/A</span>` :
            `Your Best MIN number: <span style="color: #F80000;">${formatNumber(min_luck)}</span>`;

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
      "Buy //5K $LUCU/";

   buyEmeraldButton.textContent = hasBoughtEmerald ?
      (equippedSkin === "Emerald" ? "Equipped" : "Equip") :
      "Buy //10K $LUCU/";

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
const buyNegativeButton = document.getElementById('buy-negative');
const buyEmeraldButton = document.getElementById('buy-Emerald');
const equipClassicButton = document.getElementById('equip-classic');
let hasBoughtNegative = false;
let hasBoughtEmerald = false;
let equippedSkin = 'classic';
const skinsMenu = document.getElementById('skins-menu');
const skinsButton = document.querySelector('.menu-item img[alt="Skins"]');

// Открытие меню
skinsButton.addEventListener('click', () => {
   skinsMenu.classList.remove('hidden'); // Делаем меню видимым
   requestAnimationFrame(() => {
       skinsMenu.classList.add('show'); // Запускаем анимацию появления
   });
});

// Закрытие меню
skinsMenu.addEventListener('click', (e) => {
   if (e.target === skinsMenu) {
       skinsMenu.classList.add('hide'); // Запускаем анимацию вниз
       skinsMenu.classList.remove('show'); // Убираем show
       setTimeout(() => {
           skinsMenu.classList.add('hidden'); // Полностью скрываем после анимации
           skinsMenu.classList.remove('hide'); // Сбрасываем hide
       }, 400); // Ждём завершения CSS-анимации
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

const profileButton = document.getElementById("profile-button");
const profileMenu = document.getElementById("profile-menu");
const profileName = document.getElementById("profile-name");

// Получаем имя пользователя из Telegram API
const userName = tg.initDataUnsafe?.user?.username || "NoName";
profileName.textContent = `Hello, ${userName}`;

// Функция открытия меню
profileButton.addEventListener('click', () => {
   profileMenu.classList.remove('hide', 'hidden'); // Убираем скрытие
   requestAnimationFrame(() => {
       profileMenu.classList.add('show'); // Добавляем класс show для плавного появления
   });
});

// Функция закрытия меню с зеркальной анимацией
profileMenu.addEventListener('click', (e) => {
   if (e.target === profileMenu) {
       profileMenu.classList.add('hide'); // Запускаем анимацию закрытия
       profileMenu.classList.remove('show'); // Убираем класс show
       setTimeout(() => {
           profileMenu.classList.add('hidden'); // Полностью скрываем меню после анимации
           profileMenu.classList.remove('hide'); // Сбрасываем hide
       }, 400); // Время совпадает с CSS (0.4s)
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

// Функция открытия меню
friendButton.addEventListener('click', () => {
   friendMenu.classList.remove('hide', 'hidden'); // Убираем скрытие
   friendMenu.classList.add('show'); // Добавляем плавное появление
   updateFriendsCount();
});

// Функция закрытия меню с зеркальной анимацией
friendMenu.addEventListener('click', (e) => {
   if (e.target === friendMenu) {
       friendMenu.classList.add('hide'); // Запускаем анимацию вниз
       friendMenu.classList.remove('show'); // Убираем класс show
       setTimeout(() => {
           friendMenu.classList.add('hidden'); // Полностью скрываем после анимации
           friendMenu.classList.remove('hide'); // Убираем класс hide, чтобы при следующем открытии не было проблем
       }, 400); // Время совпадает с CSS (0.4s)
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
