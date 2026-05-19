// ── delay utility ──
var delay = (function() {
  var timer = 0;
  return function(callback, ms) {
    clearTimeout(timer);
    timer = setTimeout(callback, ms);
  };
})();

// ── UI audio ──
function hover() {
  document.getElementById("hover").play();
}
function select() {
  document.getElementById("select").play();
}
function zip() {
  document.getElementById("zip").play();
  select();
  document.getElementById("bg-music").pause();
}
function back() {
  document.getElementById("back").play();
}

// ── Active channel state ──
// Stores the data attributes of whichever channel was last clicked
var activeChannel = {
  action: null,   // "youtube" or "route"
  url: null,      // embed URL or page path
  title: null
};

// ── Called when a channel icon is clicked ──
function selectChannel(el) {
  zip(); // plays zip + select sounds, pauses music

  var img    = el.getAttribute("data-img");
  var action = el.getAttribute("data-action");
  var url    = el.getAttribute("data-url");
  var title  = el.getAttribute("data-title") || "";

  // Store for Start button
  activeChannel.action = action;
  activeChannel.url    = url;
  activeChannel.title  = title;

  // Animate menu zoom-out + splash screen zoom-in (original behaviour)
  var centerX = $(el).offset().left + $(el).width() / 2;
  var centerY = $(el).offset().top  + $(el).height() / 2;
  $(".main-menu").css({ "transform-origin": centerX + "px " + centerY + "px 0px" });
  $(".splash-screen").css({
    "background-image": "url(" + img + ")",
    "transform-origin": centerX + "px " + centerY + "px 0px"
  });

  // Show channel title inside splash
  $(".splash-title").text(title);

  $(".main-menu").addClass("channel-splash");
  $("body").addClass("channel-splash");
  delay(function() {
    $("body").removeClass("splash-switch");
  }, 900);
}

// ── Start button ──
function startChannel() {
  select();
  if (!activeChannel.action) return;

  if (activeChannel.action === "youtube") {
    // Open the video modal and inject the embed URL
    $("#videoFrame").attr("src", activeChannel.url + "&autoplay=1");
    $("#videoModal").addClass("active");
  } else if (activeChannel.action === "route") {
    // Navigate to the page (e.g. /rivals/)
    window.location.href = activeChannel.url;
  }
}

// ── Close video modal ──
function closeVideoModal() {
  back();
  $("#videoModal").removeClass("active");
  // Stop video by clearing src
  setTimeout(function() {
    $("#videoFrame").attr("src", "");
  }, 300);
}

// ── Back to menu ──
function backToMenu() {
  back();
  $(".main-menu").removeClass("channel-splash");
  $("body").removeClass("channel-splash");
  $("body").addClass("splash-switch");
  delay(function() {
    $("body").removeClass("splash-switch");
  }, 900);
}

// ── Date ──
const monthNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const d = new Date();
weekday = monthNames[d.getDay()];
day     = d.getDate();
month   = d.getMonth() + 1;
date    = weekday + " " + month + "/" + day;

// ── Document ready ──
$(document).ready(function() {

  // Close screen-message on click
  $("body").on("click", ".screen-message", function() {
    $(".screen-message").addClass("hidden");
  });

  // Close video modal on backdrop click
  $("body").on("click", "#videoModal", function(e) {
    if ($(e.target).is("#videoModal")) {
      closeVideoModal();
    }
  });

  // Close video modal with Escape key
  $(document).on("keydown", function(e) {
    if (e.key === "Escape") closeVideoModal();
  });

});
