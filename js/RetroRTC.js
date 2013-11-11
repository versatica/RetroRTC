RetroRTC = function() {
  
  var self = this;
  var minNumber = 1000;
  var maxNumber = 2999;
  var myNumber = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
  
  this.conf = {
    wheelSpeed: 0.17,  // 0 fastest, 1 slowest.
    dialTimeout: 4,  // Seconds to wait to start dialing when at least one digit is entered.
    dialTimeoutEmpty: 5,  // Seconds to wait to start dialing when no digit has been entered yet.
    jssip: {
      uri: "sip:" + myNumber + "@retrortc.versatica.com",
      ws_servers:  [ "ws://ws1.versatica.com:10080" ],
      display_name: "RetroRTC",
      register: true,
      register_expires: 300,
      trace_sip: true,
      stun_servers: [ "stun:74.125.132.127:19302" ],
      use_preloaded_route: false
    }
  };
  
  this.dom = $("#RetroRTC");
  this.dom.earphone = this.dom.find(".earphone");
  this.dom.base = this.dom.find(".base");
  this.dom.wheel = this.dom.find(".wheel");
  this.dom.doorstop = this.dom.find(".doorstop");
  this.dom.mirrorContainer = $("#mirrorContainer");
  this.dom.myVideo = $("#mirrorContainer video");
  this.dom.frameContainer = $("#frameContainer");
  this.dom.remoteVideo = $("#frameContainer video");
  this.dom.unregisterAll = $("#RetroRTC .unregister-all");
  this.dom.logo = $("#Logo");
  this.dom.vase = this.dom.find(".vase");
  
  this.status = {
    myNumber: myNumber,
    earphone: "down",  // "down" / "up" / "moving" / "ringing".
    phoneRinging: false,
    videoEnabled: false,
    dialedNumber: "",
    dialTimer: null,
    lineReady: false,
    currentCall: null
  };
  
  // Audio player for the phone and line.
  this.phonePlayer = new Audio();
  this.phonePlayer.volume = 1;
  this.phonePlayer.setAttribute("preload", "auto");
  this.phonePlayer.sounds = {
    hangUp: "sounds/phone-hang-up.ogg",
    pickUp: "sounds/phone-pick-up.ogg",
    phoneRinging: "sounds/phone-ringing-1.ogg",
    lineReady: "sounds/line-ready-1.ogg",
    lineRinging: "sounds/line-ringing-1.ogg",
    lineBusy: "sounds/line-busy-1.ogg",
    lineError: "sounds/line-error-1.ogg",
    lineOffHook: "sounds/line-off-hook-1.ogg",
    lineNumberUnavailable: "sounds/line-number-unavailable-1.ogg"
  }
  this.preloadSounds(this.phonePlayer.sounds);

  // Audio player for the phone wheel.
  this.wheelPlayer = new Audio();
  this.wheelPlayer.volume = 0.6;
  this.wheelPlayer.setAttribute("preload", "auto");
  this.wheelPlayer.sounds = {
    digit0: "sounds/rotary-phone-1-nr0.ogg",
    digit1: "sounds/rotary-phone-1-nr1.ogg",
    digit2: "sounds/rotary-phone-1-nr2.ogg",
    digit3: "sounds/rotary-phone-1-nr3.ogg",
    digit4: "sounds/rotary-phone-1-nr4.ogg",
    digit5: "sounds/rotary-phone-1-nr5.ogg",
    digit6: "sounds/rotary-phone-1-nr6.ogg",
    digit7: "sounds/rotary-phone-1-nr7.ogg",
    digit8: "sounds/rotary-phone-1-nr8.ogg",
    digit9: "sounds/rotary-phone-1-nr9.ogg"
  }
  this.preloadSounds(this.wheelPlayer.sounds);
  
  // Init events.
  this.initDomEvents();
  
  // Write my number into the post-it.
  $("#postit .myNumber").html(this.status.myNumber);
  
  // Load JsSIP.
  try {
    this.jssip = new JsSIP.UA(this.conf.jssip);
  }
  catch(e){
    console.error("ERROR running JsSIP:");
    console.error(e);
    throw(e);
    return;
  }
  
  // Set JsSIP events.
  this.jssip.on("newRTCSession", function(e) {
    self.onCall(e);
  });
  
  // Run JsSIP.
  this.jssip.start();
};


