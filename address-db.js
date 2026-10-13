// address-db.js — Розширена база даних та розумний пошук з транслітерацією

const addressDatabase = {
  "черкаси": {
    name: "м. Черкаси",
    type: "city",
    queues: {
      "1.1": ["революції", "перемоги", "леніна", "кірова", "1 травня", "хрещатик"],
      "1.2": ["героїв", "комунальна", "лесі українки", "щорса", "шевченка"],
      "2.1": ["красина", "челюскінців", "азовського", "гоголя", "кольцева"],
      "2.2": ["пушкіна", "сумської", "павлова", "короленка", "ціолковського"],
      "3.1": ["дніпровська", "набережна", "приозерна", "митниця"],
      "3.2": ["молодіжна", "спортивна", "центральна", "будівельників"]
    }
  },
  "smila": {
    name: "м. Сміла",
    type: "city",
    queues: {
      "3.1": ["центр", "героїв", "незалежності", "миру", "соборна"],
      "3.2": ["промзона", "робітнича", "промислова", "заводська", "седова"]
    }
  },
  "umany": {
    name: "м. Умань",
    type: "city",
    queues: {
      "2.1": ["центр", "грушевського", "театральна", "соборна", "небесної сотні"],
      "2.2": ["околиці", "робітнича", "промислова", "тищика"]
    }
  },
  "zolotonosha": {
    name: "м. Золотоноша",
    type: "city",
    queues: {
      "1.1": ["центр", "центральна", "миру", "шевченка"],
      "1.2": ["околиці", "робітнича", "садова"]
    }
  },
  "kaniv": {
    name: "м. Канів",
    type: "city",
    queues: {
      "4.1": ["центр", "центральна", "леніна", "ентузіастів"],
      "4.2": ["околиці", "садова", "дніпровська"]
    }
  },
  "zvenigorodka": {
    name: "м. Звенигородка",
    type: "city",
    queues: {
      "5.1": ["центр", "шевченка", "героїв майдану"],
      "5.2": ["околиці", "промислова"]
    }
  },
  "smila_district": {
    name: "Смілянський район",
    type: "district",
    queues: {
      "3.1": ["озерщина", "виговський", "каганівка", "синівка", "мельниці"],
      "3.2": ["красносілля", "морозівка", "сидорівка", "будки"]
    }
  },
  "zolotonosha_district": {
    name: "Золотоніський район",
    type: "district",
    queues: {
      "1.1": ["заєць", "гнідий", "грезине"],
      "1.2": ["деменки", "красносілля"]
    }
  },
  "kaniv_district": {
    name: "Канівський район",
    type: "district",
    queues: {
      "4.1": ["рідкодуб", "слобідка", "ісківці"],
      "4.2": ["оситняжка", "вовкозвіл"]
    }
  },
  "cherkasy_district": {
    name: "Черкаський район",
    type: "district",
    queues: {
      "1.1": ["адамівка", "акордівка", "архангельське"],
      "1.2": ["бажанівка", "бандурівка", "багачка"],
      "2.1": ["ганівка", "гарай", "геращенко"],
      "2.2": ["гнідий", "грозинівка", "гузіївка"]
    }
  },
  "shpolya_district": {
    name: "Шполянський район",
    type: "district",
    queues: {
      "4.1": ["шпола", "красносілля", "красне"],
      "4.2": ["кроківка", "крупки"]
    }
  },
  "umany_district": {
    name: "Уманський район",
    type: "district",
    queues: {
      "2.1": ["успенське", "удачне", "увільщина"],
      "2.2": ["улькова", "унівка"]
    }
  }
};

// Проста таблиця транслітерації (латиниця -> кирилиця)
const translitMap = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'zh': 'ж',
  'z': 'з', 'y': 'и', 'i': 'і', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н',
  'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф',
  'kh': 'х', 'ts': 'ц', 'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'yu': 'ю', 'ya': 'я',
  'h': 'г', 'j': 'й', 'x': 'х', '\'' : ''
};

function transliterate(text) {
  let lower = text.toLowerCase().trim();
  // Спочатку замінюємо складні сполучення
  lower = lower.replace(/shch/g, 'щ').replace(/sh/g, 'ш').replace(/ch/g, 'ч').replace(/zh/g, 'ж').replace(/kh/g, 'х').replace(/ts/g, 'ц');

  let result = '';
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    result += translitMap[char] !== undefined ? translitMap[char] : char;
  }
  return result;
}

// Розумний пошук черги за адресою (підтримує транслітерацію та часткове збігання)
function findQueueByAddress(address, location) {
  const locationData = addressDatabase[location];
  if (!locationData) return null;

  // Транслітеруємо введений текст (якщо введено англійською) і переводимо в нижній регістр
  const cleanInput = transliterate(address);

  let bestMatchQueue = null;
  let maxScore = 0;

  for (const [queue, streets] of Object.entries(locationData.queues)) {
    for (const street of streets) {
      const cleanStreet = transliterate(street);

      // Перевіряємо збіг
      if (cleanStreet.includes(cleanInput) || cleanInput.includes(cleanStreet)) {
        // Чим довший збіг, тим вищий пріоритет
        const score = street.length;
        if (score > maxScore) {
          maxScore = score;
          bestMatchQueue = queue;
        }
      }
    }
  }

  // Якщо не знайшли точного входження, повертаємо дефолтну першу чергу або чергу за ключовим словом
  if (!bestMatchQueue && cleanInput.length > 0) {
    // Якщо введено хоч щось — повертаємо чергу 3.1 або 1.1 як найпоширеніші для цього міста за замовчуванням
    const availableQueues = Object.keys(locationData.queues);
    return availableQueues[0] || "3.1";
  }

  return bestMatchQueue;
}

function getLocationInfo(locationKey) {
  return addressDatabase[locationKey] || null;
}

function getAllLocations() {
  return Object.entries(addressDatabase).map(([key, data]) => ({
    key,
    name: data.name,
    type: data.type
  }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addressDatabase, findQueueByAddress, getLocationInfo, getAllLocations, transliterate };
}
