import { db, type Client, type Metric, type Workout, type WorkoutExercise } from '@/lib/db'
import { addDaysISO, todayISO } from '@/lib/format'
import { uid } from '@/lib/id'

type SetSpec = { reps?: number; weight?: number; timeSec?: number; distance?: number }

function ex(
  name: string,
  metrics: Metric[],
  sets: SetSpec[],
  note = '',
  restSec: number | null = null,
): WorkoutExercise {
  return {
    id: uid(),
    name,
    metrics,
    restSec,
    note,
    sets: sets.map((s) => ({
      id: uid(),
      reps: s.reps ?? null,
      weight: s.weight ?? null,
      timeSec: s.timeSec ?? null,
      distance: s.distance ?? null,
      done: false,
    })),
  }
}

const repeat = (n: number, s: SetSpec) => Array.from({ length: n }, () => ({ ...s }))

export async function loadDemoData(): Promise<void> {
  const now = Date.now()
  const today = todayISO()

  const anna: Client = {
    id: uid(),
    name: 'Анна Смирнова',
    phone: '+7 916 123-45-67',
    birthDate: '1992-04-18',
    heightCm: 168,
    weightKg: 68.5,
    goal: 'Снизить вес на 5 кг, подтянуть ягодицы',
    health: 'Протрузия L5–S1: без осевой нагрузки на позвоночник',
    notes: 'Тренируется пн/чт в 19:00. Любит круговые.',
    createdAt: now - 90 * 86_400_000,
    updatedAt: now,
  }
  const igor: Client = {
    id: uid(),
    name: 'Игорь Петров',
    phone: '+7 903 555-01-02',
    birthDate: '1985-11-02',
    heightCm: 182,
    weightKg: 79,
    goal: 'Подготовка к забегу на 10 км и общая выносливость',
    health: '',
    notes: 'Утро, 7:30. Приходит натощак — напоминать про банан.',
    createdAt: now - 60 * 86_400_000,
    updatedAt: now,
  }
  const maria: Client = {
    id: uid(),
    name: 'Мария Ковалёва',
    phone: '',
    birthDate: '1978-07-23',
    heightCm: 164,
    weightKg: 62,
    goal: 'Здоровая спина, мобильность плечевого пояса',
    health: 'Перенесла операцию на правом плече (2023)',
    notes: '',
    createdAt: now - 14 * 86_400_000,
    updatedAt: now,
  }
  const dmitry: Client = {
    id: uid(),
    name: 'Дмитрий Волков',
    phone: '+7 925 310-77-41',
    birthDate: '1990-02-14',
    heightCm: 178,
    weightKg: 72,
    goal: 'Набрать 4–5 кг мышечной массы',
    health: '',
    notes: 'Пн/ср/пт в 8:00. Сплит верх/низ. Следить за питанием — недоедает.',
    createdAt: now - 45 * 86_400_000,
    updatedAt: now,
  }
  const elena: Client = {
    id: uid(),
    name: 'Елена Морозова',
    phone: '+7 977 402-18-93',
    birthDate: '1996-09-05',
    heightCm: 170,
    weightKg: 68.6,
    goal: 'Минус 6 кг к свадьбе в июне',
    health: 'Варикоз: без прыжков с большой амплитудой',
    notes: 'Вт/пт вечером. Мотивирует таблица прогресса.',
    createdAt: now - 40 * 86_400_000,
    updatedAt: now,
  }
  const sergey: Client = {
    id: uid(),
    name: 'Сергей Николаев',
    phone: '+7 915 220-64-08',
    birthDate: '1968-12-30',
    heightCm: 175,
    weightKg: 88,
    goal: 'Снизить давление, вернуть бодрость',
    health: 'Гипертония 1 ст., принимает препараты. Пульс не выше 140.',
    notes: 'Мерить давление до и после тренировки.',
    createdAt: now - 50 * 86_400_000,
    updatedAt: now,
  }
  const olga: Client = {
    id: uid(),
    name: 'Ольга Белова',
    phone: '+7 999 871-25-36',
    birthDate: '2001-03-11',
    heightCm: 166,
    weightKg: 58,
    goal: 'Подтянуться 5 раз без резинки',
    health: '',
    notes: 'Студентка, расписание плавает — подтверждать накануне.',
    createdAt: now - 35 * 86_400_000,
    updatedAt: now,
  }
  const alexey: Client = {
    id: uid(),
    name: 'Алексей Козлов',
    phone: '+7 926 145-90-12',
    birthDate: '1988-06-27',
    heightCm: 185,
    weightKg: 92,
    goal: 'Жим лёжа 120 кг',
    health: 'Старая травма левого локтя — аккуратно с узким хватом',
    notes: 'Опыт 5 лет. Любит тяжёлые тренировки, не любит кардио.',
    createdAt: now - 42 * 86_400_000,
    updatedAt: now,
  }
  const natalia: Client = {
    id: uid(),
    name: 'Наталья Фёдорова',
    phone: '+7 916 533-48-70',
    birthDate: '1983-10-19',
    heightCm: 162,
    weightKg: 64,
    goal: 'Восстановление после родов, укрепить кор',
    health: 'Диастаз 1,5 см: без классических скручиваний',
    notes: 'Приходит с коляской, ребёнок спит — тренировка 45 мин.',
    createdAt: now - 30 * 86_400_000,
    updatedAt: now,
  }
  const pavel: Client = {
    id: uid(),
    name: 'Павел Соколов',
    phone: '+7 903 768-02-55',
    birthDate: '1999-01-08',
    heightCm: 180,
    weightKg: 81,
    goal: 'Подготовка к функциональным стартам',
    health: '',
    notes: 'Высокий уровень. Сб утром — длинная тренировка.',
    createdAt: now - 28 * 86_400_000,
    updatedAt: now,
  }

  const w = (
    client: Client,
    daysFromToday: number,
    title: string,
    exercises: WorkoutExercise[],
    notes = '',
  ): Workout => {
    const date = addDaysISO(today, daysFromToday)
    const completed = daysFromToday < 0
    return {
      id: uid(),
      clientId: client.id,
      date,
      title,
      status: completed ? 'completed' : 'planned',
      exercises: completed
        ? exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: true })) }))
        : exercises,
      notes,
      createdAt: now,
      updatedAt: now,
    }
  }

  const series = (
    client: Client,
    title: string,
    days: number[],
    build: (i: number) => WorkoutExercise[],
    notes: string[] = [],
  ) => days.map((d, i) => w(client, d, title, build(i), notes[i] ?? ''))

  const annaLower = (week: number) => [
    ex(
      'Ягодичный мост',
      ['reps', 'weight'],
      repeat(4, { reps: 12, weight: 40 + week * 5 }),
      'Пауза 2 с в верхней точке',
      60,
    ),
    ex(
      'Болгарские сплит-приседания',
      ['reps', 'weight'],
      repeat(3, { reps: 10, weight: 8 + week * 2 }),
      'На каждую ногу',
      60,
    ),
    ex('Махи гирей', ['reps', 'weight'], repeat(4, { reps: 15, weight: 12 + (week > 1 ? 4 : 0) }), '', 45),
    ex('Планка', ['time'], repeat(3, { timeSec: 40 + week * 10 }), '', 30),
  ]

  const workouts: Workout[] = [
    w(anna, -18, 'Низ тела + кор', annaLower(0), 'Хорошее самочувствие. Техника моста — ок.'),
    w(anna, -11, 'Низ тела + кор', annaLower(1), 'Устала после работы, последний подход махов сократили.'),
    w(anna, -4, 'Низ тела + кор', annaLower(2), 'Отлично! Прибавили вес в мосту. Спина не беспокоила.'),
    w(anna, 0, 'Круговая на всё тело', [
      ex('Гоблет-присед', ['reps', 'weight'], repeat(3, { reps: 12, weight: 16 })),
      ex('Тяга TRX', ['reps'], repeat(3, { reps: 12 })),
      ex('Бёрпи', ['reps'], repeat(3, { reps: 8 })),
      ex('Гребной тренажёр', ['distance', 'time'], [{ distance: 500 }], 'Темп 24–26 гребков в минуту'),
    ]),
    w(anna, 3, 'Низ тела + кор', annaLower(3)),

    w(
      igor,
      -9,
      'Выносливость',
      [
        ex('Гребной тренажёр', ['distance', 'time'], repeat(4, { distance: 500, timeSec: 115 }), '', 90),
        ex('Трастеры', ['reps', 'weight'], repeat(3, { reps: 12, weight: 30 })),
        ex('Прыжки на тумбу', ['reps'], repeat(3, { reps: 10 })),
      ],
      'Пульс держал в зоне 2 на гребле.',
    ),
    w(
      igor,
      -2,
      'Сила + кондиции',
      [
        ex(
          'Становая тяга',
          ['reps', 'weight'],
          [
            { reps: 8, weight: 80 },
            { reps: 6, weight: 90 },
            { reps: 5, weight: 100 },
            { reps: 5, weight: 100 },
          ],
          'Следить за нейтральной спиной',
          120,
        ),
        ex('Фермерская прогулка', ['distance', 'weight'], repeat(3, { distance: 40, weight: 24 })),
        ex('Канаты (Battle ropes)', ['time'], repeat(4, { timeSec: 30 })),
      ],
      'Становая — новый рабочий вес 100 кг.',
    ),
    w(igor, 2, 'Интервалы', [
      ex('Велотренажёр (Assault bike)', ['time'], repeat(6, { timeSec: 30 }), '30 с работа / 90 с отдых'),
      ex('Махи гирей', ['reps', 'weight'], repeat(4, { reps: 20, weight: 24 })),
      ex('Скручивания', ['reps'], repeat(3, { reps: 20 })),
    ]),

    w(
      maria,
      -7,
      'Мобильность и спина',
      [
        ex('Кошка-корова', ['reps'], repeat(2, { reps: 10 })),
        ex('Растяжка «90/90»', ['time'], repeat(2, { timeSec: 60 })),
        ex('Тяга TRX', ['reps'], repeat(3, { reps: 10 }), 'Без боли в плече — продолжаем'),
        ex('Боковая планка', ['time'], repeat(2, { timeSec: 20 })),
      ],
      'Плечо реагирует на подъём выше головы — пока исключаем жимы вверх.',
    ),
    w(maria, 1, 'Мобильность и спина', [
      ex('Кошка-корова', ['reps'], repeat(2, { reps: 12 })),
      ex('Медвежья походка', ['distance'], repeat(3, { distance: 10 })),
      ex('Тяга TRX', ['reps'], repeat(3, { reps: 12 })),
      ex('Ягодичный мост', ['reps', 'weight'], repeat(3, { reps: 15 })),
    ]),

    ...series(
      dmitry,
      'Верх тела',
      [-26, -19, -12, -5, 2],
      (i) => [
        ex('Жим лёжа', ['reps', 'weight'], repeat(4, { reps: 8, weight: 60 + i * 2.5 }), '', 120),
        ex('Подтягивания', ['reps', 'weight'], repeat(4, { reps: 6 + Math.min(i, 2) }), '', 90),
        ex('Жим гантелей стоя', ['reps', 'weight'], repeat(3, { reps: 10, weight: 14 + (i > 2 ? 2 : 0) })),
        ex('Сгибания на бицепс', ['reps', 'weight'], repeat(3, { reps: 12, weight: 12 })),
      ],
      ['', 'Подтягивания: последний подход 5 повторов.', 'Набрал 1,2 кг за месяц.', 'Жим 67,5 кг на 8 — уверенно.'],
    ),
    ...series(
      dmitry,
      'Низ тела',
      [-24, -17, -10, -3, 4],
      (i) => [
        ex(
          'Приседания со штангой',
          ['reps', 'weight'],
          repeat(4, { reps: 8, weight: 70 + i * 5 }),
          'Глубина — параллель',
          150,
        ),
        ex('Румынская тяга', ['reps', 'weight'], repeat(3, { reps: 10, weight: 60 + i * 5 }), '', 120),
        ex('Выпады с гантелями', ['reps', 'weight'], repeat(3, { reps: 10, weight: 14 }), 'На каждую ногу'),
        ex('Подъём ног в висе', ['reps'], repeat(3, { reps: 10 + i })),
      ],
      ['Крепатура после первого раза — норм.', '', 'Присед 80 кг — колени не заваливает.', ''],
    ),

    ...series(
      elena,
      'Круговая на жиросжигание',
      [-33, -29, -26, -22, -19, -15, -12, -8, -5, -1, 3],
      (i) => [
        ex('Гоблет-присед', ['reps', 'weight'], repeat(3, { reps: 15, weight: 10 + Math.floor(i / 3) * 2 })),
        ex('Тяга TRX', ['reps'], repeat(3, { reps: 12 })),
        ex('Ягодичный мост', ['reps', 'weight'], repeat(3, { reps: 15, weight: 30 + i * 2.5 })),
        ex(
          'Гребной тренажёр',
          ['distance', 'time'],
          repeat(3, { distance: 250, timeSec: 65 - Math.min(i, 8) }),
          '',
          60,
        ),
        ex('Планка', ['time'], repeat(3, { timeSec: 30 + i * 5 })),
      ],
      [
        'Вес 71,4 кг. Замеры сделаны.',
        '',
        'Пропустила ужин — к концу закружилась голова.',
        '',
        'Вес 70,1 кг.',
        '',
        '',
        'Вес 69,0 кг. Довольна!',
        '',
        'Вес 68,6 кг. Минус 2,8 кг за месяц.',
      ],
    ),

    ...series(
      sergey,
      'Оздоровительная',
      [-40, -33, -26, -19, -12, -5, 2],
      (i) => [
        ex('Велотренажёр (Assault bike)', ['time'], [{ timeSec: 600 + i * 60 }], 'Пульс 110–125', null),
        ex('Гоблет-присед', ['reps', 'weight'], repeat(3, { reps: 12, weight: 8 + Math.floor(i / 2) * 2 })),
        ex('Тяга верхнего блока', ['reps', 'weight'], repeat(3, { reps: 12, weight: 30 + i * 2.5 })),
        ex('Фермерская прогулка', ['distance', 'weight'], repeat(2, { distance: 30, weight: 12 + (i > 3 ? 4 : 0) })),
        ex('Растяжка «90/90»', ['time'], repeat(2, { timeSec: 60 })),
      ],
      [
        'АД до 145/92, после 138/88.',
        'АД до 140/90, после 135/85.',
        'Жаловался на сон — обсудили режим.',
        'АД до 132/86. Говорит, стало легче подниматься по лестнице.',
        '',
        'АД до 128/84 — лучший результат.',
      ],
    ),

    ...series(
      olga,
      'Спина и подтягивания',
      [-31, -24, -17, -10, -3, 4],
      (i) => [
        ex(
          'Подтягивания',
          ['reps', 'weight'],
          repeat(4, { reps: 3 + Math.min(i, 3) }),
          i < 3 ? 'С толстой резинкой' : 'С тонкой резинкой',
          120,
        ),
        ex('Тяга верхнего блока', ['reps', 'weight'], repeat(3, { reps: 10, weight: 25 + i * 2.5 })),
        ex(
          'Тяга гантели в наклоне',
          ['reps', 'weight'],
          repeat(3, { reps: 10, weight: 8 + (i > 2 ? 2 : 0) }),
          'На каждую руку',
        ),
        ex('Отжимания', ['reps'], repeat(3, { reps: 6 + i })),
        ex('Боковая планка', ['time'], repeat(2, { timeSec: 25 + i * 5 })),
      ],
      ['', '', 'Перешли на тонкую резинку со следующей тренировки.', '', 'Первое чистое подтягивание без резинки!'],
    ),

    ...series(
      alexey,
      'Жим (тяжёлый день)',
      [-36, -29, -22, -15, -8, -1, 6],
      (i) => [
        ex(
          'Жим лёжа',
          ['reps', 'weight'],
          [
            { reps: 5, weight: 80 },
            { reps: 3, weight: 95 + i * 2.5 },
            { reps: 3, weight: 95 + i * 2.5 },
            { reps: 3, weight: 95 + i * 2.5 },
          ],
          'Пауза на груди 1 с',
          180,
        ),
        ex('Жим гантелей на наклонной', ['reps', 'weight'], repeat(3, { reps: 8, weight: 30 }), '', 120),
        ex('Отжимания на брусьях', ['reps', 'weight'], repeat(3, { reps: 8, weight: 10 + (i > 3 ? 5 : 0) })),
        ex('Тяга гантели в наклоне', ['reps', 'weight'], repeat(3, { reps: 10, weight: 36 })),
      ],
      [
        'Стартовый замер: жим 102,5 кг на 1.',
        '',
        'Локоть ок, брусья без боли.',
        '',
        'Рабочие тройки 105 — шли быстро.',
        '107,5 × 3 — новый рекорд в тройках.',
      ],
    ),
    ...series(
      alexey,
      'Ноги и спина',
      [-33, -26, -19, -12, -5],
      (i) => [
        ex('Становая тяга', ['reps', 'weight'], repeat(3, { reps: 5, weight: 140 + i * 5 }), '', 180),
        ex('Приседания со штангой', ['reps', 'weight'], repeat(3, { reps: 6, weight: 110 + i * 2.5 }), '', 150),
        ex('Подтягивания', ['reps', 'weight'], repeat(3, { reps: 8, weight: 10 })),
        ex('Гребной тренажёр', ['distance', 'time'], [{ distance: 1000 }], 'Обязательное кардио :)'),
      ],
      ['', 'Ворчал на греблю, но сделал.', '', '', 'Становая 160 × 5.'],
    ),

    ...series(
      natalia,
      'Кор и восстановление',
      [-27, -24, -20, -17, -13, -10, -6, -3, 1],
      (i) => [
        ex('Кошка-корова', ['reps'], repeat(2, { reps: 10 })),
        ex('Ягодичный мост', ['reps', 'weight'], repeat(3, { reps: 15, weight: i < 4 ? undefined : 10 })),
        ex('Медвежья походка', ['distance'], repeat(3, { distance: 8 + i })),
        ex('Боковая планка', ['time'], repeat(2, { timeSec: 15 + i * 3 }), 'На каждую сторону'),
        ex('Гоблет-присед', ['reps', 'weight'], repeat(3, { reps: 12, weight: 6 + Math.floor(i / 3) * 2 })),
      ],
      [
        'Диастаз 2 см, дыхание — учились включать поперечную.',
        '',
        '',
        'Добавили вес в мосту со следующей недели.',
        '',
        'Контроль диастаза: 1,5 см.',
        'Ребёнок проснулся — закончили раньше.',
      ],
    ),

    ...series(
      pavel,
      'Функциональный комплекс',
      [-25, -21, -18, -14, -11, -7, -4, 3],
      (i) => [
        ex('Трастеры', ['reps', 'weight'], repeat(5, { reps: 10, weight: 40 + Math.floor(i / 2) * 2.5 }), '', 60),
        ex('Бёрпи', ['reps'], repeat(5, { reps: 12 })),
        ex('Броски мяча в цель (Wall ball)', ['reps', 'weight'], repeat(4, { reps: 20, weight: 9 })),
        ex('Гребной тренажёр', ['distance', 'time'], repeat(3, { distance: 500, timeSec: 100 - i }), '', 120),
        ex('Толчок саней', ['distance', 'weight'], repeat(4, { distance: 20, weight: 80 + i * 5 })),
      ],
      [
        'Комплекс за 24:10.',
        '',
        'Не выспался, темп ниже.',
        'Комплекс за 22:45.',
        '',
        '',
        'Комплекс за 21:30 — лучший результат.',
      ],
    ),
  ]

  await db.transaction('rw', db.clients, db.workouts, async () => {
    await db.clients.bulkAdd([anna, igor, maria, dmitry, elena, sergey, olga, alexey, natalia, pavel])
    await db.workouts.bulkAdd(workouts)
  })
}