RetroRTC.prototype.preloadSounds = function(sounds) {
  var player;
  
  for (var sound in sounds) {
    player = new Audio(sounds[sound]);
    player.volume = 0;
    player.play();
  }
};


RetroRTC.prototype.initDomEvents = function() {
  var self = this;


  // Wheel digit pressed.
  this.dom.wheel.find(".digit").mousedown(function() {
    if (self.dom.wheel.hasClass("disabled")) {
      return;
    }
    
    if ($(this).hasClass("zero")) {
      self.onDigitPressed(0);
    } else if ($(this).hasClass("one")) {
      self.onDigitPressed(1);
    } else if ($(this).hasClass("two")) {
      self.onDigitPressed(2);
    } else if ($(this).hasClass("three")) {
      self.onDigitPressed(3);
    } else if ($(this).hasClass("four")) {
      self.onDigitPressed(4);
    } else if ($(this).hasClass("five")) {
      self.onDigitPressed(5);
    } else if ($(this).hasClass("six")) {
      self.onDigitPressed(6);
    } else if ($(this).hasClass("seven")) {
      self.onDigitPressed(7);
    } else if ($(this).hasClass("eight")) {
      self.onDigitPressed(8);
    } else if ($(this).hasClass("nine")) {
      self.onDigitPressed(9);
    }
  });

  
  // Earphone clicked.
  this.dom.earphone.mousedown(function() {
    // Moving: abort.
    if (self.status.earphone == "moving") {
      return;
    }
    
    // Pick up.
    else if (self.status.earphone == "down") {
      console.log("earphone pick up");
      
      self.status.earphone = "moving";
      window.setTimeout(function() {
        self.status.earphone = "up";
      }, 500);
      
      $(this).addClass("up");
      
      // Vibrate the phone.
      self.dom.addClass("pickingUp");
      window.setTimeout(function(){
        self.dom.removeClass("pickingUp");
      }, 50);
      
      // Play sound.
      self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.pickUp);
      self.phonePlayer.loop = false;
      self.phonePlayer.play();
      
      // Try to get line.
      if (! self.status.phoneRinging) {
        window.setTimeout(function() {
          // Registered: OK.
          if (self.jssip.isRegistered()) {
            self.status.lineReady = true;
            
            // Play line sound.
            self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineReady);
            self.phonePlayer.loop = true;
            self.phonePlayer.play();
            
            // Start dial timer.
            self.startDialTimer();
          }
          
          // Not registered: ERROR
          else {
            // Play sound.
            self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineError);
            self.phonePlayer.loop = true;
            self.phonePlayer.play();
          }
        }, 500);
      }
      
      // Answering a call.
      else {
        self.status.phoneRinging = false;
        self.dom.earphone.removeClass("ringing");
        
        self.status.currentCall.answer({
          mediaConstraints: { audio: true, video: self.status.videoEnabled },
          RTCConstraints: {"optional": [{"DtlsSrtpKeyAgreement": "true"}]} // TODO: Not implemented in JsSIP devel yet.
        });
      }
    }
      
    // Hang up phone.
    else if (self.status.earphone == "up") {
      console.log("earphone hang up");
      
      // Stop dial timer.
      self.stopDialTimer();
      
      self.status.earphone = "moving";
      window.setTimeout(function() {
        self.status.earphone = "down";
      }, 250);
      
      $(this).removeClass("up");
      
      window.setTimeout(function(){
        // Play sound.
        self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.hangUp);
        self.phonePlayer.loop = false;
        self.phonePlayer.play();
        
        // Vibrate the phone.
        self.dom.addClass("hangingUp");
        window.setTimeout(function(){
          self.dom.removeClass("hangingUp");
          
          // Wheel hit effect.
          self.dom.wheel.css({
            "-webkit-transform": "rotate(1deg)",
            "-moz-transform": "rotate(1deg)",
            "transform": "rotate(1deg)"
          });
          window.setTimeout(function() {
            self.dom.wheel.css({
              "-webkit-transform": "rotate(0deg)",
              "-moz-transform": "rotate(0deg)",
              "transform": "rotate(0deg)"
            });
          }, 250);
          
          // Hits!!!
          if (! self.dom.vase.hasClass("hit")) {
            // Hit the vase and logo.
            self.dom.vase.addClass("hit");
            self.dom.logo.toggleClass("hit");
          }
          else {
            // Hit the logo or frame or mirror!
            switch(Math.floor(Math.random() * 4) + 1) {
              case 1:
                self.dom.logo.toggleClass("hit");
                self.dom.frameContainer.toggleClass("hit");
                break;
              case 2:
                self.dom.logo.toggleClass("hit");
                self.dom.mirrorContainer.toggleClass("hit");
                break;
              case 3:
                self.dom.mirrorContainer.toggleClass("hit");
                self.dom.frameContainer.toggleClass("hit");
                break;
              case 4:
                self.dom.logo.toggleClass("hit");
                self.dom.mirrorContainer.toggleClass("hit");
                self.dom.frameContainer.toggleClass("hit");
                break;
            };
          }
          
        }, 100);
      }, 50);
      
      // Cancel or terminate current call if there is one.
      if (self.status.currentCall) {
        self.status.currentCall.terminate();
        self.status.currentCall = null;
      }
    }
  });
  
  
  // Mirror click.
  this.dom.mirrorContainer.click(function() {
    var action;
    
    if (self.status.currentCall) {
      alert("cannot (yet) enable/disable video during a call");
      return;
    }
    
    if (self.status.videoEnabled == null) {
      return;
    }
    else if (self.status.videoEnabled == false) {
      action = "enableVideo";
    }
    else if (self.status.videoEnabled == true) {
      action = "disableVideo";
    }
    
    self.status.videoEnabled = null;
    
    var myVideo = self.dom.myVideo[0];  // HTML5 <video> DOM element.
    
    // Enable video.
    if (action == "enableVideo") {
      // getUserMedia.
      WebRTC.getUserMedia(
        // Media constrains.
        { video:true, audio:false },
        // onSuccess.
        function(stream) {
          self.status.videoEnabled = true;
          myVideo.autoplay = true;
          myVideo.src = window.URL.createObjectURL(stream);
          myVideo.stream = stream;  // Store the stream for stopping it later.
        },
        // onError.
        function(e) {
          self.status.videoEnabled = false;
          console.error(e);
          alert(e);
        }
      );
    }
    
    // Disable video.
    else if (action == "disableVideo") {
      self.status.videoEnabled = false;
      myVideo.stream.stop();
      myVideo.src = "";
    }
    
  });
  
  
  // Vase clicked.
  this.dom.vase.click(function() {
    $(this).removeClass("hit");
  });
  
  
  // Unregister all.
  this.dom.unregisterAll.click(function() {
    self.jssip.unregister({all: true});
  });
};


