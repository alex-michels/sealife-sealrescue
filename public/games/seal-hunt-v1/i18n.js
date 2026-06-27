// i18n.js — локализация игры по языку сайта (ru — исходный, en — перевод).
// Классический (не module) скрипт: подключается ПЕРЕД <script type="module" src="game.js">,
// поэтому выполняется синхронно при парсинге и применяет статические строки до отрисовки
// (без «мигания» исходного языка). game.js берёт динамические строки из window.SealI18n.
//
// Язык приходит из ?lang=ru|en (его проставляет страница-обёртка по локали сайта).
// Имена/бренд не «переводим на лету» — это заранее подготовленные варианты в словаре.
(function () {
  'use strict';

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
    },
    en: {
      // — static (index.html)
      title: 'Seal Hunter',
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
    },
  };

  // Источник — ru; всё, что не en, откатывается на ru (инвариант локалей сайта).
  var param = new URLSearchParams(location.search).get('lang');
  var LANG = param === 'en' ? 'en' : 'ru';
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

  window.SealI18n = { lang: LANG, t: t, dict: DICT };
})();
