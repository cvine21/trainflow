import {
  db,
  type BlockFormat,
  type BlockResult,
  type Client,
  type Measurement,
  type Metric,
  type Workout,
  type WorkoutBlock,
  type WorkoutExercise,
} from '@/lib/db'
import { addDaysISO, todayISO } from '@/lib/format'
import { uid } from '@/lib/id'
import { normalizeLocalData } from '@/lib/migrations'

type SetSpec = { reps?: number; weight?: number; band?: string; timeSec?: number; distance?: number; calories?: number }

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
      band: s.band ?? null,
      timeSec: s.timeSec ?? null,
      distance: s.distance ?? null,
      calories: s.calories ?? null,
    })),
  }
}

const repeat = (n: number, s: SetSpec) => Array.from({ length: n }, () => ({ ...s }))

function block(
  format: BlockFormat,
  exercises: WorkoutExercise[],
  params: Pick<WorkoutBlock, 'rounds' | 'durationSec' | 'intervalSec'> = {},
  result?: BlockResult,
): WorkoutBlock {
  return { id: uid(), format, exercises, ...params, ...(result && { result }) }
}

const sets = (e: WorkoutExercise) => block('sets', [e])
const superset = (...exercises: WorkoutExercise[]) => block('superset', exercises)
const min = (m: number, s = 0) => m * 60 + s

