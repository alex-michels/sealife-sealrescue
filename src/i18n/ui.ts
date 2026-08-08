import { defaultLocale, type Locale } from './config'

/**
 * Строки интерфейса фронтенда. Контент (статьи/мемы) хранится в Payload и
 * переводится заранее; здесь только статичные подписи UI.
 * Бренд и tagline у каждого сайта свои — см. `src/site/config.ts`.
 *
 * При добавлении локали TypeScript потребует заполнить все ключи — намеренно,
 * чтобы перевод интерфейса не забыли.
 */
type UIKey =
  // sealife
  | 'latest'
  | 'empty'
  | 'aiGenerated'
  // provenance-шкала (EU-11 / AI Act Art. 50). `aiGenerated` выше — устаревшая общая метка,
  // остаётся запасной для записей, у которых группа `provenance` ещё не заполнена.
  | 'provTitle'
  | 'provAiAssisted'
  | 'provAiTranslated'
  | 'provAiChecked'
  | 'provSourceVerified'
  | 'provHumanReviewed'
  | 'language'
  | 'crossRescue'
  | 'crossRescueCta'
  | 'crossRescueCurious'
  | 'crossRescueCuriousCta'
  | 'backHome'
  // 404 (микрокопия различается по сайту — бриф §7)
  | 'notFoundTitle'
  | 'notFoundBodyLife'
  | 'notFoundBodyRescue'
  // bento-хаб главной sealife (M1-T05). Порядок слотов — §6a брифа.
  | 'bentoToday'
  | 'sectionsAll'
  | 'quizOfDay'
  | 'memeOfDay'
  | 'gamePick'
  | 'newsLatest'
  | 'speciesHub'
  // Пустые состояния плиток: у каждой своя строка (§8 — пустой экран приглашает к действию,
  // а пять одинаковых «пусто» читаются как сломанная страница).
  | 'bentoFactEmpty'
  | 'bentoQuizSoon'
  | 'bentoMemeEmpty'
  | 'bentoGameEmpty'
  | 'bentoNewsEmpty'
  | 'bentoSpeciesEmpty'
  | 'bentoOpen'
  | 'filterAll'
  | 'filterByTopic'
  | 'factOfDay'
  | 'speciesRange'
  | 'speciesLength'
  | 'speciesConservation'
  // sealrescue — инструкции «нашёл тюленя» (BIO-01..BIO-06, аудит 2026-07-26).
  // Порядок в UI намеренный: сначала «обычно норма», потом что делать, потом чего НЕ делать,
  // и только потом признаки, по которым звонить. Если начать с шагов, читатель считает, что
  // вмешаться надо всегда, — а изъятие здоровых детёнышей и есть главный реальный вред.
  | 'rescueHeadline'
  | 'rescueNormal'
  | 'rescueDoTitle'
  | 'rescueStep1'
  | 'rescueStep2'
  | 'rescueStep3'
  | 'rescueStep4'
  | 'rescueNeverTitle'
  | 'rescueNever1'
  | 'rescueNever2'
  | 'rescueNever3'
  | 'rescueNever4'
  | 'rescueBite'
  | 'rescueSignsTitle'
  | 'rescueSign1'
  | 'rescueSign2'
  | 'rescueSign3'
  | 'rescueSign4'
  | 'rescueSign5'
  | 'rescueSign6'
  | 'rescueSign7'
  | 'rescueDistance'
  | 'rescueCta'
  | 'centersTitle'
  | 'centersSoon'
  | 'crossLife'
  | 'crossLifeCta'
  // согласие на аналитику / cookie
  | 'consentTitle'
  | 'consentText'
  | 'consentMore'
  | 'consentAccept'
  | 'consentDecline'
  | 'footerCookies'
  | 'cookiesTitle'
  | 'cookiesIntro'
  | 'cookiesPlausible'
  | 'cookiesWithdraw'
  | 'cookiesStatusLabel'
  | 'cookiesGranted'
  | 'cookiesDenied'
  | 'cookiesNone'
  | 'cookiesEnable'
  | 'cookiesDisable'