RetroRTC.prototype.onDigitPressed = function(digit) {
  var self = this;
  var sound, duration, angle;
  
  // Disable the wheel until animation ends.
  this.dom.wheel.addClass("disabled");
  
  switch(digit) {
    case 1:
      angle = 60;
      sound = this.wheelPlayer.sounds.digit1;
      break;
    case 2:
      angle = 90;
      sound = this.wheelPlayer.sounds.digit2;
      break;
    case 3:
      angle = 120;
      sound = this.wheelPlayer.sounds.digit3;
      break;
    case 4:
      angle = 150;
      sound = this.wheelPlayer.sounds.digit4;
      break;
    case 5:
      angle = 180;
      sound = this.wheelPlayer.sounds.digit5;
      break;
    case 6:
      angle = 210;
      sound = this.wheelPlayer.sounds.digit6;
      break;
    case 7:
      angle = 240;
      sound = this.wheelPlayer.sounds.digit7;
      break;
    case 8:
      angle = 270;
      sound = this.wheelPlayer.sounds.digit8;
      break;
    case 9:
      angle = 300;
      sound = this.wheelPlayer.sounds.digit9;
      break;
    case 0:
      angle = 330;
      sound = this.wheelPlayer.sounds.digit0;
      break;
  }
  
  // Play wheel sound.
  this.wheelPlayer.setAttribute("src", sound);
  this.wheelPlayer.play();
  
  // Calculate the duration of the wheel animation.
  duration = ( this.conf.wheelSpeed * angle / 60 ) + this.conf.wheelSpeed;
  
  // Turn the wheel until the pressed digit.
  this.dom.wheel.css({
    "-webkit-transition-duration": duration + "s",
    "-moz-transition-duration": duration + "s",
    "transition-duration": duration + "s",
    "-webkit-transform": "rotate(" + angle + "deg)",
    "-moz-transform": "rotate(" + angle + "deg)",
    "transform": "rotate(" + angle + "deg)"
  });
  
  // Movement effect in the doorstop.
  window.setTimeout(function(){
    self.dom.doorstop.addClass("pressed");
    window.setTimeout(function(){
      self.dom.doorstop.removeClass("pressed");
    }, 200);
  }, (duration * 1000) * 0.80);
  
  // Move the wheel back to its original position.
  window.setTimeout(function(){
    self.dom.wheel.css({
      "-webkit-transition-duration": duration/1.15 + "s",
      "-moz-transition-duration": duration/1.15 + "s",
      "transition-duration": duration/1.15 + "s",
      "-webkit-transform": "rotate(0deg)",
      "-moz-transform": "rotate(0deg)",
      "transform": "rotate(0deg)"
    });
    // Set CSS transition-duration to 0 again.
    window.setTimeout(function(){
      self.dom.wheel.css({
        "-webkit-transition-duration": "0s",
        "-moz-transition-duration": "0s",
        "transition-duration": "0s"
      });
    }, (duration * 1000) + 50);
  }, (duration * 1000) + 50);
  
  // Enable the wheel again.
  window.setTimeout(function(){
    self.dom.wheel.removeClass("disabled");
  }, (duration * 1000) * 2);
  
  // Use the digit.
  if (self.status.lineReady) {
    console.log("digit " + digit + " entered");
    this.status.dialedNumber = this.status.dialedNumber + digit;
    
    // End line ready sound.
    window.setTimeout(function() {
      self.phonePlayer.setAttribute("src", "");
      self.phonePlayer.loop = false;
    }, 300);
    
    // Run the dial timer.
    this.startDialTimer();
  }
};


