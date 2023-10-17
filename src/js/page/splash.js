var Splash = (function() {
  /**
   * The minimum milliseconds to show the loading screen.
   * 
   * This is there to avoid flickering user experience when Kaltura's API is blazing fast.
   * And keep showing the spash screen in that case for at least this amount of milliseconds.
   */
  var MIN_DELAY_TIME_MS = 1000;

  /**
   * Run the splash screen.
   * 
   * Checks if there is an active Kaltura session and if there is gathers the live TV channels 
   * and then redirects to the channels screen. If there isn't an active login session then it
   * redirects to the login screen.
   */
  var run = function() {
    var splashOpenTime = Date.now();

    Kaltura.isLoggedIn().then(function(isLoggedIn) {
      if(isLoggedIn) {
        Kaltura.getLiveChannels().then(function(channels) {
          return Kaltura.extendChannelsWithLiveEpg(channels);
        }).then(function(_channelsWithEpg) {
          _delayedRedirect('channels.html', splashOpenTime, Date.now());
        }).catch(function(error) {
          // TODO: Handle loading channels failed
        });
      } else {
        _delayedRedirect('login.html', splashOpenTime, Date.now());
      }
    }).catch(function(error) {
      // TODO: Handle checking if logged in failed
    });
  };

  var _delayedRedirect = function(redirectTo, startTime, endTime) {
    setTimeout(function() {
      location.href = redirectTo;
    }, MIN_DELAY_TIME_MS - (endTime - startTime));
  };

  return {
    run,
  };
})();