// address-db.js — Розширена база даних населених пунктів та сіл Черкаської області

const addressDatabase = {
  // Міста обласного значення
  "черкаси": {
    name: "м. Черкаси",
    type: "city",
    queues: {
      "1.1": ["революції", "перемоги", "леніна", "кірова", "1 травня", "хрещатик", "дніпровського узвишшя"],
      "1.2": ["героїв", "комунальна", "лесі українки", "щорса", "шевченка", "пацаєва"],
      "2.1": ["красина", "челюскінців", "азовського", "гоголя", "кольцева", "сумгаїтська"],
      "2.2": ["пушкіна", "сумської", "павлова", "короленка", "ціолковського", "б. хмельницького"],
      "3.1": ["дніпровська", "набережна", "приозерна", "митниця", "гагаріна"],
      "3.2": ["молодіжна", "спортивна", "центральна", "будівельників", "острівна"]
    }
  },
  "smila": {
    name: "м. Сміла",
    type: "city",
    queues: {
      "3.1": ["центр", "героїв", "незалежності", "миру", "соборна", "мазурця"],
      "3.2": ["промзона", "робітнича", "промислова", "заводська", "седова", "перемоги"]
    }
  },
  "umany": {
    name: "м. Умань",
    type: "city",
    queues: {
      "2.1": ["центр", "грушевського", "театральна", "соборна", "небесної сотні", "коломенська"],
      "2.2": ["околиці", "робітнича", "промислова", "тищика", "садова"]
    }
  },
  "zolotonosha": {
    name: "м. Золотоноша",
    type: "city",
    queues: {
      "1.1": ["центр", "центральна", "миру", "шевченка", "багата"],
      "1.2": ["околиці", "робітнича", "садова", "об'їзна"]
    }
  },
  "kaniv": {
    name: "м. Канів",
    type: "city",
    queues: {
      "4.1": ["центр", "центральна", "леніна", "ентузіастів", "героїв дніпра"],
      "4.2": ["околиці", "садова", "дніпровська", "пушкіна"]
    }
  },
  "zvenigorodka": {
    name: "м. Звенигородка",
    type: "city",
    queues: {
      "5.1": ["центр", "шевченка", "героїв майдану", "проспекті"],
      "5.2": ["околиці", "промислова", "вишнева"]
    }
  },
  "shpolya": {
    name: "м. Шпола",
    type: "city",
    queues: {
      "4.1": ["центр", "лозуватська", "набережна", "грушевського"],
      "4.2": ["заводська", "промислова", "околиці"]
    }
  },
  "vatutine": {
    name: "м. Ватутіне (м. Богачеве)",
    type: "city",
    queues: {
      "5.1": ["центр", "дружби", "будівельників"],
      "5.2": ["промислова", "шахтарська"]
    }
  },
  "korsun": {
    name: "м. Корсунь-Шевченківський",
    type: "city",
    queues: {
      "1.1": ["центр", "героїв майдану", "stеценко"],
      "1.2": ["околиці", "зарічна", "промислова"]
    }
  },
  "monastyrysche": {
    name: "м. Монастирище",
    type: "city",
    queues: {
      "2.1": ["центр", "соборна", "гагаріна"],
      "2.2": ["заводська", "околиці"]
    }
  },
  "zhashkiv": {
    name: "м. Жашків",
    type: "city",
    queues: {
      "6.1": ["центр", "мирна", "мінюкова"],
      "6.2": ["промислова", "садова"]
    }
  },
  "talne": {
    name: "м. Тальне",
    type: "city",
    queues: {
      "5.1": ["центр", "соборна", "карла маркса"],
      "5.2": ["околиці", "залізнична"]
    }
  },
  "kamianka": {
    name: "м. Кам'янка",
    type: "city",
    queues: {
      "3.1": ["центр", "пушкіна", "декабристів"],
      "3.2": ["околиці", "заводська"]
    }
  },

  // Села та селища за районами
  "cherkasy_district_villages": {
    name: "Села Черкаського району (Червона Слобода, Білозір'я, Руська Поляна, Мошни тощо)",
    type: "district",
    queues: {
      "1.1": ["червона слобода", "буди", "лася", "героїв дніпра"],
      "1.2": ["білозір'я", "заводська", "центральна"],
      "2.1": ["руська поляна", "бессарабія", "лісова"],
      "2.2": ["мошни", "сагунівка", "боровиця"],
      "3.1": ["степанки", "хутір малий", "свидивок"],
      "3.2": ["вергуни", "тубільці", "кременець"]
    }
  },
  "smila_district_villages": {
    name: "Села Смілянського району (Мала Смілянка, Балаклея, Тернівка тощо)",
    type: "district",
    queues: {
      "3.1": ["балаклея", "плоске", "костянтинівка"],
      "3.2": ["тесівка", "будки", "санжариха", "меринівка"],
      "4.1": ["кам'янка", "пастирське", "ревівка"]
    }
  },
  "umany_district_villages": {
    name: "Села Уманського району (Маньківка, Жашківські села, Бабанка тощо)",
    type: "district",
    queues: {
      "2.1": ["бабанка", "полянецьке", "кочержинці"],
      "2.2": ["стемпківка", "рогівка", "паланка"],
      "6.1": ["маньківка", "буки", "іваньки"]
    }
  },
  "zolotonosha_district_villages": {
    name: "Села Золотоніського району (Чорнобай, Драбів, Згар тощо)",
    type: "district",
    queues: {
      "1.1": ["чорнобай", "іркліїв", "велимче"],
      "1.2": ["драбів", "шрамківка", "беспальче"],
      "3.1": ["велика бурімка", "благодатне"]
    }
  },
  "zvenigorodka_district_villages": {
    name: "Села Звенигородського району (Лисянка, Єрки, Катеринопіль тощо)",
    type: "district",
    queues: {
      "5.1": ["лисянка", "єрки", "катеринопіль"],
      "5.2": ["мокрина", "хижинці", "стецівка"]
    }
  },
  "kaniv_district_villages": {
    name: "Села Канівського району (Бобриця, Межиріч, Селище тощо)",
    type: "district",
    queues: {
      "4.1": ["межиріч", "бобриця", "прохорівка"],
      "4.2": ["грищенці", "литвинець", "пекарі"]
    }
  }
};