RetroRTC.prototype.startDialTimer = function() {
  var self = this;
  var timeout;
  
  window.clearTimeout(this.status.dialTimer);
  
  if (this.status.dialedNumber) {
    timeout = this.conf.dialTimeout * 1000;
  } else {
    timeout = this.conf.dialTimeoutEmpty * 1000;
  }
  
  this.status.dialTimer = window.setTimeout(function() {
    // Terminate line.
    self.status.lineReady = false;
    
    // If no number has been entered, fail.
    if (! self.status.dialedNumber) {
      console.log("canceling line");
      
      // Play error tone.
      self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineError);
      self.phonePlayer.loop = false;
      self.phonePlayer.play();
    }
    
    // Otherwise initiate a call.
    else {
      console.log("calling to " + self.status.dialedNumber);
      
      // End line sound.
      self.phonePlayer.setAttribute("src", "");
      self.phonePlayer.loop = false;
      
      try {
        self.jssip.call(self.status.dialedNumber, {
          mediaConstraints: { audio: true, video: self.status.videoEnabled },
          RTCConstraints: {
            "optional": [{"DtlsSrtpKeyAgreement": "true"}]
          }
        });
      } catch(e){
        console.error("ERROR calling:");
        console.error(e);
        throw(e);
        return;
      }
    }
  }, timeout);
};


RetroRTC.prototype.stopDialTimer = function() {
  window.clearTimeout(this.status.dialTimer);
  
  // Terminate line.
  this.status.lineReady = false;
  
  // Empty the dialed number.
  this.status.dialedNumber = "";
};


