/**
 * Services related to O2.
 */
var O2 = (function() {
  /**
   * Login to O2TV / MojeO2 on the O2 side.
   * 
   * @param {string} username The O2TV / MojeO2 username (email)
   * @param {string} password The O2TV / MojeO2 password
   * @returns 
   */
  var login = function(username, password) {
    return fetch('https://login-a-moje.o2.cz/cas-external/v1/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        'username': username,
        'password': password,
        'service': 'https://www.new-o2tv.cz/',
        'udid': Device.getOrCreateID()
      }),
    }).then(function(response) {
      return response.json();
    }).then(function(responseJson) {
      if('jwt' in responseJson) {
        return responseJson.jwt;
      }
      
      throw new Error('Couldn\'t login to O2');
    });
  };

  return {
    login,
  };
})();