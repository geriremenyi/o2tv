var Player = (function() {
  var player = null;

  var init = function() {
    var channelId = _getChannelIdFromSearchParams(window.location.search).channelId;
    if(!channelId) {
      throw new Error('Couldn\'t get the channel to play!');
    }

    Kaltura.getPlaybackContext(channelId).then(function(playbackContext) {
      return _initShakaPlayer(playbackContext);
    }).then(function() {
      player.play();
    }).catch(function(error) {
      console.error(error);
    }); 
  };

  var _initShakaPlayer = function(playbackContext) {
    shaka.polyfill.installAll();
    if (shaka.Player.isBrowserSupported()) {
      var video = document.getElementById('player');
      var shakaPlayer = new shaka.Player(video);
      player = shakaPlayer;
      if(playbackContext.drm) {
        player.configure({
          drm: {
            servers: {
              'com.widevine.alpha': playbackContext.drm,
            }
          }
        });
      }

      return player.load(playbackContext.url);
    } else {
      throw new Error('Environment is not supported for shaka.');
    }
  }

  var _getChannelIdFromSearchParams = function(search) {
    if(search.length > 0 && search[0] === '?') {
      search = search.substring(1);
    }

    var params = {};
    var searchPieces = search.split('&');
    searchPieces.forEach(function(searchPiece) {
      var keyValue = searchPiece.split('=');
      if(keyValue.length !== 2) {
        throw new Error('Cannot parse search query key-value pair!');
      }

      params[keyValue[0]] = keyValue[1];
    });

    return params;
  };

  return { init };
})();