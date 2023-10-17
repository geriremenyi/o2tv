var Kaltura = (function() {
  /**
   * The partner ID for O2 at Kaltura
   */
  var PARTNER_ID = 3201;
  
  /**
   * The Kaltura API version to use
   */
  var API_VERSION = '5.4.0';

  /**
   * The local storage key for storing the Kaltura session
   */
  var KS_STORAGE_KEY = 'ks';

  /**
   * The local storage key storing the channels
   */
  var CHANNELS_STORAGE_KEY = 'channels';

  /**
   * Cached session data.
   * 
   * This data is also serialized and saved in the session storage for reusability across pages.
   */
  var ks = null;

  /**
   * Get the kaltura session data either from memory of local storage.
   * 
   * @returns Returns the session data if exists, null otherwise.
   */
  var _getKs = function(shouldThrow) {
    session = ks || JSON.parse(localStorage.getItem(KS_STORAGE_KEY));
    if(!session && shouldThrow) {
      throw new Error('There isn\'t a kaltura session available. First call Kaltura.login() then you can call the rest of the APIs.')
    }

    return session;
  };

  /**
   * Check if there is an active valid logged in session.
   * 
   * @returns A promise holding a true or false value.
   */
  var isLoggedIn = function() {
    var session = _getKs(false);
    if(!session) {
      return Promise.resolve(false);
    }

    return fetch("https://" + PARTNER_ID + ".frp1.ott.kaltura.com/api_v3/service/session/action/get", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        'ks': session.ks,
        'apiVersion': API_VERSION
      }),
    }).then(function(response) {
      return response.json();
    }).then(function(responseJson) {
      if('result' in responseJson && 'expiry' in responseJson.result && responseJson.result.expiry) {
        var expired = responseJson.result.expiry < Math.floor(Date.now() / 1000);
        if(expired) {
          ks = null;
          localStorage.removeItem(KS_STORAGE_KEY);
        }

        return expired;
      }

      return false;
    });
  };

  /**
   * Creates an anonymus login session in Kaltura for O2.
   * 
   * @returns An anonymus login session token from Kaltura
   */
  var _getAnonymusLoginToken = function() {
    return fetch("https://" + PARTNER_ID + ".frp1.ott.kaltura.com/api_v3/service/ottuser/action/anonymousLogin", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        'partnerId': PARTNER_ID,
        'apiVersion': API_VERSION
      }),
    }).then(function(response) {
      return response.json();
    }).then(function(responseJson) {
      if('result' in responseJson && 'ks' in responseJson.result && responseJson.result.ks) {
        return responseJson.result.ks;
      }

      throw new Error('Couldn\'t login anonymously to Kaltura!');
    });
  };

  /**
   * Get the list of service IDs available for the user.
   * 
   * @param {string} o2JwtToken 
   * @param {string} anonymusKs 
   * @returns An array with all service IDs available for the logged in user
   */
  var _getServiceIDs = function(o2JwtToken, anonymusKs) {
    return fetch("https://" + PARTNER_ID + ".frp1.ott.kaltura.com/api/p/" + PARTNER_ID + "/service/CZ/action/Invoke", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        'intent': 'Service List',
        'adapterData': [
          {
            'key': 'access_token',
            'value': o2JwtToken
          },
          {
            'key': 'pageIndex',
            'value': 0
          },
          {
            'key': 'pageSize',
            'value': 100
          }
        ],
        'ks': anonymusKs,
        'apiVersion': API_VERSION
      }),
    }).then(function(response) {
      return response.json();
    }).then(function(responseJson) {
      if(
        'result' in responseJson 
        && 'adapterData' in responseJson.result 
        && 'service_list' in responseJson.result.adapterData
        && 'value' in responseJson.result.adapterData['service_list']
        && responseJson.result.adapterData['service_list'].value) {
          serviceList = JSON.parse(responseJson.result.adapterData['service_list'].value);
          if('ServicesList' in serviceList && serviceList.ServicesList.length > 0) {
            return serviceList.ServicesList.map(function(service) {
              return Object.keys(service).map(function(serviceKey) {
                return service[serviceKey];
              })[0];
            });
          }
      }
      
      throw new Error('Couldn\'t get service list from Kaltura!');
    });
  };

  var _getLoginToken = function(o2JwtToken, serviceId) {
    return fetch("https://" + PARTNER_ID + ".frp1.ott.kaltura.com/api_v3/service/ottuser/action/login", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        'partnerId': PARTNER_ID,
        'username': 'NONE',
        'password': 'NONE',
        'extraParams': {
          'token': {
            'objectType': 'KalturaStringValue',
            'value': o2JwtToken
          },
          'loginType': {
            'objectType': 'KalturaStringValue',
            'value': 'accessToken'
          },
          'externalId': {
            'objectType': 'KalturaStringValue',
            'value': serviceId
          },
          'brandId': {
            'objectType': 'KalturaStringValue',
            'value': '16'
          }
        },
        'udid': Device.getOrCreateID(),
        'apiVersion': API_VERSION
      }),
    }).then(function(response) {
      return response.json();
    }).then(function(responseJson) {
      if(
        'result' in responseJson 
        && 'loginSession' in responseJson.result 
        && 'ks' in responseJson.result.loginSession
        && 'expiry' in responseJson.result.loginSession
        && 'refreshToken' in responseJson.result.loginSession) {
          return {
            'ks': responseJson.result.loginSession.ks,
            'expiry': responseJson.result.loginSession.expiry,
            'refreshToken': responseJson.result.loginSession.refreshToken,
          };
      }

      throw new Error('Couldn\'t login to Kaltura!');
    });
  };

  /**
   * Login with the username and password to Kaltura and save the kaltura session.
   * 
   * @param {string} email The email of the user to login with.
   * @param {string} password The password of the user to login with.
   * @return An empty promise if everything succeeds and ks is saved.
   */
  var login = function(email, password) {
    var o2JwtToken;
    return O2.login(email, password).then(function(jwtToken) {
      o2JwtToken = jwtToken;
      return _getAnonymusLoginToken();
    }).then(function(anonymusKs){
      return _getServiceIDs(o2JwtToken, anonymusKs);
    }).then(function(serviceId) {
      return _getLoginToken(o2JwtToken, serviceId[0]);
    }).then(function(session) {
      ks = session;
      localStorage.setItem(KS_STORAGE_KEY, JSON.stringify(ks));
    });
  };

  var getLiveChannels = function() {
    return fetch("https://" + PARTNER_ID + ".frp1.ott.kaltura.com/api_v3/service/asset/action/list", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        'ks': _getKs(true).ks,
        'filter': {
          'objectType': 'KalturaSearchAssetFilter',
          'kSql': '(and asset_type=\'607\' (or entitled_assets=\'entitledSubscriptions\' entitled_assets=\'free\'))'
        },
        'apiVersion': API_VERSION
      }),
    }).then(function(response) {
      return response.json();
    }).then(function(responseJson) {
      if('result' in responseJson && 'objects' in responseJson.result && Array.isArray(responseJson.result.objects)) {
        var channels = responseJson.result.objects.map(function(channel) {
          images = channel.images.filter(function(image) {
            return image.ratio === "16x9";
          });
          if(!images || images.length === 0) {
            throw new Error('Couldn\'t get the 16x9 image for the channel \'' + channel.name + '\' with id \'' + channel.id + '\'');
          }

          return {
            id: channel.id,
            name: channel.name,
            imageUrl: images[0].url,
          };
        });
        localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));

        return channels;
      }

      throw new Error('Couldn\'t get the live channels.');
    });
  };

  var extendChannelsWithLiveEpg = function(channels) {
    var channelFilter = '(or ' + channels.map(function(channel) { 
      return 'linear_media_id=\'' + channel.id +'\'' 
    }).join(' ') + ')';
    var currentTime = Math.floor(Date.now() / 1000);
    return fetch("https://" + PARTNER_ID + ".frp1.ott.kaltura.com/api_v3/service/asset/action/list", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        'ks': _getKs(true).ks,
        'filter': {
          'objectType': 'KalturaSearchAssetFilter',
          'kSql': '(and ' + channelFilter + ' start_date<=\'' + currentTime + '\' end_date>=\'' + currentTime + '\' asset_type=\'epg\' auto_fill=true)'
        },
        'apiVersion': API_VERSION
      }),
    }).then(function(response) {
      return response.json();
    }).then(function(responseJson) {
      if('result' in responseJson && 'objects' in responseJson.result && Array.isArray(responseJson.result.objects)) {
        responseJson.result.objects.map(function(epg) {
          images = epg.images.filter(function(image) {
            return image.ratio === "16x9";
          });
          if(!images || images.length === 0) {
            throw new Error('Couldn\'t get the 16x9 image for the epg \'' + epg.name + '\' for the channel with id \'' + epg.linearAssetId + '\'');
          }
          channels.forEach(function(channel) {
            if(channel.id === epg.linearAssetId) {
              channel.currentProgram = {
                name: epg.name,
                imageUrl: images[0].url,
              }
            }
          })
        });
        localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));

        return channels;
      }
      console.log(responseJson);
      throw new Error('Couldn\'t get the live epg for channels.');
    });
  };

  var getPlaybackContext = function(channelId) {
    return fetch("https://" + PARTNER_ID + ".frp1.ott.kaltura.com/api_v3/service/asset/action/getPlaybackContext", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        'ks': _getKs(true).ks,
        assetId: channelId,
        assetType: 'media',
        contextDataParams: {
          context: 'PLAYBACK',
          streamerType: 'mpegdash',
          urlType: 'DIRECT'
        },
        'apiVersion': API_VERSION
      }),
    }).then(function(response) {
      return response.json();
    }).then(function(responseJson) {
      if('result' in responseJson && 'sources' in responseJson.result && Array.isArray(responseJson.result.sources)) {
        var dashWV = responseJson.result.sources.filter(function(streamSource) {
          return streamSource.type === 'DASH_WV';
        });
        if(dashWV && dashWV.length === 1) {
          drmWV = dashWV[0].drm.filter(function(drm) {
            return drm.scheme === 'WIDEVINE_CENC';
          });
          if(drmWV && drmWV.length === 1) {
            return {
              url: dashWV[0].url,
              drm: drmWV[0].licenseURL
            }
          }
          
          throw new Error('Couldn\'t find Widevine DRM for channel with id \'' + channelId + '\'.');
        }

        dash = responseJson.result.sources.filter(function(streamSource) {
          return streamSource.type === 'DASH';
        });
        if(dash && dash.length === 1) {
          return {
            url: dash[0].url
          } 
        }

        throw new Error('Couldn\'t find DASH_WV neither DASH playback context for channel with id \'' + channelId + '\'.')
      }

      throw new Error('Couldn\'t get the playback context for channel with id \'' + channelId + '\'.');
    });
  };

  return {
    isLoggedIn,
    login,
    getLiveChannels,
    extendChannelsWithLiveEpg,
    getPlaybackContext
  };
})();