// i18n.js — локализация игры по языку сайта (ru — исходный, en — перевод).
// Классический (не module) скрипт: подключается ПЕРЕД <script type="module" src="game.js">,
// поэтому выполняется синхронно при парсинге и применяет статические строки до отрисовки
// (без «мигания» исходного языка). game.js берёт динамические строки из window.SealI18n.
//
// Язык приходит из ?lang=ru|en (его проставляет страница-обёртка по локали сайта).
// Имена/бренд не «переводим на лету» — это заранее подготовленные варианты в словаре.
(function () {
  'use strict';

  // Контакт оператора для standalone-альфы (sealthehunter.online). Это ОТОБРАЖАЕМЫЙ контакт
  // (как в Impressum), а не форма сбора email — соответствует COMPLIANCE.
  var FEEDBACK_EMAIL = 'feedback@sealthehunter.online';

  var DICT = {
    ru: {
      // — статика (index.html)
      title: 'Тюль-Охотник',
      metaDescription: 'Мобильная игра про тюленя — лови рыбу за 60 секунд!',
      hudAriaLabel: 'Панель игры',
      canvasAriaLabel: 'Игровое поле: тюлень охотится за рыбой',
      hudTimeTitle: 'Оставшееся время',
      hudScoreTitle: 'Очки',
      hudBestTitle: 'Рекорд на этом устройстве',
      btnStart: 'Старт',
      btnPause: 'Пауза',
      btnSoundTitle: 'Звук',
      btnAgain: 'Играть ещё',
      btnShareEnd: 'Поделиться',
      btnShareEndTitle: 'Поделиться результатом',
      noscript: 'Для игры нужен JavaScript.',
      // — динамика (game.js)
      btnPlay: 'Играть',
      btnResume: 'Продолжить',
      soundOn: 'Звук: вкл',
      soundOff: 'Звук: выкл',
      intro:
        'Лови как можно больше 🐟 за <b>60 секунд</b>.<br>Управление: удерживай палец/мышь — тюлень плывёт за касанием.',
      friendChallenge: function (v) {
        return (
          'Ваш друг (подруга) набрал(а) <b>' +
          v.score +
          '</b> очков (рекорд: <b>' +
          v.best +
          '</b>). Сможете больше?'
        );
      },
      timeUpNewRecord: function (v) {
        return 'Время вышло! Ваш счёт: <b>' + v.score + '</b> 🐟 — <b>Новый рекорд!</b> 🏆';
      },
      timeUp: function (v) {
        return 'Время вышло! Ваш счёт: <b>' + v.score + '</b> 🐟 рекорд: <b>' + v.best + '</b> 🏆';
      },
      shareNewRecordTag: ' — новый рекорд!',
      shareText: function (v) {
        return 'Мой счёт: ' + v.score + ' 🐟 рекорд: ' + v.best + ' 🏆 за 60 секунд' + v.tag;
      },
      linkCopied: 'Ссылка скопирована!',
      copyShare: 'Скопируйте и поделитесь:',
      // — лидерборд
      lbTitle: 'Лидерборд',
      lbResetNote: 'за неделю',
      lbDesktop: 'Десктоп',
      lbMobile: 'Мобайл',
      lbEmpty: 'Пока пусто — будь первым!',
      lbOffline: 'Лидерборд недоступен.',
      lbLoading: 'Загрузка…',
      lbMore: 'Показать ещё',
      lbPlayers: function (v) {
        return 'Игроков: ' + v.n;
      },
      lbResetIn: function (v) {
        return '⏳ Сброс через ' + v.t;
      },
      lbYouLine: function (v) {
        return 'Вы: #' + v.rank + ' из ' + v.total + ' · топ ' + v.pct + '%';
      },
      helloLine: function (v) {
        return 'Привет, ' + v.alias + '!';
      },
      // — standalone-альфа (только на sealthehunter.online)
      alphaNotice: 'Это ограниченный альфа-тест игры. Спасибо, что играете!',
      feedbackInvite: function () {
        return (
          'Нашли баг или есть идея? Пишите: <a href="mailto:' +
          FEEDBACK_EMAIL +
          '">' +
          FEEDBACK_EMAIL +
          '</a>'
        );
      },
      langSwitchLabel: 'Язык игры',
    },
    en: {
      // — static (index.html)
      title: 'Seal The Hunter',
      metaDescription: 'A mobile game about a seal — catch fish in 60 seconds!',
      hudAriaLabel: 'Game toolbar',
      canvasAriaLabel: 'Playfield: a seal hunts for fish',
      hudTimeTitle: 'Time left',
      hudScoreTitle: 'Score',
      hudBestTitle: 'Best score on this device',
      btnStart: 'Start',
      btnPause: 'Pause',
      btnSoundTitle: 'Sound',
      btnAgain: 'Play again',
      btnShareEnd: 'Share',
      btnShareEndTitle: 'Share your result',
      noscript: 'JavaScript is required to play.',
      // — dynamic (game.js)
      btnPlay: 'Play',
      btnResume: 'Resume',
      soundOn: 'Sound: on',
      soundOff: 'Sound: off',
      intro:
        'Catch as many 🐟 as you can in <b>60 seconds</b>.<br>Controls: hold finger/mouse — the seal follows your touch.',
      friendChallenge: function (v) {
        return (
          'A friend scored <b>' + v.score + '</b> points (best: <b>' + v.best + '</b>). Can you beat it?'
        );
      },
      timeUpNewRecord: function (v) {
        return "Time's up! Your score: <b>" + v.score + '</b> 🐟 — <b>New record!</b> 🏆';
      },
      timeUp: function (v) {
        return "Time's up! Your score: <b>" + v.score + '</b> 🐟 best: <b>' + v.best + '</b> 🏆';
      },
      shareNewRecordTag: ' — new record!',
      shareText: function (v) {
        return 'My score: ' + v.score + ' 🐟 best: ' + v.best + ' 🏆 in 60 seconds' + v.tag;
      },
      linkCopied: 'Link copied!',
      copyShare: 'Copy and share:',
      // — leaderboard
      lbTitle: 'Leaderboard',
      lbResetNote: 'this week',
      lbDesktop: 'Desktop',
      lbMobile: 'Mobile',
      lbEmpty: 'Empty — be the first!',
      lbOffline: 'Leaderboard unavailable.',
      lbLoading: 'Loading…',
      lbMore: 'Show more',
      lbPlayers: function (v) {
        return v.n + ' players';
      },
      lbResetIn: function (v) {
        return '⏳ Resets in ' + v.t;
      },
      lbYouLine: function (v) {
        return 'You: #' + v.rank + ' of ' + v.total + ' · top ' + v.pct + '%';
      },
      helloLine: function (v) {
        return 'Hello, ' + v.alias + '!';
      },
      // — standalone alpha (sealthehunter.online only)
      alphaNotice: 'This is a limited alpha test run of the game. Thanks for playing!',
      feedbackInvite: function () {
        return (
          'Found a bug or have an idea? Email <a href="mailto:' +
          FEEDBACK_EMAIL +
          '">' +
          FEEDBACK_EMAIL +
          '</a>'
        );
      },
      langSwitchLabel: 'Game language',
    },
    de: {
      // — statisch (index.html)
      title: 'Robbe der Jäger',
      metaDescription: 'Ein mobiles Spiel über eine Robbe — fang in 60 Sekunden Fische!',
      hudAriaLabel: 'Spielleiste',
      canvasAriaLabel: 'Spielfeld: eine Robbe jagt Fische',
      hudTimeTitle: 'Verbleibende Zeit',
      hudScoreTitle: 'Punkte',
      hudBestTitle: 'Bestwert auf diesem Gerät',
      btnStart: 'Start',
      btnPause: 'Pause',
      btnSoundTitle: 'Ton',
      btnAgain: 'Nochmal spielen',
      btnShareEnd: 'Teilen',
      btnShareEndTitle: 'Ergebnis teilen',
      noscript: 'Zum Spielen wird JavaScript benötigt.',
      // — dynamisch (game.js)
      btnPlay: 'Spielen',
      btnResume: 'Fortsetzen',
      soundOn: 'Ton: an',
      soundOff: 'Ton: aus',
      intro:
        'Fang in <b>60 Sekunden</b> so viele 🐟 wie möglich.<br>Steuerung: Finger/Maus halten — die Robbe folgt der Berührung.',
      friendChallenge: function (v) {
        return (
          'Ein Freund hat <b>' +
          v.score +
          '</b> Punkte erreicht (Bestwert: <b>' +
          v.best +
          '</b>). Schaffst du mehr?'
        );
      },
      timeUpNewRecord: function (v) {
        return 'Zeit abgelaufen! Dein Ergebnis: <b>' + v.score + '</b> 🐟 — <b>Neuer Rekord!</b> 🏆';
      },
      timeUp: function (v) {
        return 'Zeit abgelaufen! Dein Ergebnis: <b>' + v.score + '</b> 🐟 Bestwert: <b>' + v.best + '</b> 🏆';
      },
      shareNewRecordTag: ' — neuer Rekord!',
      shareText: function (v) {
        return 'Mein Ergebnis: ' + v.score + ' 🐟 Bestwert: ' + v.best + ' 🏆 in 60 Sekunden' + v.tag;
      },
      linkCopied: 'Link kopiert!',
      copyShare: 'Kopieren und teilen:',
      // — Bestenliste
      lbTitle: 'Bestenliste',
      lbResetNote: 'diese Woche',
      lbDesktop: 'Desktop',
      lbMobile: 'Mobil',
      lbEmpty: 'Noch leer — sei der Erste!',
      lbOffline: 'Bestenliste nicht verfügbar.',
      lbLoading: 'Lädt…',
      lbMore: 'Mehr anzeigen',
      lbPlayers: function (v) {
        return v.n + ' Spieler';
      },
      lbResetIn: function (v) {
        return '⏳ Reset in ' + v.t;
      },
      lbYouLine: function (v) {
        return 'Du: #' + v.rank + ' von ' + v.total + ' · Top ' + v.pct + '%';
      },
      helloLine: function (v) {
        return 'Hallo, ' + v.alias + '!';
      },
      // — Standalone-Alpha (nur auf sealthehunter.online)
      alphaNotice: 'Dies ist ein begrenzter Alpha-Test des Spiels. Danke fürs Spielen!',
      feedbackInvite: function () {
        return (
          'Bug gefunden oder eine Idee? Schreib an <a href="mailto:' +
          FEEDBACK_EMAIL +
          '">' +
          FEEDBACK_EMAIL +
          '</a>'
        );
      },
      langSwitchLabel: 'Spielsprache',
    },
  };

  // STANDALONE = игра открыта самостоятельной страницей (sealthehunter.online), не во фрейме.
  // Во фрейме (встраивание на sealife.*) язык приходит из ?lang= и переключателя нет.
  var STANDALONE = (function () {
    try {
      return window.self === window.top;
    } catch (e) {
      return false;
    }
  })();
  var LANG_KEY = 'seal_hunt_lang';

  function validLang(l) {
    return l === 'ru' || l === 'en' || l === 'de' ? l : null;
  }
  function storedLang() {
    try {
      return validLang(localStorage.getItem(LANG_KEY));
    } catch (e) {
      return null;
    }
  }
  // Язык браузера → поддерживаемая локаль (та же политика, что в src/proxy.ts pickLocale:
  // русскоязычные → ru, немецкоязычные → de, остальные → en). Применяем только в standalone.
  function navLang() {
    var n = ((navigator.language || navigator.userLanguage || '') + '').slice(0, 2).toLowerCase();
    return n === 'ru' ? 'ru' : n === 'de' ? 'de' : 'en';
  }

  // Источник — ru; поддерживаем en и de. Порядок выбора:
  //   ?lang= → (standalone) сохранённый выбор → (standalone) язык браузера → ru.
  var param = validLang(new URLSearchParams(location.search).get('lang'));
  var LANG = param || (STANDALONE ? storedLang() || navLang() : null) || 'ru';
  var STR = DICT[LANG];

  function t(key, vars) {
    var v = STR[key];
    if (v == null) v = DICT.ru[key]; // подстраховка: недостающий перевод → исходный ru
    return typeof v === 'function' ? v(vars || {}) : v;
  }

  // Применяем статические строки сразу (DOM выше этого скрипта уже распарсен).
  function applyStatic() {
    document.documentElement.lang = LANG;
    document.title = t('title');

    var setEach = function (sel, fn) {
      var nodes = document.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) fn(nodes[i]);
    };
    setEach('[data-i18n]', function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    setEach('[data-i18n-title]', function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    setEach('[data-i18n-aria]', function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    setEach('[data-i18n-content]', function (el) {
      el.setAttribute('content', t(el.getAttribute('data-i18n-content')));
    });
  }

  applyStatic();

  // Сменить язык во время игры (standalone-переключатель). persist=true → запомнить ВЫБОР
  // (COMPLIANCE: язык в localStorage только после явного выбора пользователя). После смены
  // зовём onChange — game.js перерисовывает динамику (приветствие, интро, доску, заметки).
  var onChange = null;
  function setLang(l, persist) {
    l = validLang(l) || 'ru';
    LANG = l;
    STR = DICT[LANG];
    applyStatic();
    window.SealI18n.lang = LANG;
    if (persist) {
      try {
        localStorage.setItem(LANG_KEY, LANG);
      } catch (e) {}
    }
    if (typeof onChange === 'function') {
      try {
        onChange(LANG);
      } catch (e) {}
    }
  }

  window.SealI18n = {
    lang: LANG,
    t: t,
    dict: DICT,
    standalone: STANDALONE,
    setLang: setLang,
    onLangChange: function (cb) {
      onChange = cb;
    },
  };
})();
