/*
 * RetroRTC
 * Copyright (c) 2013-2014 Versatica <http://www.versatica.com>
 * Authors:
 *   Iñaki Baz Castillo <ibc@aliax.net>
 *   José Luis Millán <jmillan@aliax.net>
 * Homepage: http://retrortc.versatica.com
 * License: http://retrortc.versatica.com/LICENSE.txt
 */


if (! JsSIP.rtcninja.hasWebRTC()) {
  console.error("WebRTC not supported, the demo will not work at all");
  alert("WebRTC not supported, the demo will not work at all. Please use a modern version of Chrome or Firefox browser.");
}




$(document).ready(function(){

  retroRTC = new RetroRTC();

});