const dict: Record<Locale, Record<UIKey, string>> = {
  ru: {
    latest: 'Свежее',
    empty: 'Тут пока тихо, как тюлень после обеда.',
    aiGenerated: 'Подготовлено с участием AI.',
    provTitle: 'Происхождение материала',
    provAiAssisted: 'Черновик готовил AI',
    provAiTranslated: 'Машинный перевод',
    provAiChecked: 'Факты сверял агент',
    provSourceVerified: 'Источники подтверждены',
    provHumanReviewed: 'Проверено человеком',
    language: 'Язык',
    crossRescue: 'Нашёл тюленя? Это не шутки.',
    crossRescueCta: 'Что делать →',
    crossRescueCurious: 'А как вообще спасают тюленей?',
    crossRescueCuriousCta: 'Узнать →',
    backHome: '← На главную',
    notFoundTitle: 'Страница не найдена',
    notFoundBodyLife: 'Эта страница уплыла — или её никогда и не было.',
    notFoundBodyRescue:
      'Такой страницы нет. Проверьте адрес или вернитесь на главную — там есть инструкция «нашёл тюленя» и список разделов.',
    bentoToday: 'Сегодня',
    sectionsAll: 'Все разделы',
    quizOfDay: 'Квиз дня',
    memeOfDay: 'Мем дня',
    gamePick: 'Во что поиграть',
    newsLatest: 'Последняя новость',
    speciesHub: 'Тюленепедия',
    bentoFactEmpty: 'Факты ещё досыпаются в тюленепедию.',
    bentoQuizSoon: 'Квизы ещё на подходе — готовим вопросы.',
    bentoMemeEmpty: 'Мемы ещё сохнут на камне.',
    bentoGameEmpty: 'Игры чинят ласты.',
    bentoNewsEmpty: 'Новостей нет — у ластоногих всё спокойно.',
    bentoSpeciesEmpty: 'Тюленепедия ещё набирает виды.',
    bentoOpen: 'Открыть раздел',
    filterAll: 'Все',
    filterByTopic: 'Фильтр по теме',
    factOfDay: 'Факт дня',
    speciesRange: 'Ареал',
    speciesLength: 'Размер',
    speciesConservation: 'Охранный статус',
    rescueHeadline: 'Нашёл тюленя на берегу?',
    rescueNormal:
      'Скорее всего, с ним всё в порядке. Тюлени выходят на сушу отдыхать, греться и линять — ' +
      'это их нормальная жизнь, а не беда. Одинокий детёныш обычно НЕ брошен: мать кормится в ' +
      'море и возвращается, иногда через несколько часов. Понаблюдайте издалека и не вмешивайтесь.',
    rescueDoTitle: 'Что делать',
    rescueStep1: 'Отойдите и наблюдайте с расстояния — не ближе 100 метров.',
    rescueStep2:
      'Возьмите собаку на поводок и уведите: собака и тюлень легко травмируют друг друга.',
    rescueStep3: 'Не подходите ради фото, не обступайте животное, говорите тихо.',
    rescueStep4:
      'Осмотрите его издалека по признакам ниже — и звоните в центр, если хоть один есть.',
    rescueNeverTitle: 'Чего НЕ делать никогда',
    rescueNever1:
      'Не сталкивайте и не относите тюленя в воду. Он вышел на берег намеренно — отдохнуть, ' +
      'согреться или потому что болен. Ослабевшее животное в воде тонет. Это самая частая ' +
      'ошибка очевидцев, и она убивает.',
    rescueNever2: 'Не поливайте водой и не накрывайте — тюлень перегреется или запаникует.',
    rescueNever3: 'Не кормите и не поите: неправильная еда и вода в лёгких убивают вернее голода.',
    rescueNever4: 'Не перевозите сами. Центр приедет или подскажет, что делать.',
    rescueBite:
      'И не трогайте руками: тюлень кусается — быстро и сильно. Укусы и просто контакт передают ' +
      'инфекции («палец тюленя», микоплазмоз и другие), опасные и для людей, и для собак.',
    rescueSignsTitle: 'Когда всё-таки звонить',
    rescueSign1: 'видимая рана или кровь;',
    rescueSign2: 'запутался в сети, леске или пластике;',
    rescueSign3: 'тяжёлое, шумное дыхание или кашель;',
    rescueSign4: 'выделения или корки вокруг глаз и носа;',
    rescueSign5: 'заметная худоба — торчат рёбра, складки на шее;',
    rescueSign6: 'не реагирует на обычный шум пляжа, подпускает вплотную;',
    rescueSign7: 'детёныш в белом пушистом мехе один, или у него не отпала пуповина.',
    rescueDistance:
      'Держитесь не ближе 100 метров — а где местные правила требуют больше, соблюдайте их: ' +
      'точная норма зависит от страны и от места.',
    rescueCta: 'Найти центры рядом →',
    centersTitle: 'Центры рядом',
    centersSoon: 'Каталог реабилитационных центров появится здесь (M2).',
    crossLife: 'Устали от серьёзного?',
    crossLifeCta: 'К тюленям →',
    consentTitle: 'Согласие на аналитику',
    consentText:
      'Мы используем Plausible — приватную аналитику без cookies. Она не собирает персональные данные, не идентифицирует вас и не передаёт данные третьим лицам. Включить аналитику?',
    consentMore: 'Подробнее',
    consentAccept: 'Принять',
    consentDecline: 'Отклонить',
    footerCookies: 'Настройки cookie',
    cookiesTitle: 'Аналитика и cookie',
    cookiesIntro:
      'Сайт использует Plausible Analytics — приватный аналитический сервис. Он не использует cookies, не собирает персональные данные и не идентифицирует посетителей. Данные о посещаемости обрабатываются в агрегированном виде и не передаются третьим лицам.',
    cookiesPlausible:
      'Аналитика включается только с вашего явного согласия (opt-in): до согласия скрипт не загружается. Ваш выбор согласия хранится в строго необходимом cookie.',
    cookiesWithdraw:
      'Вы можете в любой момент изменить или отозвать своё решение ниже — это так же просто, как дать согласие.',
    cookiesStatusLabel: 'Текущий выбор:',
    cookiesGranted: 'аналитика включена',
    cookiesDenied: 'аналитика отключена',
    cookiesNone: 'не задан',
    cookiesEnable: 'Включить аналитику',
    cookiesDisable: 'Отключить аналитику',
  },
  en: {
    latest: 'Latest',
    empty: 'Quiet here — like a seal after lunch.',
    aiGenerated: 'Prepared with AI assistance.',
    provTitle: 'Content provenance',
    provAiAssisted: 'Draft written by AI',
    provAiTranslated: 'Machine translation',
    provAiChecked: 'Facts checked by an agent',
    provSourceVerified: 'Sources verified',
    provHumanReviewed: 'Reviewed by a human',
    language: 'Language',
    crossRescue: 'Found a seal? This is no joke.',
    crossRescueCta: 'What to do →',
    crossRescueCurious: 'How are seals actually rescued?',
    crossRescueCuriousCta: 'Find out →',
    backHome: '← Home',
    notFoundTitle: 'Page not found',
    notFoundBodyLife: 'This page swam away — or maybe it never existed.',
    notFoundBodyRescue:
      'This page does not exist. Check the address or return to the start page — it has the "found a seal" guide and all sections.',
    bentoToday: 'Today',
    sectionsAll: 'All sections',
    quizOfDay: 'Quiz of the day',
    memeOfDay: 'Meme of the day',
    gamePick: 'Something to play',
    newsLatest: 'Latest news',
    speciesHub: 'Seal-pedia',
    bentoFactEmpty: 'Facts are still trickling into the seal-pedia.',
    bentoQuizSoon: 'Quizzes are on their way — questions in the making.',
    bentoMemeEmpty: 'The memes are still drying on a rock.',
    bentoGameEmpty: 'The games are fixing their flippers.',
    bentoNewsEmpty: 'No news — all quiet on the pinniped front.',
    bentoSpeciesEmpty: 'The seal-pedia is still collecting species.',
    bentoOpen: 'Open section',
    filterAll: 'All',
    filterByTopic: 'Filter by topic',
    factOfDay: 'Fact of the day',
    speciesRange: 'Range',
    speciesLength: 'Size',
    speciesConservation: 'Conservation status',
    rescueHeadline: 'Found a seal on the beach?',
    rescueNormal:
      'It is most likely fine. Seals come ashore to rest, warm up and moult — that is normal ' +
      'life, not trouble. A pup on its own is usually NOT abandoned: the mother is feeding at ' +
      'sea and comes back, sometimes hours later. Watch from a distance and leave it alone.',
    rescueDoTitle: 'What to do',
    rescueStep1: 'Move away and watch from a distance — at least 100 metres.',
    rescueStep2:
      'Put your dog on a lead and take it away: dogs and seals injure each other easily.',
    rescueStep3: 'Do not come closer for a photo, do not crowd the animal, keep your voice down.',
    rescueStep4:
      'Check it from afar against the signs below — call a centre if you see any of them.',
    rescueNeverTitle: 'Never do this',
    rescueNever1:
      'Never push or carry a seal into the water. It hauled out on purpose — to rest, to warm ' +
      'up, or because it is ill. A weakened animal drowns in the water. This is the most common ' +
      'bystander mistake, and it kills.',
    rescueNever2: 'Do not pour water on it and do not cover it — it will overheat or panic.',
    rescueNever3:
      'Do not feed it or give it water: the wrong food and water in the lungs kill faster than hunger.',
    rescueNever4: 'Do not transport it yourself. The centre will come out or tell you what to do.',
    rescueBite:
      'And keep your hands off: seals bite — fast and hard. Bites and even contact transmit ' +
      'infections (seal finger, Mycoplasma and others) that affect both people and dogs.',
    rescueSignsTitle: 'When to call after all',
    rescueSign1: 'a visible wound or blood;',
    rescueSign2: 'tangled in netting, fishing line or plastic;',
    rescueSign3: 'laboured, noisy breathing or coughing;',
    rescueSign4: 'discharge or crusting around the eyes and nose;',
    rescueSign5: 'visibly thin — ribs showing, loose folds at the neck;',
    rescueSign6: 'no reaction to normal beach noise, lets you walk right up;',
    rescueSign7: 'a pup in white fluffy fur alone, or with the umbilical cord still attached.',
    rescueDistance:
      'Stay at least 100 metres away — and where local rules require more, follow them: the ' +
      'exact figure depends on the country and the site.',
    rescueCta: 'Find centers nearby →',
    centersTitle: 'Centers nearby',
    centersSoon: 'The directory of rehabilitation centers will appear here (M2).',
    crossLife: 'Tired of the serious stuff?',
    crossLifeCta: 'To the seals →',
    consentTitle: 'Analytics consent',
    consentText:
      'We use Plausible — privacy-friendly analytics without cookies. It collects no personal data, does not identify you, and shares nothing with third parties. Enable analytics?',
    consentMore: 'Learn more',
    consentAccept: 'Accept',
    consentDecline: 'Decline',
    footerCookies: 'Cookie settings',
    cookiesTitle: 'Analytics & cookies',
    cookiesIntro:
      'This site uses Plausible Analytics — a privacy-friendly analytics service. It uses no cookies, collects no personal data, and does not identify visitors. Traffic data is processed in aggregate and never shared with third parties.',
    cookiesPlausible:
      'Analytics is enabled only with your explicit consent (opt-in): the script is not loaded before you agree. Your consent choice is stored in a strictly necessary cookie.',
    cookiesWithdraw:
      'You can change or withdraw your decision at any time below — it is as easy as giving consent.',
    cookiesStatusLabel: 'Current choice:',
    cookiesGranted: 'analytics enabled',
    cookiesDenied: 'analytics disabled',
    cookiesNone: 'not set',
    cookiesEnable: 'Enable analytics',
    cookiesDisable: 'Disable analytics',
  },
}

// Последний рубеж — словарь ИСХОДНОЙ локали (CR-14: en). Пропущенный ключ должен деградировать
// в язык, на котором строки пишутся, иначе английскому читателю молча покажут русский текст.
export const t = (locale: Locale, key: UIKey): string =>
  dict[locale]?.[key] ?? dict[defaultLocale][key]