RetroRTC.prototype.onCall = function(e) {
  var self = this;
  var request = e.data.request;
  var call = e.data.session;
  
  // Store the current call.
  this.status.currentCall = call;
  
  console.log(call.direction + " incoming call from " + call.remote_identity.uri.user);
  
  // Incoming call.
  if (call.direction === 'incoming') {
    console.log("incoming call from " + call.remote_identity.uri.user);
    
    // If cannot receive the call reject with Busy.
    if (this.status.earphone != "down" || this.status.phoneRinging) {
      console.log("incoming call rejected with Busy");
      call.terminate({status_code: 486});
      this.status.currentCall = null;
      return;
    }
    
    this.status.phoneRinging = true;
    
    // Vibration effect.
    this.dom.earphone.addClass("ringing");
    
    // Play sound.
    this.phonePlayer.setAttribute("src", this.phonePlayer.sounds.phoneRinging);
    this.phonePlayer.loop = true;
    this.phonePlayer.play();
  }
  
  // Call ringing.
  call.on("progress", function(e) {
    console.log("call " + e.type + ":");
    console.log(e.data);
    
    // Local call (avoid multiple ringings).
    if (call.direction == "outgoing" && self.phonePlayer.getAttribute("src") != self.phonePlayer.sounds.lineRinging) {
      // Play simulated ringing.
      self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineRinging);
      self.phonePlayer.loop = true;
      self.phonePlayer.play();
    }
  });
  
  // Call answered.
  call.on("started", function(e) {
    console.log("call " + e.type + ":");
    console.log(e.data);
    
    // End current sound.
    self.phonePlayer.setAttribute("src", "");
    self.phonePlayer.loop = false;
    self.phonePlayer.setAttribute("src", "");
    self.phonePlayer.loop = false;
    
    // Attach the remote media stream(s) and show its video.
    if ( call.getRemoteStreams().length > 0) {
      var remoteVideo = self.dom.remoteVideo[0];
      remoteVideo.src = window.URL.createObjectURL(call.getRemoteStreams()[0]);
      remoteVideo.play();
    }
  });
    
  // Call canceled.
  call.on("failed", function(e) {
    console.log("call " + e.type + ":");
    console.log(e.data);
    
    self.status.currentCall = null;
    
    // Remote call canceled by the remote phone.
    if (call.direction == "incoming" && e.data.originator != "local") {
      self.status.phoneRinging = false;
      
      // Remove vibration effect.
      self.dom.earphone.removeClass("ringing");
      
      // End current sound.
      self.phonePlayer.setAttribute("src", "");
      self.phonePlayer.loop = false;
    }
    
    // Local call rejected by the remote phone.
    else if (call.direction == "outgoing" && e.data.originator == "remote") {
      switch(e.data.cause) {
        case JsSIP.C.causes.BUSY:
          self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineBusy);
          self.phonePlayer.loop = false;
          self.phonePlayer.play();
          break;
        case JsSIP.C.causes.UNAVAILABLE:  // SIP codes: 480,410,408,430
          window.setTimeout(function() {
            self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineNumberUnavailable);
            self.phonePlayer.loop = false;
            self.phonePlayer.play();
          }, 1000);
          break;
        default:
          self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineError);
          self.phonePlayer.loop = false;
          self.phonePlayer.play();
          break;
      }
    }
    
    // Local call rejected by local or system issues (WebRTC, getUserMedia...).
    else if (call.direction == "outgoing" && e.data.originator != "remote") {
      switch(e.data.cause) {
        case JsSIP.C.causes.CANCELED:
        case JsSIP.C.causes.NO_ANSWER: 
        case JsSIP.C.causes.EXPIRES:
          break;
        default:
          self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineError);
          self.phonePlayer.loop = false;
          self.phonePlayer.play();
          break;
      }
    }
  });
    
  // Ended call (was answered).
  call.on("ended", function(e) {
    console.log("call " + e.type + ":");
    console.log(e.data);
    
    self.status.currentCall = null;
    
    // Remove remote stream.
    var remoteVideo = self.dom.remoteVideo[0];
    remoteVideo.src = "";
    remoteVideo.pause();
    
    if (e.data.originator != "local") {
      // Play line off hook sound.
      self.phonePlayer.setAttribute("src", self.phonePlayer.sounds.lineOffHook);
      self.phonePlayer.loop = false;
      self.phonePlayer.play();
    }
  });
};