// Таблиця транслітерації
const translitMap = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'zh': 'ж',
  'z': 'з', 'y': 'и', 'i': 'і', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н',
  'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф',
  'kh': 'х', 'ts': 'ц', 'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'yu': 'ю', 'ya': 'я',
  'h': 'г', 'j': 'й', 'x': 'х', '\'' : ''
};

function transliterate(text) {
  let lower = text.toLowerCase().trim();
  lower = lower.replace(/shch/g, 'щ').replace(/sh/g, 'ш').replace(/ch/g, 'ч').replace(/zh/g, 'ж').replace(/kh/g, 'х').replace(/ts/g, 'ц');

  let result = '';
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    result += translitMap[char] !== undefined ? translitMap[char] : char;
  }
  return result;
}

function findQueueByAddress(address, location) {
  const locationData = addressDatabase[location];
  if (!locationData) return null;

  const cleanInput = transliterate(address);
  let bestMatchQueue = null;
  let maxScore = 0;

  for (const [queue, streets] of Object.entries(locationData.queues)) {
    for (const street of streets) {
      const cleanStreet = transliterate(street);

      if (cleanStreet.includes(cleanInput) || cleanInput.includes(cleanStreet)) {
        const score = street.length;
        if (score > maxScore) {
          maxScore = score;
          bestMatchQueue = queue;
        }
      }
    }
  }

  if (!bestMatchQueue && cleanInput.length > 0) {
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
