// ══════════════════════════════════════════════════════
//  Salune — main.js
// ══════════════════════════════════════════════════════

// ── delay utility ──
var delay = (function() {
  var timer = 0;
  return function(callback, ms) {
    clearTimeout(timer);
    timer = setTimeout(callback, ms);
  };
})();

// ══════════════════════════════════════════════════════
//  ROBUST AUDIO SYSTEM
//  Pre-loads all clips into AudioBuffers via Web Audio API.
//  Falls back to HTMLAudioElement if Web Audio is unavailable.
// ══════════════════════════════════════════════════════

var AudioCtx = window.AudioContext || window.webkitAudioContext;
var audioCtx = null;
var audioBuffers = {};
var audioUnlocked = false;

var SOUNDS = {
  hover:      'assets/audio/button-hover.mp3',
  select:     'assets/audio/button-select.mp3',
  zip:        'assets/audio/zip.mp3',
  back:       'assets/audio/back.mp3',
  startup:    'assets/audio/startup.mp3',
  bottomBtn:  'assets/audio/bottom-btn.mp3'
};

function initAudioCtx() {
  if (audioCtx) return;
  try { audioCtx = new AudioCtx(); } catch(e) {}
}

function loadBuffer(name, url) {
  if (!audioCtx) return;
  fetch(url)
    .then(function(r) { return r.arrayBuffer(); })
    .then(function(ab) { return audioCtx.decodeAudioData(ab); })
    .then(function(buf) { audioBuffers[name] = buf; })
    .catch(function() {}); // silently ignore missing files (e.g. bottom-btn.mp3)
}

function playSound(name) {
  if (audioCtx && audioBuffers[name]) {
    // Resume ctx if suspended (autoplay policy)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var src = audioCtx.createBufferSource();
    src.buffer = audioBuffers[name];
    src.connect(audioCtx.destination);
    src.start(0);
  } else {
    // Fallback: HTMLAudioElement clone (avoids "already playing" issue)
    var el = document.getElementById(name);
    if (el) {
      var clone = el.cloneNode();
      clone.volume = el.volume || 1;
      clone.play().catch(function(){});
    }
  }
}

// Pre-load all buffers once AudioCtx is created
function preloadSounds() {
  initAudioCtx();
  Object.keys(SOUNDS).forEach(function(k) { loadBuffer(k, SOUNDS[k]); });
}

// ── Named sound functions ──
function hover()     { playSound('hover');     }
function select()    { playSound('select');    }
function back()      { playSound('back');      }
function bottomBtn() { playSound('bottomBtn'); }

function zip() {
  playSound('zip');
  playSound('select');
  // Pause bg-music HTMLAudioElement
  var music = document.getElementById('bg-music');
  if (music) music.pause();
}

// ══════════════════════════════════════════════════════
//  AUTOPLAY MUSIC
//  Strategy: try immediately, retry on first user gesture.
//  mirrors the bgmusic.html iframe trick from index-old.html
//  but done directly so it works without Cloudflare.
// ══════════════════════════════════════════════════════

var musicStarted = false;

function tryStartMusic() {
  if (musicStarted) return;
  var music = document.getElementById('bg-music');
  var startup = document.getElementById('startup');
  if (!music) return;

  // Attempt play — browsers may reject before gesture
  var p = music.play();
  if (p !== undefined) {
    p.then(function() {
      musicStarted = true;
      if (startup) startup.play().catch(function(){});
    }).catch(function() {
      // Will retry on first interaction
    });
  } else {
    musicStarted = true;
  }
}

function unlockAndPlay() {
  if (musicStarted) return;
  // Unlock Web Audio context too
  initAudioCtx();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  preloadSounds();
  tryStartMusic();
}

// ══════════════════════════════════════════════════════
//  GIF HOVER SYSTEM
//  Images use src = static first frame (jpg/png).
//  data-gif points to the animated .gif.
//  On hover-in: wait 500ms, swap to gif.
//  On hover-out: wait 500ms, fade back to static.
// ══════════════════════════════════════════════════════

var gifTimers = {};

function channelHoverIn(hoverEl) {
  hover(); // play hover sound
  var icon = hoverEl.closest('.channel-icon') || hoverEl.parentElement;
  var img  = icon.querySelector('.channel-gif');
  if (!img) return;
  var gifSrc = img.getAttribute('data-gif');
  if (!gifSrc || gifSrc === img.getAttribute('data-static')) return;

  // Save static src on first call
  if (!img.getAttribute('data-static')) {
    img.setAttribute('data-static', img.src);
  }

  clearTimeout(gifTimers[img.id || gifSrc]);
  gifTimers[img.id || gifSrc] = setTimeout(function() {
    img.style.transition = 'none';
    img.style.opacity = '1';
    img.src = gifSrc + '?t=' + Date.now(); // force gif restart
  }, 500);
}

function channelHoverOut(hoverEl) {
  var icon = hoverEl.closest('.channel-icon') || hoverEl.parentElement;
  var img  = icon.querySelector('.channel-gif');
  if (!img) return;
  var staticSrc = img.getAttribute('data-static');
  if (!staticSrc) return;

  clearTimeout(gifTimers[img.id || staticSrc]);
  gifTimers[img.id || staticSrc] = setTimeout(function() {
    img.style.transition = 'opacity 400ms ease';
    img.style.opacity = '0';
    setTimeout(function() {
      img.src = staticSrc;
      img.style.opacity = '1';
    }, 400);
  }, 500);
}