export async function loadDemoData(): Promise<void> {
  const now = Date.now()
  const today = todayISO()

  const client = (
    name: string,
    fields: Omit<Client, 'id' | 'name' | 'createdAt' | 'updatedAt'>,
    daysAgo: number,
  ): Client => ({ id: uid(), name, ...fields, createdAt: now - daysAgo * 86_400_000, updatedAt: now })

  const anna = client(
    'Анна Смирнова',
    {
      phone: '+7 916 123-45-67',
      birthDate: '1992-04-18',
      goal: 'Снизить вес на 5 кг, подтянуть ягодицы',
      health: 'Протрузия L5–S1: без осевой нагрузки на позвоночник',
      notes: 'Тренируется пн/чт в 19:00. Любит круговые.',
    },
    90,
  )
  const igor = client(
    'Игорь Петров',
    {
      phone: '+7 903 555-01-02',
      birthDate: '1985-11-02',
      goal: 'Подготовка к забегу на 10 км и общая выносливость',
      notes: 'Утро, 7:30. Приходит натощак — напоминать про банан.',
    },
    60,
  )
  const maria = client(
    'Мария Ковалёва',
    {
      birthDate: '1978-07-23',
      goal: 'Здоровая спина, мобильность плечевого пояса',
      health: 'Перенесла операцию на правом плече (2023)',
    },
    14,
  )
  const dmitry = client(
    'Дмитрий Волков',
    {
      phone: '+7 925 310-77-41',
      birthDate: '1990-02-14',
      goal: 'Набрать 4–5 кг мышечной массы',
      notes: 'Пн/ср/пт в 8:00. Сплит верх/низ. Следить за питанием — недоедает.',
    },
    45,
  )
  const elena = client(
    'Елена Морозова',
    {
      phone: '+7 977 402-18-93',
      birthDate: '1996-09-05',
      goal: 'Минус 6 кг к свадьбе в июне',
      health: 'Варикоз: без прыжков с большой амплитудой',
      notes: 'Вт/пт вечером. Мотивирует таблица прогресса.',
    },
    40,
  )
  const sergey = client(
    'Сергей Николаев',
    {
      phone: '+7 915 220-64-08',
      birthDate: '1968-12-30',
      goal: 'Снизить давление, вернуть бодрость',
      health: 'Гипертония 1 ст., принимает препараты. Пульс не выше 140.',
      notes: 'Мерить давление до и после тренировки.',
    },
    50,
  )
  const olga = client(
    'Ольга Белова',
    {
      phone: '+7 999 871-25-36',
      birthDate: '2001-03-11',
      goal: 'Подтянуться 5 раз без резинки',
      notes: 'Студентка, расписание плавает — подтверждать накануне.',
    },
    35,
  )
  const alexey = client(
    'Алексей Козлов',
    {
      phone: '+7 926 145-90-12',
      birthDate: '1988-06-27',
      goal: 'Жим лёжа 120 кг',
      health: 'Старая травма левого локтя — аккуратно с узким хватом',
      notes: 'Опыт 5 лет. Любит тяжёлые тренировки, не любит кардио.',
    },
    42,
  )
  const natalia = client(
    'Наталья Фёдорова',
    {
      phone: '+7 916 533-48-70',
      birthDate: '1983-10-19',
      goal: 'Восстановление после родов, укрепить кор',
      health: 'Диастаз 1,5 см: без классических скручиваний',
      notes: 'Приходит с коляской, ребёнок спит — тренировка 45 мин.',
    },
    30,
  )
  const pavel = client(
    'Павел Соколов',
    {
      phone: '+7 903 768-02-55',
      birthDate: '1999-01-08',
      goal: 'Подготовка к функциональным стартам',
      notes: 'Высокий уровень. Сб утром — длинная тренировка.',
    },
    28,
  )

  const w = (
    c: Client,
    daysFromToday: number,
    time: string,
    title: string,
    blocks: WorkoutBlock[],
    notes = '',
  ): Workout => {
    const completed = daysFromToday < 0
    return {
      id: uid(),
      clientId: c.id,
      date: addDaysISO(today, daysFromToday),
      time,
      title,
      status: completed ? 'completed' : 'planned',
      // Planned circuits have no result yet.
      blocks: completed ? blocks : blocks.map(({ result: _result, ...b }) => b),
      notes,
      createdAt: now,
      updatedAt: now,
    }
  }

  const series = (
    c: Client,
    time: string,
    title: string,
    days: number[],
    build: (i: number) => WorkoutBlock[],
    notes: string[] = [],
  ) => days.map((d, i) => w(c, d, time, title, build(i), notes[i] ?? ''))

  const annaLower = (week: number) => [
    sets(
      ex(
        'Ягодичный мост',
        ['reps', 'weight'],
        repeat(4, { reps: 12, weight: 40 + week * 5 }),
        'Пауза 2 с в верхней точке',
        60,
      ),
    ),
    sets(
      ex(
        'Болгарские сплит-приседания',
        ['reps', 'weight'],
        repeat(3, { reps: 10, weight: 8 + week * 2 }),
        'На каждую ногу',
        60,
      ),
    ),
    superset(
      ex('Махи гирей', ['reps', 'weight'], repeat(3, { reps: 15, weight: 12 + (week > 1 ? 4 : 0) })),
      ex('Планка', ['time'], repeat(3, { timeSec: 40 + week * 10 })),
    ),
  ]

  const workouts: Workout[] = [
    w(anna, -18, '19:00', 'Низ тела + кор', annaLower(0), 'Хорошее самочувствие. Техника моста — ок.'),
    w(anna, -11, '19:00', 'Низ тела + кор', annaLower(1), 'Устала после работы, последний подход махов сократили.'),
    w(anna, -4, '19:00', 'Низ тела + кор', annaLower(2), 'Отлично! Прибавили вес в мосту. Спина не беспокоила.'),
    w(anna, 0, '19:00', 'Круговая на всё тело', [
      block(
        'rounds',
        [
          ex('Гоблет-присед', ['reps', 'weight'], [{ reps: 12, weight: 16 }]),
          ex('Тяга TRX', ['reps'], [{ reps: 12 }]),
          ex('Бёрпи', ['reps'], [{ reps: 8 }], 'Без прыжка в конце'),
          ex('Гребной тренажёр', ['calories'], [{ calories: 12 }], 'Темп 24–26 гребков в минуту'),
        ],
        { rounds: 3 },
      ),
      sets(ex('Боковая планка', ['time'], repeat(2, { timeSec: 30 }), 'На каждую сторону')),
    ]),
    w(anna, 3, '19:00', 'Низ тела + кор', annaLower(3)),

    w(
      igor,
      -9,
      '07:30',
      'Выносливость',
      [
        sets(ex('Гребной тренажёр', ['calories'], repeat(4, { calories: 20 }), 'Каждый отрезок ровно', 90)),
        block(
          'rounds',
          [
            ex('Трастеры', ['reps', 'weight'], [{ reps: 12, weight: 30 }]),
            ex('Прыжки на тумбу', ['reps'], [{ reps: 10 }]),
          ],
          { rounds: 3 },
          { timeSec: min(9, 40) },
        ),
      ],
      'Пульс держал в зоне 2 на гребле.',
    ),
    w(
      igor,
      -2,
      '07:30',
      'Сила + кондиции',
      [
        sets(
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
        ),
        block(
          'amrap',
          [
            ex('Фермерская прогулка', ['distance', 'weight'], [{ distance: 40, weight: 24 }]),
            ex('Канаты (Battle ropes)', ['time'], [{ timeSec: 30 }]),
            ex('Бёрпи', ['reps'], [{ reps: 6 }]),
          ],
          { durationSec: min(10) },
          { rounds: 6, reps: 4 },
        ),
      ],
      'Становая — новый рабочий вес 100 кг.',
    ),
    w(igor, 2, '07:30', 'Интервалы', [
      block(
        'emom',
        [ex('Велотренажёр (Assault bike)', ['calories'], [{ calories: 12 }], 'Если не успевает — 10 кал')],
        { durationSec: min(12), intervalSec: 60 },
      ),
      superset(
        ex('Махи гирей', ['reps', 'weight'], repeat(4, { reps: 20, weight: 24 })),
        ex('Скручивания', ['reps'], repeat(4, { reps: 20 })),
      ),
    ]),

    w(
      maria,
      -7,
      '11:00',
      'Мобильность и спина',
      [
        sets(ex('Кошка-корова', ['reps'], repeat(2, { reps: 10 }))),
        sets(ex('Растяжка «90/90»', ['time'], repeat(2, { timeSec: 60 }))),
        sets(ex('Тяга TRX', ['reps'], repeat(3, { reps: 10 }), 'Без боли в плече — продолжаем')),
        sets(ex('Боковая планка', ['time'], repeat(2, { timeSec: 20 }))),
      ],
      'Плечо реагирует на подъём выше головы — пока исключаем жимы вверх.',
    ),
    w(maria, 0, '11:00', 'Мобильность и спина', [
      sets(ex('Кошка-корова', ['reps'], repeat(2, { reps: 12 }))),
      sets(ex('Медвежья походка', ['distance'], repeat(3, { distance: 10 }))),
      superset(
        ex('Тяга TRX', ['reps'], repeat(3, { reps: 12 })),
        ex('Ягодичный мост', ['reps'], repeat(3, { reps: 15 })),
      ),
    ]),

    ...series(
      dmitry,
      '08:00',
      'Верх тела',
      [-26, -19, -12, -5, 2],
      (i) => [
        sets(ex('Жим лёжа', ['reps', 'weight'], repeat(4, { reps: 8, weight: 60 + i * 2.5 }), '', 120)),
        sets(ex('Подтягивания', ['reps'], repeat(4, { reps: 6 + Math.min(i, 2) }), '', 90)),
        superset(
          ex('Жим гантелей стоя', ['reps', 'weight'], repeat(3, { reps: 10, weight: 14 + (i > 2 ? 2 : 0) })),
          ex('Сгибания на бицепс', ['reps', 'weight'], repeat(3, { reps: 12, weight: 12 })),
        ),
      ],
      ['', 'Подтягивания: последний подход 5 повторов.', 'Набрал 1,2 кг за месяц.', 'Жим 67,5 кг на 8 — уверенно.'],
    ),
    ...series(
      dmitry,
      '08:00',
      'Низ тела',
      [-24, -17, -10, -3, 4],
      (i) => [
        sets(
          ex(
            'Приседания со штангой',
            ['reps', 'weight'],
            repeat(4, { reps: 8, weight: 70 + i * 5 }),
            'Глубина — параллель',
            150,
          ),
        ),
        sets(ex('Румынская тяга', ['reps', 'weight'], repeat(3, { reps: 10, weight: 60 + i * 5 }), '', 120)),
        superset(
          ex('Выпады с гантелями', ['reps', 'weight'], repeat(3, { reps: 10, weight: 14 }), 'На каждую ногу'),
          ex('Подъём ног в висе', ['reps'], repeat(3, { reps: 10 + i })),
        ),
      ],
      ['Крепатура после первого раза — норм.', '', 'Присед 80 кг — колени не заваливает.', ''],
    ),

    ...series(
      elena,
      '19:30',
      'Круговая на жиросжигание',
      [-33, -29, -26, -22, -19, -15, -12, -8, -5, -1, 3],
      (i) => [
        block(
          'rounds',
          [
            ex('Гоблет-присед', ['reps', 'weight'], [{ reps: 15, weight: 10 + Math.floor(i / 3) * 2 }]),
            ex('Тяга TRX', ['reps'], [{ reps: 12 }]),
            ex('Ягодичный мост', ['reps', 'weight'], [{ reps: 15, weight: 30 + i * 2.5 }]),
            ex('Гребной тренажёр', ['calories'], [{ calories: 12 + Math.floor(i / 3) }]),
          ],
          { rounds: 3 },
          { timeSec: min(16, 30) - i * 20 },
        ),
        sets(ex('Планка', ['time'], repeat(3, { timeSec: 30 + i * 5 }))),
      ],
      [
        'Замеры сделаны.',
        '',
        'Пропустила ужин — к концу закружилась голова.',
        '',
        '',
        '',
        '',
        'Довольна результатом на весах!',
        '',
        'Минус 2,8 кг за месяц.',
      ],
    ),

    ...series(
      sergey,
      '10:00',
      'Оздоровительная',
      [-40, -33, -26, -19, -12, -5, 2],
      (i) => [
        sets(ex('Велотренажёр (Assault bike)', ['time'], [{ timeSec: 600 + i * 60 }], 'Пульс 110–125, ровный темп')),
        block(
          'rounds',
          [
            ex('Гоблет-присед', ['reps', 'weight'], [{ reps: 12, weight: 8 + Math.floor(i / 2) * 2 }]),
            ex('Тяга верхнего блока', ['reps', 'weight'], [{ reps: 12, weight: 30 + i * 2.5 }]),
            ex('Фермерская прогулка', ['distance', 'weight'], [{ distance: 30, weight: 12 + (i > 3 ? 4 : 0) }]),
          ],
          { rounds: 3 },
        ),
        sets(ex('Растяжка «90/90»', ['time'], repeat(2, { timeSec: 60 }))),
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
      '17:00',
      'Спина и подтягивания',
      [-31, -24, -17, -10, -3, 4],
      (i) => [
        sets(
          ex(
            'Подтягивания',
            ['reps', 'band'],
            repeat(4, { reps: 3 + Math.min(i, 3), band: i < 3 ? 'Зелёная' : 'Красная' }),
            i < 3 ? 'С толстой резинкой' : 'С тонкой резинкой',
            120,
          ),
        ),
        sets(ex('Тяга верхнего блока', ['reps', 'weight'], repeat(3, { reps: 10, weight: 25 + i * 2.5 }))),
        superset(
          ex(
            'Тяга гантели в наклоне',
            ['reps', 'weight'],
            repeat(3, { reps: 10, weight: 8 + (i > 2 ? 2 : 0) }),
            'На каждую руку',
          ),
          ex('Отжимания', ['reps'], repeat(3, { reps: 6 + i })),
        ),
        sets(ex('Боковая планка', ['time'], repeat(2, { timeSec: 25 + i * 5 }))),
      ],
      ['', '', 'Перешли на тонкую резинку со следующей тренировки.', '', 'Первое чистое подтягивание без резинки!'],
    ),

    ...series(
      alexey,
      '18:00',
      'Жим (тяжёлый день)',
      [-36, -29, -22, -15, -8, -1, 6],
      (i) => [
        sets(
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
        ),
        sets(ex('Жим гантелей на наклонной', ['reps', 'weight'], repeat(3, { reps: 8, weight: 30 }), '', 120)),
        superset(
          ex('Отжимания на брусьях', ['reps', 'weight'], repeat(3, { reps: 8, weight: 10 + (i > 3 ? 5 : 0) })),
          ex('Тяга гантели в наклоне', ['reps', 'weight'], repeat(3, { reps: 10, weight: 36 })),
        ),
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
      '18:00',
      'Ноги и спина',
      [-33, -26, -19, -12, -5],
      (i) => [
        sets(ex('Становая тяга', ['reps', 'weight'], repeat(3, { reps: 5, weight: 140 + i * 5 }), '', 180)),
        sets(ex('Приседания со штангой', ['reps', 'weight'], repeat(3, { reps: 6, weight: 110 + i * 2.5 }), '', 150)),
        sets(ex('Подтягивания', ['reps', 'weight'], repeat(3, { reps: 8, weight: 10 }))),
        sets(ex('Гребной тренажёр', ['calories'], [{ calories: 40 }], 'Обязательное кардио :)')),
      ],
      ['', 'Ворчал на греблю, но сделал.', '', '', 'Становая 160 × 5.'],
    ),

    ...series(
      natalia,
      '10:30',
      'Кор и восстановление',
      [-27, -24, -20, -17, -13, -10, -6, -3, 1],
      (i) => [
        sets(ex('Кошка-корова', ['reps'], repeat(2, { reps: 10 }))),
        sets(
          i < 4
            ? ex('Ягодичный мост', ['reps'], repeat(3, { reps: 15 }))
            : ex('Ягодичный мост', ['reps', 'weight'], repeat(3, { reps: 15, weight: 10 })),
        ),
        sets(ex('Медвежья походка', ['distance'], repeat(3, { distance: 8 + i }))),
        superset(
          ex('Боковая планка', ['time'], repeat(2, { timeSec: 15 + i * 3 }), 'На каждую сторону'),
          ex('Гоблет-присед', ['reps', 'weight'], repeat(2, { reps: 12, weight: 6 + Math.floor(i / 3) * 2 })),
        ),
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
      '09:00',
      'Функциональный комплекс',
      [-25, -21, -18, -14, -11, -7, -4, 3],
      (i) => [
        sets(ex('Толчок саней', ['distance', 'weight'], repeat(4, { distance: 20, weight: 80 + i * 5 }), '', 90)),
        block(
          'fortime',
          [
            ex('Трастеры', ['reps', 'weight'], [{ reps: 10, weight: 40 + Math.floor(i / 2) * 2.5 }]),
            ex('Бёрпи', ['reps'], [{ reps: 12 }]),
            ex('Броски мяча в цель (Wall ball)', ['reps', 'weight'], [{ reps: 20, weight: 9 }]),
            ex('Гребной тренажёр', ['calories'], [{ calories: 15 }]),
          ],
          { rounds: 5, durationSec: min(30) },
          { timeSec: [min(24, 10), min(23, 40), min(24, 30), min(22, 45), min(22, 20), min(22, 5), min(21, 30)][i] },
        ),
        block(
          'emom',
          [ex('Махи гирей', ['reps', 'weight'], [{ reps: 15, weight: 24 }])],
          { durationSec: min(6), intervalSec: 60 },
          { rounds: 6 },
        ),
      ],
      ['', '', 'Не выспался, темп ниже.', '', '', '', 'Лучший результат в комплексе.'],
    ),
  ]

  const m = (c: Client, daysAgo: number, values: Partial<Measurement>, note = ''): Measurement => ({
    id: uid(),
    clientId: c.id,
    date: addDaysISO(today, -daysAgo),
    ...values,
    ...(note && { note }),
    createdAt: now - daysAgo * 86_400_000,
    updatedAt: now,
  })

  const measurements: Measurement[] = [
    m(anna, 18, { weightKg: 68.5, heightCm: 168, waistCm: 76, hipsCm: 102, bodyFatPct: 29 }),
    m(anna, 11, { weightKg: 68.1, waistCm: 75.5 }),
    m(anna, 4, { weightKg: 67.6, waistCm: 74.5, hipsCm: 101, bodyFatPct: 28 }),

    m(
      elena,
      33,
      { weightKg: 71.4, heightCm: 170, waistCm: 80, hipsCm: 104, chestCm: 92, thighCm: 60 },
      'Утром натощак',
    ),
    m(elena, 26, { weightKg: 70.6, waistCm: 79 }),
    m(elena, 19, { weightKg: 70.1, waistCm: 78, hipsCm: 103 }),
    m(elena, 12, { weightKg: 69.4, waistCm: 77 }),
    m(elena, 5, { weightKg: 69.0, waistCm: 76.5, hipsCm: 102, chestCm: 91, thighCm: 58.5 }),
    m(elena, 1, { weightKg: 68.6 }),

    m(dmitry, 26, { weightKg: 72, heightCm: 178, chestCm: 96, armCm: 33.5, bodyFatPct: 14 }),
    m(dmitry, 12, { weightKg: 72.8, chestCm: 97, armCm: 34 }),
    m(dmitry, 3, { weightKg: 73.2, chestCm: 98, armCm: 34.5, bodyFatPct: 14 }),

    m(sergey, 40, { weightKg: 88, heightCm: 175, waistCm: 102 }, 'АД 145/92'),
    m(sergey, 19, { weightKg: 86.6, waistCm: 100 }),
    m(sergey, 5, { weightKg: 85.4, waistCm: 98.5 }, 'АД 128/84'),
  ]

  await db.transaction('rw', db.clients, db.workouts, db.measurements, async () => {
    await db.clients.bulkAdd([anna, igor, maria, dmitry, elena, sergey, olga, alexey, natalia, pavel])
    await db.workouts.bulkAdd(workouts)
    await db.measurements.bulkAdd(measurements)
  })
  await normalizeLocalData()
}