// ══════════════════════════════════════════════════════
//  CHANNEL SELECTION + WARNING SEQUENCE
// ══════════════════════════════════════════════════════

var activeChannel = { action: null, url: null, title: null };

function selectChannel(el) {
  zip();

  activeChannel.action = el.getAttribute('data-action');
  activeChannel.url    = el.getAttribute('data-url');
  activeChannel.title  = el.getAttribute('data-title') || '';

  var img     = el.getAttribute('data-img');
  var centerX = $(el).offset().left + $(el).width()  / 2;
  var centerY = $(el).offset().top  + $(el).height() / 2;

  $('.main-menu').css({ 'transform-origin': centerX + 'px ' + centerY + 'px 0px' });
  $('.splash-screen').css({
    'background-image': 'url(' + img + ')',
    'transform-origin': centerX + 'px ' + centerY + 'px 0px'
  });
  $('.splash-title').text(activeChannel.title);

  $('.main-menu').addClass('channel-splash');
  $('body').addClass('channel-splash');
  delay(function() { $('body').removeClass('splash-switch'); }, 900);
}

// ── Warning overlay sequence ──
//
// Timeline (ms):
//   0         : solid black overlay appears, image invisible
//   500       : image fades IN  over 3000ms
//   3500      : image fully visible, holds for 1500ms
//   5000      : image fades OUT over 3000ms
//   8500      : black hold, then launch
//
// Route channels: overlay stays solid black while next page loads —
//   it is NEVER dismissed, so the page transition looks like a game boot.
// YouTube channels: modal opens, then overlay fades away slowly
//   (2s ease) like lights coming back on after a film.

function showWarningThenLaunch() {
  var overlay = document.getElementById('warningOverlay');
  var img     = document.getElementById('warningImg');
  if (!overlay || !img) { launchChannel(); return; }

  var FADE = 3000;

  // Reset: solid black, image invisible
  overlay.style.transition = 'none';
  overlay.style.opacity    = '1';
  overlay.style.display    = 'flex';
  img.style.transition     = 'none';
  img.style.opacity        = '0';
  overlay.offsetHeight; // force reflow

  // Fade image in
  setTimeout(function() {
    img.style.transition = 'opacity ' + FADE + 'ms ease';
    img.style.opacity    = '1';
  }, 500);

  // Fade image out (after lead-in + fade-in + hold)
  var fadeOutAt = 500 + FADE + 1500;
  setTimeout(function() {
    img.style.transition = 'opacity ' + FADE + 'ms ease';
    img.style.opacity    = '0';
  }, fadeOutAt);

  // Launch after image gone + short black hold
  var launchAt = fadeOutAt + FADE + 500;
  setTimeout(function() {
    if (activeChannel.action === 'route') {
      // Stay black through page load — never hide overlay
      window.location.href = activeChannel.url;
    } else {
      // Open video modal, then slowly bring up the lights
      launchChannel();
      setTimeout(function() {
        overlay.style.transition = 'opacity 2000ms ease';
        overlay.style.opacity    = '0';
        setTimeout(function() { overlay.style.display = 'none'; }, 2100);
      }, 300);
    }
  }, launchAt);
}

function launchChannel() {
  if (!activeChannel.action) return;
  if (activeChannel.action === 'youtube') {
    $('#videoFrame').attr('src', activeChannel.url + (activeChannel.url.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1');
    $('#videoModal').addClass('active');
  } else if (activeChannel.action === 'route') {
    window.location.href = activeChannel.url;
  }
}

function startChannel() {
  select();
  showWarningThenLaunch();
}

function closeVideoModal() {
  back();
  // Fade backdrop out slowly — lights coming back on after a film
  var modal = document.getElementById('videoModal');
  if (modal) {
    modal.style.transition = 'opacity 1800ms ease';
    modal.style.opacity    = '0';
    setTimeout(function() {
      $('#videoModal').removeClass('active');
      modal.style.transition = '';
      modal.style.opacity    = '';
      $('#videoFrame').attr('src', '');
      var music = document.getElementById('bg-music');
      if (music) music.play().catch(function(){});
    }, 1900);
  }
}

function backToMenu() {
  back();
  $('.main-menu').removeClass('channel-splash');
  $('body').removeClass('channel-splash');
  $('body').addClass('splash-switch');
  delay(function() { $('body').removeClass('splash-switch'); }, 900);
}

// ── Date ──
var monthNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var _d    = new Date();
weekday   = monthNames[_d.getDay()];
day       = _d.getDate();
month     = _d.getMonth() + 1;
date      = weekday + ' ' + month + '/' + day;

// ══════════════════════════════════════════════════════
//  DOCUMENT READY
// ══════════════════════════════════════════════════════

$(document).ready(function() {

  // First user interaction → unlock audio + start music
  $(document).one('click touchstart keydown', function() {
    unlockAndPlay();
    preloadSounds();
  });

  // Also try immediately (works in some browsers / after prior gesture)
  setTimeout(function() {
    preloadSounds();
    tryStartMusic();
  }, 100);

  // Escape / backdrop close for video modal
  $('body').on('click', '#videoModal', function(e) {
    if ($(e.target).is('#videoModal')) closeVideoModal();
  });
  $(document).on('keydown', function(e) {
    if (e.key === 'Escape') closeVideoModal();
  });

});
